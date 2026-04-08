# 🌸 Vasantra — Women's Saree E-Commerce Website

A complete, production-ready e-commerce website for Indian women's sarees with Razorpay payment gateway integration.

## ✨ Features

- **Beautiful Homepage** — Hero carousel, categories, featured products, testimonials
- **Full Product Catalog** — 12+ sarees with filters (category, price, fabric)
- **Product Detail Pages** — Image gallery, color selection, size picker, accordion specs
- **Shopping Cart** — Slide-out drawer with quantity control
- **Checkout** — Full address form + Razorpay + Cash on Delivery
- **Payment Gateway** — Razorpay (UPI, Cards, Net Banking, Wallets)
- **Order Confirmation** — Beautiful success page with order tracking steps
- **Auth Modal** — Sign in / Register UI
- **Wishlist** — Save favourite products
- **Responsive** — Works on mobile, tablet, desktop
- **Toast Notifications** — Add to cart, wishlist, payment confirmations

---

## 🚀 Quick Start

### 1. Open the Website (No Backend)
Simply open `index.html` in your browser. Everything works as a frontend-only demo.

### 2. Full Stack Setup (With Backend)

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Add your Razorpay keys to .env
nano .env

# Start the server
npm start
# → http://localhost:3000
```

---

## 🔑 Razorpay Setup

1. Sign up at [razorpay.com](https://razorpay.com)
2. Go to **Settings → API Keys**
3. Generate **Test Keys** first (for testing)
4. Copy `Key ID` and `Key Secret` to `.env`
5. Also update the key in `index.html` at line:
   ```js
   key: 'rzp_test_YOUR_KEY_HERE',
   ```

### Test Cards (Razorpay Test Mode)
| Card Number | Type |
|---|---|
| 4111 1111 1111 1111 | Visa (Success) |
| 5267 3181 8797 5449 | Mastercard (Success) |
| 4000 0000 0000 0002 | Any (Failure) |

**UPI Test:** `success@razorpay`

---

## 🛒 Connect Frontend to Backend

In `index.html`, update the checkout handler to call your API:

```js
// In handleRazorpayPayment():
const res = await fetch('/api/create-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: total, receipt: 'vasantra_' + Date.now() })
});
const { orderId, key } = await res.json();

// Then in Razorpay options:
key: key,
order_id: orderId,

// In handler:
await fetch('/api/verify-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(response)
});
```

---

## 📁 File Structure

```
vasantra/
├── index.html        ← Complete frontend SPA (React CDN)
├── server.js         ← Express backend + Razorpay APIs
├── package.json      ← NPM dependencies
├── .env.example      ← Environment variables template
└── README.md         ← This file
```

---

## 🎨 Brand Customization

### Change Brand Name
Search and replace `Vasantra` in `index.html` with your brand name.

### Colors (in `index.html` `<style>`)
```css
:root {
  --maroon: #7B1818;     /* Primary brand color */
  --gold: #C4922A;       /* Accent color */
  --gold-light: #E8B84B; /* Light accent */
  --cream: #FDF8F2;      /* Background */
  --dark: #1A0800;       /* Dark color */
}
```

### Add Your Products
Edit the `PRODUCTS` array in `index.html` to add your real products:
```js
{
  id: 13,
  name: 'Your Saree Name',
  category: 'banarasi', // banarasi, kanjivaram, designer, bridal, cotton
  fabric: 'Pure Silk',
  price: 15000,
  original: 20000,
  colors: ['#8B1A1A', '#C4922A'],
  sizes: ['5m', '5.5m', '6m'],
  rating: 4.8,
  reviews: 50,
  badge: 'new', // new, hot, sale, or null
  images: ['/your-image-1.jpg', '/your-image-2.jpg'],
  description: 'Product description here...',
}
```

### Add Real Product Images
Replace the Unsplash URLs in the `images` array with your actual product photographs.

---

## 🚢 Deployment

### Vercel (Recommended for static)
```bash
npx vercel --prod
```

### Railway / Render (Full Stack)
1. Push to GitHub
2. Connect to Railway or Render
3. Add environment variables
4. Deploy!

### Traditional VPS (DigitalOcean / AWS)
```bash
npm install pm2 -g
pm2 start server.js --name vasantra
pm2 startup
pm2 save
```

---

## 📞 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/create-order` | Create Razorpay order |
| POST | `/api/verify-payment` | Verify payment signature |
| POST | `/api/place-order` | Place COD order |
| GET | `/api/orders/:id` | Get order details |
| POST | `/api/razorpay-webhook` | Razorpay webhooks |

---

## ⚡ Tech Stack

- **Frontend:** React 18 (CDN), Pure CSS, Google Fonts
- **Backend:** Node.js, Express 4
- **Payment:** Razorpay
- **No build step required** — Just open and run!

---

Built with ♥ for Indian fashion e-commerce
