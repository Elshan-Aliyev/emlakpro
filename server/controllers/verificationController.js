const User = require('../models/User');

// Get verification pricing
exports.getVerificationPricing = (req, res) => {
  const pricing = {
    'verified-user': {
      name: 'Verified User',
      price: 19.99,
      features: [
        'Verified badge on profile',
        'Increased trust',
        'Access to messaging',
        'Basic support'
      ],
      requirements: [
        'Government-issued ID',
        'Phone verification'
      ]
    },
    'verified-seller': {
      name: 'Verified Seller',
      price: 99,
      features: [
        'Verified seller badge',
        'List properties',
        'Up to 10 active listings',
        'Priority support',
        'Analytics dashboard'
      ],
      requirements: [
        'Government-issued ID',
        'Proof of address',
        'Phone verification'
      ]
    },
    'realtor': {
      name: 'Realtor',
      price: 299,
      features: [
        'Professional realtor badge',
        'Unlimited active listings',
        'Featured listing spots (2/month)',
        'Advanced analytics',
        'Priority customer support',
        'API access'
      ],
      requirements: [
        'Valid real estate license',
        'Brokerage information',
        'Professional credentials',
        'Government-issued ID'
      ]
    },
    'corporate': {
      name: 'Corporate',
      price: 499,
      features: [
        'Corporate badge and branding',
        'Unlimited active listings',
        'Featured listing spots (5/month)',
        'Multi-user account access',
        'Custom branding options',
        'Advanced analytics & reports',
        'Dedicated account manager',
        'API access with higher limits'
      ],
      requirements: [
        'Company registration documents',
        'Tax ID documentation',
        'Authorized person credentials',
        'Company address verification'
      ]
    }
  };
  
  res.json(pricing);
};

// Submit verification application
exports.submitVerificationApplication = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestedTier, applicationData } = req.body;

    // Validate tier
    if (!['verified-user', 'verified-seller', 'realtor', 'corporate'].includes(requestedTier)) {
      return res.status(400).json({ message: 'Invalid verification tier' });
    }

    // Check if user already has pending or approved application
    const user = await User.findById(userId);
    
    if (user.verificationApplication?.status === 'pending') {
      return res.status(400).json({ message: 'You already have a pending application' });
    }
    
    if (user.accountType !== 'unverified-user' && user.verificationApplication?.status === 'approved') {
      return res.status(400).json({ message: 'Your account is already verified' });
    }

    // Calculate fee
    const fees = {
      'verified-user': 19.99,
      'verified-seller': 99,
      'realtor': 299,
      'corporate': 499
    };

    // Update user with application
    user.verificationApplication = {
      status: 'pending',
      requestedTier,
      submittedAt: new Date(),
      applicationData,
      paymentStatus: 'pending',
      paymentAmount: fees[requestedTier],
      documents: []
    };

    await user.save();

    res.json({ 
      message: 'Application submitted successfully',
      application: user.verificationApplication,
      nextStep: 'upload-documents'
    });
  } catch (error) {
    console.error('Error submitting verification application:', error);
    res.status(500).json({ message: 'Error submitting application', error: error.message });
  }
};

// Upload verification document
exports.uploadVerificationDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const { documentType, documentUrl } = req.body;

    const user = await User.findById(userId);
    
    if (!user.verificationApplication || user.verificationApplication.status !== 'pending') {
      return res.status(400).json({ message: 'No pending application found' });
    }

    // Add document to application
    user.verificationApplication.documents.push({
      type: documentType,
      url: documentUrl,
      uploadedAt: new Date()
    });

    await user.save();

    res.json({ 
      message: 'Document uploaded successfully',
      documents: user.verificationApplication.documents
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Error uploading document', error: error.message });
  }
};

// Process payment (mock for now - integrate with payment gateway)
exports.processVerificationPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentMethod, transactionId } = req.body;

    const user = await User.findById(userId);
    
    if (!user.verificationApplication || user.verificationApplication.status !== 'pending') {
      return res.status(400).json({ message: 'No pending application found' });
    }

    if (user.verificationApplication.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Payment already processed' });
    }

    // TODO: Integrate with actual payment gateway (Stripe, PayPal, etc.)
    // For now, we'll mark it as paid with the transaction ID
    
    user.verificationApplication.paymentStatus = 'paid';
    user.verificationApplication.paymentDate = new Date();
    user.verificationApplication.paymentTransactionId = transactionId || `MOCK-${Date.now()}`;

    await user.save();

    res.json({ 
      message: 'Payment processed successfully. Your application is under review.',
      application: user.verificationApplication
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ message: 'Error processing payment', error: error.message });
  }
};

// Get current user's application status
exports.getMyApplicationStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('accountType verificationApplication');

    res.json({
      currentTier: user.accountType,
      application: user.verificationApplication || { status: 'none' }
    });
  } catch (error) {
    console.error('Error fetching application status:', error);
    res.status(500).json({ message: 'Error fetching application status', error: error.message });
  }
};

// Admin: Get all pending applications
exports.getPendingApplications = async (req, res) => {
  try {
    const applications = await User.find({
      'verificationApplication.status': 'pending',
      'verificationApplication.paymentStatus': 'paid'
    }).select('name email accountType verificationApplication createdAt');

    res.json(applications);
  } catch (error) {
    console.error('Error fetching pending applications:', error);
    res.status(500).json({ message: 'Error fetching applications', error: error.message });
  }
};

// Admin: Approve verification application
exports.approveVerification = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.verificationApplication?.status !== 'pending') {
      return res.status(400).json({ message: 'No pending application to approve' });
    }

    if (user.verificationApplication.paymentStatus !== 'paid') {
      return res.status(400).json({ message: 'Payment not completed' });
    }

    // Update user tier and verification status
    user.accountType = user.verificationApplication.requestedTier;
    user.verified = true;
    user.verificationApplication.status = 'approved';
    user.verificationApplication.reviewedAt = new Date();
    user.verificationApplication.reviewedBy = adminId;

    // DO NOT change user.role - that's for admin/superadmin access control
    // accountType is separate and only for account verification tiers

    await user.save();

    res.json({ 
      message: 'Application approved successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        verified: user.verified
      }
    });
  } catch (error) {
    console.error('Error approving application:', error);
    res.status(500).json({ message: 'Error approving application', error: error.message });
  }
};

// Admin: Reject verification application
exports.rejectVerification = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.verificationApplication?.status !== 'pending') {
      return res.status(400).json({ message: 'No pending application to reject' });
    }

    user.verificationApplication.status = 'rejected';
    user.verificationApplication.reviewedAt = new Date();
    user.verificationApplication.reviewedBy = adminId;
    user.verificationApplication.rejectionReason = reason;

    await user.save();

    res.json({ 
      message: 'Application rejected',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({ message: 'Error rejecting application', error: error.message });
  }
};
