class LoginManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupPasswordToggle();
        this.setupFormValidation();
        this.setupSessionCheck();
        this.setupInputAnimations();
    }

    setupPasswordToggle() {
        const toggleBtn = document.querySelector('.password-toggle');
        if (!toggleBtn) return;

        toggleBtn.addEventListener('click', () => {
            this.togglePasswordVisibility();
        });
    }

    togglePasswordVisibility() {
        const passwordField = document.getElementById("password");
        const toggleIcon = document.querySelector(".password-toggle i");

        if (!passwordField || !toggleIcon) return;

        if (passwordField.type === "password") {
            passwordField.type = "text";
            toggleIcon.classList.remove("fa-eye");
            toggleIcon.classList.add("fa-eye-slash");
        } else {
            passwordField.type = "password";
            toggleIcon.classList.remove("fa-eye-slash");
            toggleIcon.classList.add("fa-eye");
        }
    }

    setupFormValidation() {
        const form = document.getElementById('loginForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLoginSubmit();
        });
    }

    async handleLoginSubmit() {
        const form = document.getElementById('loginForm');
        const errorMessage = document.getElementById('errorMessage');
        const submitBtn = document.querySelector('.login-btn');

        const formData = this.getFormData();

        if (!this.validateForm(formData)) {
            return;
        }

        this.setLoadingState(submitBtn, true);
        this.hideError();

        const returnUrl = this.getReturnUrl();

        try {
            await this.attemptLogin(formData, returnUrl);
        } catch (error) {
            this.showError(error.message || 'Login failed. Please check your credentials.');
            this.setLoadingState(submitBtn, false);
        }
    }

    getFormData() {
        return {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            remember: document.getElementById('remember').checked
        };
    }

    validateForm(data) {
        if (!LoginUtils.validateEmail(data.email)) {
            this.showError('Please enter a valid email address');
            this.shakeElement(document.getElementById('errorMessage'));
            return false;
        }

        if (!data.password || data.password.length < 1) {
            this.showError('Please enter your password');
            this.shakeElement(document.getElementById('errorMessage'));
            return false;
        }

        return true;
    }

    async attemptLogin(formData, returnUrl) {
        try {
            const response = await api.login(formData.email, formData.password);
            if (response.success) {
                const userData = response.user || response.data?.user || response;
                if (userData) {
                    this.handleLoginSuccess(userData, formData.remember, returnUrl, 'user');
                    return;
                }
            }
        } catch (userError) {
            if (this.isAdminEmail(formData.email)) {
                await this.attemptAdminLogin(formData, returnUrl);
            } else {
                throw userError;
            }
        }
    }

    // Attempt admin login
    async attemptAdminLogin(formData, returnUrl) {
        const adminName = formData.email.includes('@') ? formData.email.split('@')[0] : formData.email;
        const response = await api.adminLogin(adminName, formData.password);

        if (response.success) {
            // Handle different response formats
            const adminData = response.admin || response.data?.admin || response;
            if (adminData) {
                this.handleLoginSuccess(adminData, formData.remember, returnUrl, 'admin');
            } else {
                throw new Error('Invalid admin credentials');
            }
        } else {
            throw new Error('Invalid admin credentials');
        }
    }

    // Handle successful login
    handleLoginSuccess(userData, remember, returnUrl, userType) {
        if (!userData || !userData.name) {
            console.error('Invalid user data received:', userData);
            LoginUtils.showNotification('Login failed: Invalid user data', 'error');
            return;
        }

        // Show success notification
        const successMessage = userType === 'admin' ?
            'Admin login successful!' :
            `Login successful! Welcome back, ${userData.name}`;

        LoginUtils.showNotification(successMessage, 'success');

        this.storeSession(userData, userType, remember);

        setTimeout(() => {
            this.redirectUser(returnUrl, userType);
        }, 1000);
    }

    // Store user session
    storeSession(userData, userType, remember) {
        const sessionKey = userType === 'admin' ? 'admin_session' : 'user_session';
        const tempKey = userType === 'admin' ? 'admin_session_temp' : 'user_session_temp';

        if (remember) {
            // Store in localStorage for persistent login
            localStorage.setItem(sessionKey, JSON.stringify(userData));
        } else {
            // Store only in sessionStorage for temporary login
            sessionStorage.setItem(tempKey, JSON.stringify(userData));
        }
    }

    // Redirect user after successful login
    redirectUser(returnUrl, userType) {
        let redirectUrl = returnUrl ? decodeURIComponent(returnUrl) :
                       (userType === 'admin' ? 'Dashboard.html' : 'Home.html');

        if (redirectUrl.includes('Booking.html')) {
            const separator = redirectUrl.includes('?') ? '&' : '?';
            redirectUrl += `${separator}logged_in=true`;
        }

        window.location.href = redirectUrl;
    }

    setupSessionCheck() {
        window.addEventListener('load', () => {
            this.checkExistingSession();
        });
    }

    checkExistingSession() {
        const userSession = this.getExistingSession('user');
        const adminSession = this.getExistingSession('admin');
        const returnUrl = this.getReturnUrl();

        if (adminSession) {
            this.handleExistingSession('admin', returnUrl);
        } else if (userSession) {
            this.handleExistingSession('user', returnUrl);
        }
    }

    getExistingSession(userType) {
        const sessionKey = `${userType}_session`;
        const tempKey = `${userType}_session_temp`;
        return JSON.parse(localStorage.getItem(sessionKey) || sessionStorage.getItem(tempKey) || 'null');
    }

    handleExistingSession(userType, returnUrl) {
        const displayName = userType === 'admin' ? 'admin' : 'user';
        LoginUtils.showNotification(`Already logged in as ${displayName}. Redirecting...`, 'info');

        setTimeout(() => {
            const defaultPage = userType === 'admin' ? 'Dashboard.html' : 'Home.html';
            const redirectUrl = returnUrl ? decodeURIComponent(returnUrl) : defaultPage;
            window.location.href = redirectUrl;
        }, 1500);
    }

    getReturnUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('return');
    }

    isAdminEmail(email) {
        return email.toLowerCase().includes('admin') || email === 'admin';
    }

    setLoadingState(button, isLoading) {
        button.disabled = isLoading;
        button.innerHTML = isLoading ?
            '<i class="fas fa-spinner fa-spin"></i> Logging in...' :
            'Login';
    }

    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }
    }

    hideError() {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    }

    shakeElement(element) {
        if (!element) return;

        element.classList.remove('shaking');
        void element.offsetWidth; 
        element.classList.add('shaking');
    }

    setupInputAnimations() {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                this.animateInput(input, 'scale(1.02)');
            });

            input.addEventListener('blur', () => {
                this.animateInput(input, 'scale(1)');
            });
        });
    }

    animateInput(input, transform) {
        if (input.parentElement) {
            input.parentElement.style.transform = transform;
        }
    }
}

// Utility functions
const LoginUtils = {
    showNotification(message, type = 'info') {
        if (window.utils && window.utils.showNotification) {
            window.utils.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    },

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    addShakeStyles() {
        if (!document.getElementById('login-shake-styles')) {
            const style = document.createElement('style');
            style.id = 'login-shake-styles';
            style.textContent = `
                @keyframes shake-login {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }

                .login-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .error-message.shaking {
                    animation: shake-login 0.5s ease-in-out;
                }
            `;
            document.head.appendChild(style);
        }
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    LoginUtils.addShakeStyles();

    new LoginManager();

    console.log('Login page initialized successfully');
});

window.LoginUtils = LoginUtils;