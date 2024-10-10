const mongoose = require('mongoose')


const AddressSchema = new mongoose.Schema({
  type: { type: String, required: true },
  address: { type: String, required: true },
  flatNo: { type: String },
  landmark: { type: String },
  city: { type: String, required: true }, 
  mobileNumber: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  }
});


const OrderSchema = new mongoose.Schema({
    userId: { type: String, ref: 'user', required: true },
    orderId: { 
      type: String, 
      required: true,
      unique: true,
      sparse: true
    },
    addresses: {
      type: Map,
      of: AddressSchema,
      default: new Map()

    },
    orderDetailsMap: {
      type: Map,
      of: new mongoose.Schema({
        productId: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        
      }),
      required: true
    },
    orderStatus: { type: String, required: true }
  }, { collection: 'order' });

  const Order = mongoose.model('Order', OrderSchema);

  module.exports = Order;
