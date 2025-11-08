let rooms = [];
let currentUser = null;
let currentRoom = null;
let currentStep = 1;
let bookingData = {};
let myBookings = [];

function getImagePath(imageUrl) {
    if (!imageUrl) {
        return "../assets/img/meetingroom.jpg";
    }

    if (imageUrl.startsWith('../')) {
        return imageUrl;
    }

    if (imageUrl.startsWith('assets/')) {
        return '../' + imageUrl;
    }

    if (!imageUrl.includes('/')) {
        return '../assets/img/' + imageUrl;
    }

    return '../' + imageUrl;
}

async function loadRooms() {
    try {
        const response = await api.getAllRooms();
        // Handle new API response format with success wrapper
        const roomsData = response.success ? response : response;
        const roomsArray = Array.isArray(roomsData) ? roomsData : (roomsData.data || []);
        rooms = roomsArray.map(room => {
            const processedImage = getImagePath(room.image_url);
            console.log('Processing room:', {
                name: room.room_name,
                status: room.status,
                processed: processedImage
            });

            return {
                id: room.id,
                name: room.room_name,
                description: room.description || `${room.room_name} - A professional space for your business needs.`,
                price: room.price,
                image: processedImage, // Process image_url from database
                status: room.status || 'available' // Add status from API
            };
        });
        renderRooms();
    } catch (error) {
        console.error('Failed to load rooms:', error);
        utils.showNotification('Failed to load rooms. Please try again later.', 'error');

        // Show empty state instead of fallback data
        const grid = document.getElementById('roomsGrid');
        grid.innerHTML = `
            <div class="error-state">
                <div class="error-icon">❌</div>
                <h3>Failed to load rooms</h3>
                <p>We couldn't load the available rooms. Please refresh the page or try again later.</p>
                <button class="btn" onclick="loadRooms()">Try Again</button>
            </div>
        `;
    }
}

function checkLoginStatus() {
    currentUser = utils.getCurrentUser();

    // Log for debugging
    if (currentUser) {
        console.log('User logged in:', currentUser.name);
    } else {
        console.log('No user session found');
    }

    updateProfileButton();
    loadUserBookings();
}

// Add function to refresh login status (useful after returning from login)
function refreshLoginStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const justLoggedIn = urlParams.get('logged_in');

    if (justLoggedIn === 'true') {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        utils.showNotification('Welcome back! You can now book rooms.', 'success');
    }

    currentUser = utils.getCurrentUser();
    updateProfileButton();
    loadUserBookings();
}

