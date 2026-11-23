let allOrders = []; // Store orders globally for client-side filtering
let currentFilter = 'All';
let searchQuery = '';

const SEEN_STORAGE_KEY = 'cakekue_seen_order_states_v1';

function getSeenMap() {
    try {
        return JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

function saveSeenMap(map) {
    try {
        localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(map));
    } catch (err) {
        console.warn('Could not persist seen order states:', err);
    }
}

function getOrderStateSignature(order) {
    const price = order.TOTAL_PRICE !== null && order.TOTAL_PRICE !== undefined
        ? String(order.TOTAL_PRICE)
        : '';
    return `${order.STATUS || 'New Inquiry'}|${price}`;
}

function isOrderSeen(order) {
    const seenMap = getSeenMap();
    return seenMap[String(order.order_id)] === getOrderStateSignature(order);
}

function markOrderAsSeen(order) {
    if (!order) return;
    const seenMap = getSeenMap();
    seenMap[String(order.order_id)] = getOrderStateSignature(order);
    saveSeenMap(seenMap);
}

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('orders-list');
    const searchInput = document.getElementById('customer-search');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim().toLowerCase();
            renderOrders();
        });
    }

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

function applyCardSeenVisuals(cardEl, unreadPill, seen) {
    if (seen) {
        cardEl.classList.remove('is-unread');
        cardEl.classList.add('is-seen');
        if (unreadPill) unreadPill.style.display = 'none';
    } else {
        cardEl.classList.remove('is-seen');
        cardEl.classList.add('is-unread');
        if (unreadPill) unreadPill.style.display = 'inline-block';
    }
}

function renderOrders() {
    const container = document.getElementById('orders-list');
    const template = document.getElementById('order-card-template');

    // Filter orders based on active status tab and search query
    const filteredOrders = allOrders.filter(order => {
        const matchesStatus = currentFilter === 'All' || order.STATUS === currentFilter;
        const nameMatch = (order.CUSTOMER_NAME || '').toLowerCase().includes(searchQuery);
        const emailMatch = (order.CUSTOMER_EMAIL || '').toLowerCase().includes(searchQuery);
        const matchesSearch = !searchQuery || nameMatch || emailMatch;
        return matchesStatus && matchesSearch;
    });

    if (filteredOrders.length === 0) {
        const filterLabel = currentFilter === 'All' ? 'orders' : `orders with status "${currentFilter}"`;
        const searchLabel = searchQuery ? ` matching "${searchQuery}"` : '';
        container.innerHTML = `<div class="empty-state">No ${filterLabel}${searchLabel} found.</div>`;
        return;
    }

    container.innerHTML = '';
    
    filteredOrders.forEach(order => {
        const clone = template.content.cloneNode(true);
        const cardEl = clone.querySelector('.order-card');
        const unreadPill = clone.querySelector('.unread-pill');

        cardEl.dataset.orderId = order.order_id;
        applyCardSeenVisuals(cardEl, unreadPill, isOrderSeen(order));

        // Clicking or focusing inside the card marks it as seen and cools down its highlight
        cardEl.addEventListener('click', () => {
            if (!isOrderSeen(order)) {
                markOrderAsSeen(order);
                applyCardSeenVisuals(cardEl, unreadPill, true);
            }
        });

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

        // Lock all past workflow statuses so they can never be re-selected
        lockPastStatusOptions(statusSelect, order.STATUS);

        const saveBtn = clone.querySelector('.save-btn');
        saveBtn.id = `saveBtn_${order.order_id}`;
        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateOrder(order.order_id);
        });

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
        
        // Disable any status stage that is strictly behind the current progress rank,
        // and also disable the exact current status to prevent redundant "saving" back to the same state.
        if (optionRank && optionRank <= currentRank) {
            option.disabled = true;
            option.style.color = '#bbb';
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
                markOrderAsSeen(targetOrder);
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