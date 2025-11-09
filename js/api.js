class ApiService {
    constructor() {
        this.baseUrl = this.getBaseUrl();
    }

    getBaseUrl() {
        const pathname = window.location.pathname;

        if (pathname.includes('/admin/')) {
            return '../api';
        } else if (pathname.includes('/pages/')) {
            return '../api';
        } else {
            return './api';
        }
    }

    async request(endpoint, options = {}) {
        try {
            const fullUrl = `${this.baseUrl}${endpoint}`;
            const response = await fetch(fullUrl, {
                headers: { 'Content-Type': 'application/json', ...options.headers },
                ...options
            });

            const text = await response.text();

            if (text.trim().startsWith('<')) {
                throw new Error('Server error: Invalid response format');
            }

            const data = this.parseJSON(text);

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            throw error;
        }
    }

    parseJSON(text) {
        try {
            return JSON.parse(text);
        } catch (parseError) {
            throw new Error('Server error: Invalid JSON response');
        }
    }

    async login(email, password) {
        return this.request('/auth.php?action=login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    async register(userData) {
        return this.request('/auth.php?action=register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async adminLogin(adminName, password) {
        return this.request('/auth.php?action=admin_login', {
            method: 'POST',
            body: JSON.stringify({ admin_name: adminName, password })
        });
    }

    //Room Endpoint
    async getAllRooms() {
        return this.request('/rooms.php');
    }

    //Booking Endpoint
    async getUserBookings(userId) {
        return this.request(`/bookings.php?action=user_bookings&user_id=${userId}`);
    }

    //Create Booking
    async createBooking(bookingData) {
        return this.request('/bookings.php', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
    }

    //Update Booking Status
    async updateBookingStatus(bookingId, status) {
        return this.request(`/bookings.php?id=${bookingId}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    //Dashboard Endpoint
    async getDashboardStats() {
        return this.request('/dashboard.php?action=stats');
    }
}

const Utils = {

    isLoggedIn() {
        return localStorage.getItem('user_session') !== null ||
            sessionStorage.getItem('user_session_temp') !== null;
    },

    isAdminLoggedIn() {
        return localStorage.getItem('admin_session') !== null ||
            sessionStorage.getItem('admin_session_temp') !== null;
    },

    getCurrentUser() {
        const session = localStorage.getItem('user_session') ||
            sessionStorage.getItem('user_session_temp');
        return session ? JSON.parse(session) : null;
    },

    getCurrentAdmin() {
        const session = localStorage.getItem('admin_session') ||
            sessionStorage.getItem('admin_session_temp');
        return session ? JSON.parse(session) : null;
    },

    requireLogin(showMessage = true) {
        if (!this.isLoggedIn()) {
            if (showMessage) {
                this.showNotification('Please login to access this feature', 'error');
            }
            const returnUrl = encodeURIComponent(window.location.href);
            window.location.href = `Login.html?return=${returnUrl}`;
            return false;
        }
        return true;
    },

    requireAdminLogin(showMessage = true) {
        if (!this.isAdminLoggedIn()) {
            if (showMessage) {
                this.showNotification('Admin access required', 'error');
            }
            window.location.href = 'Login.html';
            return false;
        }
        return true;
    },

    logout() {
        localStorage.removeItem('user_session');
        sessionStorage.removeItem('user_session_temp');
        localStorage.removeItem('admin_session');
        sessionStorage.removeItem('admin_session_temp');

        this.showNotification('Logged out successfully', 'success');
        setTimeout(() => window.location.reload(), 1000);
    },

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    validatePhone(phone) {
        return /^[\d\s\-\+\(\)]+$/.test(phone) && phone.length >= 10;
    },

    formatRupiah(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(amount);
    },

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    formatDateShort(dateString) {
        return new Date(dateString).toLocaleDateString('id-ID');
    },

    getStatusBadgeClass(status) {
        const statusMap = {
            'available': 'available',
            'unavailable': 'occupied',
            'confirmed': 'available',
            'cancelled': 'occupied'
        };
        return statusMap[status.toLowerCase()] || 'available';
    },

    showNotification(message, type = 'success') {
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800'
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
    },

    confirmAction(message) {
        return confirm(message);
    }
};

window.api = new ApiService();
window.utils = Utils;

(() => {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
})();