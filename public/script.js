// ==========================================
// CANDLE INVENTORY SETTINGS (Edit Here!)
// Change inStock to true or false as needed
// ==========================================
const candleInventory = [
    { id: 'prem', label: 'Premium', fullName: 'Premium Candle', price: 3, img: 'images/premium_candle.jpeg', inStock: true },
    { id: 'std1', label: 'Standard 1', fullName: 'Standard Candle 1', price: 1, img: 'images/standard_candle1.jpeg', inStock: true },
    { id: 'std2', label: 'Standard 2', fullName: 'Standard Candle 2', price: 1, img: 'images/standard_candle2.jpeg', inStock: true },
    { id: 'std3', label: 'Standard 3', fullName: 'Standard Candle 3', price: 1, img: 'images/standard_candle3.jpeg', inStock: true },
    { id: 'std4', label: 'Standard 4', fullName: 'Standard Candle 4', price: 1, img: 'images/standard_candle4.jpeg', inStock: false },
    { id: 'std5', label: 'Standard 5', fullName: 'Standard Candle 5', price: 1, img: 'images/standard_candle5.jpeg', inStock: true }
];

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('pickup_date');
    const timeSelect = document.getElementById('pickup_time');
    const form = document.getElementById('orderForm');
    const submitBtn = form.querySelector('button[type="submit"]');

    // ==========================================
    // 0. CONDITIONAL CUSTOM ADD-ON INPUTS
    // ==========================================
    const customMsgCheckbox = document.getElementById('custom_msg_cb');
    const customMsgContainer = document.getElementById('custom_msg_container');
    const customMsgInput = document.getElementById('custom_message_text');

    if (customMsgCheckbox && customMsgContainer && customMsgInput) {
        customMsgCheckbox.addEventListener('change', () => {
            if (customMsgCheckbox.checked) {
                customMsgContainer.style.display = 'block';
                customMsgInput.required = true;
                customMsgInput.focus();
            } else {
                customMsgContainer.style.display = 'none';
                customMsgInput.required = false;
                customMsgInput.value = '';
            }
        });
    }

    const customAddonCheckbox = document.getElementById('custom_addon_cb');
    const customAddonContainer = document.getElementById('custom_addon_container');
    const customAddonInput = document.getElementById('custom_addon_text');

    if (customAddonCheckbox && customAddonContainer && customAddonInput) {
        customAddonCheckbox.addEventListener('change', () => {
            if (customAddonCheckbox.checked) {
                customAddonContainer.style.display = 'block';
                customAddonInput.required = true;
                customAddonInput.focus();
            } else {
                customAddonContainer.style.display = 'none';
                customAddonInput.required = false;
                customAddonInput.value = '';
            }
        });
    }

    // ==========================================
    // 0B. 2D DESIGN & 3D CHARACTER NOTICE TOGGLES
    // ==========================================
    const twodCb = document.getElementById('twod_design_cb');
    const twodNotice = document.getElementById('twod_design_notice');
    if (twodCb && twodNotice) {
        twodCb.addEventListener('change', () => {
            twodNotice.style.display = twodCb.checked ? 'block' : 'none';
        });
    }

    const threedCb = document.getElementById('threed_char_cb');
    const threedNotice = document.getElementById('threed_char_notice');
    if (threedCb && threedNotice) {
        threedCb.addEventListener('change', () => {
            threedNotice.style.display = threedCb.checked ? 'block' : 'none';
        });
    }

    // ==========================================
    // 1. BUILD CANDLE GALLERY & CHECKLIST
    // ==========================================
    const galleryContainer = document.getElementById('candle-gallery');
    const checklistContainer = document.getElementById('candle-checklist');

    if (galleryContainer && checklistContainer) {
        candleInventory.forEach((candle, index) => {
            // Build Gallery Pane
            const pane = document.createElement('div');
            pane.className = `candle-pane ${candle.inStock ? '' : 'out-of-stock'}`;
            pane.innerHTML = `
                <img src="${candle.img}" alt="${candle.fullName}">
                <span>${candle.label} ${candle.inStock ? `(+$${candle.price}/ea)` : '(Out of Stock)'}</span>
            `;
            galleryContainer.appendChild(pane);

            // Build Checklist Item
            const label = document.createElement('label');
            label.className = `candle-check-label ${candle.inStock ? '' : 'disabled-label'}`;
            if (index > 0) label.style.marginTop = '8px';

            if (candle.inStock) {
                label.innerHTML = `
                    <input type="checkbox" id="${candle.id}_cb" name="candle_types" value="${candle.label}">
                    ${candle.label} (+$${candle.price}/ea)
                `;
                checklistContainer.appendChild(label);

                // Determine specific field label & placeholder based on candle ID
                let specLabel = 'Specify Color / Style:';
                let specPlaceholder = 'e.g. Gold, pink, rainbow...';

                if (candle.id === 'prem') {
                    specLabel = 'Specify Type / Character:';
                    specPlaceholder = 'e.g. Teddy bear, daisy flower, duck, red heart, spiral...';
                } else if (candle.id === 'std1' || candle.id === 'std2') {
                    specLabel = 'Specify Color:';
                    specPlaceholder = 'e.g. Gold, silver, black, pink...';
                } else if (candle.id === 'std3' || candle.id === 'std4' || candle.id === 'std5') {
                    specLabel = 'Specify Type & Color:';
                    specPlaceholder = 'e.g. Polka dot, spiral, gradient, metallic wave...';
                }

                // Create Quantity & Specification Inputs Container
                const qtyWrapper = document.createElement('div');
                qtyWrapper.id = `${candle.id}_qty`;
                qtyWrapper.className = 'candle-qty-container';
                qtyWrapper.style.display = 'none';
                qtyWrapper.innerHTML = `
                    <div style="margin-bottom: 8px;">
                        <label style="font-size: 11px; margin-bottom: 3px; display: block;">Quantity for ${candle.label}:</label>
                        <input type="number" name="${candle.id}_quantity" min="1" value="1" style="padding: 8px 10px; width: 100%;">
                    </div>
                    <div>
                        <label style="font-size: 11px; margin-bottom: 3px; display: block;">${specLabel}</label>
                        <input type="text" name="${candle.id}_color" placeholder="${specPlaceholder}" style="padding: 8px 10px; width: 100%;">
                    </div>
                `;
                checklistContainer.appendChild(qtyWrapper);

                // Toggle Quantity & Specification Inputs when Checked
                const checkbox = label.querySelector('input[type="checkbox"]');
                const specInput = qtyWrapper.querySelector(`input[name="${candle.id}_color"]`);
                
                checkbox.addEventListener('change', () => {
                    qtyWrapper.style.display = checkbox.checked ? 'block' : 'none';
                    if (checkbox.checked) {
                        specInput.required = true;
                        specInput.focus();
                    } else {
                        specInput.required = false;
                        specInput.value = '';
                    }
                });
            } else {
                label.innerHTML = `
                    <input type="checkbox" disabled>
                    ${candle.label} (Out of Stock)
                `;
                checklistContainer.appendChild(label);
            }
        });
    }

    // ==========================================
    // 2. PICKUP DATE & TIME SLOTS
    // ==========================================
    const timeSchedules = {
        standard: [
            { value: "16:30", text: "4:30 PM" },
            { value: "17:00", text: "5:00 PM" },
            { value: "17:30", text: "5:30 PM" },
            { value: "18:00", text: "6:00 PM" },
            { value: "18:30", text: "6:30 PM" },
            { value: "19:00", text: "7:00 PM" },
            { value: "19:30", text: "7:30 PM" },
            { value: "20:00", text: "8:00 PM" },
            { value: "20:30", text: "8:30 PM" },
            { value: "21:00", text: "9:00 PM" }
        ],
        specialDays: [
            { value: "12:00", text: "12:00 PM" },
            { value: "12:30", text: "12:30 PM" },
            { value: "13:00", text: "1:00 PM" },
            { value: "13:30", text: "1:30 PM" },
            { value: "14:00", text: "2:00 PM" },
            { value: "14:30", text: "2:30 PM" },
            { value: "15:00", text: "3:00 PM" },
            { value: "15:30", text: "3:30 PM" },
            { value: "16:00", text: "4:00 PM" },
            { value: "16:30", text: "4:30 PM" },
            { value: "17:00", text: "5:00 PM" }
        ]
    };

    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);

    dateInput.addEventListener('change', async (e) => {
        const selectedDateVal = e.target.value;
        if (!selectedDateVal) {
            timeSelect.innerHTML = '<option value="">Please select a valid pickup date first</option>';
            timeSelect.disabled = true;
            return;
        }

        const selectedDate = new Date(selectedDateVal + 'T00:00:00');
        const dayOfWeek = selectedDate.getDay();

        timeSelect.disabled = false;
        timeSelect.innerHTML = '<option value="" disabled selected>Loading availability...</option>';

        let bookedTimes = [];
        let isFullyBooked = false;

        try {
            const res = await fetch(`/api/booked-slots?date=${selectedDateVal}`);
            if (res.ok) {
                const data = await res.json();
                bookedTimes = data.bookedTimes;
                isFullyBooked = data.isFullyBooked;
            }
        } catch (err) {
            console.error('Failed to fetch booked slots:', err);
        }

        if (isFullyBooked) {
            timeSelect.innerHTML = '<option value="" disabled selected>Date Fully Booked</option>';
            timeSelect.disabled = true;
            return;
        }

        timeSelect.innerHTML = '<option value="" disabled selected>Select pickup time</option>';

        const slots = (dayOfWeek === 1 || dayOfWeek === 2) 
            ? timeSchedules.specialDays 
            : timeSchedules.standard;

        slots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot.value;
            
            if (bookedTimes.includes(slot.value)) {
                option.textContent = `${slot.text} (Booked)`;
                option.disabled = true;
                option.style.color = '#999';
            } else {
                option.textContent = slot.text;
            }

            timeSelect.appendChild(option);
        });
    });

    // ==========================================
    // 3. FORM SUBMISSION
    // ==========================================
    form.addEventListener('submit', async (e) => {
        if (!form.checkValidity()) {
            form.reportValidity(); 
            return;
        }

        e.preventDefault();

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting Order...';

        const photoInput = document.getElementById('inspo_photos');
        if (photoInput && photoInput.files.length > 3) {
            alert('You can only upload up to 3 reference photos.');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
        }

        const formData = new FormData(form);

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            
            if (response.ok) {
                alert('Success! Order Inquiry ID #' + result.orderId + ' has been submitted.');
                form.reset();
                timeSelect.disabled = true;
                timeSelect.innerHTML = '<option value="">Please select a valid pickup date first</option>';
                
                // Hide all conditional containers
                document.querySelectorAll('.candle-qty-container').forEach(el => {
                    el.style.display = 'none';
                });
            } else {
                alert('Error: ' + (result.error || 'Please try again.'));
            }
        } catch (err) {
            console.error(err);
            alert('Failed to submit form. Please check your network connection.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});