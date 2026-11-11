# 🍰 Bespoke Bakery Inquiry & Order Management Portal

A custom-built, full-stack web application designed to streamline custom cake inquiries, design uploads, and time-slot scheduling for bespoke bakeries. 

Unlike standard e-commerce platforms (like Shopify or WordPress plugins), this system provides tailormade control over complex ordering workflows—including dynamic date/time slot locking, strict business policy validation, and secure cloud media storage.

---

## 🚀 Key Features

* **Bespoke Inquiry Processing:** Tailored order forms capturing specific cake shapes, sizes, flavors, tier counts, and custom text/writing instructions.
* **Smart Time-Slot Management:** Built-in scheduling logic to prevent double-booking pickup slots and manage daily kitchen capacity.
* **Design File Uploads:** Integrated with Cloudinary for secure, permanent, and optimized cloud storage of customer inspiration photos.
* **Business Policy Enforcement:** Automated Terms & Conditions validation and strict handling of 3-day urgent order fees.
* **Financial Reporting Architecture:** Structured data models ready for administrative analytics and financial export.

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** TiDB Cloud (MySQL-compatible distributed SQL database)
* **Media Storage:** Cloudinary API
* **Hosting & Deployment:** Render
* **Version Control:** Git & GitHub

---

## 📁 Project Architecture

```text
├── public/              # Frontend assets (HTML, CSS, client-side JS)
├── routes/              # Express API route handlers
├── config/              # Database & cloud storage configurations
├── .env.example         # Template for required environment variables
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
Fill in your database credentials and Cloudinary API keys inside the `.env` file.

### 4. Run the application
```bash
npm start
```
The server will start running locally on your specified `PORT`.

---

## 📌 Future Roadmap
* Administrative financial reporting export (Excel / CSV generation).
* Calendar synchronization for automated pickup reminders.

---

## 👤 Author
* **Jeremy Santoso**