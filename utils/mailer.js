require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function sendQuoteEmail(order) {
    const totalPrice = parseFloat(order.TOTAL_PRICE).toFixed(2);
    const depositAmount = (parseFloat(order.TOTAL_PRICE) / 2).toFixed(2);
    const formattedDate = new Date(order.PICKUP_DATE).toISOString().split('T')[0];

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
        .replace(/{{candle_option}}/g, order.CANDLE_OPTION)
        .replace(/{{addons}}/g, order.ADDONS || 'None')
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
            subject: `Your Custom Cake Quote & Order Summary - Order #${order.order_id}`,
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