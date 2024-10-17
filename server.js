const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('./model/user');
const category = require('./model/category');
const product = require('./model/product')
const { send } = require('process');
const jwt = require('jsonwebtoken');
const Order = require('./model/order');
const Payment = require('./model/payment');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const Razorpay = require('razorpay');
require('dotenv').config();

const port = 5000;


const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'https://master--preeminent-empanada-733ca8.netlify.app/',
  credentials: true
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://master--preeminent-empanada-733ca8.netlify.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.header('Access-Control-Allow-Credentials', true);
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});




// MongoDB Atlas connection URI
const uri = process.env.MONGODB_URI;
mongoose.connect(uri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// JWT Token.

const secretKey = process.env.JWT_SECRET;

const razorpay = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET
})



app.get('/hello', (req, res) => {
  console.log('hii');
})

// Registration
app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    // Create new user without saving yet to calculate the verification expiration
    const newUser = new User({
      email,
      password: hashedPassword,
      verificationCode,
      verified: false
    });

    await newUser.save();

    // Now that createdAt is set in the schema, you can calculate expiration 5 minutes after
    newUser.verificationCodeExpires = new Date(newUser.createdAt.getTime() + 5 * 60 * 1000); // 5 minutes after createdAt


    // Save the new user
    await newUser.save();

    // Create a transporter using SMTP
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Set up email data
    let mailOptions = {
      from: '"Raw Chicken" <noreply@yourapp.com>',
      to: email,
      subject: "Email Verification",
      text: `Your verification code is: ${verificationCode}. This code will expire in 5 minutes.`,
      html: `<p>Your verification code is: <strong>${verificationCode}</strong></p>
                   <p>This code will expire in 5 minutes.</p>`
    };

    // Send the email
    let info = await transporter.sendMail(mailOptions);

    console.log("Verification email sent: %s", info.messageId);

    res.status(201).send('Registration initiated. Please check your email for the verification code.');
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return res.status(400).send('Email already exists. Please try with a different email address.');
    }

    console.error("Registration error:", error);
    res.status(500).send('Error initiating registration');
  }
});

// Verify email
app.post('/verify', async (req, res) => {
  try {
    const { verificationCode } = req.body;

    const user = await User.findOne({
      verificationCode,
      verificationCodeExpires: { $gt: Date.now() }  // Check if code has not expired
    });

    if (!user) {
      return res.status(400).send('Invalid or expired verification code');
    }

    user.verified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    res.send('Email verified successfully. You can now log in.');
  } catch (error) {
    console.error("Verification error:", error);
    res.status(400).send('Error during verification');
  }
});

// Login user

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || !user.verified) {
      return res.status(401).send('Invalid email or user not verified');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send("Invalid email or password");
    }

    const userdata = {
      userId: user._id,
      email: user.email,
      role: user.role,
      verified: user.verified
    }

    const token = jwt.sign(userdata, secretKey, { expiresIn: '1h' });

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 //
    });

    res.json({ message: 'Logged in successfully', userdata });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Error logging in');
  }
});

app.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.user = user;
    next();
  });
};

// Example of a protected route
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});


app.get('/categories', async (req, res) => {
  try {
    const categories = await category.find();
    res.json(categories)
  }
  catch (error) {
    res.status(500).send('error during getting category data');

  }
})

