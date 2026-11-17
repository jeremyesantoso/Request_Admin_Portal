require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Helper to convert comma or semicolon separated strings into clean vertical HTML list items
const formatVerticalList = (str) => {
    if (!str || str === 'None' || str.trim() === '') return '<span style="color: #888;">None</span>';
    
    const separator = str.includes(';') ? ';' : ',';
    const items = str.split(separator).map(item => item.trim()).filter(Boolean);
    
    if (items.length <= 1) return str;

    return items
        .map(item => `<div style="background: #ffffff; padding: 6px 10px; border-radius: 6px; border: 1px dashed #f8c8dc; margin-top: 4px; font-size: 13px; color: #4a4a4a;">• ${item}</div>`)
        .join('');
};

async function sendQuoteEmail(order) {
    const totalPrice = parseFloat(order.TOTAL_PRICE).toFixed(2);
    const depositAmount = (parseFloat(order.TOTAL_PRICE) / 2).toFixed(2);
    const formattedDate = new Date(order.PICKUP_DATE).toISOString().split('T')[0];

    // Format candles and add-ons vertically if multiple exist
    const formattedCandles = formatVerticalList(order.CANDLE_OPTION);
    const formattedAddons = formatVerticalList(order.ADDONS || 'None');

    // Read the HTML template from the templates folder
    const templatePath = path.join(__dirname, '../templates/quoteEmail.html');
    let htmlContent = fs.readFileSync(templatePath, 'utf8');

    // Replace placeholders with actual order values
    htmlContent = htmlContent
        .replace(/{{order_id}}/g, order.order_id)
        .replace(/{{customer_name}}/g, order.CUSTOMER_NAME)
        .replace(/{{formatted_date}}/g, formattedDate)
        .replace(/{{pickup_time}}/g, order.PICKUP_TIME)
        .replace(/{{cake_shape}}/g, order.CAKE_SHAPE)
        .replace(/{{cake_size}}/g, order.CAKE_SIZE)
        .replace(/{{cake_flavour}}/g, order.CAKE_FLAVOUR)
        .replace(/{{candle_option}}/g, formattedCandles)
        .replace(/{{addons}}/g, formattedAddons)
        .replace(/{{design_notes}}/g, order.DESIGN_MESSAGE_NOTES || 'None')
        .replace(/{{diet_notes}}/g, order.DIET_NOTES)
        .replace(/{{total_price}}/g, totalPrice)
        .replace(/{{deposit_amount}}/g, depositAmount)
        .replace(/{{etransfer_email}}/g, process.env.ETRANSFER_EMAIL);

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY,
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            sender: {
                name: process.env.SENDER_NAME || 'cakekue',
                email: process.env.SENDER_EMAIL
            },
            to: [{ email: order.CUSTOMER_EMAIL }],
            subject: `Your Cake Quote & Order Summary #${order.order_id}`,
            htmlContent: htmlContent
        })
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(`Brevo API Error (${response.status}): ${errorDetails}`);
    }

    return await response.json();
}

module.exports = { sendQuoteEmail };