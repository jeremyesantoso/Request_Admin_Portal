require('dotenv').config();

async function sendQuoteEmail(order) {
    const totalPrice = parseFloat(order.TOTAL_PRICE).toFixed(2);
    const depositAmount = (parseFloat(order.TOTAL_PRICE) / 2).toFixed(2);
    const formattedDate = new Date(order.PICKUP_DATE).toISOString().split('T')[0];

    const htmlContent = `
        <div style="font-family: 'Nunito', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f8c8dc; border-radius: 12px; padding: 24px; color: #333;">
            <h2 style="color: #e34a8a; margin-top: 0;">cakekue &bull; Order Quote #${order.order_id}</h2>
            <p>Hi <strong>${order.CUSTOMER_NAME}</strong>,</p>
            <p>Thank you for your custom cake inquiry! Here is your finalized quote and order summary:</p>
            
            <div style="background: #fff1fa; border: 1px dashed #f8c8dc; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Pickup Date & Time:</strong> ${formattedDate} at ${order.PICKUP_TIME}</p>
                <p style="margin: 4px 0;"><strong>Shape & Size:</strong> ${order.CAKE_SHAPE}, ${order.CAKE_SIZE}</p>
                <p style="margin: 4px 0;"><strong>Flavour:</strong> ${order.CAKE_FLAVOUR}</p>
                <p style="margin: 4px 0;"><strong>Candles:</strong> ${order.CANDLE_OPTION}</p>
                <p style="margin: 4px 0;"><strong>Add-ons:</strong> ${order.ADDONS || 'None'}</p>
                <p style="margin: 4px 0;"><strong>Design Notes:</strong> ${order.DESIGN_MESSAGE_NOTES || 'None'}</p>
                <p style="margin: 4px 0;"><strong>Dietary Notes:</strong> ${order.DIET_NOTES}</p>
            </div>

            <div style="border-top: 1px solid #f3e8ee; padding-top: 16px; margin-bottom: 20px;">
                <p style="font-size: 16px; margin: 4px 0;"><strong>Total Quote:</strong> $${totalPrice}</p>
                <p style="font-size: 18px; color: #d63384; margin: 4px 0;"><strong>50% Non-Refundable Deposit Due:</strong> $${depositAmount}</p>
            </div>

            <h3 style="color: #e34a8a; font-size: 16px;">How to Confirm Your Order:</h3>
            <ol style="line-height: 1.6; padding-left: 20px;">
                <li>Send an Interac E-Transfer of <strong>$${depositAmount}</strong> to <strong>${process.env.ETRANSFER_EMAIL}</strong>.</li>
                <li>Include <strong>Order #${order.order_id}</strong> in the transfer message.</li>
                <li><strong>Reply directly to this email with a screenshot of your transfer receipt</strong> so we can verify your deposit and lock in your pickup slot!</li>
            </ol>

            <p style="font-size: 12px; color: #777; margin-top: 24px;">Note: Your pickup date and time are not guaranteed until the 50% deposit screenshot is received and verified.</p>
        </div>
    `;

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