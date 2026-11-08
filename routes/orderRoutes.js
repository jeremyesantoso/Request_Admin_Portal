const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

// Automatically create public/uploads folder if it doesn't exist on Render's disk
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for local file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
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
            payment_method
        } = req.body;

        //Check if the pickup date and time slot is already booked (excluding cancelled orders)
        const [existingSlot] = await connection.query(
            `SELECT ID FROM ORDERS WHERE PICKUP_DATE = ? AND PICKUP_TIME = ? AND STATUS != 'Cancelled'`,
            [pickup_date, pickup_time]
        );

        if (existingSlot.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'This pickup date and time slot is already booked. Please choose another time.' });
        }

        //Insert into ORDERS table 
        const [orderResult] = await connection.query(
            `INSERT INTO ORDERS (CUSTOMER_NAME, CUSTOMER_EMAIL, CUSTOMER_MOBILE, PICKUP_DATE, PICKUP_TIME, PAYMENT_METHOD) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [customer_name, customer_email, customer_mobile, pickup_date, pickup_time, payment_method || 'E-Transfer']
        );

        const orderId = orderResult.insertId;

        //Insert into CAKE_SPECS 
        await connection.query(
            `INSERT INTO CAKE_SPECS (ORDER_ID, CAKE_SHAPE, CAKE_SIZE, CAKE_FLAVOUR, CANDLE_OPTION, DIET_NOTES, DESIGN_MESSAGE_NOTES) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [orderId, cake_shape, cake_size, cake_flavour, candle_option || 'None', diet_notes || 'None', design_message_notes || '']
        );

        //Insert into INSPO_PICS table if photos were uploaded
        if (req.files && req.files.length > 0) {
            const photoValues = req.files.map(file => [
                orderId, 
                `/uploads/${file.filename}`
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

        const [booked] = await db.query(
            `SELECT PICKUP_TIME FROM ORDERS WHERE PICKUP_DATE = ? AND STATUS != 'Cancelled'`,
            [date]
        );

        // Return an array of booked time strings (e.g., ["17:00:00", "18:30:00"])
        const bookedTimes = booked.map(row => row.PICKUP_TIME.slice(0, 5)); // Normalize to HH:MM format
        res.json(bookedTimes);
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