function updateProfileButton() {
    const profileBtn = document.getElementById('profileBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginBtn = document.getElementById('loginBtn');

    if (currentUser && currentUser.name) {
        const initials = currentUser.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
        profileBtn.innerHTML = `
            <div class="user-avatar">${initials}</div>
            <div class="user-info-nav">
                <span class="user-name">${currentUser.name}</span>
                <span class="user-status">My Account</span>
            </div>
        `;
        profileBtn.classList.add('logged-in');
        logoutBtn.style.display = 'block';
        loginBtn.style.display = 'none';
    } else {
        profileBtn.innerHTML = `
            <div class="login-avatar">
                <span>👤</span>
            </div>
            <div class="user-info-nav">
                <span class="login-text">Login</span>
                <span class="login-subtitle">Access Account</span>
            </div>
        `;
        profileBtn.classList.remove('logged-in');
        logoutBtn.style.display = 'none';
        loginBtn.style.display = 'block';
    }
}

function updateProfileModal() {
    if (!currentUser || !currentUser.name) {
        console.warn('No valid user data for profile modal');
        return;
    }

    const profileInfo = document.querySelector('.profile-info');
    profileInfo.innerHTML = `
        <div class="profile-info-row">
            <div class="profile-label">👤 Full Name</div>
            <div class="profile-value">${currentUser.name}</div>
        </div>
        <div class="profile-info-row">
            <div class="profile-label">📧 Email</div>
            <div class="profile-value">${currentUser.email}</div>
        </div>
        <div class="profile-info-row">
            <div class="profile-label">📱 Phone Number</div>
            <div class="profile-value">${currentUser.no_telp || 'Not provided'}</div>
        </div>
        <div class="profile-info-row">
            <div class="profile-label">📅 Member Since</div>
            <div class="profile-value">${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</div>
        </div>
    `;
}

// Load user bookings
async function loadUserBookings() {
    if (!currentUser) {
        myBookings = [];
        return;
    }

    try {
        const response = await api.getUserBookings(currentUser.id);
        const bookingsData = response.success ? response : response;
        const bookingsArray = Array.isArray(bookingsData) ? bookingsData : (bookingsData.data || []);
        myBookings = bookingsArray.map(booking => ({
            id: 'BK' + String(booking.id).padStart(3, '0'),
            roomName: booking.room_name || 'Room',
            startDate: booking.start_date,
            endDate: booking.end_date,
            total: booking.price,
            status: booking.status,
            company: booking.name
        }));
    } catch (error) {
        console.error('Failed to load user bookings:', error);
        myBookings = [];
    }
}

// Get status badge HTML and styling
function getStatusBadge(status) {
    const badges = {
        // Room statuses
        'available': { text: 'Available', class: 'badge-available' },
        'unavailable': { text: 'Unavailable', class: 'badge-occupied' },

        // Booking statuses
        'pending': { text: 'Pending', class: 'badge-pending' },
        'confirmed': { text: 'Confirmed', class: 'badge-available' },
        'cancelled': { text: 'Cancelled', class: 'badge-occupied' }
    };

    const badge = badges[status.toLowerCase()] || badges['available'];
    return `<div class="room-status-badge ${badge.class}">${badge.text}</div>`;
}

// Get status indicator line class for colored left border
function getStatusLineClass(status) {
    const statusLineMap = {
        // Booking statuses
        'pending': 'status-line-pending',
        'confirmed': 'status-line-confirmed',
        'cancelled': 'status-line-cancelled'
    };

    return statusLineMap[status.toLowerCase()] || 'status-line-pending';
}

// Render rooms
function renderRooms() {
    const grid = document.getElementById('roomsGrid');
    grid.innerHTML = rooms.map(room => {
        const isUnavailable = room.status === 'unavailable';
        const cardClass = isUnavailable ? 'room-card unavailable-room' : 'room-card';
        const clickHandler = isUnavailable ? '' : `onclick="openBookingModal(${room.id})"`;
        const buttonClass = isUnavailable ? 'btn disabled' : 'btn';
        const buttonText = isUnavailable ? 'Not Available' : 'Book Now';
        const buttonDisabled = isUnavailable ? 'disabled' : '';

        return `
            <div class="${cardClass}" ${clickHandler}>
                <div class="room-image" style="background-image: url('${room.image}')">
                    ${getStatusBadge(room.status)}
                    ${isUnavailable ? '<div class="unavailable-overlay"></div>' : ''}
                </div>
                <div class="room-info">
                    <div class="room-name">${room.name}</div>
                    <div class="room-details">${room.description}</div>
                    <div class="room-price">Rp ${room.price.toLocaleString('id-ID')}/day</div>
                    <button class="${buttonClass}" ${buttonDisabled}>${buttonText}</button>
                </div>
            </div>
        `;
    }).join('');
}

// Open booking modal
function openBookingModal(roomId) {
    if (!utils.isLoggedIn()) {
        showLoginWarning();
        return;
    }

    currentRoom = rooms.find(r => r.id === roomId);
    if (!currentRoom) {
        utils.showNotification('Room not found', 'error');
        return;
    }
    if (currentRoom.status === 'unavailable') {
        utils.showNotification('This room is not available for booking', 'error');
        return;
    }

    currentStep = 1;
    bookingData = {};
    document.getElementById('bookingModal').classList.add('active');
    renderStep1();
}

// Show login warning modal
function showLoginWarning() {
    const warningModal = document.createElement('div');
    warningModal.className = 'modal active';
    warningModal.id = 'loginWarningModal';
    warningModal.innerHTML = `
        <div class="modal-content modal-small">
            <span class="close-btn" onclick="closeLoginWarning()">&times;</span>
            <div class="warning-icon">⚠️</div>
            <h2>Login Required</h2>
            <p>You need to login first before you can book a room.</p>
            <div class="warning-buttons">
                <button class="btn" onclick="goToLogin()">Login Now</button>
                <button class="btn btn-secondary" onclick="closeLoginWarning()">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(warningModal);
}

function closeLoginWarning() {
    const modal = document.getElementById('loginWarningModal');
    if (modal) modal.remove();
}

function goToLogin() {
    closeLoginWarning();
    const currentUrl = window.location.href;
    window.location.href = `Login.html?return=${encodeURIComponent(currentUrl)}`;
}

// Step 1: Booking Details
function renderStep1() {
    updateSteps(1);
    document.getElementById('modalBody').innerHTML = `
        <h2>Booking Details</h2>
        <form id="bookingForm">
            <div class="form-group">
                <label>Company/Organization Name</label>
                <input type="text" id="guestName" required placeholder="Enter company name">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="guestEmail" required placeholder="your@email.com">
            </div>
            <div class="form-group">
                <label>Phone Number</label>
                <input type="tel" id="guestPhone" required placeholder="+62 xxx xxxx xxxx">
            </div>
            <div class="form-group">
                <label>Start Date</label>
                <input type="date" id="checkIn" required min="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <label>End Date</label>
                <input type="date" id="checkOut" required min="${new Date().toISOString().split('T')[0]}">
            </div>
            <button type="submit" class="btn">Continue to Payment</button>
        </form>
    `;

    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('checkOut');

    checkInInput.addEventListener('change', function() {
        checkOutInput.min = this.value;
        if (checkOutInput.value && checkOutInput.value <= this.value) {
            const nextDay = new Date(this.value);
            nextDay.setDate(nextDay.getDate() + 1);
            checkOutInput.value = nextDay.toISOString().split('T')[0];
        }
    });

    checkOutInput.addEventListener('change', function() {
        if (checkInInput.value && this.value <= checkInInput.value) {
            this.value = '';
            alert('End date must be after start date');
        }
    });

    document.getElementById('bookingForm').onsubmit = function(e) {
        e.preventDefault();
        bookingData.name = document.getElementById('guestName').value;
        bookingData.email = document.getElementById('guestEmail').value;
        bookingData.phone = document.getElementById('guestPhone').value;

        const checkInValue = document.getElementById('checkIn').value;
        const checkOutValue = document.getElementById('checkOut').value;

        if (!checkInValue || !checkOutValue) {
            alert('Please select both check-in and check-out dates');
            return;
        }

        const checkInDate = new Date(checkInValue);
        const checkOutDate = new Date(checkOutValue);

        if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
            alert('Please select valid dates');
            return;
        }

        bookingData.checkIn = checkInDate.toISOString().split('T')[0];
        bookingData.checkOut = checkOutDate.toISOString().split('T')[0];

        renderStep2();
    };
}

// Step 2: Payment
function renderStep2() {
    updateSteps(2);
    const days = calculateDays();
    const pricePerDay = currentRoom.price;
    const total = pricePerDay * days;

    document.getElementById('modalBody').innerHTML = `
        <h2>Payment Method</h2>
        <div class="booking-summary">
            <div class="summary-row">
                <span>Room:</span>
                <span>${currentRoom.name}</span>
            </div>
            <div class="summary-row">
                <span>Duration:</span>
                <span>${bookingData.checkIn} - ${bookingData.checkOut} (${days} ${days > 1 ? 'days' : 'day'})</span>
            </div>
            <div class="summary-row summary-total">
                <span>Total:</span>
                <span>Rp ${total.toLocaleString('id-ID')}</span>
            </div>
        </div>

        <div class="form-group">
            <label>Select Payment Method</label>
            <div class="payment-methods">
                <div class="payment-method" onclick="selectPayment('credit', this)">
                    <div>💳</div>
                    <div>Credit Card</div>
                </div>
                <div class="payment-method" onclick="selectPayment('bank', this)">
                    <div>🏦</div>
                    <div>Bank Transfer</div>
                </div>
                <div class="payment-method" onclick="selectPayment('ewallet', this)">
                    <div>📱</div>
                    <div>E-Wallet</div>
                </div>
                <div class="payment-method" onclick="selectPayment('cash', this)">
                    <div>💵</div>
                    <div>Cash</div>
                </div>
            </div>
        </div>

        <button class="btn" onclick="renderStep3()">Confirm Booking</button>
        <button class="btn btn-secondary" onclick="renderStep1()">Back</button>
    `;
}

// Select payment method
function selectPayment(method, element) {
    document.querySelectorAll('.payment-method').forEach(el => {
        el.classList.remove('selected');
    });
    element.closest('.payment-method').classList.add('selected');
    bookingData.paymentMethod = method;
}

// Step 3: Confirmation with API call
async function renderStep3() {
    if (!bookingData.paymentMethod) {
        utils.showNotification('Please select a payment method', 'error');
        return;
    }

    document.getElementById('modalBody').innerHTML = `
        <div class="loading-message">
            <div class="spinner"></div>
            <h2>Processing Booking...</h2>
            <p>Please wait while we confirm your booking.</p>
        </div>
    `;

    try {
        const days = calculateDays();
        const total = currentRoom.price * days;

        const bookingPayload = {
            room_id: currentRoom.id,
            name: bookingData.name,
            email: bookingData.email,
            phone_number: bookingData.phone,
            start_date: bookingData.checkIn,
            end_date: bookingData.checkOut,
            price: total,
            payment: bookingData.paymentMethod
        };

        
        const response = await api.createBooking(bookingPayload);

        const responseData = response.data || response;
        const bookingId = responseData.booking_id || response.booking_id || response.data?.booking_id;

        const isSuccess = response.success === true || response.data?.success === true ||
                         (responseData && (responseData.booking_id || response.booking_id));

        if (isSuccess) {
            // Success
            updateSteps(3);
            document.getElementById('modalBody').innerHTML = `
                <div class="success-message">
                    <div class="success-icon">✅</div>
                    <h2>Booking Confirmed!</h2>
                    <p>Your meeting room booking has been successfully confirmed.</p>
                    <p><strong>Booking ID: #${String(bookingId).padStart(3, '0')}</strong></p>

                    <div class="booking-summary">
                        <div class="summary-row">
                            <strong>Company:</strong>
                            <span>${bookingData.name}</span>
                        </div>
                        <div class="summary-row">
                            <strong>Email:</strong>
                            <span>${bookingData.email}</span>
                        </div>
                        <div class="summary-row">
                            <strong>Room:</strong>
                            <span>${currentRoom.name}</span>
                        </div>
                        <div class="summary-row">
                            <strong>Duration:</strong>
                            <span>${bookingData.checkIn} - ${bookingData.checkOut}</span>
                        </div>
                        <div class="summary-row">
                            <strong>Payment:</strong>
                            <span>${getPaymentName(bookingData.paymentMethod)}</span>
                        </div>
                        <div class="summary-row summary-total">
                            <strong>Total:</strong>
                            <span>${utils.formatRupiah(total)}</span>
                        </div>
                    </div>

                    <button class="btn" onclick="closeAndReset()">Done</button>
                </div>
            `;

            if (currentUser) {
                loadUserBookings();
            }
        }
    } catch (error) {
        // Error
        document.getElementById('modalBody').innerHTML = `
            <div class="error-message">
                <div class="error-icon">❌</div>
                <h2>Booking Failed</h2>
                <p>${error.message || 'Failed to create booking. Please try again.'}</p>
                <button class="btn" onclick="renderStep2()">Back to Payment</button>
                <button class="btn btn-secondary" onclick="closeAndReset()">Cancel</button>
            </div>
        `;
    }
}

// Cancel booking function
function cancelBooking(bookingId, roomName) {
    const cancelModal = document.createElement('div');
    cancelModal.className = 'modal active';
    cancelModal.id = 'cancelConfirmationModal';
    cancelModal.innerHTML = `
        <div class="modal-content modal-small">
            <span class="close-btn" onclick="closeCancelModal()">&times;</span>
            <div class="warning-icon">⚠️</div>
            <h2>Cancel Booking</h2>
            <p>Are you sure you want to cancel the booking for <strong>${roomName}</strong>?</p>
            <p class="warning-text">This action cannot be undone.</p>
            <div class="modal-buttons">
                <button class="btn btn-danger" onclick="confirmCancel('${bookingId}', '${roomName}')">Yes, Cancel Booking</button>
                <button class="btn btn-secondary" onclick="closeCancelModal()">Keep Booking</button>
            </div>
        </div>
    `;
    document.body.appendChild(cancelModal);
}

// Close cancel confirmation modal
function closeCancelModal() {
    const modal = document.getElementById('cancelConfirmationModal');
    if (modal) modal.remove();
}

// Confirm and process cancellation
async function confirmCancel(bookingId, roomName) {
    closeCancelModal();

    try {
        const loadingModal = document.createElement('div');
        loadingModal.className = 'modal active';
        loadingModal.id = 'cancelLoadingModal';
        loadingModal.innerHTML = `
            <div class="modal-content modal-small">
                <div class="loading-message">
                    <div class="spinner"></div>
                    <h2>Cancelling Booking...</h2>
                    <p>Please wait while we cancel your booking.</p>
                </div>
            </div>
        `;
        document.body.appendChild(loadingModal);

        const response = await api.updateBookingStatus(bookingId, 'cancelled');

        loadingModal.remove();

        if (response.success || response.data) {
            utils.showNotification('Booking cancelled successfully', 'success');
            loadUserBookings();
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab) {
                const filter = activeTab.textContent.toLowerCase();
                renderBookings(filter === 'all' ? 'all' : filter);
            }
        } else {
            utils.showNotification('Failed to cancel booking', 'error');
        }
    } catch (error) {
        const loadingModal = document.getElementById('cancelLoadingModal');
        if (loadingModal) loadingModal.remove();

        utils.showNotification('Error cancelling booking: ' + error.message, 'error');
    }
}

// Helper functions
function calculateDays() {
    if (!bookingData.checkIn || !bookingData.checkOut) return 1;
    const start = new Date(bookingData.checkIn);
    const end = new Date(bookingData.checkOut);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
}

function getPaymentName(method) {
    const names = {
        'credit': 'Credit Card',
        'bank': 'Bank Transfer',
        'ewallet': 'E-Wallet',
        'cash': 'Cash'
    };
    return names[method] || method;
}

function updateSteps(step) {
    document.querySelectorAll('.step').forEach((el, index) => {
        el.classList.remove('active', 'completed');
        if (index + 1 < step) {
            el.classList.add('completed');
        } else if (index + 1 === step) {
            el.classList.add('active');
        }
    });
}

function closeAndReset() {
    document.getElementById('bookingModal').classList.remove('active');
    currentRoom = null;
    currentStep = 1;
    bookingData = {};
}

// Render Bookings
function renderBookings(filter) {
    const list = document.getElementById('bookingsList');
    let filteredBookings = filter === 'all'
        ? myBookings
        : myBookings.filter(b => b.status === filter);

    if (filteredBookings.length === 0) {
        const emptyMessages = {
            'all': 'No bookings found',
            'pending': 'No pending bookings',
            'confirmed': 'No confirmed bookings',
            'cancelled': 'No cancelled bookings'
        };
        list.innerHTML = `<div class="no-bookings">${emptyMessages[filter] || 'No bookings found'}</div>`;
        return;
    }

    list.innerHTML = filteredBookings.map(booking => {
        const statusBadge = '';

        const statusLineClass = getStatusLineClass(booking.status);

        const cancelButton = booking.status === 'pending' ?
            `<button class="btn btn-cancel" onclick="cancelBooking('${booking.id.substring(2)}', '${booking.roomName}')">Cancel</button>` : '';

        return `
        <div class="booking-item">
            <div class="status-indicator ${statusLineClass}"></div>
            <div class="booking-row">
                <div class="booking-main">
                    <div class="booking-title">${booking.roomName}</div>
                    <div class="booking-date">${booking.startDate} - ${booking.endDate}</div>
                </div>
                <div class="booking-right">
                    <div class="booking-actions">
                        <div class="booking-price">Rp ${booking.total.toLocaleString('id-ID')}</div>
                        ${statusBadge}
                        ${cancelButton}
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// Filter Bookings
function filterBookings(filter, buttonElement) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');

    renderBookings(filter);
}

function initializeEventListeners() {
    function attachCloseListener(buttonId, modalId) {
        const closeBtn = document.getElementById(buttonId);
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.remove('active');
                }
            });
        }
    }

    attachCloseListener('closeModal', 'bookingModal');
    attachCloseListener('closeProfileModal', 'profileModal');
    attachCloseListener('closeBookingsModal', 'bookingsModal');

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });

    document.getElementById('profileBtn').onclick = function(e) {
        e.stopPropagation();
        document.getElementById('profileMenu').classList.toggle('active');
    };

    document.getElementById('profileMenu').addEventListener('click', function(e) {
        const target = e.target;

        if (target.id === 'logoutBtn' || target.parentElement.id === 'logoutBtn') {
            e.preventDefault();
            document.getElementById('profileMenu').classList.remove('active');
            utils.logout();
            setTimeout(() => {
                location.reload();
            }, 1000);
        }

        if (target.id === 'loginBtn' || target.parentElement.id === 'loginBtn') {
            e.preventDefault();
            document.getElementById('profileMenu').classList.remove('active');
            window.location.href = 'Login.html?return=' + encodeURIComponent(window.location.href);
        }

        if (target.id === 'profileUserBtn' || target.parentElement.id === 'profileUserBtn') {
            e.preventDefault();
            if (!currentUser) {
                showLoginWarning();
                return;
            }
            document.getElementById('profileMenu').classList.remove('active');
            document.getElementById('profileModal').classList.add('active');
            updateProfileModal();
        }

        if (target.id === 'myBookingsBtn' || target.parentElement.id === 'myBookingsBtn') {
            e.preventDefault();
            if (!currentUser) {
                showLoginWarning();
                return;
            }
            document.getElementById('profileMenu').classList.remove('active');
            document.getElementById('bookingsModal').classList.add('active');
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector('.tab-btn').classList.add('active');
            renderBookings('all');
        }
    });

    document.addEventListener('click', function() {
        document.getElementById('profileMenu').classList.remove('active');
    });
}

// Initialize on page load
window.addEventListener('load', function() {
    refreshLoginStatus();
    loadRooms();
    initializeEventListeners();
});