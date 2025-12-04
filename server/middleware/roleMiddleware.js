// Role-based access control middleware

const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        requiredRole: allowedRoles,
        currentRole: req.user.role
      });
    }

    next();
  };
};

const isAdmin = (req, res, next) => {
  return checkRole('admin', 'superadmin')(req, res, next);
};

const isSuperAdmin = (req, res, next) => {
  return checkRole('superadmin')(req, res, next);
};

const isRealtorOrAdmin = (req, res, next) => {
  return checkRole('realtor', 'corporate', 'admin', 'superadmin')(req, res, next);
};

const isVerifiedRealtor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!['realtor', 'corporate', 'admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Realtor access required' });
  }

  if (!['admin', 'superadmin'].includes(req.user.role) && !req.user.verified) {
    return res.status(403).json({ message: 'Account verification required' });
  }

  next();
};

const canCreateListing = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Guest cannot create listings
  if (req.user.role === 'guest') {
    return res.status(403).json({ message: 'Please register to create listings' });
  }

  // Check subscription limits for basic users
  if (req.user.role === 'user' && req.user.subscriptionTier === 'free') {
    // Allow only 1 free listing for basic users (you can adjust this)
    if (req.user.totalListings >= 1) {
      return res.status(403).json({ 
        message: 'Free listing limit reached. Upgrade to post more listings.' 
      });
    }
  }

  next();
};

const canContactOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ 
      message: 'Please login or register to contact property owners' 
    });
  }

  if (req.user.role === 'guest') {
    return res.status(403).json({ 
      message: 'Please register to contact property owners' 
    });
  }

  next();
};

const canSaveFavorites = (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ 
      message: 'Please login or register to save favorites' 
    });
  }

  if (req.user.role === 'guest') {
    return res.status(403).json({ 
      message: 'Please register to save favorite listings' 
    });
  }

  next();
};

module.exports = {
  checkRole,
  isAdmin,
  isSuperAdmin,
  isRealtorOrAdmin,
  isVerifiedRealtor,
  canCreateListing,
  canContactOwner,
  canSaveFavorites
};
