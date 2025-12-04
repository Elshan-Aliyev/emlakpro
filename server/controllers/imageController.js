const Image = require('../models/Image');
const cloudinary = require('../config/cloudinary');

// @desc    Upload new image
// @route   POST /api/images
// @access  Private (authenticated users)
exports.uploadImage = async (req, res) => {
  try {
    const { type, relatedId, relatedModel, altText, title, description, heroCategory } = req.body;
    
    // Validate required fields
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image file provided' 
      });
    }
    
    if (!type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Image type is required' 
      });
    }
    
    // Create image record
    const imageData = {
      type,
      url: req.file.path, // Cloudinary URL from multer
      publicId: req.file.filename,
      altText: altText || '',
      title,
      description,
      heroCategory,
      format: req.file.format,
      width: req.file.width,
      height: req.file.height,
      size: req.file.bytes,
      uploadedBy: req.user._id
    };
    
    // Add relatedId if provided
    if (relatedId && relatedModel) {
      imageData.relatedId = relatedId;
      imageData.relatedModel = relatedModel;
    }
    
    const image = await Image.create(imageData);
    
    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: image
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during image upload',
      error: error.message 
    });
  }
};

// @desc    Get all images with filters
// @route   GET /api/images
// @access  Private
exports.getImages = async (req, res) => {
  try {
    const { type, relatedId, heroCategory, isActive = true } = req.query;
    
    // Build filter query
    const filter = { isActive };
    
    if (type) filter.type = type;
    if (relatedId) filter.relatedId = relatedId;
    if (heroCategory) filter.heroCategory = heroCategory;
    
    const images = await Image.find(filter)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: images.length,
      data: images
    });
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching images',
      error: error.message 
    });
  }
};

// @desc    Get single image
// @route   GET /api/images/:id
// @access  Public
exports.getImage = async (req, res) => {
  try {
    const image = await Image.findById(req.params.id)
      .populate('uploadedBy', 'name email');
    
    if (!image) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      data: image
    });
  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching image',
      error: error.message 
    });
  }
};

// @desc    Update image metadata
// @route   PATCH /api/images/:id
// @access  Private (owner or admin)
exports.updateImage = async (req, res) => {
  try {
    const { altText, title, description, heroCategory, isActive } = req.body;
    
    let image = await Image.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found' 
      });
    }
    
    // Check ownership or admin
    if (image.uploadedBy.toString() !== req.user._id.toString() && 
        !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this image' 
      });
    }
    
    // Update allowed fields
    if (altText !== undefined) image.altText = altText;
    if (title !== undefined) image.title = title;
    if (description !== undefined) image.description = description;
    if (heroCategory !== undefined) image.heroCategory = heroCategory;
    if (isActive !== undefined) image.isActive = isActive;
    
    await image.save();
    
    res.status(200).json({
      success: true,
      message: 'Image updated successfully',
      data: image
    });
  } catch (error) {
    console.error('Update image error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating image',
      error: error.message 
    });
  }
};

// @desc    Delete image
// @route   DELETE /api/images/:id
// @access  Private (owner or admin)
exports.deleteImage = async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found' 
      });
    }
    
    // Check ownership or admin
    if (image.uploadedBy.toString() !== req.user._id.toString() && 
        !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this image' 
      });
    }
    
    // Delete from Cloudinary if publicId exists
    if (image.publicId) {
      try {
        await cloudinary.uploader.destroy(image.publicId);
      } catch (cloudinaryError) {
        console.error('Cloudinary deletion error:', cloudinaryError);
      }
    }
    
    // Delete from database
    await image.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting image',
      error: error.message 
    });
  }
};

// @desc    Bulk delete images
// @route   POST /api/images/bulk-delete
// @access  Private (admin only)
exports.bulkDeleteImages = async (req, res) => {
  try {
    const { imageIds } = req.body;
    
    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an array of image IDs' 
      });
    }
    
    const images = await Image.find({ _id: { $in: imageIds } });
    
    // Delete from Cloudinary
    for (const image of images) {
      if (image.publicId) {
        try {
          await cloudinary.uploader.destroy(image.publicId);
        } catch (cloudinaryError) {
          console.error('Cloudinary deletion error:', cloudinaryError);
        }
      }
    }
    
    // Delete from database
    const result = await Image.deleteMany({ _id: { $in: imageIds } });
    
    res.status(200).json({
      success: true,
      message: `${result.deletedCount} images deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Bulk delete images error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during bulk delete',
      error: error.message 
    });
  }
};
