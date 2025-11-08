// Dashboard Controller - Simplified and maintainable
class DashboardController {
    constructor() {
        this.currentPage = 'bookings';
        this.init();
    }

    init() {
        this.checkSession();
        this.setupEventListeners();
        this.setupSearchListeners();
        this.navigateTo('bookings');
    }

    checkSession() {
        try {
            const admin = adminUtils.getCurrentAdmin();
            if (!admin) {
                window.location.href = 'login.html';
                return;
            }
        } catch (error) {
            console.error('Session error:', error);
            window.location.href = 'login.html';
        }
    }

    setupEventListeners() {
        const menuItems = document.querySelectorAll('.menu-item');
        const pageNames = ['bookings', 'rooms', 'customers'];

        menuItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                this.navigateTo(pageNames[index]);
            });
        });

        // Modal setup
        this.setupModal();
    }

    setupModal() {
        const modal = document.getElementById('detailModal');
        const closeBtn = document.querySelector('.close-modal');

        closeBtn.onclick = () => modal.style.display = 'none';
        window.onclick = (event) => {
            if (event.target === modal) modal.style.display = 'none';
        };
    }

    navigateTo(page) {
        this.currentPage = page;
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = this.getPageContent(page);

        this.updateActiveMenu(page);
        this.updateUserInfo();

        // Setup search listeners after DOM is updated
        setTimeout(() => {
            this.setupSearchListeners();
        }, 100);

        if (page === 'customers') {
            this.loadCustomersData();
        } else if (page === 'rooms') {
            this.loadRoomsData();
        } else if (page === 'bookings') {
            this.loadBookingsData();
        }
    }

    updateActiveMenu(page) {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });

        const pageIndex = {
            'bookings': 0,
            'rooms': 1,
            'customers': 2
        };

        const menuItems = document.querySelectorAll('.menu-item');
        if (menuItems[pageIndex[page]]) {
            menuItems[pageIndex[page]].classList.add('active');
        }
    }

    updateUserInfo() {
        const admin = adminUtils.getCurrentAdmin();
        if (!admin) return;

        const userNameElement = document.querySelector('.user-name');
        const userEmailElement = document.querySelector('.user-email');
        const avatarElement = document.querySelector('.avatar');

        if (userNameElement) userNameElement.textContent = admin.admin_name;
        if (userEmailElement) userEmailElement.textContent = `${admin.admin_name}@seru.com`;
        if (avatarElement) {
            const initials = admin.admin_name.split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
            avatarElement.textContent = initials;
        }
    }

    
    async loadCustomersData() {
        try {
            // Load customers data from API
            const response = await fetch('../api/dashboard.php?action=customers');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();

            // Check if response is HTML (error page) instead of JSON
            if (text.trim().startsWith('<')) {
                console.error('API returned HTML instead of JSON:', text.substring(0, 200));
                throw new Error('Server returned HTML error page instead of JSON');
            }

            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                console.error('Response text:', text.substring(0, 500));
                throw new Error('Invalid JSON response from server');
            }

            if (result.success) {
                this.updateCustomersUI(result.data);
            } else {
                throw new Error(result.error || 'API returned error');
            }
        } catch (error) {
            console.error('Error loading customers data:', error);
            this.showNotification(`Error loading customers data: ${error.message}`, 'error');

            // Fallback to empty data
            this.updateCustomersUI({
                customers: [],
                stats: { total_customers: 0, active_this_month: 0 }
            });
        }
    }

    async loadRoomsData() {
        try {
            // Load rooms data from API
            const response = await fetch('../api/dashboard.php?action=rooms');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();

            // Check if response is HTML (error page) instead of JSON
            if (text.trim().startsWith('<')) {
                console.error('API returned HTML instead of JSON:', text.substring(0, 200));
                throw new Error('Server returned HTML error page instead of JSON');
            }

            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                console.error('Response text:', text.substring(0, 500));
                throw new Error('Invalid JSON response from server');
            }

            if (result.success) {
                this.updateRoomsUI(result.data);
            } else {
                throw new Error(result.error || 'API returned error');
            }
        } catch (error) {
            console.error('Error loading rooms data:', error);
            this.showNotification(`Error loading rooms data: ${error.message}`, 'error');

            // Fallback to empty data
            this.updateRoomsUI({
                rooms: [],
                stats: { total_rooms: 0, available_rooms: 0, occupied_rooms: 0, total_today_bookings: 0 }
            });
        }
    }

    async loadBookingsData() {
        try {
            // Load bookings data from API
            const response = await fetch('../api/bookings.php');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();

            // Check if response is HTML (error page) instead of JSON
            if (text.trim().startsWith('<')) {
                console.error('API returned HTML instead of JSON:', text.substring(0, 200));
                throw new Error('Server returned HTML error page instead of JSON');
            }

            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                console.error('Response text:', text.substring(0, 500));
                throw new Error('Invalid JSON response from server');
            }

            if (result.success) {
                this.updateBookingsUI(result.data);
            } else {
                throw new Error(result.error || 'API returned error');
            }
        } catch (error) {
            console.error('Error loading bookings data:', error);
            this.showNotification(`Error loading bookings data: ${error.message}`, 'error');

            // Fallback to empty data
            this.updateBookingsUI([]);
        }
    }

    
    updateCustomersUI(data) {
        // Update statistics cards for customers tab
        const totalCustomersElement = document.getElementById('totalCustomersCount');
        const activeThisMonthElement = document.getElementById('activeThisMonthCount');

        if (totalCustomersElement) {
            totalCustomersElement.textContent = data.stats.total_customers;
        }

        if (activeThisMonthElement) {
            activeThisMonthElement.textContent = data.stats.active_this_month;
        }

        // Update customers table
        const customersTableBody = document.querySelector('.rooms-table tbody');
        if (customersTableBody && data.customers) {
            customersTableBody.innerHTML = '';
            data.customers.forEach(customer => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${customer.name}</td>
                    <td>${customer.email}</td>
                    <td>${customer.phone || '-'}</td>
                    <td>${customer.total_bookings} bookings</td>
                    <td>
                        <button class="btn-small btn-view" onclick="dashboard.showCustomerDetail(${customer.id})">View</button>
                        <button class="btn-small btn-delete" onclick="dashboard.deleteCustomer(${customer.id})">Delete</button>
                    </td>
                `;
                customersTableBody.appendChild(row);
            });
        }
    }

    updateRoomsUI(data) {
        // Update statistics cards for rooms tab
        const totalRoomsElement = document.getElementById('totalRoomsCount');
        if (totalRoomsElement) {
            totalRoomsElement.textContent = data.stats.total_rooms;
        }

        // Update rooms table
        const roomsTableBody = document.querySelector('.rooms-table tbody');
        if (roomsTableBody && data.rooms) {
            roomsTableBody.innerHTML = '';
            data.rooms.forEach(room => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${room.name}</td>
                    <td><span class="status-badge ${room.status_class}">${room.status === 'available' ? 'Available' : 'Not Available'}</span></td>
                    <td>${room.today_bookings} bookings</td>
                    <td>${room.price}</td>
                    <td>
                        <button class="btn-small btn-view" onclick="dashboard.showRoomDetail(${room.id})">View</button>
                        <button class="btn-small btn-edit" onclick="dashboard.showEditRoomModal(${room.id})">Edit</button>
                        <button class="btn-small btn-delete" onclick="dashboard.deleteRoom(${room.id})">Delete</button>
                    </td>
                `;
                roomsTableBody.appendChild(row);
            });
        }
    }

    updateBookingsUI(bookings) {
        // Update statistics cards for bookings tab
        const totalBookingsElement = document.getElementById('totalBookingsCount');
        const activeTodayElement = document.getElementById('activeTodayCount');

        if (totalBookingsElement) {
            totalBookingsElement.textContent = bookings ? bookings.length : 0;
        }

        if (activeTodayElement) {
            // Count active bookings for today
            const today = new Date().toISOString().split('T')[0];
            const activeTodayCount = bookings ? bookings.filter(booking =>
                booking.status === 'confirmed' &&
                booking.start_date <= today &&
                booking.end_date >= today
            ).length : 0;
            activeTodayElement.textContent = activeTodayCount;
        }

        // Update bookings table
        const bookingsTableBody = document.querySelector('.rooms-table tbody');
        if (bookingsTableBody && bookings) {
            bookingsTableBody.innerHTML = '';
            bookings.forEach(booking => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>#${String(booking.id).padStart(3, '0')}</td>
                    <td>${booking.name}</td>
                    <td>${booking.room_name || 'Unknown Room'}</td>
                    <td>${new Date(booking.start_date).toLocaleDateString('id-ID')}</td>
                    <td>${new Date(booking.end_date).toLocaleDateString('id-ID')}</td>
                    <td><span class="status-badge ${booking.status === 'confirmed' ? 'available' : 'occupied'}">${booking.status}</span></td>
                    <td>Rp ${parseInt(booking.price || 0).toLocaleString('id-ID')}</td>
                    <td>
                        <button class="btn-small btn-view" onclick="dashboard.showBookingDetail('${booking.id}')">View</button>
                    </td>
                `;
                bookingsTableBody.appendChild(row);
            });
        }
    }

    showNotification(message, type = 'success') {
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196F3'
        };

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${colors[type] || colors.success};
            color: white;
            border-radius: 5px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getPageContent(page) {
        return this.pages[page] || '';
    }

    // Page templates
    pages = {
        bookings: `
            <div class="header">
                <div>
                    <h1>Bookings Management</h1>
                    <p class="header-subtitle">Welcome back, Admin!</p>
                </div>
                <button class="btn-header" onclick="dashboard.showAddBookingModal()">+ New Booking</button>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon blue">📅</div>
                    <div class="stat-value" id="totalBookingsCount">0</div>
                    <div class="stat-label">Total Bookings</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">All Bookings</h2>
                    <div class="header-controls">
                        <input type="text" placeholder="Search booking..." class="search-input" id="bookingSearchInput">
                        <select class="filter-select" id="statusFilter">
                            <option value="">All Status</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
                <table class="rooms-table">
                    <thead>
                        <tr>
                            <th>Booking ID</th>
                            <th>Customer</th>
                            <th>Room</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Status</th>
                            <th>Amount</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>#BK001</td>
                            <td>PT. Teknologi Maju</td>
                            <td>Meeting Room</td>
                            <td>26 Oct 2025</td>
                            <td>26 Oct 2025</td>
                            <td><span class="status-badge available">Confirmed</span></td>
                            <td>Rp 500,000</td>
                            <td><button class="btn-small" onclick="dashboard.showBookingDetail('BK001')">View</button></td>
                        </tr>
                        <tr>
                            <td>#BK002</td>
                            <td>CV. Digital Creative</td>
                            <td>Private Office</td>
                            <td>26 Oct 2025</td>
                            <td>28 Oct 2025</td>
                            <td><span class="status-badge available">Confirmed</span></td>
                            <td>Rp 3,600,000</td>
                            <td><button class="btn-small" onclick="dashboard.showBookingDetail('BK002')">View</button></td>
                        </tr>
                        <tr>
                            <td>#BK003</td>
                            <td>Startup Indonesia</td>
                            <td>Virtual Office</td>
                            <td>27 Oct 2025</td>
                            <td>30 Oct 2025</td>
                            <td><span class="status-badge pending">Pending</span></td>
                            <td>Rp 2,800,000</td>
                            <td><button class="btn-small" onclick="dashboard.showBookingDetail('BK003')">View</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `,
        rooms: `
            <div class="header">
                <div>
                    <h1>Room Management</h1>
                    <p class="header-subtitle">Welcome back, Admin!</p>
                </div>
                <button class="btn-header" onclick="dashboard.showAddRoomModal()">+ Add Room</button>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon purple">🏢</div>
                    <div class="stat-value" id="totalRoomsCount">0</div>
                    <div class="stat-label">Total Rooms</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">All Rooms</h2>
                    <input type="text" placeholder="Search room..." class="search-input" id="roomSearchInput">
                </div>
                <table class="rooms-table">
                    <thead>
                        <tr>
                            <th>Room Name</th>
                            <th>Status</th>
                            <th>Today's Bookings</th>
                            <th>Price/Day</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Meeting Room</td>
                            <td><span class="status-badge occupied">Not Available</span></td>
                            <td>3 bookings</td>
                            <td>Rp 500,000</td>
                            <td><button class="btn-small">Edit</button></td>
                        </tr>
                        <tr>
                            <td>Private Office</td>
                            <td><span class="status-badge available">Available</span></td>
                            <td>2 bookings</td>
                            <td>Rp 1,200,000</td>
                            <td><button class="btn-small">Edit</button></td>
                        </tr>
                        <tr>
                            <td>Virtual Office</td>
                            <td><span class="status-badge occupied">Not Available</span></td>
                            <td>4 bookings</td>
                            <td>Rp 700,000</td>
                            <td><button class="btn-small">Edit</button></td>
                        </tr>
                        <tr>
                            <td>Class Room</td>
                            <td><span class="status-badge available">Available</span></td>
                            <td>2 bookings</td>
                            <td>Rp 250,000</td>
                            <td><button class="btn-small">Edit</button></td>
                        </tr>
                        <tr>
                            <td>Coworking Space</td>
                            <td><span class="status-badge available">Available</span></td>
                            <td>1 booking</td>
                            <td>Rp 950,000</td>
                            <td><button class="btn-small">Edit</button></td>
                        </tr>
                        <tr>
                            <td>Event Space</td>
                            <td><span class="status-badge occupied">Not Available</span></td>
                            <td>5 bookings</td>
                            <td>Rp 350,000</td>
                            <td><button class="btn-small">Edit</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `,
        customers: `
            <div class="header">
                <div>
                    <h1>Customers</h1>
                    <p class="header-subtitle">Welcome back, Admin!</p>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon blue">👥</div>
                    <div class="stat-value" id="totalCustomersCount">0</div>
                    <div class="stat-label">Total Customers</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">📅</div>
                    <div class="stat-value" id="activeThisMonthCount">0</div>
                    <div class="stat-label">Active This Month</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Customer List</h2>
                    <input type="text" placeholder="Search customer..." class="search-input" id="customerSearchInput">
                </div>
                <table class="rooms-table">
                    <thead>
                        <tr>
                            <th>Customer Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Total Bookings</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>PT. Teknologi Maju</td>
                            <td>info@teknologimaju.com</td>
                            <td>+62 21 1234567</td>
                            <td>15 bookings</td>
                            <td><button class="btn-small" onclick="dashboard.showCustomerDetail('teknologi-maju')">View</button></td>
                        </tr>
                        <tr>
                            <td>CV. Digital Creative</td>
                            <td>contact@digitalcreative.id</td>
                            <td>+62 21 9876543</td>
                            <td>8 bookings</td>
                            <td><button class="btn-small" onclick="dashboard.showCustomerDetail('digital-creative')">View</button></td>
                        </tr>
                        <tr>
                            <td>Startup Indonesia</td>
                            <td>hello@startupid.com</td>
                            <td>+62 812 3456789</td>
                            <td>22 bookings</td>
                            <td><button class="btn-small" onclick="dashboard.showCustomerDetail('startup-indonesia')">View</button></td>
                        </tr>
                        <tr>
                            <td>Konsultan Bisnis</td>
                            <td>admin@konsultanbisnis.co.id</td>
                            <td>+62 21 5551234</td>
                            <td>5 bookings</td>
                            <td><button class="btn-small" onclick="dashboard.showCustomerDetail('konsultan-bisnis')">View</button></td>
                        </tr>
                        <tr>
                            <td>PT. Sukses Makmur</td>
                            <td>cs@suksesmakmur.com</td>
                            <td>+62 21 7778888</td>
                            <td>18 bookings</td>
                            <td><button class="btn-small" onclick="dashboard.showCustomerDetail('sukses-makmur')">View</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `
    };

    // Modal and detail methods
    async showBookingDetail(bookingId) {
        try {
            // Show loading modal
            const modalBody = document.getElementById('modalBody');
            modalBody.innerHTML = `
                <div class="loading-message">
                    <div class="spinner"></div>
                    <h2>Loading Booking Details...</h2>
                    <p>Please wait while we fetch the information.</p>
                </div>
            `;
            document.getElementById('detailModal').style.display = 'block';

            // Extract numeric ID from booking ID (remove BK prefix if exists)
            const numericId = bookingId.replace('BK', '');

            // Get booking data from API
            const response = await fetch(`../api/bookings.php?action=get_booking&id=${numericId}`);
            const result = await response.json();

            if (result.success) {
                modalBody.innerHTML = this.getBookingDetailTemplate(result.data);
            } else {
                this.closeModal();
                this.showNotification('Booking not found', 'error');
            }
        } catch (error) {
            console.error('Error loading booking details:', error);
            this.closeModal();
            this.showNotification('Error loading booking details', 'error');
        }
    }

    async showCustomerDetail(customerId) {
        try {
            // Show loading modal
            const modalBody = document.getElementById('modalBody');
            modalBody.innerHTML = `
                <div class="loading-message">
                    <div class="spinner"></div>
                    <h2>Loading Customer Details...</h2>
                    <p>Please wait while we fetch the information.</p>
                </div>
            `;
            document.getElementById('detailModal').style.display = 'block';

            // Get customer data from API
            const customerResponse = await fetch(`../api/dashboard.php?action=user&id=${customerId}`);
            const customerResult = await customerResponse.json();

            if (!customerResult.success) {
                this.closeModal();
                this.showNotification('Customer not found', 'error');
                return;
            }

            // Get customer bookings from API
            const bookingResponse = await fetch(`../api/bookings.php?action=user_bookings&user_id=${customerId}`);
            const bookingResult = await bookingResponse.json();

            const bookingData = bookingResult.success ? bookingResult.data : [];

            this.showCustomerDetailModal(customerResult.data, bookingData);

        } catch (error) {
            console.error('Error loading customer details:', error);
            this.closeModal();
            this.showNotification('Error loading customer details', 'error');
        }
    }

    showCustomerDetailModal(customer, bookingData) {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = this.getCustomerDetailTemplate(customer, bookingData);
    }

    async showRoomDetail(roomId) {
        try {
            // Get room details from rooms API
            const response = await fetch(`../api/rooms.php?action=get_room&id=${roomId}`);
            const result = await response.json();

            if (result.success) {
                this.showRoomDetailModal(result.data);
            } else {
                this.showNotification('Error loading room details', 'error');
            }
        } catch (error) {
            console.error('Error loading room details:', error);
            this.showNotification('Error loading room details', 'error');
        }
    }

    showRoomDetailModal(room) {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = this.getRoomDetailTemplate(room);

        document.getElementById('detailModal').style.display = 'block';
    }

    async showEditRoomModal(roomId) {
        try {
            // Get room details from rooms API
            const response = await fetch(`../api/rooms.php?action=get_room&id=${roomId}`);
            const result = await response.json();

            if (result.success) {
                this.showEditRoomModalContent(result.data);
            } else {
                this.showNotification('Error loading room details', 'error');
            }
        } catch (error) {
            console.error('Error loading room details:', error);
            this.showNotification('Error loading room details', 'error');
        }
    }

    showEditRoomModalContent(room) {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = this.getEditRoomTemplate(room);

        document.getElementById('detailModal').style.display = 'block';

        // Setup form handlers
        this.setupEditRoomForm(room);
    }

    showAddRoomModal() {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = this.getAddRoomTemplate();

        document.getElementById('detailModal').style.display = 'block';

        // Setup form handlers
        this.setupAddRoomForm();
    }

    showAddBookingModal() {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = this.getAddBookingTemplate();

        document.getElementById('detailModal').style.display = 'block';

        // Setup form handlers
        this.setupAddBookingForm();
    }

    setupEditRoomForm(room) {
        const form = document.getElementById('editRoomForm');
        if (!form) return;

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEditRoomSubmit(room.id);
        });
    }

    setupAddRoomForm() {
        const form = document.getElementById('addRoomForm');
        if (!form) return;

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddRoomSubmit();
        });
    }

    async handleEditRoomSubmit(roomId) {
        const form = document.getElementById('editRoomForm');
        if (!form) return;

        const formData = new FormData(form);

        try {
            this.showNotification('Updating room...', 'info');

            // Update room data (tanpa image_url)
            const roomData = {
                room_name: formData.get('room_name'),
                price: formData.get('price'),
                description: formData.get('description'),
                status: formData.get('status')
            };

            const response = await fetch(`../api/rooms.php?id=${roomId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(roomData)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Room updated successfully!', 'success');
                this.closeModal();
                // Reload rooms data
                this.loadRoomsData();
            } else {
                throw new Error(result.error || 'Failed to update room');
            }
        } catch (error) {
            console.error('Error updating room:', error);
            this.showNotification('Error updating room: ' + error.message, 'error');
        }
    }

    async handleAddRoomSubmit() {
        const form = document.getElementById('addRoomForm');
        if (!form) return;

        const formData = new FormData(form);

        try {
            this.showNotification('Creating room...', 'info');

            // Create room data
            const roomData = {
                room_name: formData.get('room_name'),
                price: formData.get('price'),
                description: formData.get('description'),
                status: formData.get('status')
            };

            const response = await fetch('../api/rooms.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(roomData)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Room created successfully!', 'success');
                this.closeModal();
                // Reload rooms data
                this.loadRoomsData();
            } else {
                throw new Error(result.error || 'Failed to create room');
            }
        } catch (error) {
            console.error('Error creating room:', error);
            this.showNotification('Error creating room: ' + error.message, 'error');
        }
    }

    closeModal() {
        document.getElementById('detailModal').style.display = 'none';
    }

    getBookingDetailTemplate(booking) {
        // Calculate duration in days
        const startDate = new Date(booking.start_date);
        const endDate = new Date(booking.end_date);
        const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        return `
            <h2>Booking Details</h2>
            <div class="detail-grid">
                <div class="detail-item"><label>Booking ID:</label><span>#${String(booking.id).padStart(3, '0')}</span></div>
                <div class="detail-item">
                    <label>Status:</label>
                    <span class="status-badge ${booking.status === 'confirmed' ? 'available' : 'occupied'}">${booking.status}</span>
                </div>
                <div class="detail-item"><label>Customer Name:</label><span>${booking.name}</span></div>
                <div class="detail-item"><label>Email:</label><span>${booking.email}</span></div>
                <div class="detail-item"><label>Phone:</label><span>${booking.phone_number || '-'}</span></div>
                <div class="detail-item"><label>Room:</label><span>${booking.room_name || 'Unknown Room'}</span></div>
                <div class="detail-item"><label>Start Date:</label><span>${new Date(booking.start_date).toLocaleDateString('id-ID')}</span></div>
                <div class="detail-item"><label>End Date:</label><span>${new Date(booking.end_date).toLocaleDateString('id-ID')}</span></div>
                <div class="detail-item"><label>Duration:</label><span>${duration} day${duration > 1 ? 's' : ''}</span></div>
                <div class="detail-item"><label>Total Price:</label><span>Rp ${parseInt(booking.price || 0).toLocaleString('id-ID')}</span></div>
                <div class="detail-item"><label>Payment Method:</label><span>${booking.payment || 'Not specified'}</span></div>
                <div class="detail-item"><label>Created:</label><span>${new Date(booking.created_at).toLocaleDateString('id-ID')}</span></div>
            </div>
            <div class="modal-actions">
                <button class="btn-primary" onclick="dashboard.closeModal()">Close</button>
            </div>
        `;
    }

    getCustomerDetailTemplate(customer, bookingData) {
        const totalBookings = bookingData ? bookingData.length : 0;

        // Calculate booking statistics
        const activeBookings = bookingData ?
            bookingData.filter(booking => booking.status === 'confirmed').length : 0;
        const cancelledBookings = bookingData ?
            bookingData.filter(booking => booking.status === 'cancelled').length : 0;

        // Find last booking date
        const lastBooking = bookingData && bookingData.length > 0 ?
            bookingData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] : null;

        return `
            <h2>Customer Details</h2>
            <div class="detail-grid">
                <div class="detail-item"><label>Customer ID:</label><span>#${String(customer.id).padStart(3, '0')}</span></div>
                <div class="detail-item"><label>Name:</label><span>${customer.name}</span></div>
                <div class="detail-item"><label>Email:</label><span>${customer.email}</span></div>
                <div class="detail-item"><label>Phone:</label><span>${customer.phone || '-'}</span></div>
                <div class="detail-item"><label>Total Bookings:</label><span>${totalBookings} bookings</span></div>
                <div class="detail-item"><label>Active Bookings:</label><span>${activeBookings} bookings</span></div>
                <div class="detail-item"><label>Cancelled Bookings:</label><span>${cancelledBookings} bookings</span></div>
                <div class="detail-item"><label>Last Booking:</label><span>${lastBooking ? new Date(lastBooking.created_at).toLocaleDateString('id-ID') : 'No bookings'}</span></div>

                <div class="detail-item full-width">
                    <label>Recent Booking Activity:</label>
                    <div style="margin-top: 10px; max-height: 200px; overflow-y: auto;">
                        ${bookingData && bookingData.length > 0 ?
                            bookingData
                                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                .slice(0, 5)
                                .map(booking => {
                                    const statusClass = booking.status === 'confirmed' ? 'available' : 'occupied';
                                    return `
                                        <div style="padding: 10px; background: #f8f9fa; margin-bottom: 8px; border-radius: 4px; border-left: 4px solid #667eea;">
                                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                                <div>
                                                    <strong>${booking.room_name || 'Unknown Room'}</strong><br>
                                                    <small>${booking.start_date} - ${booking.end_date}</small>
                                                </div>
                                                <div style="text-align: right;">
                                                    <span class="status-badge ${statusClass}">${booking.status}</span><br>
                                                    <small>Rp ${parseInt(booking.price || 0).toLocaleString('id-ID')}</small>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('') :
                            '<div style="color: #666; padding: 20px; text-align: center; background: #f8f9fa; border-radius: 4px;">No bookings found</div>'
                        }
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn-primary" onclick="dashboard.closeModal()">Close</button>
            </div>
        `;
    }

    getRoomDetailTemplate(room) {
        return `
            <h2>Room Details</h2>
            <div class="detail-grid">
                <div class="detail-item"><label>Room Name:</label><span>${room.room_name}</span></div>
                <div class="detail-item"><label>Room ID:</label><span>#${String(room.id).padStart(3, '0')}</span></div>
                <div class="detail-item"><label>Price:</label><span>${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(room.price)}</span></div>
                <div class="detail-item">
                    <label>Status:</label>
                    <span class="status-badge ${room.status === 'available' ? 'available' : 'occupied'}">${room.status === 'available' ? 'Available' : 'Not Available'}</span>
                </div>
                <div class="detail-item full-width">
                    <label>Description:</label><span>${room.description || 'No description available'}</span></div>
            </div>
            <div class="modal-actions">
                <button class="btn-primary" onclick="dashboard.closeModal()">Close</button>
            </div>
        `;
    }

    getEditRoomTemplate(room) {
        return `
            <h2>Edit Room</h2>
            <form id="editRoomForm">
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Room Name:</label>
                        <input type="text" name="room_name" value="${room.room_name}" required style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                    </div>
                    <div class="detail-item">
                        <label>Price:</label>
                        <input type="number" name="price" value="${room.price}" required style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <select name="status" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                            <option value="available" ${room.status === 'available' ? 'selected' : ''}>Available</option>
                            <option value="unavailable" ${room.status === 'unavailable' ? 'selected' : ''}>Not Available</option>
                        </select>
                    </div>
                    <div class="detail-item full-width">
                        <label>Description:</label>
                        <textarea name="description" rows="3" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%; resize: vertical;">${room.description || ''}</textarea>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="dashboard.closeModal()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;">Cancel</button>
                    <button type="submit" class="btn-primary" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Update Room</button>
                </div>
            </form>
        `;
    }

    getAddRoomTemplate() {
        return `
            <h2>Add New Room</h2>
            <form id="addRoomForm">
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Room Name:</label>
                        <input type="text" name="room_name" placeholder="Enter room name" required style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                    </div>
                    <div class="detail-item">
                        <label>Price per Day:</label>
                        <input type="number" name="price" placeholder="Enter price" required min="0" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <select name="status" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                            <option value="available" selected>Available</option>
                            <option value="unavailable">Not Available</option>
                        </select>
                    </div>
                    <div class="detail-item full-width">
                        <label>Description:</label>
                        <textarea name="description" rows="3" placeholder="Enter room description" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%; resize: vertical;"></textarea>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="dashboard.closeModal()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;">Cancel</button>
                    <button type="submit" class="btn-primary" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Add Room</button>
                </div>
            </form>
        `;
    }

    getAddBookingTemplate() {
        return `
            <h2>Add New Booking</h2>
            <form id="addBookingForm">
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Customer Name:</label>
                        <input type="text" name="name" placeholder="Enter customer name" required style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                    </div>
                    <div class="detail-item">
                        <label>Email:</label>
                        <input type="email" name="email" placeholder="Enter email address" required style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                    </div>
                    <div class="detail-item">
                        <label>Phone Number:</label>
                        <input type="tel" name="phone_number" placeholder="Enter phone number" required style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                    </div>
                    <div class="detail-item">
                        <label>Room:</label>
                        <select name="room_id" required style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                            <option value="">Select a room</option>
                        </select>
                    </div>
                    <div class="detail-item">
                        <label>Start Date:</label>
                        <input type="date" name="start_date" required style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                    </div>
                    <div class="detail-item">
                        <label>End Date:</label>
                        <input type="date" name="end_date" required style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                    </div>
                    <div class="detail-item">
                        <label>Total Price:</label>
                        <input type="number" name="price" placeholder="Enter total price" required min="0" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                    </div>
                    <div class="detail-item">
                        <label>Payment Method:</label>
                        <select name="payment" required style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                            <option value="">Select payment method</option>
                            <option value="Cash">Cash</option>
                            <option value="Transfer">Bank Transfer</option>
                            <option value="Credit Card">Credit Card</option>
                            <option value="E-Wallet">E-Wallet</option>
                        </select>
                    </div>
                    <div class="detail-item full-width">
                        <label>Status:</label>
                        <select name="status" required style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                            <option value="confirmed">Confirmed</option>
                            <option value="pending">Pending</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="dashboard.closeModal()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;">Cancel</button>
                    <button type="submit" class="btn-primary" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Add Booking</button>
                </div>
            </form>
        `;
    }

    setupAddBookingForm() {
        const form = document.getElementById('addBookingForm');
        if (!form) return;

        // Load rooms for dropdown
        this.loadRoomsForBooking();

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddBookingSubmit();
        });

        // Handle date validation
        const startDateInput = form.querySelector('input[name="start_date"]');
        const endDateInput = form.querySelector('input[name="end_date"]');

        startDateInput.addEventListener('change', () => {
            endDateInput.min = startDateInput.value;
        });
    }

    async loadRoomsForBooking() {
        try {
            const response = await fetch('../api/dashboard.php?action=rooms');
            const result = await response.json();

            if (result.success && result.data.rooms) {
                const roomSelect = document.querySelector('select[name="room_id"]');
                if (roomSelect) {
                    roomSelect.innerHTML = '<option value="">Select a room</option>';
                    result.data.rooms.forEach(room => {
                        if (room.status === 'available') {
                            roomSelect.innerHTML += `<option value="${room.id}">${room.name} - Rp ${parseInt(room.price).toLocaleString('id-ID')}/day</option>`;
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error loading rooms:', error);
        }
    }

    async handleAddBookingSubmit() {
        const form = document.getElementById('addBookingForm');
        if (!form) return;

        const formData = new FormData(form);

        try {
            this.showNotification('Creating booking...', 'info');

            // Create booking data
            const bookingData = {
                user_id: null, // Can be null for walk-in customers
                room_id: parseInt(formData.get('room_id')),
                name: formData.get('name'),
                email: formData.get('email'),
                phone_number: formData.get('phone_number'),
                start_date: formData.get('start_date'),
                end_date: formData.get('end_date'),
                price: parseInt(formData.get('price')),
                payment: formData.get('payment'),
                status: formData.get('status')
            };

            const response = await fetch('../api/bookings.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingData)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Booking created successfully!', 'success');
                this.closeModal();
                // Reload bookings data
                this.loadBookingsData();
            } else {
                throw new Error(result.error || 'Failed to create booking');
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            this.showNotification('Error creating booking: ' + error.message, 'error');
        }
    }

    // Data storage
    bookingsData = {
        'BK001': {
            id: '#BK001', customer: 'PT. Teknologi Maju', email: 'info@teknologimaju.com', phone: '+62 21 1234567',
            room: 'Meeting Room', startDate: '26 October 2025', endDate: '26 October 2025', duration: '1 Day',
            status: 'Confirmed', amount: 'Rp 500,000', paymentStatus: 'Paid',
            notes: 'Membutuhkan projector dan whiteboard tambahan'
        },
        'BK002': {
            id: '#BK002', customer: 'CV. Digital Creative', email: 'contact@digitalcreative.id', phone: '+62 21 9876543',
            room: 'Private Office', startDate: '26 October 2025', endDate: '28 October 2025', duration: '3 Days',
            status: 'Confirmed', amount: 'Rp 3,600,000', paymentStatus: 'Paid',
            notes: 'Event launching produk baru'
        },
        'BK003': {
            id: '#BK003', customer: 'Startup Indonesia', email: 'hello@startupid.com', phone: '+62 812 3456789',
            room: 'Virtual Office', startDate: '27 October 2025', endDate: '30 October 2025', duration: '4 Days',
            status: 'Pending', amount: 'Rp 2,800,000', paymentStatus: 'Pending',
            notes: 'Alamat virtual untuk bisnis startup'
        }
    };

    customersData = {
        'teknologi-maju': {
            name: 'PT. Teknologi Maju', email: 'info@teknologimaju.com', phone: '+62 21 1234567',
            address: 'Jl. Teknologi No. 123, Jakarta', totalBookings: 15, totalSpent: 'Rp 7,500,000',
            joinDate: '15 Januari 2024', status: 'Active'
        },
        'digital-creative': {
            name: 'CV. Digital Creative', email: 'contact@digitalcreative.id', phone: '+62 21 9876543',
            address: 'Jl. Kreatif No. 45, Jakarta', totalBookings: 8, totalSpent: 'Rp 4,200,000',
            joinDate: '20 Maret 2024', status: 'Active'
        },
        'startup-indonesia': {
            name: 'Startup Indonesia', email: 'hello@startupid.com', phone: '+62 812 3456789',
            address: 'Jl. Startup No. 78, Jakarta', totalBookings: 22, totalSpent: 'Rp 15,400,000',
            joinDate: '10 Februari 2024', status: 'Active'
        },
        'konsultan-bisnis': {
            name: 'Konsultan Bisnis', email: 'admin@konsultanbisnis.co.id', phone: '+62 21 5551234',
            address: 'Jl. Bisnis No. 234, Jakarta', totalBookings: 5, totalSpent: 'Rp 1,250,000',
            joinDate: '5 Maret 2024', status: 'Active'
        },
        'sukses-makmur': {
            name: 'PT. Sukses Makmur', email: 'cs@suksesmakmur.com', phone: '+62 21 7778888',
            address: 'Jl. Sukses No. 567, Jakarta', totalBookings: 18, totalSpent: 'Rp 17,100,000',
            joinDate: '1 Januari 2024', status: 'Active'
        }
    };

    // Search functionality
    setupSearchListeners() {
        // Room search
        const roomSearchInput = document.getElementById('roomSearchInput');
        if (roomSearchInput) {
            roomSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchRooms(e.target.value);
                }
            });
        }

        // Customer search
        const customerSearchInput = document.getElementById('customerSearchInput');
        if (customerSearchInput) {
            customerSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchCustomers(e.target.value);
                }
            });
        }

        // Booking search
        const bookingSearchInput = document.getElementById('bookingSearchInput');
        if (bookingSearchInput) {
            bookingSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchBookings();
                }
            });
        }

        // Booking status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.searchBookings();
            });
        }
    }

    searchRooms(searchTerm) {
        const tableBody = document.querySelector('#mainContent .rooms-table tbody');
        const rows = tableBody ? tableBody.querySelectorAll('tr') : [];

        if (!searchTerm) {
            // If search is empty, show all rows
            rows.forEach(row => row.style.display = '');
            return;
        }

        const lowerSearchTerm = searchTerm.toLowerCase();

        rows.forEach(row => {
            const roomName = row.cells[0]?.textContent.toLowerCase() || '';
            const status = row.cells[1]?.textContent.toLowerCase() || '';

            if (roomName.includes(lowerSearchTerm) || status.includes(lowerSearchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    searchCustomers(searchTerm) {
        const tableBody = document.querySelector('#mainContent .rooms-table tbody');
        const rows = tableBody ? tableBody.querySelectorAll('tr') : [];

        if (!searchTerm) {
            // If search is empty, show all rows
            rows.forEach(row => row.style.display = '');
            return;
        }

        const lowerSearchTerm = searchTerm.toLowerCase();

        rows.forEach(row => {
            const customerName = row.cells[0]?.textContent.toLowerCase() || '';
            const email = row.cells[1]?.textContent.toLowerCase() || '';
            const phone = row.cells[2]?.textContent.toLowerCase() || '';

            if (customerName.includes(lowerSearchTerm) ||
                email.includes(lowerSearchTerm) ||
                phone.includes(lowerSearchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    searchBookings() {
        const tableBody = document.querySelector('#mainContent .rooms-table tbody');
        const rows = tableBody ? tableBody.querySelectorAll('tr') : [];

        // Get all filter values
        const searchTerm = document.getElementById('bookingSearchInput')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';

        rows.forEach(row => {
            let showRow = true;

            // Text search filter (search by ID, customer, room)
            if (searchTerm) {
                const bookingId = row.cells[0]?.textContent.toLowerCase() || '';
                const customer = row.cells[1]?.textContent.toLowerCase() || '';
                const room = row.cells[2]?.textContent.toLowerCase() || '';

                if (!bookingId.includes(searchTerm) &&
                    !customer.includes(searchTerm) &&
                    !room.includes(searchTerm)) {
                    showRow = false;
                }
            }

            // Status filter (only apply if status is selected)
            if (statusFilter && showRow) {
                const status = row.cells[5]?.textContent.toLowerCase() || '';
                if (status !== statusFilter.toLowerCase()) {
                    showRow = false;
                }
            }

            // Show or hide row
            row.style.display = showRow ? '' : 'none';
        });
    }

    // Delete functionality
    async deleteCustomer(customerId) {
        // Get customer data for display in modal
        try {
            const response = await fetch(`../api/dashboard.php?action=user&id=${customerId}`);
            const result = await response.json();

            if (result.success) {
                this.showDeleteModal('customer', result.data);
            } else {
                this.showNotification('Customer not found', 'error');
            }
        } catch (error) {
            console.error('Error fetching customer data:', error);
            this.showNotification('Error fetching customer data', 'error');
        }
    }

    async deleteRoom(roomId) {
        // Get room data for display in modal
        try {
            const response = await fetch(`../api/rooms.php?action=get_room&id=${roomId}`);
            const result = await response.json();

            if (result.success) {
                this.showDeleteModal('room', result.data);
            } else {
                this.showNotification('Room not found', 'error');
            }
        } catch (error) {
            console.error('Error fetching room data:', error);
            this.showNotification('Error fetching room data', 'error');
        }
    }

    // Delete modal functionality
    showDeleteModal(type, data) {
        const modalBody = document.getElementById('deleteModalBody');
        const isCustomer = type === 'customer';

        const title = `Delete ${isCustomer ? 'Customer' : 'Room'}`;
        const message = `Are you sure you want to delete this ${isCustomer ? 'customer' : 'room'}? This action cannot be undone.`;

        const details = isCustomer ?
            `<div class="delete-details">
                <div class="delete-detail-item">
                    <span class="delete-detail-label">Name:</span>
                    <span class="delete-detail-value">${data.name}</span>
                </div>
                <div class="delete-detail-item">
                    <span class="delete-detail-label">Email:</span>
                    <span class="delete-detail-value">${data.email}</span>
                </div>
                <div class="delete-detail-item">
                    <span class="delete-detail-label">Phone:</span>
                    <span class="delete-detail-value">${data.phone || '-'}</span>
                </div>
            </div>` :
            `<div class="delete-details">
                <div class="delete-detail-item">
                    <span class="delete-detail-label">Room Name:</span>
                    <span class="delete-detail-value">${data.room_name}</span>
                </div>
                <div class="delete-detail-item">
                    <span class="delete-detail-label">Price/Day:</span>
                    <span class="delete-detail-value">Rp ${parseInt(data.price || 0).toLocaleString('id-ID')}</span>
                </div>
                <div class="delete-detail-item">
                    <span class="delete-detail-label">Status:</span>
                    <span class="delete-detail-value">${data.status || 'Unknown'}</span>
                </div>
            </div>`;

        modalBody.innerHTML = `
            <div class="delete-confirmation">
                <div class="delete-icon">🗑️</div>
                <h2 class="delete-title">${title}</h2>
                <p class="delete-message">${message}</p>
                ${details}
                <div class="delete-actions">
                    <button class="btn-cancel-delete" onclick="closeDeleteModal()">Cancel</button>
                    <button class="btn-confirm-delete" onclick="confirmDelete('${type}', ${data.id})">
                        Delete ${isCustomer ? 'Customer' : 'Room'}
                    </button>
                </div>
            </div>
        `;

        document.getElementById('deleteModal').style.display = 'block';
    }

    async confirmDelete(type, id) {
        try {
            this.showNotification(`Deleting ${type}...`, 'info');

            const url = type === 'customer' ?
                `../api/dashboard.php?action=delete_customer&id=${id}` :
                `../api/rooms.php?id=${id}`;

            const response = await fetch(url, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(`${type === 'customer' ? 'Customer' : 'Room'} deleted successfully!`, 'success');
                closeDeleteModal();

                // Reload relevant data
                if (type === 'customer') {
                    this.loadCustomersData();
                } else {
                    this.loadRoomsData();
                }
            } else {
                throw new Error(result.error || `Failed to delete ${type}`);
            }
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
            this.showNotification(`Error deleting ${type}: ` + error.message, 'error');
        }
    }
}

// Global functions for backward compatibility
function logout() {
    adminUtils.logout();
}

function clearSession() {
    localStorage.removeItem('adminSession');
    alert('Session cleared! Page will reload.');
    location.reload();
}

// Delete modal global functions
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
}

function confirmDelete(type, id) {
    if (dashboard) {
        dashboard.confirmDelete(type, id);
    }
}

// Initialize dashboard
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new DashboardController();
});