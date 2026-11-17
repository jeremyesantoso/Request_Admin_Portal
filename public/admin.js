let allOrders = []; // Store orders globally for client-side filtering
let currentFilter = 'All';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('orders-list');

    try {
        const res = await fetch('/api/orders');
        if (!res.ok) throw new Error('Failed to fetch orders');
        
        allOrders = await res.json();

        // Setup filter button listeners
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => {
                    b.style.background = '#fff1fa';
                    b.style.color = '#e34a8a';
                });
                e.target.style.background = '#e34a8a';
                e.target.style.color = 'white';

                currentFilter = e.target.getAttribute('data-status');
                renderOrders();
            });
        });

        renderOrders();

    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty-state error-state">Failed to load orders from the server.</div>';
    }
});

function renderOrders() {
    const container = document.getElementById('orders-list');
    const template = document.getElementById('order-card-template');

    // Filter orders based on active tab selection
    const filteredOrders = currentFilter === 'All' 
        ? allOrders 
        : allOrders.filter(order => order.STATUS === currentFilter);

    if (filteredOrders.length === 0) {
        container.innerHTML = `<div class="empty-state">No orders found with status "${currentFilter}".</div>`;
        return;
    }

    container.innerHTML = '';
    
    filteredOrders.forEach(order => {
        const clone = template.content.cloneNode(true);

        clone.querySelector('.order-title').textContent = `Order #${order.order_id} • ${order.CUSTOMER_NAME}`;
        
        const badge = clone.querySelector('.order-badge');
        badge.textContent = order.STATUS;
        badge.id = `badge_${order.order_id}`;

        clone.querySelector('.field-email').textContent = order.CUSTOMER_EMAIL;
        clone.querySelector('.field-mobile').textContent = order.CUSTOMER_MOBILE;
        clone.querySelector('.field-pickup').textContent = `${order.PICKUP_DATE.split('T')[0]} at ${order.PICKUP_TIME}`;
        clone.querySelector('.field-config').textContent = `${order.CAKE_SHAPE}, ${order.CAKE_SIZE}`;
        clone.querySelector('.field-flavour').textContent = order.CAKE_FLAVOUR;
        clone.querySelector('.field-payment').textContent = order.PAYMENT_METHOD;
        clone.querySelector('.field-design-notes').textContent = order.DESIGN_MESSAGE_NOTES || 'None';
        clone.querySelector('.field-diet-notes').textContent = order.DIET_NOTES;

        // Render Candles vertically if multiple exist (split by semicolon ;)
        const candlesContainer = clone.querySelector('.field-candles');
        const rawCandles = order.CANDLE_OPTION;
        if (rawCandles && rawCandles !== 'None') {
            candlesContainer.innerHTML = '';
            const candleList = rawCandles.split(';').map(c => c.trim()).filter(Boolean);
            const ul = document.createElement('ul');
            ul.className = 'admin-attribute-list';
            candleList.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                ul.appendChild(li);
            });
            candlesContainer.appendChild(ul);
        } else {
            candlesContainer.textContent = 'None';
        }

        // Render Add-ons vertically if multiple exist (split by comma ,)
        const addonsContainer = clone.querySelector('.field-addons');
        const rawAddons = order.ADDONS;
        if (rawAddons && rawAddons !== 'None') {
            addonsContainer.innerHTML = '';
            const addonList = rawAddons.split(',').map(a => a.trim()).filter(Boolean);
            const ul = document.createElement('ul');
            ul.className = 'admin-attribute-list';
            addonList.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                ul.appendChild(li);
            });
            addonsContainer.appendChild(ul);
        } else {
            addonsContainer.textContent = 'None';
        }

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
            span.textContent = 'No reference photos uploaded';
            photoContainer.appendChild(span);
        }

        // Setup input IDs and values
        const priceInput = clone.querySelector('.price-input');
        priceInput.id = `price_${order.order_id}`;
        priceInput.value = order.TOTAL_PRICE || '';

        const statusSelect = clone.querySelector('.status-select');
        statusSelect.id = `status_${order.order_id}`;
        statusSelect.value = order.STATUS;

        // Lock past status options to prevent moving backward and duplicating emails
        lockPastStatusOptions(statusSelect, order.STATUS);

        const saveBtn = clone.querySelector('.save-btn');
        saveBtn.id = `saveBtn_${order.order_id}`;
        saveBtn.addEventListener('click', () => updateOrder(order.order_id));

        container.appendChild(clone);
    });
}

function lockPastStatusOptions(selectElement, currentStatus) {
    const statusHierarchy = {
        'New Inquiry': 1,
        'Quote Sent': 2,
        'Deposit Paid': 3,
        'In Progress': 4,
        'Completed': 5,
        'Cancelled': 6
    };

    const currentRank = statusHierarchy[currentStatus] || 1;

    Array.from(selectElement.options).forEach(option => {
        const optionRank = statusHierarchy[option.value];
        if (optionRank && optionRank < currentRank) {
            option.disabled = true;
            option.style.color = '#ccc';
        }
    });
}

async function updateOrder(orderId) {
    const saveBtn = document.getElementById(`saveBtn_${orderId}`);
    const priceInput = document.getElementById(`price_${orderId}`);
    const statusSelect = document.getElementById(`status_${orderId}`);
    
    const finalPrice = priceInput.value;
    const newStatus = statusSelect.value;

    saveBtn.disabled = true;
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';

    try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ total_price: finalPrice, status: newStatus })
        });

        const result = await response.json();
        if (response.ok) {
            alert(`Order #${orderId} updated successfully!`);
            
            // Update the global orders array state locally so filtering stays accurate immediately
            const targetOrder = allOrders.find(o => o.order_id === orderId);
            if (targetOrder) {
                targetOrder.STATUS = newStatus;
                targetOrder.TOTAL_PRICE = finalPrice;
            }

            renderOrders();
        } else {
            alert('Error updating order: ' + (result.error || 'Please try again.'));
        }
    } catch (err) {
        console.error(err);
        alert('Network error while updating order.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}