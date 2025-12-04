const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { isAdmin, isSuperAdmin } = require('../middleware/roleMiddleware');
const Property = require('../models/Property');
const User = require('../models/User');

// Get admin dashboard stats
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalListings = await Property.countDocuments();
    const activeListings = await Property.countDocuments({ listingStatus: { $in: ['for-sale', 'for-rent'] } });
    const soldListings = await Property.countDocuments({ listingStatus: 'sold' });
    const rentedListings = await Property.countDocuments({ listingStatus: 'rented' });
    
    // Get listings by type
    const buyListings = await Property.countDocuments({ listingStatus: 'for-sale' });
    const rentListings = await Property.countDocuments({ listingStatus: 'for-rent' });
    
    // Get users by role
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    // Get recent users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    
    // Get recent listings (last 30 days)
    const newListings = await Property.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    
    res.json({
      totalUsers,
      totalListings,
      activeListings,
      soldListings,
      rentedListings,
      buyListings,
      rentListings,
      usersByRole,
      newUsers,
      newListings
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Error fetching admin stats', error: error.message });
  }
});

// Get all listings for admin with filters
router.get('/listings', verifyToken, isAdmin, async (req, res) => {
  try {
    const { search, status, type, category, sortBy, order } = req.query;
    const query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) query.listingStatus = status;
    if (type) query.propertyType = type;
    if (category) query.purpose = category;
    
    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = order === 'desc' ? -1 : 1;
    } else {
      sortOptions.createdAt = -1; // Default: newest first
    }
    
    const properties = await Property.find(query)
      .populate('ownerId', 'name lastName email role verified')
      .sort(sortOptions);
    
    res.json(properties);
  } catch (error) {
    console.error('Admin listings error:', error);
    res.status(500).json({ message: 'Error fetching listings', error: error.message });
  }
});

// Approve property
router.put('/properties/:id/approve', verifyToken, isAdmin, async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    res.json({ message: 'Property approved', property });
  } catch (error) {
    console.error('Approve property error:', error);
    res.status(500).json({ message: 'Error approving property', error: error.message });
  }
});

// Reject property
router.put('/properties/:id/reject', verifyToken, isAdmin, async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { isApproved: false },
      { new: true }
    );
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    res.json({ message: 'Property rejected', property });
  } catch (error) {
    console.error('Reject property error:', error);
    res.status(500).json({ message: 'Error rejecting property', error: error.message });
  }
});

// Bulk approve properties
router.post('/properties/bulk-approve', verifyToken, isAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Invalid property IDs' });
    }
    
    const result = await Property.updateMany(
      { _id: { $in: ids } },
      { isApproved: true }
    );
    
    res.json({ message: `${result.modifiedCount} properties approved`, result });
  } catch (error) {
    console.error('Bulk approve error:', error);
    res.status(500).json({ message: 'Error bulk approving properties', error: error.message });
  }
});

// Bulk delete properties
router.post('/properties/bulk-delete', verifyToken, isAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Invalid property IDs' });
    }
    
    const result = await Property.deleteMany({ _id: { $in: ids } });
    
    res.json({ message: `${result.deletedCount} properties deleted`, result });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: 'Error bulk deleting properties', error: error.message });
  }
});

// Get recent activity
router.get('/activity', verifyToken, isAdmin, async (req, res) => {
  try {
    // Get last 20 listings
    const recentListings = await Property.find()
      .populate('ownerId', 'name lastName')
      .sort({ createdAt: -1 })
      .limit(20)
      .select('title createdAt listingStatus price ownerId');
    
    // Get last 20 users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select('name lastName email role createdAt');
    
    // Combine and sort by date
    const activity = [
      ...recentListings.map(l => ({
        type: 'listing',
        action: 'created',
        user: l.ownerId ? `${l.ownerId.name} ${l.ownerId.lastName || ''}` : 'Unknown',
        details: l.title,
        timestamp: l.createdAt
      })),
      ...recentUsers.map(u => ({
        type: 'user',
        action: 'registered',
        user: `${u.name} ${u.lastName || ''}`,
        details: `Role: ${u.role}`,
        timestamp: u.createdAt
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);
    
    res.json(activity);
  } catch (error) {
    console.error('Activity error:', error);
    res.status(500).json({ message: 'Error fetching activity', error: error.message });
  }
});

module.exports = router;
