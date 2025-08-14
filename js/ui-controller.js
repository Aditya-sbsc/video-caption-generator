/**
 * UI Controller
 * Manages user interface updates, notifications, and responsive behavior
 */

class UIController {
    constructor() {
        this.currentTheme = 'light';
        this.notifications = [];
        this.maxNotifications = 5;
        this.notificationTimeout = 5000;
        
        // UI state
        this.isLoading = false;
        this.currentTab = 'upload';
        this.modalsOpen = new Set();
        
        // Responsive breakpoints
        this.breakpoints = {
            mobile: 480,
            tablet: 768,
            desktop: 1024,
            wide: 1200
        };
        
        this.initializeUI();
    }

    /**
     * Initialize UI controller
     */
    initializeUI() {
        this.createNotificationContainer();
        this.setupResponsiveListeners();
        this.initializeTooltips();
        this.bindGlobalEvents();
        
        console.log('UI Controller initialized');
    }

    /**
     * Create notification container
     */
    createNotificationContainer() {
        if (document.getElementById('notification-container')) return;
        
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
            pointer-events: none;
        `;
        
        document.body.appendChild(container);
    }

    /**
     * Setup responsive listeners
     */
    setupResponsiveListeners() {
        window.addEventListener('resize', this.handleResize.bind(this));
        window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
        
        // Initial responsive setup
        this.handleResize();
    }

    /**
     * Initialize tooltips
     */
    initializeTooltips() {
        // Simple tooltip implementation
        document.addEventListener('mouseover', (event) => {
            const element = event.target.closest('[title]');
            if (element && element.title) {
                this.showTooltip(element, element.title);
            }
        });
        
        document.addEventListener('mouseout', (event) => {
            const element = event.target.closest('[title]');
            if (element) {
                this.hideTooltip();
            }
        });
    }

    /**
     * Bind global UI events
     */
    bindGlobalEvents() {
        // Close modals on outside click
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal') && !event.target.classList.contains('modal-content')) {
                this.closeAllModals();
            }
        });
        
        // Close modals on escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        // Handle loading overlay clicks
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('loading-overlay')) {
                // Prevent interaction when loading
                event.preventDefault();
                event.stopPropagation();
            }
        });
    }

    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        this.isLoading = true;
        
        const overlay = document.getElementById('loading-overlay');
        const text = document.getElementById('loading-text');
        
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.style.display = 'flex';
        }
        
        if (text) {
            text.textContent = message;
        }
        
        // Disable scrolling
        document.body.style.overflow = 'hidden';
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        this.isLoading = false;
        
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }
        
        // Re-enable scrolling
        document.body.style.overflow = '';
    }

    /**
     * Update loading progress
     */
    updateProgress(percentage, message = '') {
        const progressFill = document.getElementById('progress-fill');
        const loadingText = document.getElementById('loading-text');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (loadingText && message) {
            loadingText.textContent = message;
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = null) {
        const notification = this.createNotification(message, type, duration);
        const container = document.getElementById('notification-container');
        
        if (container) {
            container.appendChild(notification);
            this.notifications.push(notification);
            
            // Remove old notifications if too many
            while (this.notifications.length > this.maxNotifications) {
                const oldest = this.notifications.shift();
                if (oldest && oldest.parentNode) {
                    oldest.parentNode.removeChild(oldest);
                }
            }
            
            // Auto-remove after timeout
            const timeoutDuration = duration || this.notificationTimeout;
            setTimeout(() => {
                this.removeNotification(notification);
            }, timeoutDuration);
        }
        
        return notification;
    }

    /**
     * Create notification element
     */
    createNotification(message, type, duration) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background-color: var(--surface);
            border: 1px solid var(--outline);
            border-radius: var(--radius-md);
            padding: var(--spacing-md) var(--spacing-lg);
            box-shadow: var(--shadow-2);
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            pointer-events: auto;
            cursor: pointer;
            transition: all var(--transition-normal);
            animation: slideInRight 0.3s ease-out;
            max-width: 100%;
            word-wrap: break-word;
        `;
        
        // Icon based on type
        const icon = this.getNotificationIcon(type);
        const iconElement = document.createElement('div');
        iconElement.innerHTML = icon;
        iconElement.style.cssText = `
            flex-shrink: 0;
            width: 20px;
            height: 20px;
            color: var(--${this.getNotificationColor(type)});
        `;
        
        // Message
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        messageElement.style.cssText = `
            flex: 1;
            font-size: 0.875rem;
            line-height: 1.4;
        `;
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            background: none;
            border: none;
            font-size: 1.25rem;
            color: var(--on-surface-variant);
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--radius-sm);
            transition: background-color var(--transition-fast);
        `;
        
        closeButton.addEventListener('click', (event) => {
            event.stopPropagation();
            this.removeNotification(notification);
        });
        
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.backgroundColor = 'var(--surface-variant)';
        });
        
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.backgroundColor = 'transparent';
        });
        
        notification.appendChild(iconElement);
        notification.appendChild(messageElement);
        notification.appendChild(closeButton);
        
        // Click to dismiss
        notification.addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        return notification;
    }

    /**
     * Get notification icon
     */
    getNotificationIcon(type) {
        const icons = {
            success: '<svg width="20" height="20" fill="currentColor"><circle cx="10" cy="10" r="8"/><path d="m7 10 2 2 4-4"/></svg>',
            error: '<svg width="20" height="20" fill="currentColor"><circle cx="10" cy="10" r="8"/><path d="M10 6v4m0 4v.01"/></svg>',
            warning: '<svg width="20" height="20" fill="currentColor"><path d="M10 2L3 14h14l-7-12z"/><path d="M10 8v4m0 4v.01"/></svg>',
            info: '<svg width="20" height="20" fill="currentColor"><circle cx="10" cy="10" r="8"/><path d="M10 6v.01M10 10v4"/></svg>'
        };
        
        return icons[type] || icons.info;
    }

    /**
     * Get notification color variable
     */
    getNotificationColor(type) {
        const colors = {
            success: 'success',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };
        
        return colors[type] || 'info';
    }

    /**
     * Remove notification
     */
    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                
                const index = this.notifications.indexOf(notification);
                if (index > -1) {
                    this.notifications.splice(index, 1);
                }
            }, 300);
        }
    }

    /**
     * Show success notification
     */
    showSuccess(message, duration = null) {
        return this.showNotification(message, 'success', duration);
    }

    /**
     * Show error notification
     */
    showError(message, duration = null) {
        return this.showNotification(message, 'error', duration || 8000);
    }

    /**
     * Show warning notification
     */
    showWarning(message, duration = null) {
        return this.showNotification(message, 'warning', duration);
    }

    /**
     * Show info notification
     */
    showInfo(message, duration = null) {
        return this.showNotification(message, 'info', duration);
    }

    /**
     * Clear all notifications
     */
    clearNotifications() {
        this.notifications.forEach(notification => {
            this.removeNotification(notification);
        });
    }

    /**
     * Update recording state UI
     */
    updateRecordingState(isRecording) {
        const recordBtn = document.getElementById('record-btn');
        const liveCaptions = document.getElementById('live-captions');
        
        if (recordBtn) {
            if (isRecording) {
                recordBtn.classList.add('recording');
                recordBtn.innerHTML = `
                    <svg width="24" height="24" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12"/>
                    </svg>
                    Stop Recording
                `;
            } else {
                recordBtn.classList.remove('recording');
                recordBtn.innerHTML = `
                    <svg width="24" height="24" fill="currentColor">
                        <circle cx="12" cy="12" r="8"/>
                    </svg>
                    Start Recording
                `;
            }
        }
        
        if (liveCaptions) {
            if (isRecording) {
                liveCaptions.classList.remove('hidden');
            } else {
                liveCaptions.classList.add('hidden');
            }
        }
    }

    /**
     * Show tooltip
     */
    showTooltip(element, text) {
        this.hideTooltip(); // Remove any existing tooltip
        
        const tooltip = document.createElement('div');
        tooltip.id = 'tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background-color: var(--on-surface);
            color: var(--surface);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            z-index: 10001;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
        `;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        let top = rect.top - tooltipRect.height - 8;
        
