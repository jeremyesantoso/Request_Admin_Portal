document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('pickup_date');
    const timeSelect = document.getElementById('pickup_time');
    const form = document.getElementById('orderForm');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Define schedules per pickup day
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

    // Restrict date selection to today or future dates
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);

    // Listen for date changes
    dateInput.addEventListener('change', (e) => {
        if (!e.target.value) {
            timeSelect.innerHTML = '<option value="">Please select a valid pickup date first</option>';
            timeSelect.disabled = true;
            return;
        }

        const selectedDate = new Date(e.target.value + 'T00:00:00');
        const dayOfWeek = selectedDate.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, ...

        timeSelect.disabled = false;
        timeSelect.innerHTML = '<option value="" disabled selected>Select pickup time</option>';

        const slots = (dayOfWeek === 1 || dayOfWeek === 2) 
            ? timeSchedules.specialDays 
            : timeSchedules.standard;

        slots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot.value;
            option.textContent = slot.text;
            timeSelect.appendChild(option);
        });
    });

    // Form submission handler with disable-on-submit logic
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Disable button immediately to prevent mobile double-taps
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting Order...';

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
            } else {
                alert('Error: ' + (result.error || 'Please try again.'));
            }
        } catch (err) {
            console.error(err);
            alert('Failed to submit form. Please check your network connection.');
        } finally {
            // Re-enable button and restore text once response finishes
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});