/**
 * Vasantra E-Commerce Backend
 * Node.js + Express + Razorpay Payment Gateway
 * 
 * Setup:
 *   npm install
 *   node server.js
 */

require('dotenv').config();
const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));

// Serve the frontend
app.use(express.static(path.join(__dirname)));

/* ─── Razorpay Instance ─── */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_HERE',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'YOUR_SECRET_HERE',
});

/* ─── In-Memory Order Store (use MongoDB/PostgreSQL in production) ─── */
const orders = new Map();

/* ─── ROUTES ─── */

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all products
app.get('/api/products', (req, res) => {
  const { category, minPrice, maxPrice, sort } = req.query;

  let products = PRODUCTS_DATA;

  if (category && category !== 'all') {
    products = products.filter(p => p.category === category);
  }
  if (minPrice) products = products.filter(p => p.price >= Number(minPrice));
  if (maxPrice) products = products.filter(p => p.price <= Number(maxPrice));

  if (sort === 'price-asc') products.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') products.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') products.sort((a, b) => b.rating - a.rating);
  else if (sort === 'newest') products.sort((a, b) => b.id - a.id);

  res.json({ products, total: products.length });
});

// Get single product
app.get('/api/products/:id', (req, res) => {
  const product = PRODUCTS_DATA.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// Create Razorpay Order
app.post('/api/create-order', async (req, res) => {
  const { amount, currency = 'INR', receipt, notes } = req.body;

  if (!amount || amount < 100) {
    return res.status(400).json({ error: 'Invalid amount. Minimum ₹1.' });
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: receipt || `vasantra_${Date.now()}`,
      notes: {
        brand: 'Vasantra',
        ...notes,
      },
    });

    // Store order
    orders.set(order.id, {
      ...order,
      status: 'created',
      createdAt: new Date(),
    });

    console.log(`✅ Order created: ${order.id} — ₹${amount}`);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_HERE',
    });
  } catch (err) {
    console.error('❌ Razorpay order error:', err);
    res.status(500).json({ error: 'Failed to create payment order', details: err.message });
  }
});

// Verify Payment (called after successful Razorpay payment)
app.post('/api/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment verification fields' });
  }

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'YOUR_SECRET_HERE')
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    console.error('❌ Payment signature mismatch!');
    return res.status(400).json({ success: false, error: 'Invalid payment signature' });
  }

  // Update order status
  if (orders.has(razorpay_order_id)) {
    orders.get(razorpay_order_id).status = 'paid';
    orders.get(razorpay_order_id).paymentId = razorpay_payment_id;
  }

  console.log(`✅ Payment verified: ${razorpay_payment_id}`);

  res.json({
    success: true,
    message: 'Payment verified successfully',
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
  });
});

// Place Order (COD)
app.post('/api/place-order', (req, res) => {
  const { customer, items, total, paymentMethod } = req.body;

  if (!customer || !items || !total) {
    return res.status(400).json({ error: 'Missing required order fields' });
  }

  const orderId = 'VAS' + Date.now().toString(36).toUpperCase();
  const order = {
    orderId,
    customer,
    items,
    total,
    paymentMethod: paymentMethod || 'COD',
    status: 'confirmed',
    createdAt: new Date(),
    estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  orders.set(orderId, order);
  console.log(`✅ Order placed: ${orderId} — ₹${total} (${paymentMethod})`);

  res.json({
    success: true,
    orderId,
    message: 'Order placed successfully',
    estimatedDelivery: order.estimatedDelivery,
  });
});

// Get Order Status
app.get('/api/orders/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// Razorpay Webhook (for production)
app.post('/api/razorpay-webhook', (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const body = JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const { event, payload } = req.body;
  console.log(`📨 Webhook event: ${event}`);

  switch (event) {
    case 'payment.captured':
      const payment = payload.payment.entity;
      if (orders.has(payment.order_id)) {
        orders.get(payment.order_id).status = 'paid';
      }
      break;
    case 'payment.failed':
      const failedPayment = payload.payment.entity;
      if (orders.has(failedPayment.order_id)) {
        orders.get(failedPayment.order_id).status = 'failed';
      }
      break;
  }

  res.json({ received: true });
});

/* ─── Product Data ─── */
const PRODUCTS_DATA = [
  { id: 1, name: 'Scarlet Brocade Banarasi Silk', category: 'banarasi', fabric: 'Pure Banarasi Silk', price: 18500, original: 24000, rating: 4.9, reviews: 128, badge: 'hot' },
  { id: 2, name: 'Royal Purple Kanjivaram', category: 'kanjivaram', fabric: 'Pure Kanjivaram Silk', price: 22000, original: 28000, rating: 4.8, reviews: 95, badge: 'new' },
  { id: 3, name: 'Midnight Blue Georgette Designer', category: 'designer', fabric: 'Premium Georgette', price: 12500, original: 16000, rating: 4.7, reviews: 67, badge: 'sale' },
  { id: 4, name: 'Crimson Bridal Lehenga Saree', category: 'bridal', fabric: 'Heavy Silk Organza', price: 45000, original: 58000, rating: 5.0, reviews: 42, badge: 'hot' },
  { id: 5, name: 'Emerald Tussar Silk', category: 'designer', fabric: 'Pure Tussar Silk', price: 8900, original: 11000, rating: 4.6, reviews: 84 },
  { id: 6, name: 'Golden Yellow Paithani', category: 'designer', fabric: 'Paithani Silk', price: 32000, original: 40000, rating: 4.9, reviews: 56, badge: 'new' },
  { id: 7, name: 'Pastel Pink Chiffon Saree', category: 'designer', fabric: 'Pure Chiffon', price: 6500, original: 8000, rating: 4.5, reviews: 113 },
  { id: 8, name: 'Indigo Chanderi Cotton', category: 'cotton', fabric: 'Chanderi Cotton-Silk', price: 4200, original: 5500, rating: 4.7, reviews: 201, badge: 'sale' },
  { id: 9, name: 'Deep Wine Velvet Saree', category: 'bridal', fabric: 'Pure Velvet', price: 28000, original: 35000, rating: 4.8, reviews: 38, badge: 'new' },
  { id: 10, name: 'Ivory Handloom Linen', category: 'cotton', fabric: 'Pure Linen', price: 3800, original: 4800, rating: 4.6, reviews: 156 },
];

/* ─── START SERVER ─── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║     🌸 Vasantra Server Running       ║
  ║     http://localhost:${PORT}           ║
  ╚══════════════════════════════════════╝

  📡 API Endpoints:
     GET  /api/products          — List products
     GET  /api/products/:id      — Single product
     POST /api/create-order      — Create Razorpay order
     POST /api/verify-payment    — Verify payment
     POST /api/place-order       — Place COD order
     GET  /api/orders/:id        — Get order status
     POST /api/razorpay-webhook  — Razorpay webhooks

  🔑 Razorpay Key: ${process.env.RAZORPAY_KEY_ID || '⚠️  Not set — add to .env'}
  `);
});

module.exports = app;