        // Adjust if tooltip would go off screen
        if (left < 8) left = 8;
        if (left + tooltipRect.width > window.innerWidth - 8) {
            left = window.innerWidth - tooltipRect.width - 8;
        }
        
        if (top < 8) {
            top = rect.bottom + 8;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        
        // Fade in
        setTimeout(() => {
            tooltip.style.opacity = '1';
        }, 10);
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Update body class for responsive styling
        document.body.classList.remove('mobile', 'tablet', 'desktop', 'wide');
        
        if (width < this.breakpoints.mobile) {
            document.body.classList.add('mobile');
        } else if (width < this.breakpoints.tablet) {
            document.body.classList.add('tablet');
        } else if (width < this.breakpoints.desktop) {
            document.body.classList.add('desktop');
        } else {
            document.body.classList.add('wide');
        }
        
        // Adjust notification container for mobile
        const notificationContainer = document.getElementById('notification-container');
        if (notificationContainer) {
            if (width < this.breakpoints.mobile) {
                notificationContainer.style.left = '10px';
                notificationContainer.style.right = '10px';
                notificationContainer.style.maxWidth = 'none';
            } else {
                notificationContainer.style.left = 'auto';
                notificationContainer.style.right = '20px';
                notificationContainer.style.maxWidth = '400px';
            }
        }
        
        // Update modal positioning
        this.updateModalPositioning();
    }

