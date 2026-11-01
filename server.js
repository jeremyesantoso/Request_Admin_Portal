const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware (Added 10mb limit for mobile camera photos)
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});