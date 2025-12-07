const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  // Basic Info
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  slug: { 
    type: String, 
    unique: true,
    lowercase: true
  },
  heading: { 
    type: String, 
    required: true,
    trim: true
  },
  excerpt: { 
    type: String, 
    required: true,
    maxlength: 300
  },
  content: { 
    type: String, 
    required: true
  },
  
  // Featured Image
  featuredImage: {
    thumbnail: { type: String },
    medium: { type: String },
    large: { type: String },
    full: { type: String },
    publicId: { type: String },
    altText: { type: String }
  },
  
  // Categorization
  category: {
    type: String,
    enum: ['buying-guide', 'selling-tips', 'market-news', 'investment', 'legal', 'maintenance', 'lifestyle', 'technology', 'general'],
    default: 'general'
  },
  tags: [{ type: String }],
  
  // SEO
  metaTitle: { type: String },
  metaDescription: { type: String },
  
  // Author & Status
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  
  // Publishing
  publishedAt: { type: Date },
  scheduledFor: { type: Date },
  
  // Engagement
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  
  // Featured
  isFeatured: { type: Boolean, default: false },
  featuredOrder: { type: Number },
  
  // Related
  relatedArticles: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Article' 
  }]
}, {
  timestamps: true
});

// Create slug from title before saving
articleSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

// Auto-set publishedAt when status changes to published
articleSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Indexes
articleSchema.index({ slug: 1 });
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ category: 1, status: 1 });
articleSchema.index({ author: 1 });
articleSchema.index({ tags: 1 });
articleSchema.index({ isFeatured: 1, featuredOrder: 1 });

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;
