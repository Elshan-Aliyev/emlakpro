const Settings = require('../models/Settings');

// @desc    Get all settings
// @route   GET /api/settings
// @access  Public (only public settings) / Private (all settings)
exports.getSettings = async (req, res) => {
  try {
    const { category, key } = req.query;
    
    // Build filter
    const filter = {};
    if (category) filter.category = category;
    if (key) filter.key = key;
    
    // If not authenticated, only return public settings
    if (!req.user) {
      filter.isPublic = true;
    }
    
    const settings = await Settings.find(filter).sort({ category: 1, key: 1 });
    
    res.status(200).json({
      success: true,
      count: settings.length,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching settings',
      error: error.message 
    });
  }
};

// @desc    Get single setting by key
// @route   GET /api/settings/:key
// @access  Public (if public) / Private
exports.getSetting = async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });
    
    if (!setting) {
      return res.status(404).json({ 
        success: false, 
        message: 'Setting not found' 
      });
    }
    
    // Check if public or user is authenticated
    if (!setting.isPublic && !req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    res.status(200).json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching setting',
      error: error.message 
    });
  }
};

// @desc    Create or update setting
// @route   PATCH /api/settings/:key
// @access  Private (admin/superadmin only)
exports.updateSetting = async (req, res) => {
  try {
    const { value, label, description, category, valueType, isPublic, isEditable } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Value is required' 
      });
    }
    
    // Check if setting exists
    let setting = await Settings.findOne({ key: req.params.key });
    
    if (setting) {
      // Check if editable
      if (!setting.isEditable) {
        return res.status(403).json({ 
          success: false, 
          message: 'This setting is not editable' 
        });
      }
      
      // Update existing setting
      setting.value = value;
      if (label !== undefined) setting.label = label;
      if (description !== undefined) setting.description = description;
      if (category !== undefined) setting.category = category;
      if (valueType !== undefined) setting.valueType = valueType;
      if (isPublic !== undefined) setting.isPublic = isPublic;
      if (isEditable !== undefined) setting.isEditable = isEditable;
      setting.lastUpdatedBy = req.user._id;
      
      await setting.save();
    } else {
      // Create new setting
      setting = await Settings.create({
        key: req.params.key,
        value,
        label,
        description,
        category: category || 'general',
        valueType: valueType || 'string',
        isPublic: isPublic || false,
        isEditable: isEditable !== undefined ? isEditable : true,
        lastUpdatedBy: req.user._id
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Setting ${setting ? 'updated' : 'created'} successfully`,
      data: setting
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating setting',
      error: error.message 
    });
  }
};

// @desc    Delete setting
// @route   DELETE /api/settings/:key
// @access  Private (superadmin only)
exports.deleteSetting = async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });
    
    if (!setting) {
      return res.status(404).json({ 
        success: false, 
        message: 'Setting not found' 
      });
    }
    
    // Check if editable
    if (!setting.isEditable) {
      return res.status(403).json({ 
        success: false, 
        message: 'This setting cannot be deleted' 
      });
    }
    
    await setting.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Setting deleted successfully'
    });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting setting',
      error: error.message 
    });
  }
};

// @desc    Bulk update settings
// @route   POST /api/settings/bulk-update
// @access  Private (admin/superadmin only)
exports.bulkUpdateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings || !Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an array of settings to update' 
      });
    }
    
    const results = {
      updated: [],
      created: [],
      errors: []
    };
    
    for (const item of settings) {
      try {
        const { key, value, label, description, category } = item;
        
        if (!key || value === undefined) {
          results.errors.push({ key, error: 'Key and value are required' });
          continue;
        }
        
        let setting = await Settings.findOne({ key });
        
        if (setting) {
          if (!setting.isEditable) {
            results.errors.push({ key, error: 'Setting is not editable' });
            continue;
          }
          
          setting.value = value;
          if (label) setting.label = label;
          if (description) setting.description = description;
          if (category) setting.category = category;
          setting.lastUpdatedBy = req.user._id;
          
          await setting.save();
          results.updated.push(key);
        } else {
          setting = await Settings.create({
            key,
            value,
            label,
            description,
            category: category || 'general',
            lastUpdatedBy: req.user._id
          });
          results.created.push(key);
        }
      } catch (error) {
        results.errors.push({ key: item.key, error: error.message });
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Bulk update completed',
      data: results
    });
  } catch (error) {
    console.error('Bulk update settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during bulk update',
      error: error.message 
    });
  }
};

// @desc    Initialize default settings
// @route   POST /api/settings/initialize
// @access  Private (superadmin only)
exports.initializeSettings = async (req, res) => {
  try {
    const defaultSettings = [
      { key: 'defaultCurrency', value: '$', label: 'Default Currency', category: 'currency', valueType: 'string', isPublic: true },
      { key: 'siteName', value: 'Real Estate App', label: 'Site Name', category: 'general', valueType: 'string', isPublic: true },
      { key: 'maxImageSize', value: 5, label: 'Max Image Size (MB)', category: 'images', valueType: 'number', isPublic: false },
      { key: 'allowedImageFormats', value: ['jpg', 'jpeg', 'png', 'webp'], label: 'Allowed Image Formats', category: 'images', valueType: 'array', isPublic: false },
      { key: 'propertiesPerPage', value: 12, label: 'Properties Per Page', category: 'general', valueType: 'number', isPublic: true },
      { key: 'requireApproval', value: true, label: 'Require Admin Approval', category: 'general', valueType: 'boolean', isPublic: false },
      { key: 'heroBackgroundBuyResidential', value: '', label: 'Hero BG - Buy Residential', category: 'hero', valueType: 'string', isPublic: true },
      { key: 'heroBackgroundBuyCommercial', value: '', label: 'Hero BG - Buy Commercial', category: 'hero', valueType: 'string', isPublic: true },
      { key: 'heroBackgroundRentLongterm', value: '', label: 'Hero BG - Rent Long-term', category: 'hero', valueType: 'string', isPublic: true },
      { key: 'heroBackgroundRentShortterm', value: '', label: 'Hero BG - Rent Short-term', category: 'hero', valueType: 'string', isPublic: true }
    ];
    
    const created = [];
    const skipped = [];
    
    for (const settingData of defaultSettings) {
      const exists = await Settings.findOne({ key: settingData.key });
      
      if (!exists) {
        await Settings.create({
          ...settingData,
          lastUpdatedBy: req.user._id
        });
        created.push(settingData.key);
      } else {
        skipped.push(settingData.key);
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Default settings initialized',
      data: {
        created,
        skipped
      }
    });
  } catch (error) {
    console.error('Initialize settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error initializing settings',
      error: error.message 
    });
  }
};
