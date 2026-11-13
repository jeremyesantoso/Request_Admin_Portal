document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('orders-list');
    const template = document.getElementById('order-card-template');

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
            // Clone the template content cleanly
            const clone = template.content.cloneNode(true);

            // Populate text fields safely
            clone.querySelector('.order-title').textContent = `Order #${order.order_id} • ${order.CUSTOMER_NAME}`;
            
            const badge = clone.querySelector('.order-badge');
            badge.textContent = order.STATUS;
            badge.id = `badge_${order.order_id}`;

            clone.querySelector('.field-email').textContent = order.CUSTOMER_EMAIL;
            clone.querySelector('.field-mobile').textContent = order.CUSTOMER_MOBILE;
            clone.querySelector('.field-pickup').textContent = `${order.PICKUP_DATE.split('T')[0]} at ${order.PICKUP_TIME}`;
            clone.querySelector('.field-config').textContent = `${order.CAKE_SHAPE}, ${order.CAKE_SIZE}`;
            clone.querySelector('.field-flavour').textContent = order.CAKE_FLAVOUR;
            clone.querySelector('.field-candles').textContent = order.CANDLE_OPTION;
            clone.querySelector('.field-addons').textContent = order.ADDONS || 'None';
            clone.querySelector('.field-payment').textContent = order.PAYMENT_METHOD;
            clone.querySelector('.field-design-notes').textContent = order.DESIGN_MESSAGE_NOTES || 'None';
            clone.querySelector('.field-diet-notes').textContent = order.DIET_NOTES;

            // Handle Photo Previews
            const photoContainer = clone.querySelector('.photo-preview-container');
            if (order.inspo_photos) {
                const photoBox = document.createElement('div');
                photoBox.className = 'photo-preview-box';
                const photoUrls = order.inspo_photos.split(',');
                
                photoUrls.forEach(url => {
                    const a = document.createElement('a');
                    a.href = url;
                    a.target = '_blank';
                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = 'Inspo Ref';
                    a.appendChild(img);
                    photoBox.appendChild(a);
                });
                photoContainer.appendChild(photoBox);
            } else {
                const span = document.createElement('span');
                span.className = 'no-photos-text';
                span.textContent = 'No reference photos uploaded.';
                photoContainer.appendChild(span);
            }

            // Setup input IDs and event bindings for inputs/buttons
            const priceInput = clone.querySelector('.price-input');
            priceInput.id = `price_${order.order_id}`;
            priceInput.value = order.TOTAL_PRICE || '';

            const statusSelect = clone.querySelector('.status-select');
            statusSelect.id = `status_${order.order_id}`;
            statusSelect.value = order.STATUS;

            const saveBtn = clone.querySelector('.save-btn');
            saveBtn.addEventListener('click', () => updateOrder(order.order_id));

            container.appendChild(clone);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty-state error-state">Failed to load orders from the server.</div>';
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