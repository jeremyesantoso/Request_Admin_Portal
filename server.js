const express = require('express');
const cors = require('cors');
require('dotenv').config();
const cron = require('node-cron');
const db = require('./config/db');
const orderRoutes = require('./routes/orderRoutes');
const adminAuth = require('./middleware/adminAuth');
const { sendReminderEmail, sendCancelledEmail } = require('./utils/mailer'); 

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware (Added 10mb limit for mobile camera photos)
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Protect admin.html before static files are served
app.get('/admin.html', adminAuth, (req, res, next) => {
    next();
});

// Serve static files from public folder
app.use(express.static('public'));

// API Routes
app.use('/api', orderRoutes);

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        res.json({ message: 'Database connected successfully!', testResult: rows[0].result });
    } catch (err) {
        console.error('Database connection error:', err);
        res.status(500).json({ error: 'Database connection failed', details: err.message });
    }
});

// Runs every day at 12:00 AM (Midnight)
cron.schedule('0 0 * * *', async () => {//Testing to run alltime
    try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Send Pickup Reminders for orders due today with 'Deposit Paid' status
        const [ordersDueToday] = await db.query(
            `SELECT o.ID AS order_id, o.CUSTOMER_NAME, o.CUSTOMER_EMAIL, o.PICKUP_TIME 
             FROM ORDERS o 
             WHERE o.PICKUP_DATE = ? AND o.STATUS = 'Deposit Paid'`,
            [today]
        );

        for (const order of ordersDueToday) {
            await sendReminderEmail(order);
            console.log(`Automated pickup reminder sent for Order #${order.order_id}`);
        }

        // 2. Automatically Expire/Cancel 'Quote Sent' orders that are older than 24 hours
        const [expiredQuotes] = await db.query(
            `SELECT o.ID AS order_id, o.CUSTOMER_NAME, o.CUSTOMER_EMAIL, o.PICKUP_DATE, o.PICKUP_TIME 
             FROM ORDERS o 
             WHERE o.STATUS = 'Quote Sent' AND o.CREATED_AT <= NOW() - INTERVAL 24 HOUR`
        );

        for (const order of expiredQuotes) {
            // Update status to Cancelled in the database
            await db.query(`UPDATE ORDERS SET STATUS = 'Cancelled' WHERE ID = ?`, [order.order_id]);
            
            // Dispatch the cancellation/expired notice email with reset options
            await sendCancelledEmail(order);
            console.log(`Expired quote automatically cancelled and notified for Order #${order.order_id}`);
        }

    } catch (error) {
        console.error('Error running midnight background cron tasks:', error);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});