const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Info
  name: { type: String, required: true },
  lastName: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // Role System (for admin access control only)
  role: { 
    type: String, 
    enum: ['guest', 'registered', 'admin', 'superadmin'], 
    default: 'registered' 
  },
  
  // Profile Info
  phone: { type: String },
  avatar: { type: String }, // Also known as profileImage
  profileImage: { type: String }, // URL to profile image
  bio: { type: String },
  
  // Account Verification Tier
  accountType: {
    type: String,
    enum: ['unverified-user', 'verified-user', 'verified-seller', 'realtor', 'corporate'],
    default: 'unverified-user'
  },
  
  // Realtor/Corporate Specific Fields
  verified: { type: Boolean, default: false },
  licenseId: { type: String },
  brokerage: { type: String },
  companyName: { type: String },
  companyLogo: { type: String },
  website: { type: String },
  taxId: { type: String }, // For corporate accounts
  
  // Verification Application
  verificationApplication: {
    status: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none'
    },
    requestedTier: {
      type: String,
      enum: ['verified-user', 'verified-seller', 'realtor', 'corporate']
    },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String },
    
    // Application Documents
    documents: [{
      type: { type: String }, // e.g., 'id', 'license', 'tax-document'
      url: { type: String },
      uploadedAt: { type: Date, default: Date.now }
    }],
    
    // Application Data
    applicationData: {
      // For verified-user and verified-seller
      fullName: { type: String },
      idNumber: { type: String },
      address: { type: String },
      
      // For realtor
      licenseNumber: { type: String },
      brokerageName: { type: String },
      yearsExperience: { type: Number },
      
      // For corporate
      companyRegistrationNumber: { type: String },
      taxIdNumber: { type: String },
      companyAddress: { type: String },
      authorizedPersonName: { type: String },
      authorizedPersonTitle: { type: String }
    },
    
    // Payment
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    },
    paymentAmount: { type: Number },
    paymentDate: { type: Date },
    paymentTransactionId: { type: String }
  },
  
  // Corporate Account - Parent Company
  parentCompany: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Subscription & Features
  subscriptionTier: { 
    type: String, 
    enum: ['free', 'basic', 'premium', 'corporate'], 
    default: 'free' 
  },
  subscriptionExpiry: { type: Date },
  
  // Analytics
  totalListings: { type: Number, default: 0 },
  totalViews: { type: Number, default: 0 },
  
  // Saved Listings (for registered users)
  favoriteListings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
  savedProperties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }], // Alias for frontend
  
  // Saved Searches
  savedSearches: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    filters: { type: Object },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Notification Preferences
  notificationsEnabled: { type: Boolean, default: true },
  emailAlerts: { type: Boolean, default: true },
  notificationPreferences: {
    emailListings: { type: Boolean, default: true },
    emailMessages: { type: Boolean, default: true },
    emailUpdates: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true }
  },
  
  // Account Status
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  },
  isActive: { type: Boolean, default: true },
  isBlocked: { type: Boolean, default: false },
  
  // Verification
  emailVerified: { type: Boolean, default: false },
  verificationToken: { type: String }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
