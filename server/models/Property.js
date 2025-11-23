const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['ev', 'torpaq', 'obyekt', 'biznes'], required: true },
  price: { type: Number, required: true },
  location: { type: String, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  images: [{ type: String }]
}, { timestamps: true });

const Property = mongoose.model('Property', propertySchema);
module.exports = Property;
