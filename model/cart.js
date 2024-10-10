const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: { type: String , ref: 'User', required: true },
  items: [
    {
      productId: { type: String, ref: 'Product', required: true },
      name: { type: String, required: true }, 
      price: { type: Number, required: true },
      quantity: { type: Number, default: 1 },
      weight: { type: String },
    }
  ],
  total: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }, 
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'cart' });

cartSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
