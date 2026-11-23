const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../config/db');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const adminAuth = require('../middleware/adminAuth');
const { 
    sendQuoteEmail, 
    sendDepositEmail, 
    sendCompletedEmail, 
    sendCancelledEmail 
} = require('../utils/mailer');

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

// POST /api/orders - Submit a new cake inquiry (with Multer error catcher)
router.post('/orders', (req, res, next) => {
    upload.array('inspo_photos', 3)(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: 'You can only upload up to 3 reference photos.' });
        }
        next();
    });
}, async (req, res) => {
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
            candle_types,
            prem_quantity, prem_color,
            std1_quantity, std1_color,
            std2_quantity, std2_color,
            std3_quantity, std3_color,
            std4_quantity, std4_color,
            std5_quantity, std5_color,
            diet_notes,
            design_message_notes,
            payment_method,
            addons,
            custom_message_text,
            custom_addon_text
        } = req.body;

        // Validate that a payment method was selected
        if (!payment_method || payment_method.trim() === '') {
            await connection.rollback();
            return res.status(400).json({ error: 'Please select a preferred payment method.' });
        }

        // Enforce daily capacity limit of 4 orders a day
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

        // Format cake add-on checkboxes + attach any custom specifications inline
        let formattedAddons = 'None';
        if (addons) {
            const addonList = Array.isArray(addons) ? addons : [addons];
            const enrichedAddons = addonList.map(item => {
                if (item === 'Custom message (2-5$)' && custom_message_text && custom_message_text.trim() !== '') {
                    return `Custom message (2-5$): "${custom_message_text.trim()}"`;
                }
                if (item === 'Custom add-ons' && custom_addon_text && custom_addon_text.trim() !== '') {
                    return `Custom add-ons: "${custom_addon_text.trim()}"`;
                }
                return item;
            });
            formattedAddons = enrichedAddons.join(', ');
        }

        // Map candle data fields matching frontend checkbox values and dynamic input names
        const candleDataMap = {
            'Premium': { qty: prem_quantity || 1, color: prem_color || 'Any' },
            'Standard 1': { qty: std1_quantity || 1, color: std1_color || 'Any' },
            'Standard 2': { qty: std2_quantity || 1, color: std2_color || 'Any' },
            'Standard 3': { qty: std3_quantity || 1, color: std3_color || 'Any' },
            'Standard 4': { qty: std4_quantity || 1, color: std4_color || 'Any' },
            'Standard 5': { qty: std5_quantity || 1, color: std5_color || 'Any' }
        };

        let formattedCandles = 'None';
        if (candle_types) {
            const selectedTypes = Array.isArray(candle_types) ? candle_types : [candle_types];
            formattedCandles = selectedTypes
                .map(type => {
                    const data = candleDataMap[type] || { qty: 1, color: 'Any' };
                    const chosenColor = (data.color && data.color.trim() !== '') ? data.color.trim() : 'Any';
                    return `${type} (Qty: ${data.qty}, Choice: "${chosenColor}")`;
                })
                .join('; ');
        }

        // Insert into ORDERS table 
        const [orderResult] = await connection.query(
            `INSERT INTO ORDERS (CUSTOMER_NAME, CUSTOMER_EMAIL, CUSTOMER_MOBILE, PICKUP_DATE, PICKUP_TIME, PAYMENT_METHOD) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [customer_name, customer_email, customer_mobile, pickup_date, pickup_time, payment_method || 'E-Transfer']
        );

        const orderId = orderResult.insertId;

        // Insert into CAKE_SPECS
        await connection.query(
            `INSERT INTO CAKE_SPECS (ORDER_ID, CAKE_SHAPE, CAKE_SIZE, CAKE_FLAVOUR, CANDLE_OPTION, DIET_NOTES, DESIGN_MESSAGE_NOTES, ADDONS) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderId, cake_shape, cake_size, cake_flavour, formattedCandles, diet_notes || 'None', design_message_notes || '', formattedAddons]
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
router.get('/orders', adminAuth, async (req, res) => {
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
                cs.ADDONS,
                (SELECT GROUP_CONCAT(PHOTO_URL) FROM INSPO_PICS WHERE ORDER_ID = o.ID) AS inspo_photos
            FROM ORDERS o
            LEFT JOIN CAKE_SPECS cs ON o.ID = cs.ORDER_ID
            ORDER BY o.CREATED_AT DESC
        `;
        const [orders] = await db.query(query);
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to retrieve orders' });
    }
});

// PATCH /api/orders/:id/status - Update order price quote, status, and trigger corresponding status emails
router.patch('/orders/:id/status', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { total_price, status } = req.body;

        const [result] = await db.query(
            `UPDATE ORDERS SET TOTAL_PRICE = ?, STATUS = ? WHERE ID = ?`,
            [total_price || 0.00, status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Fetch basic order details for emailing
        const [rows] = await db.query(
            `SELECT 
                o.ID AS order_id, o.CUSTOMER_NAME, o.CUSTOMER_EMAIL, 
                o.PICKUP_DATE, o.PICKUP_TIME, o.TOTAL_PRICE,
                cs.CAKE_SHAPE, cs.CAKE_SIZE, cs.CAKE_FLAVOUR, 
                cs.CANDLE_OPTION, cs.DIET_NOTES, cs.DESIGN_MESSAGE_NOTES, cs.ADDONS
             FROM ORDERS o
             LEFT JOIN CAKE_SPECS cs ON o.ID = cs.ORDER_ID
             WHERE o.ID = ?`,
            [id]
        );

        let emailMessage = 'Order updated successfully!';

        if (rows.length > 0) {
            const order = rows[0];

            if (status === 'Quote Sent') {
                if (!total_price || parseFloat(total_price) <= 0) {
                    return res.status(400).json({ error: 'Please enter a valid final price before sending a quote.' });
                }
                await sendQuoteEmail(order);
                emailMessage = 'Order updated and quote invoice emailed to customer!';
            } 
            else if (status === 'Deposit Paid') {
                await sendDepositEmail(order);
                emailMessage = 'Order updated and deposit confirmation emailed to customer!';
            } 
            else if (status === 'Completed') {
                await sendCompletedEmail(order);
                emailMessage = 'Order updated and thank-you email sent to customer!';
            } 
            else if (status === 'Cancelled') {
                await sendCancelledEmail(order);
                emailMessage = 'Order updated and cancellation notice emailed to customer!';
            }
        }

        res.json({ message: emailMessage });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status or send email', details: error.message });
    }
});

// GET /api/orders/:id/reset - Reactivate/Reset an expired or cancelled inquiry
router.get('/orders/:id/reset', async (req, res) => {
    try {
        const { id } = req.params;

        // Reset the status back to 'New Inquiry' so your sister can re-quote it
        const [result] = await db.query(
            `UPDATE ORDERS SET STATUS = 'New Inquiry' WHERE ID = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).send('<h3>Order not found or invalid link.</h3>');
        }

        // Render a clean success page for the customer
        res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #fff1fa; color: #333; height: 100vh;">
                <h2 style="color: #e34a8a;">✨ Inquiry Reactivated Successfully!</h2>
                <p style="font-size: 16px;">Thank you! Your request for Order #${id} has been sent back to our active queue.</p>
                <p style="font-size: 14px; color: #666;">Our team will review it and get back to you with an updated quote soon.</p>
            </div>
        `);
    } catch (error) {
        console.error('Error resetting order:', error);
        res.status(500).send('<h3>Server error while resetting your inquiry. Please try again later.</h3>');
    }
});

module.exports = router;