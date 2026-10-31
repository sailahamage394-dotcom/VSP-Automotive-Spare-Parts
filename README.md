# VSP Automotive Spare Parts

A student e-commerce demo project with a responsive storefront, customer registration/login, shopping cart, checkout, persistent order storage, order history, order status tracking, and an admin panel.

## Run on Windows
1. Install Node.js LTS (18 or newer).
2. Extract this ZIP.
3. Open the extracted `VSP-Complete-Project` folder.
4. Click the folder address bar, type `cmd`, and press Enter.
5. Run `npm install`.
6. Run `npm start`.
7. Open http://localhost:3000 in Chrome.

## Admin demo login
- Email: `admin@vsp.com`
- Password: `Admin@123`

Change the admin password for any public deployment by setting the `ADMIN_PASSWORD` environment variable before the first run. The default demo account is for evaluation only.

## Included features
- Product catalogue, search and category filters
- Customer registration and login
- Shopping cart with quantity and total
- Checkout with customer delivery details
- Orders saved to `data/db.json`
- Customer order history and status tracking
- Admin dashboard, product add/delete, order status updates
- Responsive layout for mobile and desktop

## Important limitations
This is a learning/demo project, not a production commerce platform. It does not include online payment processing, real courier integration, email/SMS OTP, password reset, hardened production session storage, rate limiting, or production-grade database infrastructure. Authentication sessions are held in memory and reset when the server restarts. JSON data storage is suitable for a small local demo; use a managed database and secure session store before real public use.

## Render deployment
Build command: `npm install`
Start command: `npm start`

For persistent orders/users on Render, attach a persistent disk and configure a durable storage path before deployment; otherwise local JSON data can be lost on redeploy/restart depending on the hosting setup.
