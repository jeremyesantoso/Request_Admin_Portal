const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../config/db');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary with credentials from .env
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer to stream uploads directly to Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'cakekue-inquiries',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    }
});

const upload = multer({ storage: storage });

// POST /api/orders - Submit a new cake inquiry
router.post('/orders', upload.array('inspo_photos', 5), async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const {
            customer_name,
            customer_email,
            customer_mobile,
            pickup_date,
            pickup_time,
            cake_shape,
            cake_size,
            cake_flavour,
            candle_option,
            diet_notes,
            design_message_notes,
            payment_method,
            addons 
        } = req.body;

        // Make daily capacity limit of 4 orders a day
        const [dailyOrders] = await connection.query(
            `SELECT COUNT(*) AS total FROM ORDERS WHERE PICKUP_DATE = ? AND STATUS != 'Cancelled'`,
            [pickup_date]
        );

        if (dailyOrders[0].total >= 4) {
            await connection.rollback();
            return res.status(400).json({ error: 'This date is fully booked. Please choose another day.' });
        }

        // Check if pickup date and time slot is already booked
        const [existingSlot] = await connection.query(
            `SELECT ID FROM ORDERS WHERE PICKUP_DATE = ? AND PICKUP_TIME = ? AND STATUS != 'Cancelled'`,
            [pickup_date, pickup_time]
        );

        if (existingSlot.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'This pickup date and time slot is already booked. Please choose another time.' });
        }

        // Format checkboxes into a clean comma-separated string (or 'None' if none selected)
        const formattedAddons = Array.isArray(addons) 
            ? addons.join(', ') 
            : (addons || 'None');

        // Insert into ORDERS table 
        const [orderResult] = await connection.query(
            `INSERT INTO ORDERS (CUSTOMER_NAME, CUSTOMER_EMAIL, CUSTOMER_MOBILE, PICKUP_DATE, PICKUP_TIME, PAYMENT_METHOD) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [customer_name, customer_email, customer_mobile, pickup_date, pickup_time, payment_method || 'E-Transfer']
        );

        const orderId = orderResult.insertId;

        // Insert into CAKE_SPECS (including formattedAddons)
        await connection.query(
            `INSERT INTO CAKE_SPECS (ORDER_ID, CAKE_SHAPE, CAKE_SIZE, CAKE_FLAVOUR, CANDLE_OPTION, DIET_NOTES, DESIGN_MESSAGE_NOTES, ADDONS) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderId, cake_shape, cake_size, cake_flavour, candle_option || 'None', diet_notes || 'None', design_message_notes || '', formattedAddons]
        );

        // Insert Cloudinary secure URLs into INSPO_PICS table if photos were uploaded
        if (req.files && req.files.length > 0) {
            const photoValues = req.files.map(file => [
                orderId, 
                file.path 
            ]);

            await connection.query(
                `INSERT INTO INSPO_PICS (ORDER_ID, PHOTO_URL) VALUES ?`,
                [photoValues]
            );
        }

        await connection.commit();
        res.status(201).json({ 
            message: 'Order inquiry submitted successfully!', 
            orderId: orderId 
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error submitting order inquiry:', error);
        res.status(500).json({ error: 'Failed to process order inquiry', details: error.message });
    } finally {
        connection.release();
    }
});

// GET /api/booked-slots - Fetch taken times for a specific date
router.get('/booked-slots', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ error: 'Date query parameter is required' });
        }

        // Check if the whole day has reached the limit
        const [dailyCountResult] = await db.query(
            `SELECT COUNT(*) AS total FROM ORDERS WHERE PICKUP_DATE = ? AND STATUS != 'Cancelled'`,
            [date]
        );

        const isDayFullyBooked = dailyCountResult[0].total >= 4;

        const [booked] = await db.query(
            `SELECT PICKUP_TIME FROM ORDERS WHERE PICKUP_DATE = ? AND STATUS != 'Cancelled'`,
            [date]
        );

        const bookedTimes = booked.map(row => row.PICKUP_TIME.slice(0, 5)); 
        
        res.json({
            isFullyBooked: isDayFullyBooked,
            bookedTimes: bookedTimes
        });
    } catch (error) {
        console.error('Error fetching booked slots:', error);
        res.status(500).json({ error: 'Failed to fetch booked slots' });
    }
});

// GET /api/orders - Fetch all orders with specifications (Admin View)
router.get('/orders', async (req, res) => {
    try {
        const query = `
            SELECT 
                o.ID AS order_id,
                o.CUSTOMER_NAME,
                o.CUSTOMER_EMAIL,
                o.CUSTOMER_MOBILE,
                o.PICKUP_DATE,
                o.PICKUP_TIME,
                o.PAYMENT_METHOD,
                o.DEPOSIT_PAID,
                o.TOTAL_PRICE,
                o.STATUS,
                o.CREATED_AT,
                cs.CAKE_SHAPE,
                cs.CAKE_SIZE,
                cs.CAKE_FLAVOUR,
                cs.CANDLE_OPTION,
                cs.DIET_NOTES,
                cs.DESIGN_MESSAGE_NOTES,
                cs.ADDONS, -- <--- INCLUDE ADDONS IN ADMIN QUERY
                GROUP_CONCAT(ip.PHOTO_URL) AS inspo_photos
            FROM ORDERS o
            LEFT JOIN CAKE_SPECS cs ON o.ID = cs.ORDER_ID
            LEFT JOIN INSPO_PICS ip ON o.ID = ip.ORDER_ID
            GROUP BY o.ID
            ORDER BY o.CREATED_AT DESC
        `;
        const [orders] = await db.query(query);
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to retrieve orders' });
    }
});

module.exports = router;