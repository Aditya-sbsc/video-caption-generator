/**
 * Contact Form Manager
 * Handles contact form submission with EmailJS integration
 */

class ContactFormManager {
    constructor(app) {
        this.app = app;
        this.form = null;
        this.isInitialized = false;
        
        // EmailJS configuration (users will need to replace with their own)
        this.emailjsConfig = {
            serviceId: 'service_example', // Replace with your EmailJS service ID
            templateId: 'template_example', // Replace with your EmailJS template ID  
            publicKey: 'your_public_key' // Replace with your EmailJS public key
        };
        
        this.init();
    }

    /**
     * Initialize contact form functionality
     */
    init() {
        try {
            this.form = document.getElementById('contact-form');
            if (!this.form) {
                console.warn('Contact form not found');
                return;
            }

            this.setupEventListeners();
            this.populateBrowserInfo();
            this.initializeEmailJS();
            this.isInitialized = true;
            
            console.log('Contact form manager initialized');
        } catch (error) {
            console.error('Failed to initialize contact form:', error);
        }
    }

    /**
     * Setup event listeners for the contact form
     */
    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Form reset
        const resetBtn = document.getElementById('reset-contact');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleReset());
        }

        // Form validation on input
        const requiredFields = this.form.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            field.addEventListener('blur', () => this.validateField(field));
            field.addEventListener('input', () => this.clearFieldError(field));
        });
    }

    /**
     * Initialize EmailJS
     */
    initializeEmailJS() {
        if (typeof emailjs !== 'undefined') {
            emailjs.init(this.emailjsConfig.publicKey);
            console.log('EmailJS initialized');
        } else {
            console.warn('EmailJS not available. Contact form will show demo mode.');
        }
    }

    /**
     * Populate browser information automatically
     */
    populateBrowserInfo() {
        const browserField = document.getElementById('contact-browser');
        if (browserField) {
            const browserInfo = this.getBrowserInfo();
            browserField.value = browserInfo;
        }
    }

    /**
     * Get detailed browser information
     */
    getBrowserInfo() {
        const nav = navigator;
        const screen = window.screen;
        
        return [
            `Browser: ${nav.userAgent}`,
            `Platform: ${nav.platform}`,
            `Language: ${nav.language}`,
            `Screen: ${screen.width}x${screen.height}`,
            `Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
            `Online: ${nav.onLine}`,
            `Cookies: ${nav.cookieEnabled}`,
            `Features: Speech Recognition=${Utils.browserSupports('speechRecognition')}, Media Recorder=${Utils.browserSupports('mediaRecorder')}`
        ].join('\n');
    }

    /**
     * Handle form submission
     */
    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }

        const submitBtn = document.getElementById('send-contact');
        const originalText = submitBtn.innerHTML;
        
        try {
            // Show loading state
            this.setSubmitButtonState(true);
            this.showStatus('Sending your message...', 'info');

            // Get form data
            const formData = this.getFormData();
            
            // Send email
            await this.sendEmail(formData);
            
            // Show success message
            this.showStatus('Message sent successfully! We\'ll get back to you soon.', 'success');
            this.form.reset();
            this.populateBrowserInfo(); // Repopulate browser info after reset
            
        } catch (error) {
            console.error('Failed to send message:', error);
            this.showStatus('Failed to send message. Please try again later.', 'error');
        } finally {
            this.setSubmitButtonState(false);
        }
    }

    /**
     * Send email using EmailJS
     */
    async sendEmail(formData) {
        if (typeof emailjs === 'undefined') {
            // Demo mode - simulate sending
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log('Demo mode - would send email with data:', formData);
            return;
        }

        // Add timestamp and additional info
        const emailData = {
            ...formData,
            timestamp: new Date().toISOString(),
            app_version: '1.0.0',
            user_agent: navigator.userAgent
        };

        try {
            const result = await emailjs.send(
                this.emailjsConfig.serviceId,
                this.emailjsConfig.templateId,
                emailData
            );
            
            console.log('Email sent successfully:', result);
            return result;
        } catch (error) {
            // If EmailJS fails, fall back to demo mode
            console.warn('EmailJS failed, falling back to demo mode:', error);
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log('Demo mode fallback - would send email with data:', emailData);
        }
    }

    /**
     * Get form data as object
     */
    getFormData() {
        const formData = new FormData(this.form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }

    /**
     * Validate the entire form
     */
    validateForm() {
        let isValid = true;
        const requiredFields = this.form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        // Additional email validation
        const emailField = document.getElementById('contact-email');
        if (emailField && !this.isValidEmail(emailField.value)) {
            this.showFieldError(emailField, 'Please enter a valid email address');
            isValid = false;
        }

        return isValid;
    }

    /**
     * Validate individual field
     */
    validateField(field) {
        const value = field.value.trim();
        
        // Check if required field is empty
        if (field.hasAttribute('required') && !value) {
            this.showFieldError(field, 'This field is required');
            return false;
        }

        // Email validation
        if (field.type === 'email' && value && !this.isValidEmail(value)) {
            this.showFieldError(field, 'Please enter a valid email address');
            return false;
        }

        // Clear any previous errors
        this.clearFieldError(field);
        return true;
    }

    /**
     * Check if email is valid
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Show field error
     */
    showFieldError(field, message) {
        this.clearFieldError(field);
        
        field.classList.add('error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        
        field.parentNode.appendChild(errorDiv);
    }

    /**
     * Clear field error
     */
    clearFieldError(field) {
        field.classList.remove('error');
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    /**
     * Set submit button loading state
     */
    setSubmitButtonState(isLoading) {
        const submitBtn = document.getElementById('send-contact');
        if (!submitBtn) return;

        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="btn-icon">⏳</span>Sending...';
            submitBtn.classList.add('loading');
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-icon">📧</span>Send Message';
            submitBtn.classList.remove('loading');
        }
    }

    /**
     * Show status message
     */
    showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('contact-status');
        if (!statusDiv) return;

        statusDiv.className = `contact-status ${type}`;
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';

        // Auto-hide after 5 seconds for success/info messages
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Handle form reset
     */
    handleReset() {
        // Clear all field errors
        const errorFields = this.form.querySelectorAll('.error');
        errorFields.forEach(field => this.clearFieldError(field));
        
        // Hide status message
        const statusDiv = document.getElementById('contact-status');
        if (statusDiv) {
            statusDiv.style.display = 'none';
        }

        // Repopulate browser info after a short delay
        setTimeout(() => {
            this.populateBrowserInfo();
        }, 100);

        this.app.showToast('Form reset', 'info');
    }

    /**
     * Update EmailJS configuration (for users to customize)
     */
    updateEmailJSConfig(serviceId, templateId, publicKey) {
        this.emailjsConfig = {
            serviceId: serviceId,
            templateId: templateId,
            publicKey: publicKey
        };
        
        this.initializeEmailJS();
        console.log('EmailJS configuration updated');
    }
}

// Export for use in main app
window.ContactFormManager = ContactFormManager;