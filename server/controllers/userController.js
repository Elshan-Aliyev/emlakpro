// server/controllers/userController.js
const User = require('../models/User');

// Get user by ID (public - for realtor profiles)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -savedProperties -savedSearches');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all realtors (public - for Find Realtor page)
exports.getRealtors = async (req, res) => {
  try {
    const realtors = await User.find({
      accountType: { $in: ['realtor', 'corporate'] },
      isActive: true
    }).select('-password -savedProperties -savedSearches');
    
    res.json(realtors);
  } catch (err) {
    console.error('Error fetching realtors:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    // Only admin and superadmin can fetch all users
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const users = await User.find().select('-password'); // exclude passwords
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, lastName, role, accountType, isActive } = req.body;
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    
    // Permissions:
    // - Users can only update themselves (not role)
    // - Admin can update any user except superadmin, can set roles (except superadmin)
    // - Superadmin can update anyone including admins, can set any role
    
    const isSelf = req.user.id === req.params.id;
    const isAdmin = req.user.role === 'admin';
    const isSuperAdmin = req.user.role === 'superadmin';
    
    // Regular users can only update themselves
    if (!isAdmin && !isSuperAdmin && !isSelf) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Admin cannot modify superadmin accounts
    if (isAdmin && !isSuperAdmin && targetUser.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot modify superadmin accounts' });
    }

    // If email is changing, ensure uniqueness
    if (email) {
      const existing = await User.findOne({ email });
      if (existing && existing._id.toString() !== req.params.id) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    if (name) targetUser.name = name;
    if (lastName !== undefined) targetUser.lastName = lastName;
    if (email) targetUser.email = email;
    
    // Account type and status (admin/superadmin only)
    if (accountType !== undefined && (isAdmin || isSuperAdmin)) {
      targetUser.accountType = accountType;
    }
    
    if (isActive !== undefined && (isAdmin || isSuperAdmin)) {
      targetUser.isActive = isActive;
    }
    
    // Role changes
    if (role !== undefined) {
      // Regular users cannot change roles
      if (!isAdmin && !isSuperAdmin) {
        return res.status(403).json({ message: 'Cannot change role' });
      }
      
      // Admin can set roles except superadmin
      if (isAdmin && !isSuperAdmin) {
        if (['guest', 'registered', 'realtor', 'corporate', 'admin'].includes(role)) {
          targetUser.role = role;
        } else {
          return res.status(403).json({ message: 'Cannot assign superadmin role' });
        }
      }
      
      // Superadmin can set any role
      if (isSuperAdmin) {
        if (['guest', 'registered', 'realtor', 'corporate', 'admin', 'superadmin'].includes(role)) {
          targetUser.role = role;
        } else {
          return res.status(400).json({ message: 'Invalid role value' });
        }
      }
    }
    
    await targetUser.save();
    const userObj = targetUser.toObject();
    delete userObj.password;
    res.json(userObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating user' });
  }
};

// Save property to favourites
exports.saveProperty = async (req, res) => {
  try {
    const { propertyId } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Initialize savedProperties array if it doesn't exist
    if (!user.savedProperties) {
      user.savedProperties = [];
    }
    
    // Check if already saved
    if (user.savedProperties.includes(propertyId)) {
      return res.status(400).json({ message: 'Property already saved' });
    }
    
    user.savedProperties.push(propertyId);
    await user.save();
    
    res.json({ message: 'Property saved', savedProperties: user.savedProperties });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error saving property' });
  }
};

// Unsave property from favourites
exports.unsaveProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.savedProperties) {
      user.savedProperties = [];
    }
    
    user.savedProperties = user.savedProperties.filter(id => id.toString() !== propertyId);
    await user.save();
    
    res.json({ message: 'Property unsaved', savedProperties: user.savedProperties });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error unsaving property' });
  }
};

// Get saved properties
exports.getSavedProperties = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('savedProperties');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user.savedProperties || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching saved properties' });
  }
};

// Save search
exports.saveSearch = async (req, res) => {
  try {
    const { name, url, filters } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.savedSearches) {
      user.savedSearches = [];
    }
    
    user.savedSearches.push({ name, url, filters, createdAt: new Date() });
    await user.save();
    
    res.json({ message: 'Search saved', savedSearches: user.savedSearches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error saving search' });
  }
};

// Delete saved search
exports.deleteSavedSearch = async (req, res) => {
  try {
    const { searchId } = req.params;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.savedSearches = user.savedSearches.filter(s => s._id.toString() !== searchId);
    await user.save();
    
    res.json({ message: 'Search deleted', savedSearches: user.savedSearches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting search' });
  }
};

// Get saved searches
exports.getSavedSearches = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user.savedSearches || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching saved searches' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    
    const isSelf = req.user.id === req.params.id;
    const isAdmin = req.user.role === 'admin';
    const isSuperAdmin = req.user.role === 'superadmin';
    
    // Regular users can only delete themselves
    if (!isAdmin && !isSuperAdmin && !isSelf) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Admin cannot delete superadmin accounts
    if (isAdmin && !isSuperAdmin && targetUser.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot delete superadmin accounts' });
    }
    
    // Admin cannot delete other admin accounts (only superadmin can)
    if (isAdmin && !isSuperAdmin && targetUser.role === 'admin' && !isSelf) {
      return res.status(403).json({ message: 'Cannot delete other admin accounts' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting user' });
  }
};
