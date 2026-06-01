const multer = require('multer');
const Property = require('../models/Property');
const { uploadToStorage } = require('../config/supabase');
const { recalculateAndStoreQuality } = require('../lib/listingQuality');

const DOCUMENT_TYPES = ['property-extract', 'utility-bill', 'ownership-certificate'];

const DOCUMENT_LABELS = {
  'property-extract':       'Property Extract',
  'utility-bill':           'Utility Bill',
  'ownership-certificate':  'Ownership Certificate',
};

// Accepts images and PDFs, max 10 MB
const documentUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype.toLowerCase())) return cb(null, true);
    cb(new Error('Invalid file type. Allowed: JPEG, PNG, WebP, PDF.'), false);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// GET /api/ownership/my-listings
// Returns ALL of the authenticated owner's listings (all statuses — not filtered to active/approved)
exports.getMyListings = async (req, res) => {
  try {
    const properties = await Property.find({ ownerId: req.user.id })
      .select(
        'title city location price currency status isApproved listingStatus images createdAt ' +
        'ownershipVerificationStatus ownershipDocuments ownershipReviewNote ownershipReviewedAt'
      )
      .sort({ createdAt: -1 })
      .lean();
    res.json(properties);
  } catch (err) {
    console.error('getMyListings error:', err);
    res.status(500).json({ message: 'Failed to load listings.' });
  }
};

// POST /api/ownership/:propertyId/upload-document  (multipart: file + documentType)
exports.uploadOwnershipDocument = async (req, res) => {
  try {
    const { documentType } = req.body;

    if (!DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({
        message: `Invalid document type. Allowed: ${DOCUMENT_TYPES.join(', ')}.`,
      });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const property = await Property.findById(req.params.propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found.' });
    if (property.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    if (property.ownershipVerificationStatus === 'approved') {
      return res.status(400).json({ message: 'Ownership already verified.' });
    }

    const ext = (req.file.originalname.split('.').pop() || 'bin').toLowerCase();
    const storagePath = `ownership/${req.params.propertyId}/${documentType}-${Date.now()}.${ext}`;
    const { publicUrl } = await uploadToStorage(req.file.buffer, storagePath, req.file.mimetype);

    // Replace existing document of same type, or push new
    const existingIdx = property.ownershipDocuments.findIndex(d => d.type === documentType);
    if (existingIdx >= 0) {
      property.ownershipDocuments[existingIdx] = { type: documentType, url: publicUrl, uploadedAt: new Date() };
    } else {
      property.ownershipDocuments.push({ type: documentType, url: publicUrl, uploadedAt: new Date() });
    }

    // If previously rejected, allow re-submission — reset to 'none' so user can re-submit
    if (property.ownershipVerificationStatus === 'rejected') {
      property.ownershipVerificationStatus = 'none';
    }

    await property.save();

    res.json({
      message: `${DOCUMENT_LABELS[documentType]} uploaded successfully.`,
      document: { type: documentType, url: publicUrl, uploadedAt: new Date() },
      ownershipVerificationStatus: property.ownershipVerificationStatus,
    });
  } catch (err) {
    console.error('uploadOwnershipDocument error:', err);
    res.status(500).json({ message: 'Failed to upload document.' });
  }
};

// POST /api/ownership/:propertyId/submit-request
exports.submitOwnershipRequest = async (req, res) => {
  try {
    const property = await Property.findById(req.params.propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found.' });
    if (property.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    if (property.ownershipVerificationStatus === 'approved') {
      return res.status(400).json({ message: 'Ownership already verified.' });
    }
    if (property.ownershipVerificationStatus === 'pending') {
      return res.status(400).json({ message: 'Verification already submitted and under review.' });
    }
    if (property.ownershipDocuments.length === 0) {
      return res.status(400).json({ message: 'Upload at least one document before submitting.' });
    }

    property.ownershipVerificationStatus = 'pending';
    property.ownershipReviewNote = undefined;
    await property.save();

    res.json({ message: 'Verification request submitted. Our team will review it shortly.', status: 'pending' });
  } catch (err) {
    console.error('submitOwnershipRequest error:', err);
    res.status(500).json({ message: 'Failed to submit request.' });
  }
};

// GET /api/ownership/requests  (admin)
exports.getOwnershipRequests = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const allowed = ['none', 'pending', 'approved', 'rejected'];
    const statusFilter = allowed.includes(status) ? status : 'pending';

    const properties = await Property.find({ ownershipVerificationStatus: statusFilter })
      .populate('ownerId', 'name lastName email accountType phone')
      .populate('ownershipReviewedBy', 'name lastName')
      .select(
        'title city price currency images createdAt ownerId ' +
        'ownershipVerificationStatus ownershipDocuments ownershipReviewNote ownershipReviewedAt ownershipReviewedBy'
      )
      .sort({ createdAt: -1 })
      .lean();

    res.json(properties);
  } catch (err) {
    console.error('getOwnershipRequests error:', err);
    res.status(500).json({ message: 'Failed to fetch requests.' });
  }
};

// PUT /api/ownership/:propertyId/approve  (admin)
exports.approveOwnership = async (req, res) => {
  try {
    const { reviewNote } = req.body;
    const property = await Property.findByIdAndUpdate(
      req.params.propertyId,
      {
        ownershipVerificationStatus: 'approved',
        ownershipReviewNote:   reviewNote?.trim() || undefined,
        ownershipReviewedBy:   req.user.id,
        ownershipReviewedAt:   new Date(),
      },
      { new: true }
    ).populate('ownerId', 'name email');

    if (!property) return res.status(404).json({ message: 'Property not found.' });

    // Rescore quality — ownership approval is a +3 positive signal
    recalculateAndStoreQuality(property._id, property.ownerId)
      .catch((err) => console.error('[quality] score error on ownership approve:', err));

    res.json({ message: 'Ownership verified and approved.', property });
  } catch (err) {
    console.error('approveOwnership error:', err);
    res.status(500).json({ message: 'Failed to approve.' });
  }
};

// PUT /api/ownership/:propertyId/reject  (admin)
exports.rejectOwnership = async (req, res) => {
  try {
    const { reviewNote } = req.body;
    const property = await Property.findByIdAndUpdate(
      req.params.propertyId,
      {
        ownershipVerificationStatus: 'rejected',
        ownershipReviewNote:   reviewNote?.trim() || undefined,
        ownershipReviewedBy:   req.user.id,
        ownershipReviewedAt:   new Date(),
      },
      { new: true }
    );

    if (!property) return res.status(404).json({ message: 'Property not found.' });

    // Rescore quality — ownership no longer approved, losing the +3 boost
    recalculateAndStoreQuality(property._id, property.ownerId)
      .catch((err) => console.error('[quality] score error on ownership reject:', err));

    res.json({ message: 'Ownership verification rejected.', property });
  } catch (err) {
    console.error('rejectOwnership error:', err);
    res.status(500).json({ message: 'Failed to reject.' });
  }
};

exports.documentUpload = documentUpload;
exports.DOCUMENT_TYPES = DOCUMENT_TYPES;
exports.DOCUMENT_LABELS = DOCUMENT_LABELS;
