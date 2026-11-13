document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('orders-list');

    try {
        const res = await fetch('/api/orders');
        if (!res.ok) throw new Error('Failed to fetch orders');
        
        const orders = await res.json();

        if (orders.length === 0) {
            container.innerHTML = '<div class="empty-state">No incoming order inquiries found yet.</div>';
            return;
        }

        container.innerHTML = '';
        orders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'order-card';

            // Build photo previews safely
            let photosHtml = '<span style="color: var(--text-muted); font-size: 13px;">No reference photos uploaded.</span>';
            if (order.inspo_photos) {
                const photoUrls = order.inspo_photos.split(',');
                photosHtml = '<div class="photo-preview-box">' + 
                    photoUrls.map(url => `<a href="${url}" target="_blank"><img src="${url}" alt="Inspo Ref"></a>`).join('') + 
                    '</div>';
            }

            card.innerHTML = `
                <div class="order-header">
                    <h3>Order #${order.order_id} &bull; ${order.CUSTOMER_NAME}</h3>
                    <span class="badge" id="badge_${order.order_id}">${order.STATUS}</span>
                </div>
                
                <div class="order-grid">
                    <div><strong>Email:</strong> ${order.CUSTOMER_EMAIL}</div>
                    <div><strong>Mobile:</strong> ${order.CUSTOMER_MOBILE}</div>
                    <div><strong>Pickup:</strong> ${order.PICKUP_DATE.split('T')[0]} at ${order.PICKUP_TIME}</div>
                    <div><strong>Configuration:</strong> ${order.CAKE_SHAPE}, ${order.CAKE_SIZE}</div>
                    <div><strong>Flavour:</strong> ${order.CAKE_FLAVOUR}</div>
                    <div><strong>Candles:</strong> ${order.CANDLE_OPTION}</div>
                    <div><strong>Add-ons:</strong> ${order.ADDONS || 'None'}</div>
                    <div><strong>Payment Choice:</strong> ${order.PAYMENT_METHOD}</div>
                </div>

                <div class="order-notes-box">
                    <div style="margin-bottom: 4px;"><strong>Design Notes:</strong> ${order.DESIGN_MESSAGE_NOTES || 'None'}</div>
                    <div><strong>Dietary Restrictions:</strong> ${order.DIET_NOTES}</div>
                </div>

                <div>
                    <strong style="font-size: 13px; color: var(--text-muted);">Reference Photos:</strong>
                    ${photosHtml}
                </div>

                <div class="admin-actions">
                    <input type="number" step="0.01" placeholder="Final Price ($)" id="price_${order.order_id}" value="${order.TOTAL_PRICE || ''}">
                    <select id="status_${order.order_id}">
                        <option value="New Inquiry" ${order.STATUS === 'New Inquiry' ? 'selected' : ''}>New Inquiry</option>
                        <option value="Quote Sent" ${order.STATUS === 'Quote Sent' ? 'selected' : ''}>Quote Sent</option>
                        <option value="Deposit Paid" ${order.STATUS === 'Deposit Paid' ? 'selected' : ''}>Deposit Paid</option>
                        <option value="In Progress" ${order.STATUS === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Completed" ${order.STATUS === 'Completed' ? 'selected' : ''}>Completed</option>
                        <option value="Cancelled" ${order.STATUS === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                    <button class="btn-primary" onclick="updateOrder(${order.order_id})">Save Changes</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty-state" style="color: #e34a8a;">Failed to load orders from the server.</div>';
    }
});

// Function to handle saving price quote and status updates
async function updateOrder(orderId) {
    const priceInput = document.getElementById(`price_${orderId}`);
    const statusSelect = document.getElementById(`status_${orderId}`);
    
    const finalPrice = priceInput.value;
    const newStatus = statusSelect.value;

    try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ total_price: finalPrice, status: newStatus })
        });

        const result = await response.json();
        if (response.ok) {
            alert(`Order #${orderId} updated successfully!`);
            document.getElementById(`badge_${orderId}`).textContent = newStatus;
        } else {
            alert('Error updating order: ' + (result.error || 'Please try again.'));
        }
    } catch (err) {
        console.error(err);
        alert('Network error while updating order.');
    }
}