app.post('/productitem', async (req, res) => {
  try {
    const { categoryId, productId } = req.body;
    console.log("Received categoryId:", categoryId);
    console.log("Received productId:", productId);

    let query = {};

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (productId) {
      query._id = productId;
    }

    console.log("Query:", query);

    const items = await product.find(query);

    if (items.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    res.json(items);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/cartGet', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const cart = await Order.findOne({ userId, orderStatus: 'inCart' });

    if (!cart) {
      return res.status(200).json({ message: "Cart is empty", items: [], totalQuantity: 0 });
    }

    const items = cart.orderDetailsMap || new Map();

    // Convert Map to an array of its values
    const totalQuantity = Array.from(items.values()).reduce((sum, item) => sum + (item.quantity || 0), 0);

    return res.status(200).json({
      message: "Cart items fetched successfully",
      items: Object.fromEntries(items), // Convert Map back to object if needed in response
      totalQuantity: totalQuantity // Add total quantity to the response
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return res.status(500).json({ message: "Error fetching cart", error: error.message });
  }
});


function generateOrderId(userId) {
  const timestamp = Date.now().toString(36);
  const randomStr = crypto.randomBytes(4).toString('hex');
  const userIdHash = crypto.createHash('md5').update(userId).digest('hex').slice(0, 4);

  return `${timestamp}-${userIdHash}-${randomStr}`.toUpperCase();
}

// Add item to cart or update existing cart
app.post('/add-to-cart', async (req, res) => {
  try {
    const { userId, productId, name, price, quantity } = req.body;

    let order = await Order.findOne({ userId, orderStatus: 'inCart' });


    if (!order) {
      order = new Order({
        userId,
        orderId: generateOrderId(userId),
        orderDetailsMap: new Map(),
        orderStatus: 'inCart'
      });
    }

    order.orderDetailsMap.set(productId, { productId, name, price, quantity });
    await order.save();

    res.status(200).json({ message: 'Item added to cart', order });
  } catch (error) {
    res.status(500).json({ message: 'Error adding item to cart', error: error.message });
  }

});

app.post('/update-cart-item', async (req, res) => {
  const { userId, productId, quantity } = req.body;

  try {
    let order = await Order.findOne({ userId, orderStatus: 'inCart' });

    if (!order) {
      return res.status(404).json({ error: 'Cart not found for this user' });
    }

    let productDetails = order.orderDetailsMap.get(productId);

    if (!productDetails) {
      // If the product doesn't exist in the cart, initialize it
      productDetails = { productId, quantity: 0, price: 0 }; // You may need to fetch the price from your product database
    }

    if (quantity > 0) {
      // Increment
      productDetails.quantity++;
    } else if (quantity === 0) {
      // Decrement
      productDetails.quantity = Math.max(0, productDetails.quantity - 1);
    } else {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    if (productDetails.quantity === 0) {
      order.orderDetailsMap.delete(productId);
    } else {
      order.orderDetailsMap.set(productId, productDetails);
    }

    // Use markModified to ensure Mongoose knows the map has been updated
    order.markModified('orderDetailsMap');

    await order.save();

    res.status(200).json({ message: 'Cart updated successfully', order });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ error: 'Server error updating cart item' });
  }
});

//  Remove item from cart

app.post('/remove-from-cart', async (req, res) => {
  try {
    const { userId, productId } = req.body;

    const order = await Order.findOne({ userId, orderStatus: 'inCart' });

    if (!order) {
      return res.status(404).json({ message: 'No active cart found' });
    }

    order.orderDetailsMap.delete(productId);
    await order.save();

    res.status(200).json({ message: 'Item removed from cart', order });
  } catch (error) {
    res.status(500).json({ message: 'Error removing item from cart', error: error.message });
  }
});

//   place order

app.post('/place-order', async (req, res) => {
  try {
    const { userId } = req.body;

    const order = await Order.findOne({ userId, orderStatus: 'inCart' });

    if (!order) {
      return res.status(404).json({ message: 'No active cart found' });
    }

    order.orderStatus = 'placed';
    await order.save();

    setTimeout(async () => {
      try {
        await Order.findByIdAndUpdate(order._id, { $set: { orderDetailsMap: new Map() } });
      } catch (error) {
        console.error('Error removing items from cart:', error);
      }
    }, Math.floor(Math.random() * (2 - 2 + 1) + 1) * 60 * 1000);

    res.status(200).json({ message: 'Order placed successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Error placing order', error: error.message });
  }
});

app.post('/create-order', async (req, res) => {
  try {
    const options = {
      amount: req.body.amount,
      currency: "INR",
      receipt: "receipt_" + Math.random().toString(36).substring(7)
    };
    const order = await razorpay.orders.create(options);

    const payment = new Payment({
      orderId: order.id,
      amount: order.amount / 100,
      currency: order.currency,
      status: 'created'
    });
    await payment.save();

    res.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});



app.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;
    console.log('Received order ID:', razorpay_order_id);
    console.log('Received payment ID:', razorpay_payment_id);
    console.log('Received user ID:', userId);

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Update payment status
      const updatedPayment = await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        {
          paymentId: razorpay_payment_id,
          status: 'successful'
        },
        { new: true }
      );

      if (!updatedPayment) {
        console.log('Payment document not found for orderId:', razorpay_order_id);
        return res.status(404).json({ success: false, message: 'Payment document not found' });
      }

      console.log('Payment updated successfully:', updatedPayment);

      // Find the order by userId and 'inCart' status
      const orderDocument = await Order.findOne({ userId: userId, orderStatus: 'inCart' });
      console.log('Fetched order document:', orderDocument);

      if (!orderDocument) {
        console.log('Order document not found for userId:', userId);
        return res.status(404).json({ success: false, message: 'Order document not found' });
      }

      // Update the order with Razorpay orderId and change status to 'paid'
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderDocument._id },
        {
          orderId: razorpay_order_id,
          orderStatus: 'paid'
        },
        { new: true }
      );

      console.log('Order status updated successfully:', updatedOrder);

      res.json({ success: true, message: 'Payment verified and order status updated successfully' });
    } else {
      const failedPayment = await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { status: 'failed' },
        { new: true }
      );

      console.log('Payment verification failed:', failedPayment);

      res.json({ success: false, message: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment', details: error.message });
  }
});

app.post('/addAddress', async (req, res) => {
  try {
    const { userId, type, address, flatNo, landmark, city, mobileNumber, coordinates } = req.body;

    const order = await Order.findOne({ userId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newAddress = {
      type,
      address,
      flatNo,
      landmark,
      city,
      mobileNumber,
      coordinates
    };

    const addressKey = `address_${Date.now()}`;

      // Initialize addresses as an empty object if it doesn't exist
      if (!order.addresses) {
        order.addresses = new Map();
      }
      order.addresses.set(addressKey, newAddress);
  
      // Mark the addresses field as modified
      order.markModified('addresses');
      console.log(order);

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Address added successfully',
      addressId: addressKey

    })
  }
  catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }



});

app.post('/getaddress', async (req,res)=>{
  try {
    const { userId} = req.body;

    const order = await Order.findOne({ userId});

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const addresses = order.addresses ? Object.fromEntries(order.addresses) : {};

    res.status(200).json({ success: true, addresses });

  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }

})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

