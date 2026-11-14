# 🍰 Bespoke Bakery Inquiry & Order Management Portal

A custom-built, full-stack web application designed to streamline custom cake inquiries, design uploads, and time-slot scheduling for bespoke bakeries. 

Unlike standard e-commerce platforms (like Shopify or WordPress plugins), this system provides tailormade control over complex ordering workflows—including dynamic date/time slot locking, strict business policy validation, secure cloud media storage, and automated transactional email quotes.

---

## 🚀 Key Features

* **Bespoke Inquiry Processing:** Tailored order forms capturing specific cake shapes, sizes, flavors, tier counts, add-ons, candles, and custom text/writing instructions.
* **Smart Time-Slot Management:** Built-in scheduling logic to prevent double-booking pickup slots and enforce daily kitchen capacity limits (maximum 4 orders per day).
* **Design File Uploads:** Integrated with Cloudinary for secure, permanent, and optimized cloud storage of customer inspiration photos (up to 3 files).
* **Automated Transactional Quotes:** Integrated with Brevo's HTTP API to automatically dispatch beautifully styled quote emails and e-transfer instructions when an order status is updated to "Quote Sent".
* **Admin UI Safeguards:** Built-in duplicate-click protection with loading states (`Saving...`) to prevent double-submission race conditions during order updates.
* **Business Policy Enforcement:** Automated Terms & Conditions validation and strict handling of order requirements.

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** TiDB Cloud (MySQL-compatible distributed SQL database)
* **Media Storage:** Cloudinary API
* **Email Service:** Brevo HTTP API
* **Hosting & Deployment:** Render
* **Version Control:** Git & GitHub

---

## 📁 Project Architecture

```text
Request_Admin_Portal/
├── config/              # Database connection configuration (db.js)
├── middleware/          # Authentication middleware (adminAuth.js)
├── public/              # Frontend assets (admin.html, admin.js, index.html, script.js, CSS)
├── routes/              # Express API route handlers (orderRoutes.js)
├── templates/           # Isolated HTML email templates (quoteEmail.html)
├── utils/               # Utility scripts (mailer.js for Brevo integration)
├── .env.example         # Template for required environment variables
├── db_schema.sql        # Database schema definition script
├── package.json         # Node.js dependencies and scripts
└── server.js            # Application entry point
```

---

## ⚙️ Getting Started & Installation

To run this project locally for development or testing:

### 1. Clone the repository
```bash
git clone https://github.com/jeremyesantoso/Request_Admin_Portal.git
cd Request_Admin_Portal
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory by copying the provided example template:
```bash
cp .env.example .env
```
Fill in your TiDB database credentials, Cloudinary API keys, Brevo API key, sender email/name, admin login credentials, and Interac e-transfer email inside the `.env` file.

### 4. Run the application
```bash
npm start
```
The server will start running locally on your specified `PORT` (default: `5000`).

---

## 📌 Future Roadmap
* Administrative financial reporting export (Excel / CSV generation).
* Calendar synchronization for automated pickup reminders.

---

## 👤 Author
* **Jeremy Santoso**