const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  // 1. BASIC PROPERTY INFORMATION
  title: { type: String, required: true },
  description: { type: String },
  propertyType: { 
    type: String, 
    enum: [
      // Residential
      'apartment', 'house', 'townhouse', 'villa', 'penthouse', 'studio', 'duplex',
      // Commercial
      'commercial-retail', 'commercial-unit', 'office', 'industrial', 'warehouse', 'shop', 'restaurant',
      // Land
      'land', 'farm',
      // Short-term / Unique
      'cabin', 'cottage', 'bungalow', 'chalet', 'loft', 'tiny-house', 'mobile-home', 'rv', 'camper-van',
      'boat', 'treehouse', 'dome', 'a-frame', 'barn', 'castle', 'cave', 'windmill', 'lighthouse',
      'room', 'shared-room', 'entire-place'
    ],
    default: 'apartment'
  },
  // Legacy field for backward compatibility
  type: { type: String, enum: ['buy', 'rent', 'ev', 'torpaq', 'obyekt', 'biznes'] },
  listingStatus: { 
    type: String, 
    enum: ['for-sale', 'for-rent', 'new-project'],
    default: 'for-sale'
  },
  status: { 
    type: String, 
    enum: ['active', 'sold', 'pending', 'rented', 'paused'],
    default: 'active'
  },
  occupancy: { type: String, enum: ['owner-occupied', 'vacant', 'tenanted'] },
  furnishing: { type: String, enum: ['furnished', 'semi-furnished', 'unfurnished'] },
  purpose: { type: String, enum: ['residential', 'commercial'], default: 'residential' },
  category: { type: String, enum: ['residential', 'commercial'], default: 'residential' },
  subCategory: { type: String, enum: ['long-term', 'short-term'] }, // For rent only

  // 2. LOCATION DETAILS
  location: { type: String, required: true },
  address: {
    street: { type: String },
    city: { type: String },
    province: { type: String },
    postalCode: { type: String },
    country: { type: String, default: 'Azerbaijan' }
  },
  fullAddress: { type: String },
  city: { type: String },
  district: { type: String },
  street: { type: String },
  buildingName: { type: String },
  floorNumber: { type: Number },
  unitNumber: { type: String },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  nearbyLandmarks: [{ type: String }],

  // 3. PRICING DETAILS
  price: { type: Number, required: true },
  pricePerSqm: { type: Number },
  negotiable: { type: Boolean, default: false },
  currency: { type: String, default: 'AZN' },
  
  // For Rent
  monthlyRent: { type: Number },
  annualRent: { type: Number },
  depositAmount: { type: Number },
  paymentFrequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'] },
  utilitiesIncluded: { type: Boolean },
  minContractPeriod: { type: Number },

  // 4. PROPERTY SIZE & SPECIFICATIONS
  builtUpArea: { type: Number },
  landArea: { type: Number },
  floorArea: { type: Number },
  plotWidth: { type: Number },
  plotLength: { type: Number },
  yearBuilt: { type: Number },
  renovationYear: { type: Number },
  constructionStatus: { type: String, enum: ['ready', 'under-construction', 'off-plan'] },
  totalFloorsInBuilding: { type: Number },
  
  // Legacy sqf field
  sqf: {
    type: String,
    enum: [
      '0-400', '401-600', '601-800', '801-1000', '1001-1500',
      '1501-2000', '2001-3000', '3001-4500', '4501-6000',
      '6001-8000', '8000-10000', '10000+'
    ],
  },

  // 5. ROOM DETAILS
  bedrooms: { type: Number, default: 0 },
  bathrooms: { type: Number, default: 0 },
  balconies: { type: Number, default: 0 },
  maidsRoom: { type: Boolean, default: false },
  storageRoom: { type: Boolean, default: false },
  laundryRoom: { type: Boolean, default: false },
  openLayoutKitchen: { type: Boolean, default: false },

  // 6. INTERIOR FEATURES
  flooringType: { type: String, enum: ['tile', 'hardwood', 'laminate', 'carpet', 'other'] },
  heating: { type: Boolean, default: false },
  cooling: { type: String },
  kitchenAppliances: { type: Boolean, default: false },
  waterHeater: { type: Boolean, default: false },
  smartHome: { type: Boolean, default: false },
  internetAvailable: { type: Boolean, default: false },
  builtInWardrobes: { type: Boolean, default: false },
  walkInCloset: { type: Boolean, default: false },

  // 7. EXTERIOR FEATURES
  parkingSpaces: { type: Number, default: 0 },
  garage: { type: Boolean, default: false },
  garden: { type: Boolean, default: false },
  swimmingPool: { type: Boolean, default: false },
  viewType: { type: String, enum: ['city', 'sea', 'mountain', 'park', 'street', 'other'] },
  roofAccess: { type: Boolean, default: false },
  fenced: { type: Boolean, default: false },

  // 8. BUILDING FEATURES
  elevator: { type: Boolean, default: false },
  security: { type: Boolean, default: false },
  cctv: { type: Boolean, default: false },
  gym: { type: Boolean, default: false },
  sharedPool: { type: Boolean, default: false },
  visitorParking: { type: Boolean, default: false },
  wheelchairAccessible: { type: Boolean, default: false },
  petsAllowed: { type: Boolean, default: false },

  // 9. COMMUNITY & NEIGHBORHOOD
  nearby: {
    schools: { type: Boolean, default: false },
    hospital: { type: Boolean, default: false },
    metro: { type: Boolean, default: false },
    shoppingMall: { type: Boolean, default: false },
    park: { type: Boolean, default: false },
    airport: { type: Boolean, default: false }
  },
  noiseLevel: { type: String, enum: ['quiet', 'moderate', 'noisy'] },
  walkabilityScore: { type: Number },

  // 10. UTILITIES & MAINTENANCE
  waterSource: { type: String },
  electricityProvider: { type: String },
  gasAvailable: { type: Boolean, default: false },
  sewageSystem: { type: String },
  internetOptions: [{ type: String }],
  hoaFees: { type: Number },
  propertyTax: { type: Number },

  // 11. LEGAL & FINANCIAL
  ownershipType: { type: String, enum: ['freehold', 'leasehold'] },
  titleDeedAvailable: { type: Boolean, default: false },
  mortgageAllowed: { type: Boolean, default: false },
  developerName: { type: String },
  projectName: { type: String },
  completionDate: { type: Date },
  paymentPlan: {
    bookingFee: { type: Number },
    downPayment: { type: Number },
    milestones: [{ type: String }]
  },

  // 12. MEDIA & FILES
  images: [{
    thumbnail: { type: String }, // 400x300 - for cards/previews
    medium: { type: String },    // 800x600 - for gallery
    large: { type: String },     // 1600x1200 - for detail view
    full: { type: String },      // Original quality
    publicId: { type: String },  // Cloudinary public_id for deletion
    originalName: { type: String }, // Original filename
    altText: { type: String }    // For accessibility
  }],
  videos: [{ type: String }],
  virtualTour: { type: String },
  floorPlans: [{ type: String }],
  documents: [{ type: String }],

  // 13. AUTO-GENERATED/CALCULATED FIELDS
  listingId: { type: String, unique: true },
  slug: { type: String },
  ageOfProperty: { type: Number },
  estimatedMortgage: { type: Number },
  estimatedRentalYield: { type: Number },
  listingScore: { type: Number },
  daysOnMarket: { type: Number },
  viewsCount: { type: Number, default: 0 },
  views: { type: Number, default: 0 }, // Alias for frontend
  favoritesCount: { type: Number, default: 0 },
  likes: { type: Number, default: 0 }, // Alias for frontend
  clicks: { type: Number, default: 0 },

  // Owner reference and seller info
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Listing Badge and Type
  listingBadge: { 
    type: String, 
    enum: ['for-sale-by-owner', 'realtor', 'corporate', 'developer'], 
    default: 'for-sale-by-owner' 
  },
  isFSBO: { type: Boolean, default: false }, // For Sale By Owner
  isCorporate: { type: Boolean, default: false },
  
  // Featured/Promoted
  isFeatured: { type: Boolean, default: false },
  isPromoted: { type: Boolean, default: false },
  isSponsored: { type: Boolean, default: false },
  promotionExpiry: { type: Date },
  sponsoredUntil: { type: Date },
  
  // Listing Status
  isApproved: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  
  // Contact Preferences
  allowContact: { type: Boolean, default: true },
  showPhoneNumber: { type: Boolean, default: true },
  showEmail: { type: Boolean, default: true }
}, { timestamps: true });

// Pre-save middleware to generate listingId and calculate fields
propertySchema.pre('save', function(next) {
  if (!this.listingId) {
    this.listingId = 'PROP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  
  // Calculate age of property
  if (this.yearBuilt) {
    this.ageOfProperty = new Date().getFullYear() - this.yearBuilt;
  }
  
  // Calculate price per sqm
  if (this.price && this.builtUpArea) {
    this.pricePerSqm = Math.round(this.price / this.builtUpArea);
  }
  
  // Calculate annual rent from monthly
  if (this.monthlyRent && !this.annualRent) {
    this.annualRent = this.monthlyRent * 12;
  }
  
  // Generate slug from title
  if (this.title && !this.slug) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  
  next();
});

const Property = mongoose.model('Property', propertySchema);
module.exports = Property;
