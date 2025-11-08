class RegisterManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupFormValidation();
        this.setupPasswordStrength();
        this.setupRealTimeValidation();
        this.setupPhoneFormatting();
        this.setupFormSubmission();
    }

    setupFormValidation() {
        const form = document.getElementById('registerForm');
        if (!form) return;

        this.form = form;
        this.inputs = form.querySelectorAll('input, select');
        this.passwordInput = document.getElementById('password');
        this.confirmPasswordInput = document.getElementById('confirmPassword');
        this.strengthFill = document.getElementById('strengthFill');
        this.strengthText = document.getElementById('strengthText');
    }

    setupPasswordStrength() {
        if (!this.passwordInput) return;

        this.passwordInput.addEventListener('input', (e) => {
            this.checkPasswordStrength(e.target.value);
            this.validateField(e.target);
        });
    }

    checkPasswordStrength(password) {
        let strength = 0;
        let feedback = '';

        if (password.length >= 8) strength++;
        if (password.match(/[a-z]/)) strength++;
        if (password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^a-zA-Z0-9]/)) strength++;

        switch (strength) {
            case 0:
            case 1:
                this.setStrengthIndicator('strength-weak', 'Password lemah');
                break;
            case 2:
                this.setStrengthIndicator('strength-medium', 'Password sedang');
                break;
            case 3:
            case 4:
                this.setStrengthIndicator('strength-good', 'Password baik');
                break;
            case 5:
                this.setStrengthIndicator('strength-strong', 'Password kuat');
                break;
            default:
                this.setStrengthIndicator('', 'Enter password');
        }

        if (password.length === 0) {
            this.setStrengthIndicator('', 'Enter password');
        }
    }

    setStrengthIndicator(className, text) {
        if (this.strengthFill) {
            this.strengthFill.className = `strength-fill ${className}`;
        }
        if (this.strengthText) {
            this.strengthText.textContent = text;
        }
    }

    setupRealTimeValidation() {
        if (!this.inputs) return;

        this.inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });

            input.addEventListener('input', () => {
                if (input.parentElement.classList.contains('error')) {
                    this.validateField(input);
                }
            });
        });
    }

    setupPhoneFormatting() {
        const phoneInput = document.getElementById('phone');
        if (!phoneInput) return;

        phoneInput.addEventListener('input', (e) => {
            this.formatPhoneNumber(e.target);
        });
    }

    formatPhoneNumber(input) {
        let value = input.value;

        if (value.startsWith('0') && !value.startsWith('+62')) {
            input.value = '+62' + value.substring(1);
        }
    }

    setupFormSubmission() {
        if (!this.form) return;

        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleFormSubmission();
        });
    }

    // Handle form submission
    async handleFormSubmission() {
        if (!this.isFormValid()) return;

        const submitBtn = document.querySelector('.register-btn');
        this.setLoadingState(submitBtn, true);

        try {
            const userData = this.getFormData();
            const response = await api.register(userData);

            if (response.success) {
                this.handleRegistrationSuccess();
            }
        } catch (error) {
            this.handleRegistrationError(error);
            this.setLoadingState(submitBtn, false);
        }
    }

    isFormValid() {
        let isValid = true;

        this.inputs.forEach(input => {
            if (input.type !== 'checkbox' && !this.validateField(input)) {
                isValid = false;
            }
        });

        const termsCheckbox = document.getElementById('terms');
        if (!termsCheckbox || !termsCheckbox.checked) {
            RegisterUtils.showNotification('You must agree to the terms and conditions', 'error');
            isValid = false;
        }

        return isValid;
    }

    // Get form data
    getFormData() {
        return {
            name: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            no_telp: document.getElementById('phone').value
        };
    }

    validateField(field) {
        const value = field.value.trim();
        const fieldGroup = field.parentElement;

        fieldGroup.classList.remove('error');

        switch (field.name) {
            case 'fullName':
                return this.validateFullName(value, fieldGroup);

            case 'email':
                return this.validateEmail(value, fieldGroup);

            case 'phone':
                return this.validatePhone(value, fieldGroup);

            case 'password':
                return this.validatePassword(value, fieldGroup);

            case 'confirmPassword':
                return this.validateConfirmPassword(value, fieldGroup);

            default:
                return true;
        }
    }

    validateFullName(value, fieldGroup) {
        if (!value || value.length < 2) {
            this.showError(fieldGroup, 'Full name minimum 2 characters');
            return false;
        }
        return true;
    }

    validateEmail(value, fieldGroup) {
        if (!RegisterUtils.validateEmail(value)) {
            this.showError(fieldGroup, 'Format email tidak valid');
            return false;
        }
        return true;
    }

    validatePhone(value, fieldGroup) {
        if (!RegisterUtils.validatePhone(value)) {
            this.showError(fieldGroup, 'Format nomor telepon tidak valid');
            return false;
        }
        return true;
    }

    validatePassword(value, fieldGroup) {
        if (!value || value.length < 8) {
            this.showError(fieldGroup, 'Password minimal 8 karakter');
            return false;
        }
        return true;
    }

    validateConfirmPassword(value, fieldGroup) {
        const password = this.passwordInput ? this.passwordInput.value : '';
        if (!value || value !== password) {
            this.showError(fieldGroup, 'Password tidak cocok');
            return false;
        }
        return true;
    }

    showError(fieldGroup, message) {
        fieldGroup.classList.add('error');
        const errorElement = fieldGroup.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    setLoadingState(button, isLoading) {
        if (!button) return;

        button.disabled = isLoading;
        button.innerHTML = isLoading ?
            '<i class="fas fa-spinner fa-spin"></i> Registering...' :
            'Register';
    }

    // Handle successful registration
    handleRegistrationSuccess() {
        RegisterUtils.showNotification('Registration successful! Redirecting to login...', 'success');

        // Show success message
        const successMessage = document.getElementById('successMessage');
        if (successMessage) {
            successMessage.style.display = 'block';
        }

        if (this.form) {
            this.form.style.display = 'none';
        }

        setTimeout(() => {
            window.location.href = 'Login.html';
        }, 2000);
    }

    handleRegistrationError(error) {
        const message = error.message || 'Registration failed. Please try again.';
        RegisterUtils.showNotification(message, 'error');
    }
}

// Utility functions
const RegisterUtils = {
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

    validatePhone(phone) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        return phoneRegex.test(phone) && phone.length >= 10;
    },

    // Add validation styles
    addValidationStyles() {
        if (!document.getElementById('register-validation-styles')) {
            const style = document.createElement('style');
            style.id = 'register-validation-styles';
            style.textContent = `
                .form-group.error input {
                    border-color: #f44336;
                    box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.1);
                }

                .form-group.error .error-message {
                    display: block;
                    color: #f44336;
                    font-size: 0.8em;
                    margin-top: 5px;
                }

                .register-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .success-message {
                    display: none;
                    background: #4CAF50;
                    color: white;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                }

                .strength-fill {
                    height: 4px;
                    border-radius: 2px;
                    transition: all 0.3s ease;
                    width: 0%;
                }

                .strength-weak {
                    background: #f44336;
                    width: 25%;
                }

                .strength-medium {
                    background: #ff9800;
                    width: 50%;
                }

                .strength-good {
                    background: #4caf50;
                    width: 75%;
                }

                .strength-strong {
                    background: #2196f3;
                    width: 100%;
                }
            `;
            document.head.appendChild(style);
        }
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    RegisterUtils.addValidationStyles();

    new RegisterManager();

    console.log('Register page initialized successfully');
});

window.RegisterUtils = RegisterUtils;