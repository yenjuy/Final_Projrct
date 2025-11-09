const adminAuth = {
    sessionKey: 'adminSession',
    sessionHours: 24,

    init() {
        this.setupForm();
        this.checkSession();
    },

    setupForm() {
        const form = document.getElementById('adminLoginForm');
        if (!form) return;

        form.addEventListener('submit', (e) => this.handleLogin(e));

        const toggle = document.getElementById('passwordToggle');
        const password = document.getElementById('password');
        if (toggle && password) {
            toggle.addEventListener('click', () => this.togglePassword(password, toggle));
        }

        form.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => this.hideError());
        });
    },

    async handleLogin(e) {
        e.preventDefault();

        const credentials = this.getCredentials();
        if (!this.validateInput(credentials)) return;

        const btn = document.querySelector('.admin-login-btn');
        this.setButtonLoading(btn, true);

        try {
            await this.login(credentials);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.setButtonLoading(btn, false);
        }
    },

    getCredentials() {
        return {
            adminName: document.getElementById('adminName')?.value?.trim() || '',
            password: document.getElementById('password')?.value || ''
        };
    },

    validateInput({ adminName, password }) {
        if (!adminName || !password) {
            this.showError('Please fill in all fields');
            return false;
        }
        return true;
    },

    async login({ adminName, password }) {
        try {
            const response = await fetch('../api/auth.php?action=admin_login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    admin_name: adminName,
                    password: password
                })
            });

            const result = await response.json();

            if (result.success) {
                const session = {
                    id: result.data.admin.id,
                    admin_name: result.data.admin.admin_name,
                    loginTime: new Date().toISOString()
                };

                this.setSession(session);
                this.showSuccess('Login successful! Redirecting...');

                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                throw new Error(this.getLoginErrorMessage(result.error));
            }
        } catch (error) {
            throw new Error(this.getLoginErrorMessage(error.message));
        }
    },

    getLoginErrorMessage(serverError) {
        const errorMap = {
            'Admin tidak ditemukan': 'Username tidak terdaftar',
            'Username atau password salah': 'Username atau password salah',
            'Admin not found': 'Username tidak terdaftar',
            'Invalid admin credentials': 'Username atau password salah',
            'Database connection failed': 'Terjadi kesalahan server, coba lagi nanti',
            'Login failed': 'Login gagal, coba lagi'
        };

        return errorMap[serverError] || 'Login gagal, periksa kembali username dan password';
    },

    setSession(data) {
        if (!data?.id || !data?.admin_name) {
            throw new Error('Invalid session data');
        }
        localStorage.setItem(this.sessionKey, JSON.stringify(data));
    },

    getSession() {
        const session = localStorage.getItem(this.sessionKey);
        if (!session) return null;

        try {
            return JSON.parse(session);
        } catch {
            this.clearSession();
            return null;
        }
    },

    isSessionValid(session) {
        if (!session?.loginTime) return false;

        const loginTime = new Date(session.loginTime);
        const hoursPassed = (Date.now() - loginTime) / (1000 * 60 * 60);
        return hoursPassed < this.sessionHours;
    },

    checkSession() {
        if (!this.isLoginPage()) return;

        const session = this.getSession();
        if (session && this.isSessionValid(session)) {
            window.location.href = 'dashboard.html';
        } else {
            this.clearSession();
        }
    },

    isLoginPage() {
        return window.location.pathname.includes('login.html');
    },

    togglePassword(input, toggle) {
        const icon = toggle?.querySelector('i');
        if (!icon) return;

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    },

    setButtonLoading(button, loading) {
        if (!button) return;

        if (loading) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        } else {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In to Admin';
        }
    },

    showError(message) {
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            errorEl.classList.add('show');

            setTimeout(() => {
                this.hideError();
            }, 5000);
        }
    },

    hideError() {
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            errorEl.classList.remove('show');
            errorEl.style.display = 'none';
        }
    },

    showSuccess(message) {
        const successEl = document.createElement('div');
        successEl.textContent = message;
        successEl.style.cssText = `
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 25px;
            text-align: center;
            border: 1px solid #c3e6cb;
        `;

        const errorEl = document.getElementById('errorMessage');
        if (errorEl?.parentNode) {
            errorEl.parentNode.insertBefore(successEl, errorEl.nextSibling);
            setTimeout(() => successEl.remove(), 3000);
        }
    },

    getCurrentAdmin() {
        return this.getSession();
    },

    checkAuth() {
        const session = this.getSession();
        if (!session || !this.isSessionValid(session)) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    logout() {
        this.clearSession();
        window.location.href = 'login.html';
    },

    clearSession() {
        localStorage.removeItem(this.sessionKey);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    adminAuth.init();
    window.adminAuth = adminAuth;
    window.adminUtils = adminAuth;
});