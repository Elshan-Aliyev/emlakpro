const Property = require('../models/Property');
const User = require('../models/User');
const { deleteImage, deleteMultipleImages, uploadToStorage, pathFromUrl } = require('../config/supabase');
const { calculateModerationPriority } = require('../lib/moderationScore');
const { detectDuplicatesAsync } = require('../lib/duplicateDetection');
const { recalculateAndStoreQuality } = require('../lib/listingQuality');
const { checkListingQuota } = require('../lib/accountTrust');
const { detectAndStoreAgentSignals } = require('../lib/agentDetection');
const { checkInquiryAllowed } = require('../lib/inquiryGuard');
const { resolvePropertyIdentity } = require('../lib/reputation/resolveIdentity');

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
    // ── Input validation ──────────────────────────────────────────────────────
    if (Number(req.body.bedrooms) === 0) {
      return res.status(400).json({ message: 'Studio is no longer a valid option. Please select 1 Room or more.' });
    }

    // ── Trust-based listing quota ─────────────────────────────────────────────
    const quota = await checkListingQuota(req.user.id);
    if (!quota.allowed) {
      const retryMins = quota.retryAfterMs ? Math.ceil(quota.retryAfterMs / 60000) : null;
      const msg =
        quota.reason === 'cooldown'
          ? `Please wait ${retryMins} minute${retryMins !== 1 ? 's' : ''} before creating another listing.`
          : 'You have reached your daily listing limit. Please try again tomorrow.';
      return res.status(429).json({ message: msg, retryAfterMs: quota.retryAfterMs });
    }

    const listingBadge = getListingBadge(req.user.role, req.body.listingStatus);
    const property = new Property({
      ...req.body,
      ownerId:    req.user.id,
      listingBadge,
      // Server-enforced defaults — client cannot override these
      status:     'pending',
      isApproved: false,
    });
    await property.save();

    // Resolve PropertyIdentity and link it — non-fatal
    try {
      const identity = await resolvePropertyIdentity(property);
      await identity.updateOne({ $inc: { listingCount: 1 } });
      await property.updateOne({ propertyIdentityId: identity._id });
    } catch (identityErr) {
      console.error('[reputation] identity resolve error on create:', identityErr.message);
    }

    // Update user's total listings count
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalListings: 1 } });

    // Score moderation priority async (don't block the response)
    calculateModerationPriority(property._id, req.user.id)
      .then(({ score, reasons }) =>
        Property.findByIdAndUpdate(property._id, { moderationPriority: score, moderationReasons: reasons })
      )
      .catch((err) => console.error('[moderation] score error on create:', err));

    // Detect duplicates async (don't block the response)
    detectDuplicatesAsync(property._id, req.user.id)
      .catch((err) => console.error('[duplicate] detection error on create:', err));

    // Detect agent/broker behavior async
    detectAndStoreAgentSignals(property._id, req.user.id)
      .catch((err) => console.error('[agentDetection] error on create:', err));

    // Score listing quality async (don't block the response)
    recalculateAndStoreQuality(property._id, req.user.id)
      .catch((err) => console.error('[quality] score error on create:', err));

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

// Allowed filter params — strict contract with frontend
const ALLOWED_FILTER_PARAMS = new Set([
  'listingStatus', 'city', 'propertyType',
  'priceMin', 'priceMax', 'bedrooms', 'bathrooms',
  'keyword',
  // Pagination
  'page', 'limit',
  // System (not user-facing)
  'ownerId',
]);

// Minimal fields returned for list/search views
const SEARCH_SELECT = [
  'title', 'price', 'currency',
  'city', 'location', 'address',
  'coordinates',
  'bedrooms', 'bathrooms', 'builtUpArea',
  'images',
  'listingStatus', 'listingBadge', 'isSponsored', 'status',
  'createdAt',
  // Trust signals
  'qualityScore', 'ownershipVerificationStatus', 'suspectedDuplicate',
  // Promotion
  'promotionTier', 'promotionScore', 'isPromoted', 'finalScore',
  // Reputation
  'propertyIdentityId',
].join(' ');

