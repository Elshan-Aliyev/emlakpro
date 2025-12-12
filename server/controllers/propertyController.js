const Property = require('../models/Property');
const User = require('../models/User');
const { deleteImage, deleteMultipleImages } = require('../config/cloudinary');

// Helper function to determine listing badge
const getListingBadge = (userRole, listingStatus) => {
  if (userRole === 'realtor') return 'realtor';
  if (userRole === 'corporate') return 'corporate';
  if (listingStatus === 'new-project') return 'developer';
  return 'for-sale-by-owner';
};

// Create a property
exports.createProperty = async (req, res) => {
  try {
    const listingBadge = getListingBadge(req.user.role, req.body.listingStatus);
    const property = new Property({ 
      ...req.body, 
      ownerId: req.user.id,
      listingBadge
    });
    await property.save();
    
    // Update user's total listings count
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalListings: 1 } });
    
    res.status(201).json(property);
  } catch (err) {
    console.error('Create property error:', err);
    console.error('Error details:', err.message);
    if (err.name === 'ValidationError') {
      console.error('Validation errors:', err.errors);
      return res.status(400).json({ message: 'Validation error', errors: err.errors });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all properties
exports.getProperties = async (req, res) => {
  try {
    let query = {};
    
    // Filter by ownerId if provided
    if (req.query.ownerId) {
      query.ownerId = req.query.ownerId;
    }
    
    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Filter by listingStatus if provided
    if (req.query.listingStatus) {
      query.listingStatus = req.query.listingStatus;
    }
    
    const properties = await Property.find(query).populate('ownerId', 'name lastName email phone avatar role verified licenseId brokerage companyName companyLogo totalListings totalViews accountType');
    res.json(properties);
  } catch (err) {
    console.error('Search properties error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Save/Unsave property (toggle favorite)
exports.toggleSaveProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    // Check if property is already saved
    const savedIndex = user.savedProperties.indexOf(propertyId);
    const favoriteIndex = user.favoriteListings.indexOf(propertyId);

    if (savedIndex > -1) {
      // Unsave property
      user.savedProperties.splice(savedIndex, 1);
      if (favoriteIndex > -1) user.favoriteListings.splice(favoriteIndex, 1);
      property.likes = Math.max(0, (property.likes || 0) - 1);
      property.favoritesCount = Math.max(0, (property.favoritesCount || 0) - 1);
      await user.save();
      await property.save();
      res.json({ message: 'Property unsaved', saved: false });
    } else {
      // Save property
      user.savedProperties.push(propertyId);
      user.favoriteListings.push(propertyId);
      property.likes = (property.likes || 0) + 1;
      property.favoritesCount = (property.favoritesCount || 0) + 1;
      await user.save();
      await property.save();
      res.json({ message: 'Property saved', saved: true });
    }
  } catch (err) {
    console.error('Toggle save property error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get user's saved properties
exports.getSavedProperties = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate({
      path: 'savedProperties',
      populate: { path: 'ownerId', select: 'name email phone avatar' }
    });
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json(user.savedProperties || []);
  } catch (err) {
    console.error('Get saved properties error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Increment property view count
exports.incrementViews = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    
    property.views = (property.views || 0) + 1;
    property.viewsCount = (property.viewsCount || 0) + 1;
    await property.save();
    
    res.json({ views: property.views });
  } catch (err) {
    console.error('Increment views error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get single property
exports.getProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate('ownerId', 'name lastName email phone avatar bio role verified licenseId brokerage companyName companyLogo website totalListings totalViews');
    if (!property) return res.status(404).json({ message: 'Property not found' });
    
    // Increment view count
    property.viewsCount = (property.viewsCount || 0) + 1;
    await property.save();
    
    res.json(property);
  } catch (err) {
    console.error('Get property error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update property
exports.updateProperty = async (req, res) => {
  try {
    console.log('\n=== Update Property Request ===');
    console.log('Property ID:', req.params.id);
    console.log('User ID from token:', req.user.id);
    console.log('User role from token:', req.user.role);
    console.log('User ID type:', typeof req.user.id);

    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    console.log('Property ownerId:', property.ownerId);
    console.log('Property ownerId type:', typeof property.ownerId);
    console.log('Property ownerId toString():', property.ownerId.toString());

    // allow admin/superadmin to edit any property
    // Handle both populated object and ObjectId cases
    let ownerIdString;
    if (typeof property.ownerId === 'object' && property.ownerId && property.ownerId._id) {
      // Populated case: ownerId is an object with _id
      ownerIdString = property.ownerId._id.toString();
    } else if (property.ownerId && typeof property.ownerId === 'object') {
      // ObjectId case: ownerId is a mongoose ObjectId
      ownerIdString = property.ownerId.toString();
    } else {
      // String case (fallback)
      ownerIdString = property.ownerId;
    }
    
    const isOwner = ownerIdString === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    console.log('Extracted ownerId string:', ownerIdString);
    console.log('Is owner check:', isOwner);
    console.log('Is admin check:', isAdmin);
    console.log('Final authorization:', isOwner || isAdmin);

    if (!isOwner && !isAdmin) {
      console.log('❌ Authorization failed - returning 401');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('✅ Authorization passed - proceeding with update');

    // regular owners cannot change the address/location
    if (isOwner && !isAdmin && req.body.location && req.body.location !== property.location) {
      // ignore location changes from non-admin owners
      delete req.body.location;
    }

    const updatedProperty = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    console.log('✅ Property updated. Images in DB:', updatedProperty.images ? updatedProperty.images.length : 0);
    console.log('Saved images:', updatedProperty.images);
    res.json(updatedProperty);
  } catch (err) {
    console.error('Update property error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete property
exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    
    // Handle both populated object and ObjectId cases
    let ownerIdString;
    if (typeof property.ownerId === 'object' && property.ownerId && property.ownerId._id) {
      // Populated case: ownerId is an object with _id
      ownerIdString = property.ownerId._id.toString();
    } else if (property.ownerId && typeof property.ownerId === 'object') {
      // ObjectId case: ownerId is a mongoose ObjectId
      ownerIdString = property.ownerId.toString();
    } else {
      // String case (fallback)
      ownerIdString = property.ownerId;
    }
    
    const isOwner = ownerIdString === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!isOwner && !isAdmin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Delete images from Cloudinary if they exist
    if (property.images && property.images.length > 0) {
      const publicIds = property.images.map(url => {
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        return `properties/${filename.split('.')[0]}`;
      });
      try {
        await deleteMultipleImages(publicIds);
      } catch (imgErr) {
        console.error('Error deleting images:', imgErr);
      }
    }

    await property.deleteOne();
    
    // Decrement user's total listings count
    await User.findByIdAndUpdate(property.ownerId, { $inc: { totalListings: -1 } });
    
    res.json({ message: 'Property deleted' });
  } catch (err) {
    console.error('Delete property error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Upload property images
exports.uploadPropertyImages = async (req, res) => {
  try {
    console.log('\n=== Image Upload Request ===');
    console.log('📥 Files received:', req.files ? req.files.length : 0);
    console.log('👤 User:', req.user ? req.user.id : 'No user');
    console.log('📊 Body:', Object.keys(req.body));
    
    if (!req.files || req.files.length === 0) {
      console.log('❌ No files in request');
      return res.status(400).json({ 
        message: 'No images uploaded. Please select images first.',
        error: 'NO_FILES'
      });
    }

    // Validate Cloudinary upload and create multiple size URLs
    const failedUploads = [];
    const imageData = [];
    
    req.files.forEach((file, index) => {
      if (!file.path) {
        console.log(`❌ File ${index + 1} failed to upload to Cloudinary`);
        failedUploads.push(file.originalname);
      } else {
        console.log(`✅ File ${index + 1} uploaded:`, file.originalname);
        console.log(`   Public ID: ${file.filename}`);
        console.log(`   Original URL: ${file.path}`);
        
        // Extract public_id from the uploaded file
        const publicId = file.filename; // This is the public_id from Cloudinary
        
        // Generate URLs for different sizes using Cloudinary transformations
        const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
        
        const imageUrls = {
          // Thumbnail: 400x300, optimized for cards/previews
          thumbnail: `${baseUrl}/w_400,h_300,c_fill,q_auto:low,f_auto/${publicId}`,
          
          // Medium: 800x600, for gallery/listing pages
          medium: `${baseUrl}/w_800,h_600,c_limit,q_auto:good,f_auto/${publicId}`,
          
          // Large: 1600x1200, for detail view
          large: `${baseUrl}/w_1600,h_1200,c_limit,q_auto:good,f_auto/${publicId}`,
          
          // Original/Full: as uploaded (but with auto format)
          full: `${baseUrl}/q_auto:best,f_auto/${publicId}`,
          
          // Store the public_id for deletion later
          publicId: publicId,
          
          // Original filename for reference
          originalName: file.originalname
        };
        
        console.log(`   📐 Generated URLs:`);
        console.log(`      Thumbnail: ${imageUrls.thumbnail}`);
        console.log(`      Medium: ${imageUrls.medium}`);
        console.log(`      Large: ${imageUrls.large}`);
        
        imageData.push(imageUrls);
      }
    });
    
    if (failedUploads.length > 0) {
      console.log('⚠️ Some uploads failed:', failedUploads);
      return res.status(500).json({
        message: `Failed to upload ${failedUploads.length} file(s) to cloud storage: ${failedUploads.join(', ')}`,
        error: 'CLOUDINARY_ERROR',
        failedFiles: failedUploads
      });
    }
    
    console.log('✅ Upload successful:', imageData.length, 'images uploaded with multiple sizes\n');
    
    res.json({
      message: 'Images uploaded successfully',
      images: imageData,
      count: imageData.length
    });
  } catch (err) {
    console.error('❌ Upload images error:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      message: 'Server error during image upload', 
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

// Add images to existing property
exports.addPropertyImages = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    // Handle both populated object and ObjectId cases
    let ownerIdString;
    if (typeof property.ownerId === 'object' && property.ownerId && property.ownerId._id) {
      // Populated case: ownerId is an object with _id
      ownerIdString = property.ownerId._id.toString();
    } else if (property.ownerId && typeof property.ownerId === 'object') {
      // ObjectId case: ownerId is a mongoose ObjectId
      ownerIdString = property.ownerId.toString();
    } else {
      // String case (fallback)
      ownerIdString = property.ownerId;
    }
    
    const isOwner = ownerIdString === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!isOwner && !isAdmin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    // Extract image URLs from Cloudinary response
    const newImageUrls = req.files.map(file => file.path);
    
    // Add new images to existing images array
    property.images = [...(property.images || []), ...newImageUrls];
    
    // Set featured image if not already set
    if (!property.featuredImage && newImageUrls.length > 0) {
      property.featuredImage = newImageUrls[0];
    }
    
    await property.save();
    
    res.json({
      message: 'Images added successfully',
      property,
      newImages: newImageUrls
    });
  } catch (err) {
    console.error('Add property images error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete specific image from property
exports.deletePropertyImage = async (req, res) => {
  try {
    const { id, imageUrl } = req.params;
    const property = await Property.findById(id);
    
    if (!property) return res.status(404).json({ message: 'Property not found' });

    // Handle both populated object and ObjectId cases
    let ownerIdString;
    if (typeof property.ownerId === 'object' && property.ownerId && property.ownerId._id) {
      // Populated case: ownerId is an object with _id
      ownerIdString = property.ownerId._id.toString();
    } else if (property.ownerId && typeof property.ownerId === 'object') {
      // ObjectId case: ownerId is a mongoose ObjectId
      ownerIdString = property.ownerId.toString();
    } else {
      // String case (fallback)
      ownerIdString = property.ownerId;
    }
    
    const isOwner = ownerIdString === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!isOwner && !isAdmin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Decode URL parameter
    const decodedUrl = decodeURIComponent(imageUrl);
    
    // Remove image from property
    property.images = property.images.filter(img => img !== decodedUrl);
    
    // Update featured image if it was deleted
    if (property.featuredImage === decodedUrl) {
      property.featuredImage = property.images[0] || null;
    }
    
    await property.save();

    // Delete from Cloudinary
    try {
      const parts = decodedUrl.split('/');
      const filename = parts[parts.length - 1];
      const publicId = `properties/${filename.split('.')[0]}`;
      await deleteImage(publicId);
    } catch (imgErr) {
      console.error('Error deleting image from Cloudinary:', imgErr);
    }

    res.json({ message: 'Image deleted successfully', property });
  } catch (err) {
    console.error('Delete property image error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
