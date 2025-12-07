const Article = require('../models/Article');
const cloudinary = require('../config/cloudinary');

// Get all articles (public - only published)
exports.getArticles = async (req, res) => {
  try {
    const { category, tag, featured, limit = 10, page = 1 } = req.query;
    
    const query = { status: 'published' };
    
    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (featured === 'true') query.isFeatured = true;
    
    const articles = await Article.find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('author', 'name lastName email')
      .select('-content'); // Don't send full content in list
    
    const total = await Article.countDocuments(query);
    
    res.json({
      articles,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Get articles error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single article by slug (public)
exports.getArticleBySlug = async (req, res) => {
  try {
    const article = await Article.findOne({ 
      slug: req.params.slug,
      status: 'published'
    })
      .populate('author', 'name lastName email accountType')
      .populate('relatedArticles', 'title slug heading excerpt featuredImage category');
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    // Increment views
    article.views += 1;
    await article.save();
    
    res.json(article);
  } catch (err) {
    console.error('Get article error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all articles for admin (includes drafts)
exports.getAdminArticles = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    
    const articles = await Article.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('author', 'name lastName email');
    
    const total = await Article.countDocuments(query);
    
    res.json({
      articles,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Get admin articles error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create article (admin/superadmin only)
exports.createArticle = async (req, res) => {
  try {
    const articleData = {
      ...req.body,
      author: req.user._id
    };
    
    // Generate unique slug if not provided
    if (!articleData.slug && articleData.title) {
      let baseSlug = articleData.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      
      let slug = baseSlug;
      let counter = 1;
      
      // Ensure slug is unique
      while (await Article.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      articleData.slug = slug;
    }
    
    const article = new Article(articleData);
    await article.save();
    
    res.status(201).json({
      message: 'Article created successfully',
      article
    });
  } catch (err) {
    console.error('Create article error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update article (admin/superadmin only)
exports.updateArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    // Check permissions - only author, admin, or superadmin can edit
    const isAuthor = article.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to edit this article' });
    }
    
    // Update fields
    Object.keys(req.body).forEach(key => {
      article[key] = req.body[key];
    });
    
    await article.save();
    
    res.json({
      message: 'Article updated successfully',
      article
    });
  } catch (err) {
    console.error('Update article error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete article (admin/superadmin only)
exports.deleteArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    // Check permissions
    const isAuthor = article.author.toString() === req.user._id.toString();
    const isSuperAdmin = req.user.role === 'superadmin';
    
    if (!isAuthor && !isSuperAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this article' });
    }
    
    // Delete featured image from Cloudinary if exists
    if (article.featuredImage?.publicId) {
      try {
        await cloudinary.uploader.destroy(article.featuredImage.publicId);
      } catch (err) {
        console.error('Error deleting image from Cloudinary:', err);
      }
    }
    
    await Article.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Article deleted successfully' });
  } catch (err) {
    console.error('Delete article error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload featured image
exports.uploadFeaturedImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    
    // Cloudinary automatically handles the upload via multer
    const imageData = {
      thumbnail: req.file.path.replace('/upload/', '/upload/w_400,h_300,c_fill,q_auto:low,f_auto/'),
      medium: req.file.path.replace('/upload/', '/upload/w_800,h_600,c_limit,q_auto:good,f_auto/'),
      large: req.file.path.replace('/upload/', '/upload/w_1200,h_800,c_limit,q_auto:good,f_auto/'),
      full: req.file.path,
      publicId: req.file.filename,
      altText: req.body.altText || ''
    };
    
    res.json({
      message: 'Image uploaded successfully',
      image: imageData
    });
  } catch (err) {
    console.error('Upload image error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Increment article views
exports.incrementViews = async (req, res) => {
  try {
    await Article.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } }
    );
    res.json({ message: 'Views incremented' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle like
exports.toggleLike = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    // Simple like increment (can be enhanced with user tracking)
    article.likes += 1;
    await article.save();
    
    res.json({ 
      message: 'Article liked',
      likes: article.likes 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