// Get all properties (with server-side filtering + pagination)
exports.getProperties = async (req, res) => {
  try {
    const q = req.query;

    // Log unknown params to catch frontend/backend drift
    const unknown = Object.keys(q).filter(k => !ALLOWED_FILTER_PARAMS.has(k));
    if (unknown.length > 0) {
      console.warn('[getProperties] Unknown query params ignored:', unknown);
    }

    const query = {};

    // System filters
    if (q.ownerId) query.ownerId = q.ownerId;

    // Always enforce public visibility — callers cannot override these
    query.status     = 'active';
    query.isApproved = true;

    // Allowed user filters
    if (q.listingStatus) query.listingStatus = q.listingStatus;
    if (q.propertyType)  query.propertyType  = q.propertyType;
    if (q.city)          query.city          = q.city.trim().toLowerCase();

    if (q.priceMin || q.priceMax) {
      query.price = {};
      if (q.priceMin) query.price.$gte = Number(q.priceMin);
      if (q.priceMax) query.price.$lte = Number(q.priceMax);
    }
    if (q.bedrooms)  query.bedrooms  = { $gte: Number(q.bedrooms) };
    if (q.bathrooms) query.bathrooms = { $gte: Number(q.bathrooms) };

    // Keyword search — runs against title and description; independent of city
    if (q.keyword) {
      const re = { $regex: q.keyword.trim(), $options: 'i' };
      query.$or = [{ title: re }, { description: re }];
    }

    // Pagination
    const page  = Math.max(1, parseInt(q.page)  || 1);
    const limit = Math.min(Math.max(1, parseInt(q.limit) || 20), 200);
    const skip  = (page - 1) * limit;

    const [total, properties] = await Promise.all([
      Property.countDocuments(query),
      Property.find(query)
        .sort({ finalScore: -1, qualityScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(SEARCH_SELECT)
        .populate('ownerId', 'name accountType phoneVerified averageResponseTimeHours responseRate')
        .populate('propertyIdentityId', 'avgRating reviewCount recommendPercentage')
        .lean(),
    ]);

    const result = properties.map(p => {
      const identity = p.propertyIdentityId;
      return {
        ...p,
        reputationSummary: identity && typeof identity === 'object'
          ? {
              avgRating:           identity.avgRating            || 0,
              reviewCount:         identity.reviewCount          || 0,
              recommendPercentage: identity.recommendPercentage  || 0,
            }
          : { avgRating: 0, reviewCount: 0, recommendPercentage: 0 },
      };
    });

    res.json({
      properties: result,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
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

    // Track daily views — reset counter if it's a new calendar day
    const today = new Date().toDateString();
    const lastReset = property.lastDailyViewsReset
      ? new Date(property.lastDailyViewsReset).toDateString()
      : null;
    if (lastReset !== today) {
      property.dailyViewsCount = 1;
      property.lastDailyViewsReset = new Date();
    } else {
      property.dailyViewsCount = (property.dailyViewsCount || 0) + 1;
    }

    await property.save();
    
    res.json({ views: property.views, dailyViewsCount: property.dailyViewsCount });
  } catch (err) {
    console.error('Increment views error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Increment property share count (one per button click, no external confirmation needed)
exports.incrementShares = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    property.sharesCount = (property.sharesCount || 0) + 1;
    await property.save();

    res.json({ sharesCount: property.sharesCount });
  } catch (err) {
    console.error('Increment shares error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const { sendInquiryNotification } = require('../lib/mailer');

// Submit inquiry — creates message + increments inquiryCount
exports.submitInquiry = async (req, res) => {
  try {
    const { name, phone, message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    // ── Inquiry abuse guard ───────────────────────────────────────────────────
    const guard = await checkInquiryAllowed(req.user.id, req.params.id, message.trim());
    if (!guard.allowed) {
      // Keep UX messages calm — do not expose the specific detection signal
      const userMessages = {
        already_sent:  'You have already sent an inquiry to this property recently.',
        hourly_limit:  'You are sending inquiries too quickly. Please wait a moment before trying again.',
        daily_limit:   'You have reached your inquiry limit for today.',
        copy_paste:    'Your message appears identical to several recent inquiries. Please personalise your message.',
      };
      return res.status(429).json({
        message: userMessages[guard.reason] || 'Unable to send inquiry at this time.',
      });
    }

    const property = await Property.findById(req.params.id)
      .select('ownerId title')
      .lean();
    if (!property) return res.status(404).json({ message: 'Property not found.' });

    // Build structured content
    const lines = [];
    if (name?.trim())  lines.push(`Contact name: ${name.trim()}`);
    if (phone?.trim()) lines.push(`Contact phone: ${phone.trim()}`);
    if (lines.length)  lines.push('');
    lines.push(message.trim());

    const Message = require('../models/Message');
    const conversationId = Message.generateConversationId(
      req.user.id, property.ownerId, req.params.id
    );
    await Message.create({
      sender:         req.user.id,
      recipient:      property.ownerId,
      property:       req.params.id,
      subject:        `Property Inquiry: ${property.title}`,
      content:        lines.join('\n'),
      conversationId,
    });

    // Create conversation record for response-rate tracking (upsert — safe for duplicate sends)
    const Conversation = require('../models/Conversation');
    await Conversation.findOneAndUpdate(
      { conversationId },
      { $setOnInsert: {
          conversationId,
          seller:           property.ownerId,
          buyer:            req.user.id,
          property:         req.params.id,
          inquiryCreatedAt: new Date(),
      }},
      { upsert: true }
    );

    await Property.findByIdAndUpdate(req.params.id, { $inc: { inquiryCount: 1 } });

    // Fire-and-forget email to seller — failure must never block inquiry creation
    const User = require('../models/User');
    User.findById(property.ownerId).select('email name notificationPreferences').lean()
      .then((seller) => {
        if (!seller?.email) return;
        if (seller.notificationPreferences?.emailMessages === false) return;
        const preview = message.trim().slice(0, 120) + (message.trim().length > 120 ? '…' : '');
        sendInquiryNotification({
          sellerEmail:     seller.email,
          sellerName:      seller.name,
          buyerName:       name?.trim() || req.user.name || 'A potential buyer',
          propertyTitle:   property.title,
          messagePreview:  preview,
        });
      })
      .catch(() => {});

    res.json({ message: 'Inquiry sent.' });
  } catch (err) {
    console.error('submitInquiry error:', err);
    res.status(500).json({ message: 'Failed to send inquiry.' });
  }
};

// Reveal phone — authenticated; returns phone number and increments counter
exports.revealPhone = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('ownerId', 'phone')
      .lean();
    if (!property) return res.status(404).json({ message: 'Property not found.' });
    if (!property.ownerId?.phone) return res.status(404).json({ message: 'No phone number on file.' });

    await Property.findByIdAndUpdate(req.params.id, { $inc: { phoneRevealCount: 1 } });
    res.json({ phone: property.ownerId.phone });
  } catch (err) {
    console.error('revealPhone error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark listing as sold or rented (owner only)
exports.markPropertyStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['sold', 'rented'].includes(status)) {
      return res.status(400).json({ message: "Status must be 'sold' or 'rented'." });
    }

    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found.' });

    const ownerId = property.ownerId?.toString?.() || property.ownerId;
    if (ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorised.' });
    }

    property.status     = status;
    property.isApproved = false; // deactivate from search
    await property.save();

    res.json({ message: `Listing marked as ${status}.`, status });
  } catch (err) {
    console.error('markPropertyStatus error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single property
exports.getProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate('ownerId', 'name lastName email avatar bio role verified phoneVerified accountType licenseId brokerage companyName companyLogo website totalListings totalViews averageResponseTimeHours responseRate');
    if (!property) return res.status(404).json({ message: 'Property not found' });
    
    // Increment view count and daily view count
    property.views = (property.views || 0) + 1;
    property.viewsCount = (property.viewsCount || 0) + 1;
    const today = new Date().toDateString();
    const lastReset = property.lastDailyViewsReset
      ? new Date(property.lastDailyViewsReset).toDateString()
      : null;
    if (lastReset !== today) {
      property.dailyViewsCount = 1;
      property.lastDailyViewsReset = new Date();
    } else {
      property.dailyViewsCount = (property.dailyViewsCount || 0) + 1;
    }
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
    // ── Input validation ──────────────────────────────────────────────────────
    if (req.body.bedrooms !== undefined && Number(req.body.bedrooms) === 0) {
      return res.status(400).json({ message: 'Studio is no longer a valid option. Please select 1 Room or more.' });
    }

    console.log('\n=== Update Property Request ===');
    console.log('Property ID:', req.params.id);
    console.log('User:', req.user.id, req.user.role);
    console.log('Images in request:', req.body.images ? req.body.images.length : 0);
    if (req.body.images) {
      console.log('Image URLs:', req.body.images);
    }

    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    // allow admin/superadmin to edit any property
    const isOwner = property.ownerId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!isOwner && !isAdmin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // regular owners cannot change the address/location
    if (isOwner && !isAdmin && req.body.location && req.body.location !== property.location) {
      // ignore location changes from non-admin owners
      delete req.body.location;
    }

    if (req.body.city) req.body.city = req.body.city.trim().toLowerCase();

    // Record owner activity; track price history on price change
    req.body.lastOwnerActivityAt = new Date();
    if (req.body.price !== undefined && Number(req.body.price) !== property.price) {
      req.body.previousPrice  = property.price;
      req.body.priceChangedAt = new Date();
      req.body.priceDelta     = property.price > 0
        ? Math.round(((Number(req.body.price) - property.price) / property.price) * 100)
        : 0;
    }

    const updatedProperty = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    console.log('✅ Property updated. Images in DB:', updatedProperty.images ? updatedProperty.images.length : 0);
    console.log('Saved images:', updatedProperty.images);

    // Re-resolve identity if fingerprint-relevant fields changed
    const fingerprintFields = ['fullAddress', 'location', 'bedrooms', 'propertyType'];
    const fingerprintChanged = fingerprintFields.some(f => req.body[f] !== undefined);
    if (fingerprintChanged) {
      try {
        const updated = await Property.findById(req.params.id);
        if (updated) {
          const newIdentity = await resolvePropertyIdentity(updated);
          const oldIdentityId = updated.propertyIdentityId;
          if (!oldIdentityId || String(oldIdentityId) !== String(newIdentity._id)) {
            if (oldIdentityId) {
              const PropertyIdentityModel = require('../models/PropertyIdentity');
              await PropertyIdentityModel.findByIdAndUpdate(oldIdentityId, { $inc: { listingCount: -1 } });
            }
            await newIdentity.updateOne({ $inc: { listingCount: 1 } });
            await updated.updateOne({ propertyIdentityId: newIdentity._id });
          }
        }
      } catch (identityErr) {
        console.error('[reputation] identity resolve error on update:', identityErr.message);
      }
    }

    // Rescore moderation priority after update (async — don't block response)
    const ownerId = updatedProperty.ownerId;
    calculateModerationPriority(updatedProperty._id, ownerId)
      .then(({ score, reasons }) =>
        Property.findByIdAndUpdate(updatedProperty._id, { moderationPriority: score, moderationReasons: reasons })
      )
      .catch((err) => console.error('[moderation] score error on update:', err));

    // Re-run duplicate detection after update (async — don't block response)
    detectDuplicatesAsync(updatedProperty._id, ownerId)
      .catch((err) => console.error('[duplicate] detection error on update:', err));

    // Rescore listing quality after update (async — don't block response)
    recalculateAndStoreQuality(updatedProperty._id, ownerId)
      .catch((err) => console.error('[quality] score error on update:', err));

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
    const isOwner = property.ownerId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!isOwner && !isAdmin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Delete images from Supabase Storage if they exist
    if (property.images && property.images.length > 0) {
      const paths = property.images.map(url => pathFromUrl(url)).filter(Boolean);
      if (paths.length > 0) {
        try {
          await deleteMultipleImages(paths);
        } catch (imgErr) {
          console.error('Error deleting images from storage:', imgErr);
        }
      }
    }

    await property.deleteOne();

    // Decrement listingCount on PropertyIdentity — non-fatal
    if (property.propertyIdentityId) {
      try {
        const PropertyIdentityModel = require('../models/PropertyIdentity');
        await PropertyIdentityModel.findByIdAndUpdate(
          property.propertyIdentityId,
          { $inc: { listingCount: -1 } }
        );
      } catch (identityErr) {
        console.error('[reputation] listingCount decrement error on delete:', identityErr.message);
      }
    }

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
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded. Please select images first.', error: 'NO_FILES' });
    }

    const imageData = [];
    const failedUploads = [];

    for (const file of req.files) {
      try {
        const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
        const storagePath = `properties/property_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const { publicUrl, path } = await uploadToStorage(file.buffer, storagePath, file.mimetype);

        imageData.push({
          thumbnail: publicUrl,
          medium: publicUrl,
          large: publicUrl,
          full: publicUrl,
          publicId: path,
          originalName: file.originalname
        });
      } catch (uploadErr) {
        console.error(`Failed to upload ${file.originalname}:`, uploadErr.message);
        failedUploads.push(file.originalname);
      }
    }

    if (failedUploads.length > 0) {
      return res.status(500).json({
        message: `Failed to upload ${failedUploads.length} file(s): ${failedUploads.join(', ')}`,
        error: 'UPLOAD_ERROR',
        failedFiles: failedUploads
      });
    }

    res.json({ message: 'Images uploaded successfully', images: imageData, count: imageData.length });
  } catch (err) {
    console.error('Upload images error:', err);
    res.status(500).json({ message: 'Server error during image upload', error: err.message, code: 'SERVER_ERROR' });
  }
};

// Add images to existing property
exports.addPropertyImages = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const isOwner = property.ownerId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!isOwner && !isAdmin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    // Upload files to Supabase Storage and collect public URLs
    const newImageUrls = [];
    for (const file of req.files) {
      const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
      const storagePath = `properties/property_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const { publicUrl } = await uploadToStorage(file.buffer, storagePath, file.mimetype);
      newImageUrls.push(publicUrl);
    }
    
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

    const isOwner = property.ownerId.toString() === req.user.id;
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

    // Delete from Supabase Storage
    try {
      const storagePath = pathFromUrl(decodedUrl);
      if (storagePath) await deleteImage(storagePath);
    } catch (imgErr) {
      console.error('Error deleting image from storage:', imgErr);
    }

    res.json({ message: 'Image deleted successfully', property });
  } catch (err) {
    console.error('Delete property image error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


// GET /api/properties/stats (public)
exports.getPublicStats = async (req, res) => {
  try {
    const [totalListings, verifiedOwners] = await Promise.all([
      Property.countDocuments({}),
      User.countDocuments({ phoneVerified: true }),
    ]);
    res.json({ totalListings, verifiedOwners });
  } catch (err) {
    console.error('getPublicStats error:', err);
    res.status(500).json({ message: 'Stats unavailable' });
  }
};

// ── Seller Intelligence Dashboard ─────────────────────────────────────────
exports.getMyDashboard = async (req, res) => {
  try {
    // 1. Fetch all of this seller's listings with full stat fields
    const listings = await Property.find({ ownerId: req.user.id })
      .populate('propertyIdentityId', 'avgRating reviewCount recommendPercentage')
      .select(
        'title city location price currency status isApproved listingStatus images createdAt ' +
        'ownershipVerificationStatus propertyType bedrooms ' +
        'viewsCount favoritesCount inquiryCount phoneRevealCount sharesCount ' +
        'promotionTier isPromoted promotionStartDate promotionEndDate promotionScore ' +
        'propertyIdentityId'
      )
      .sort({ createdAt: -1 })
      .lean();

    if (listings.length === 0) {
      return res.json({ listings: [] });
    }

    // 2. Compute city+type benchmark averages across all active approved listings
    const benchmarkAgg = await Property.aggregate([
      {
        $match: {
          status:     { $in: ['active', 'pending'] },
          isApproved: true,
          $or: listings.map(p => ({
            city:         p.city         || '',
            propertyType: p.propertyType || '',
          })),
        },
      },
      {
        $group: {
          _id:            { city: '$city', propertyType: '$propertyType' },
          avgViews:       { $avg: '$viewsCount'       },
          avgFavorites:   { $avg: '$favoritesCount'   },
          avgInquiries:   { $avg: '$inquiryCount'     },
          avgPhoneReveal: { $avg: '$phoneRevealCount' },
          count:          { $sum: 1 },
        },
      },
    ]);

    // Build lookup map: "city::type" → benchmark averages
    const benchmarkMap = {};
    for (const b of benchmarkAgg) {
      const key = `${b._id.city || ''}::${b._id.propertyType || ''}`;
      benchmarkMap[key] = b;
    }

    // 3. Classify each listing's performance
    const MIN_COMPARABLE = 3;

    function benchmarkLabel(value, avg, count) {
      if (!count || count < MIN_COMPARABLE || !avg || avg === 0) return 'average';
      const ratio = value / avg;
      if (ratio > 1.2) return 'above_average';
      if (ratio < 0.8) return 'below_average';
      return 'average';
    }

    const enriched = listings.map(p => {
      const key   = `${p.city || ''}::${p.propertyType || ''}`;
      const bm    = benchmarkMap[key] || {};
      const count = bm.count || 0;
      const identity = p.propertyIdentityId;

      return {
        ...p,
        reputationSummary: identity && typeof identity === 'object'
          ? {
              avgRating:           identity.avgRating            || 0,
              reviewCount:         identity.reviewCount          || 0,
              recommendPercentage: identity.recommendPercentage  || 0,
            }
          : { avgRating: 0, reviewCount: 0, recommendPercentage: 0 },
        benchmark: {
          views:           benchmarkLabel(p.viewsCount      || 0, bm.avgViews,       count),
          favorites:       benchmarkLabel(p.favoritesCount  || 0, bm.avgFavorites,   count),
          inquiries:       benchmarkLabel(p.inquiryCount    || 0, bm.avgInquiries,   count),
          phoneReveal:     benchmarkLabel(p.phoneRevealCount|| 0, bm.avgPhoneReveal, count),
          comparableCount: count,
        },
      };
    });

    res.json({ listings: enriched });
  } catch (err) {
    console.error('getMyDashboard error:', err);
    res.status(500).json({ message: 'Failed to load dashboard.' });
  }
};