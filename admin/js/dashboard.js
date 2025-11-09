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

    async handleApiCall(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            const data = await response.json();

            if (response.status === 401 && data.redirect) {
                window.location.href = data.redirect;
                return null;
            }

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API call error:', error);

            if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
                window.location.href = 'login.html';
                return null;
            }

            throw error;
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

        const logoutMenu = document.querySelector('.logout-menu');
        if (logoutMenu) {
            logoutMenu.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        this.setupModal();
    }

    setupModal() {
        const detailModal = document.getElementById('detailModal');
        const detailCloseBtn = detailModal?.querySelector('.close-modal');

        if (detailCloseBtn) {
            detailCloseBtn.onclick = () => detailModal.style.display = 'none';
        }
        const logoutModal = document.getElementById('logoutModal');
        const logoutCloseBtn = logoutModal?.querySelector('.close-modal');

        if (logoutCloseBtn) {
            logoutCloseBtn.onclick = () => logoutModal.style.display = 'none';
        }

        window.onclick = (event) => {
            if (event.target === detailModal) detailModal.style.display = 'none';
            if (event.target === logoutModal) logoutModal.style.display = 'none';
            if (event.target === document.getElementById('deleteModal')) {
                document.getElementById('deleteModal').style.display = 'none';
            }
        };
    }

    navigateTo(page) {
        this.currentPage = page;
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = this.getPageContent(page);

        this.updateActiveMenu(page);
        this.updateUserInfo();

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

    logout() {
        this.showLogoutModal();
    }

    showLogoutModal() {
        const modal = document.getElementById('logoutModal');
        const modalBody = document.getElementById('logoutModalBody');

        modalBody.innerHTML = `
            <div class="delete-confirmation">
                <div class="delete-icon">🚪</div>
                <div class="delete-title">Konfirmasi Logout</div>
                <div class="delete-message">
                    Apakah Anda yakin ingin keluar dari dashboard admin?
                </div>
                <div class="delete-actions">
                    <button class="btn-cancel-delete" onclick="closeLogoutModal()">
                        Batal
                    </button>
                    <button class="btn-confirm-delete" onclick="confirmLogout()">
                        Ya, Logout
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'block';
    }


    async loadCustomersData() {
        try {
            const data = await this.handleApiCall('../api/dashboard.php?action=customers');
            if (!data) return;

            if (data.success) {
                this.updateCustomersUI(data.data);
            } else {
                throw new Error(data.error || 'API returned error');
            }
        } catch (error) {
            console.error('Error loading customers data:', error);
            this.showNotification(`Error loading customers data: ${error.message}`, 'error');

            this.updateCustomersUI({
                customers: [],
                stats: { total_customers: 0, active_this_month: 0 }
            });
        }
    }

    async loadRoomsData() {
        try {
            const data = await this.handleApiCall('../api/dashboard.php?action=rooms');
            if (!data) return; 

            if (data.success) {
                this.updateRoomsUI(data.data);
            } else {
                throw new Error(data.error || 'API returned error');
            }
        } catch (error) {
            console.error('Error loading rooms data:', error);
            this.showNotification(`Error loading rooms data: ${error.message}`, 'error');

            this.updateRoomsUI({
                rooms: [],
                stats: { total_rooms: 0, available_rooms: 0, occupied_rooms: 0, total_today_bookings: 0 }
            });
        }
    }

    async loadBookingsData() {
        try {
            const data = await this.handleApiCall('../api/bookings.php');
            if (!data) return; 

            if (data.success) {
                this.updateBookingsUI(data.data);
            } else {
                throw new Error(data.error || 'API returned error');
            }
        } catch (error) {
            console.error('Error loading bookings data:', error);
            this.showNotification(`Error loading bookings data: ${error.message}`, 'error');

            this.updateBookingsUI([]);
        }
    }

    
    updateCustomersUI(data) {
        const totalCustomersElement = document.getElementById('totalCustomersCount');
        const activeThisMonthElement = document.getElementById('activeThisMonthCount');

        if (totalCustomersElement) {
            totalCustomersElement.textContent = data.stats.total_customers;
        }

        if (activeThisMonthElement) {
            activeThisMonthElement.textContent = data.stats.active_this_month;
        }

        const customersTableBody = document.querySelector('.rooms-table tbody');
        if (customersTableBody && data.customers) {
            customersTableBody.innerHTML = '';
            data.customers.forEach(customer => {
                const row = document.createElement('tr');
                const canDelete = customer.customer_type === 'Registered';

                row.innerHTML = `
                    <td>${customer.name}</td>
                    <td>${customer.email}</td>
                    <td>${customer.phone || '-'}</td>
                    <td>${customer.total_bookings} bookings</td>
                    <td>${customer.total_spent}</td>
                    <td>
                        <button class="btn-small btn-view" onclick="dashboard.showCustomerDetail(${JSON.stringify(customer).replace(/"/g, '&quot;')})">View</button>
                        ${canDelete ? `<button class="btn-small btn-delete" onclick="dashboard.deleteCustomer(${customer.id})">Delete</button>` : ''}
                    </td>
                `;
                customersTableBody.appendChild(row);
            });
        }
    }

    updateRoomsUI(data) {
        const totalRoomsElement = document.getElementById('totalRoomsCount');
        if (totalRoomsElement) {
            totalRoomsElement.textContent = data.stats.total_rooms;
        }

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
        const totalBookingsElement = document.getElementById('totalBookingsCount');
        const activeTodayElement = document.getElementById('activeTodayCount');

        if (totalBookingsElement) {
            totalBookingsElement.textContent = bookings ? bookings.length : 0;
        }

        if (activeTodayElement) {
            const today = new Date().toISOString().split('T')[0];
            const activeTodayCount = bookings ? bookings.filter(booking =>
                booking.status === 'confirmed' &&
                booking.start_date <= today &&
                booking.end_date >= today
            ).length : 0;
            activeTodayElement.textContent = activeTodayCount;
        }

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

    pages = {
        bookings: `
            <div class="header">
                <div>
                    <h1>Bookings Management</h1>
                    <p class="header-subtitle">Welcome back, Admin!</p>
                </div>
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
                            <td><span class="status-badge confirmed">Confirmed</span></td>
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
                            <th>Total Spent</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Customer data will be loaded dynamically -->
                    </tbody>
                </table>
            </div>
        `
    };

    async showBookingDetail(bookingId) {
        try {
            const modalBody = document.getElementById('modalBody');
            modalBody.innerHTML = `
                <div class="loading-message">
                    <div class="spinner"></div>
                    <h2>Loading Booking Details...</h2>
                    <p>Please wait while we fetch the information.</p>
                </div>
            `;
            document.getElementById('detailModal').style.display = 'block';

            const numericId = bookingId.replace('BK', '');

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

    async showCustomerDetail(customerDataOrId) {
        try {
            const modalBody = document.getElementById('modalBody');
            modalBody.innerHTML = `
                <div class="loading-message">
                    <div class="spinner"></div>
                    <h2>Loading Customer Details...</h2>
                    <p>Please wait while we fetch the information.</p>
                </div>
            `;
            document.getElementById('detailModal').style.display = 'block';

            let customer, bookingData;

            if (typeof customerDataOrId === 'object') {
                customer = customerDataOrId;

                if (customer.id && typeof customer.id === 'number') {
                    const bookingResponse = await fetch(`../api/bookings.php?action=user_bookings&user_id=${customer.id}`);
                    const bookingResult = await bookingResponse.json();
                    bookingData = bookingResult.success ? bookingResult.data : [];
                } else if (customer.customer_type === 'Guest') {
                    const allBookingsResponse = await fetch(`../api/bookings.php`);
                    const allBookingsResult = await allBookingsResponse.json();
                    if (allBookingsResult.success) {
                        bookingData = allBookingsResult.data.filter(booking =>
                            booking.name === customer.name &&
                            booking.email === customer.email
                        );
                    }
                }
            } else {
                const customerResponse = await fetch(`../api/dashboard.php?action=user&id=${customerDataOrId}`);
                const customerResult = await customerResponse.json();

                if (!customerResult.success) {
                    this.closeModal();
                    this.showNotification('Customer not found', 'error');
                    return;
                }
                customer = customerResult.data;

                const bookingResponse = await fetch(`../api/bookings.php?action=user_bookings&user_id=${customerDataOrId}`);
                const bookingResult = await bookingResponse.json();
                bookingData = bookingResult.success ? bookingResult.data : [];
            }

            this.showCustomerDetailModal(customer, bookingData);

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

        this.setupEditRoomForm(room);
    }

    showAddRoomModal() {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = this.getAddRoomTemplate();

        document.getElementById('detailModal').style.display = 'block';

        this.setupAddRoomForm();
    }

    showAddBookingModal() {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = this.getAddBookingTemplate();

        document.getElementById('detailModal').style.display = 'block';

        this.setupAddBookingForm();
    }

    setupEditRoomForm(room) {
        const form = document.getElementById('editRoomForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEditRoomSubmit(room.id);
        });
    }

    setupAddRoomForm() {
        const form = document.getElementById('addRoomForm');
        if (!form) return;

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
                <div class="detail-item"><label>Payment Method:</label><span>${booking.payment_method || 'Not specified'}</span></div>
                <div class="detail-item"><label>Created:</label><span>${new Date(booking.created_at).toLocaleDateString('id-ID')}</span></div>
            </div>
            <div class="modal-actions">
                <button class="btn-primary" onclick="dashboard.closeModal()">Close</button>
            </div>
        `;
    }

    getCustomerDetailTemplate(customer, bookingData) {
        const totalBookings = bookingData ? bookingData.length : 0;

        const activeBookings = bookingData ?
            bookingData.filter(booking => booking.status === 'confirmed').length : 0;
        const cancelledBookings = bookingData ?
            bookingData.filter(booking => booking.status === 'cancelled').length : 0;

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
                        <select name="payment_method" required style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                            <option value="">Select payment method</option>
                            <option value="cash">Cash</option>
                            <option value="bank">Bank Transfer</option>
                            <option value="credit">Credit Card</option>
                            <option value="ewallet">E-Wallet</option>
                        </select>
                    </div>
                    <div class="detail-item full-width">
                        <label>Status:</label>
                        <select name="status" required style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                            <option value="confirmed">Confirmed</option>
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

        this.loadRoomsForBooking();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddBookingSubmit();
        });

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

            const bookingData = {
                user_id: null,
                room_id: parseInt(formData.get('room_id')),
                name: formData.get('name'),
                email: formData.get('email'),
                phone_number: formData.get('phone_number'),
                start_date: formData.get('start_date'),
                end_date: formData.get('end_date'),
                price: parseInt(formData.get('price')),
                payment_method: formData.get('payment_method'),
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
                this.loadBookingsData();
            } else {
                throw new Error(result.error || 'Failed to create booking');
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            this.showNotification('Error creating booking: ' + error.message, 'error');
        }
    }

    setupSearchListeners() {
        const roomSearchInput = document.getElementById('roomSearchInput');
        if (roomSearchInput) {
            roomSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchRooms(e.target.value);
                }
            });
        }

        const customerSearchInput = document.getElementById('customerSearchInput');
        if (customerSearchInput) {
            customerSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchCustomers(e.target.value);
                }
            });
        }

        const bookingSearchInput = document.getElementById('bookingSearchInput');
        if (bookingSearchInput) {
            bookingSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchBookings();
                }
            });
        }

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

        const searchTerm = document.getElementById('bookingSearchInput')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';

        rows.forEach(row => {
            let showRow = true;

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

            if (statusFilter && showRow) {
                const status = row.cells[5]?.textContent.toLowerCase() || '';
                if (status !== statusFilter.toLowerCase()) {
                    showRow = false;
                }
            }

            row.style.display = showRow ? '' : 'none';
        });
    }

    async deleteCustomer(customerId) {
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

function logout() {
    if (dashboard) {
        dashboard.logout();
    } else {
        if (confirm('Apakah Anda yakin ingin logout?')) {
            if (typeof adminUtils !== 'undefined' && adminUtils.logout) {
                adminUtils.logout();
            } else {
                localStorage.clear();
                window.location.href = 'login.html';
            }
        }
    }
}

function clearSession() {
    localStorage.removeItem('adminSession');
    location.reload();
}

function logout() {
    if (dashboard) {
        dashboard.logout();
    } else {
        if (typeof adminUtils !== 'undefined' && adminUtils.logout) {
            adminUtils.logout();
        } else {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    }
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
}

function confirmDelete(type, id) {
    if (dashboard) {
        dashboard.confirmDelete(type, id);
    }
}

function closeLogoutModal() {
    document.getElementById('logoutModal').style.display = 'none';
}

function confirmLogout() {
    closeLogoutModal();

    if (typeof adminUtils !== 'undefined' && adminUtils.logout) {
        adminUtils.logout();
    } else {
        localStorage.clear();
        window.location.href = 'login.html';
    }
}

let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new DashboardController();
});