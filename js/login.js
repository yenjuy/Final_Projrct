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
        const response = await api.login(formData.email, formData.password);
        if (response.success) {
            const userData = response.user || response.data?.user || response;
            if (userData) {
                this.handleLoginSuccess(userData, formData.remember, returnUrl);
                return;
            }
        }
        throw new Error('Login failed. Please check your credentials.');
    }


    // Handle successful login
    handleLoginSuccess(userData, remember, returnUrl) {
        if (!userData || !userData.name) {
            console.error('Invalid user data received:', userData);
            LoginUtils.showNotification('Login failed: Invalid user data', 'error');
            return;
        }

        const successMessage = `Login successful! Welcome back, ${userData.name}`;
        LoginUtils.showNotification(successMessage, 'success');

        this.storeSession(userData, remember);

        setTimeout(() => {
            this.redirectUser(returnUrl);
        }, 1000);
    }

    // Store user session
    storeSession(userData, remember) {
        if (remember) {
            localStorage.setItem('user_session', JSON.stringify(userData));
        } else {
            sessionStorage.setItem('user_session_temp', JSON.stringify(userData));
        }
    }

    // Redirect user after successful login
    redirectUser(returnUrl) {
        let redirectUrl = returnUrl ? decodeURIComponent(returnUrl) : 'Home.html';

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
        const userSession = this.getExistingSession();
        const returnUrl = this.getReturnUrl();

        if (userSession) {
            this.handleExistingSession(returnUrl);
        }
    }

    getExistingSession() {
        return JSON.parse(localStorage.getItem('user_session') || sessionStorage.getItem('user_session_temp') || 'null');
    }

    handleExistingSession(returnUrl) {
        LoginUtils.showNotification('Already logged in. Redirecting...', 'info');

        setTimeout(() => {
            const redirectUrl = returnUrl ? decodeURIComponent(returnUrl) : 'Home.html';
            window.location.href = redirectUrl;
        }, 1500);
    }

    getReturnUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('return');
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