    /**
     * Handle orientation change
     */
    handleOrientationChange() {
        setTimeout(() => {
            this.handleResize();
        }, 100);
    }

    /**
     * Update modal positioning
     */
    updateModalPositioning() {
        const modals = document.querySelectorAll('.modal:not(.hidden)');
        const isMobile = window.innerWidth < this.breakpoints.mobile;
        
        modals.forEach(modal => {
            const content = modal.querySelector('.modal-content');
            if (content) {
                if (isMobile) {
                    content.style.width = '100%';
                    content.style.height = '100%';
                    content.style.borderRadius = '0';
                    content.style.margin = '0';
                } else {
                    content.style.width = '';
                    content.style.height = '';
                    content.style.borderRadius = '';
                    content.style.margin = '';
                }
            }
        });
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        this.modalsOpen.clear();
    }

    /**
     * Open modal
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            this.modalsOpen.add(modalId);
            this.updateModalPositioning();
        }
    }

    /**
     * Close modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            this.modalsOpen.delete(modalId);
        }
    }

    /**
     * Show export preview
     */
    showExportPreview(subtitles, settings) {
        // Create preview modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'export-preview-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Export Preview</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="preview-content">
                        <h3>Subtitle Preview (First 3 items)</h3>
                        <pre id="preview-text" style="
                            background-color: var(--code-background);
                            color: var(--code-text);
                            padding: var(--spacing-md);
                            border-radius: var(--radius-md);
                            overflow-x: auto;
                            white-space: pre-wrap;
                            font-family: var(--font-mono);
                            font-size: 0.875rem;
                            max-height: 300px;
                            overflow-y: auto;
                        "></pre>
                        <div class="preview-stats" style="
                            margin-top: var(--spacing-md);
                            padding: var(--spacing-md);
                            background-color: var(--surface-variant);
                            border-radius: var(--radius-md);
                        ">
                            <p><strong>Total Subtitles:</strong> ${subtitles.length}</p>
                            <p><strong>Duration:</strong> ${this.formatDuration(subtitles)}</p>
                            <p><strong>Average Length:</strong> ${this.getAverageLength(subtitles)} characters</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn secondary" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Generate preview content
        const format = document.querySelector('input[name="export-format"]:checked').value;
        const previewText = this.generatePreviewContent(subtitles.slice(0, 3), format);
        
        const previewElement = modal.querySelector('#preview-text');
        if (previewElement) {
            previewElement.textContent = previewText;
        }
        
        // Show modal
        modal.classList.remove('hidden');
        
        // Bind close events
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }
        
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Generate preview content
     */
    generatePreviewContent(subtitles, format) {
        switch (format.toLowerCase()) {
            case 'srt':
                return subtitles.map((subtitle, index) => {
                    const start = this.formatTime(subtitle.start);
                    const end = this.formatTime(subtitle.end);
                    return `${index + 1}\n${start} --> ${end}\n${subtitle.text}\n`;
                }).join('\n');
                
            case 'vtt':
                const vttContent = subtitles.map(subtitle => {
                    const start = this.formatTime(subtitle.start);
                    const end = this.formatTime(subtitle.end);
                    return `${start} --> ${end}\n${subtitle.text}\n`;
                }).join('\n');
                return `WEBVTT\n\n${vttContent}`;
                
            case 'json':
                return JSON.stringify({
                    subtitles: subtitles,
                    preview: true
                }, null, 2);
                
            default:
                return 'Preview not available for this format';
        }
    }

