const sharp = require('sharp');
const { cloudinary } = require('../config/cloudinary');

/**
 * Middleware to compress and optimize images before uploading to Cloudinary
 * This reduces file size and improves load times
 */
const compressImage = async (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  try {
    // Handle single file upload
    if (req.file) {
      const buffer = await sharp(req.file.buffer)
        .resize(1600, 1200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
      
      req.file.buffer = buffer;
    }

    // Handle multiple files upload
    if (req.files && Array.isArray(req.files)) {
      req.files = await Promise.all(
        req.files.map(async (file) => {
          const buffer = await sharp(file.buffer)
            .resize(1600, 1200, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 85, progressive: true })
            .toBuffer();
          
          file.buffer = buffer;
          return file;
        })
      );
    }

    // Handle multiple files with field names
    if (req.files && typeof req.files === 'object') {
      for (const fieldName in req.files) {
        const filesArray = req.files[fieldName];
        req.files[fieldName] = await Promise.all(
          filesArray.map(async (file) => {
            const buffer = await sharp(file.buffer)
              .resize(1600, 1200, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .jpeg({ quality: 85, progressive: true })
              .toBuffer();
            
            file.buffer = buffer;
            return file;
          })
        );
      }
    }

    next();
  } catch (error) {
    console.error('Image compression error:', error);
    res.status(500).json({ message: 'Error processing image', error: error.message });
  }
};

/**
 * Middleware to create thumbnail from uploaded image
 */
const createThumbnail = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const thumbnailBuffer = await sharp(req.file.buffer)
      .resize(400, 300, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 70, progressive: true })
      .toBuffer();

    // Upload thumbnail to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'properties/thumbnails',
        transformation: [
          { width: 400, height: 300, crop: 'fill', quality: 'auto:low' }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('Thumbnail upload error:', error);
          return next();
        }
        req.thumbnail = result;
        next();
      }
    );

    uploadStream.end(thumbnailBuffer);
  } catch (error) {
    console.error('Thumbnail creation error:', error);
    // Don't fail the request if thumbnail creation fails
    next();
  }
};

/**
 * Validate image dimensions and size
 */
const validateImage = (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  const minWidth = 800;
  const minHeight = 600;

  const validateSingleFile = async (file) => {
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit');
    }

    const metadata = await sharp(file.buffer).metadata();
    if (metadata.width < minWidth || metadata.height < minHeight) {
      throw new Error(`Image dimensions must be at least ${minWidth}x${minHeight}px`);
    }
  };

  try {
    if (req.file) {
      validateSingleFile(req.file);
    }

    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(validateSingleFile);
    }

    next();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Extract metadata from uploaded images
 */
const extractImageMetadata = async (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  try {
    if (req.file) {
      const metadata = await sharp(req.file.buffer).metadata();
      req.file.imageMetadata = {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: req.file.size
      };
    }

    if (req.files && Array.isArray(req.files)) {
      for (let file of req.files) {
        const metadata = await sharp(file.buffer).metadata();
        file.imageMetadata = {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: file.size
        };
      }
    }

    next();
  } catch (error) {
    console.error('Metadata extraction error:', error);
    next();
  }
};

module.exports = {
  compressImage,
  createThumbnail,
  validateImage,
  extractImageMetadata
};
