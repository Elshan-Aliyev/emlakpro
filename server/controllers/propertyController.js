const Property = require('../models/Property');

// Create a property
exports.createProperty = async (req, res) => {
  try {
    const property = new Property({ ...req.body, ownerId: req.user.id });
    await property.save();
    res.status(201).json(property);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all properties
exports.getProperties = async (req, res) => {
  try {
    const properties = await Property.find().populate('ownerId', 'name email');
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single property
exports.getProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate('ownerId', 'name email');
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json(property);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Update property
exports.updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (property.ownerId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const updatedProperty = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedProperty);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete property
exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (property.ownerId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await property.deleteOne();
    res.json({ message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