    /**
     * Format duration for preview
     */
    formatDuration(subtitles) {
        if (subtitles.length === 0) return '0:00';
        
        const lastSubtitle = subtitles[subtitles.length - 1];
        const totalSeconds = lastSubtitle.end;
        
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Get average subtitle length
     */
    getAverageLength(subtitles) {
        if (subtitles.length === 0) return 0;
        
        const totalLength = subtitles.reduce((sum, subtitle) => {
            return sum + (subtitle.text ? subtitle.text.length : 0);
        }, 0);
        
        return Math.round(totalLength / subtitles.length);
    }

    /**
     * Format time for preview
     */
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
        }
    }

    /**
     * Update export progress
     */
    updateExportProgress(progress) {
        const progressContainer = document.getElementById('export-progress');
        const progressFill = document.getElementById('export-progress-fill');
        const statusText = document.getElementById('export-status');
        
        if (progressContainer) {
            progressContainer.classList.remove('hidden');
        }
        
        if (progressFill) {
            progressFill.style.width = `${progress.percentage}%`;
        }
        
        if (statusText && progress.message) {
            statusText.textContent = progress.message;
        }
    }

    /**
     * Hide export progress
     */
    hideExportProgress() {
        const progressContainer = document.getElementById('export-progress');
        if (progressContainer) {
            progressContainer.classList.add('hidden');
        }
    }

    /**
     * Add CSS animation styles
     */
    addAnimationStyles() {
        if (document.getElementById('ui-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'ui-animations';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            
            .shake {
                animation: shake 0.5s ease-in-out;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Animate element with shake effect
     */
    shakeElement(element) {
        element.classList.add('shake');
        setTimeout(() => {
            element.classList.remove('shake');
        }, 500);
    }

    /**
     * Get current device type
     */
    getDeviceType() {
        const width = window.innerWidth;
        
        if (width < this.breakpoints.mobile) return 'mobile';
        if (width < this.breakpoints.tablet) return 'small-tablet';
        if (width < this.breakpoints.desktop) return 'tablet';
        if (width < this.breakpoints.wide) return 'desktop';
        return 'wide';
    }

    /**
     * Check if device is mobile
     */
    isMobile() {
        return this.getDeviceType() === 'mobile';
    }

    /**
     * Check if device is tablet
     */
    isTablet() {
        const type = this.getDeviceType();
        return type === 'small-tablet' || type === 'tablet';
    }

    /**
     * Get UI state
     */
    getState() {
        return {
            isLoading: this.isLoading,
            currentTab: this.currentTab,
            theme: this.currentTheme,
            deviceType: this.getDeviceType(),
            notificationCount: this.notifications.length,
            modalsOpen: Array.from(this.modalsOpen)
        };
    }

    /**
     * Initialize the UI controller and add animation styles
     */
    init() {
        this.addAnimationStyles();
    }

    /**
     * Destroy UI controller
     */
    destroy() {
        this.clearNotifications();
        this.hideLoading();
        this.closeAllModals();
        this.hideTooltip();
        
        // Remove notification container
        const container = document.getElementById('notification-container');
        if (container) {
            container.remove();
        }
        
        // Remove animation styles
        const styles = document.getElementById('ui-animations');
        if (styles) {
            styles.remove();
        }
    }
}

// Initialize animations when UI controller is created
if (typeof document !== 'undefined') {
    const tempUI = new UIController();
    tempUI.init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
}