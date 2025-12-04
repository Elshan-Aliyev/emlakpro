const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Setting Key (unique identifier)
  key: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  
  // Setting Value (flexible type)
  value: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  },
  
  // Setting Metadata
  label: { type: String }, // Human-readable label
  description: { type: String }, // Description of what this setting does
  category: { 
    type: String, 
    enum: ['general', 'email', 'currency', 'images', 'hero', 'notifications', 'security', 'other'],
    default: 'general'
  },
  
  // Type hint for frontend
  valueType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    default: 'string'
  },
  
  // Access Control
  isPublic: { type: Boolean, default: false }, // Can be accessed without authentication
  isEditable: { type: Boolean, default: true }, // Can be changed by admin
  
  // Version Control
  lastUpdatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  }
}, { timestamps: true });

// Indexes
settingsSchema.index({ key: 1 }, { unique: true });
settingsSchema.index({ category: 1 });

// Static method to get setting by key
settingsSchema.statics.getSetting = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Static method to set/update setting
settingsSchema.statics.setSetting = async function(key, value, userId = null) {
  return await this.findOneAndUpdate(
    { key },
    { value, lastUpdatedBy: userId, updatedAt: new Date() },
    { upsert: true, new: true }
  );
};

const Settings = mongoose.model('Settings', settingsSchema);
module.exports = Settings;
