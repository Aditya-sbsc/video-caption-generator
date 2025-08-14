/**
 * Video Caption Generator - Main Application
 * Professional web application for video subtitle generation
 */

class VideoCaptionGenerator {
    constructor() {
        this.currentTab = 'live-captions';
        this.theme = this.getStoredTheme();
        this.captions = [];
        this.selectedCaption = null;
        this.isRecording = false;
        this.audioContext = null;
        this.mediaRecorder = null;
        this.recognition = null;
        this.videoFile = null;
        this.videoElement = null;
        this.undoStack = [];
        this.redoStack = [];
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            await this.setupEventListeners();
            await this.initializeComponents();
            this.applyTheme();
            this.showToast('Application loaded successfully', 'success');
            this.hideLoadingScreen();
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showToast('Failed to initialize application', 'error');
            this.hideLoadingScreen();
        }
    }

    /**
     * Set up all event listeners
     */
    async setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.closest('.nav-tab').dataset.tab);
            });
        });

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Help modal
        const helpBtn = document.getElementById('help-btn');
        const helpModal = document.getElementById('help-modal');
        const modalClose = helpModal?.querySelector('.modal-close');
        
        if (helpBtn && helpModal) {
            helpBtn.addEventListener('click', () => this.showModal(helpModal));
            modalClose?.addEventListener('click', () => this.hideModal(helpModal));
            helpModal.addEventListener('click', (e) => {
                if (e.target === helpModal) this.hideModal(helpModal);
            });
        }

        // Live captions controls
        this.setupLiveCaptionControls();

        // Video upload controls
        this.setupVideoUploadControls();

        // Caption editor controls
        this.setupCaptionEditorControls();

        // Styling controls
        this.setupStylingControls();

        // Export controls
        this.setupExportControls();

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Window events
        window.addEventListener('beforeunload', () => this.saveState());
        window.addEventListener('resize', () => this.handleResize());
    }

    /**
     * Initialize application components
     */
    async initializeComponents() {
        // Initialize speech recognition if supported
        if (window.SpeechRecognition || window.webkitSpeechRecognition) {
            await this.initializeSpeechRecognition();
        } else {
            this.showToast('Speech recognition not supported in this browser', 'warning');
        }

        // Initialize audio context for visualization
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Audio context not available:', error);
        }

        // Load saved state
        this.loadState();

        // Initialize timeline
        this.initializeTimeline();

        // Initialize styling preview
        this.updateStylingPreview();

        // Setup drag and drop
        this.setupDragAndDrop();
    }

    /**
     * Set up live caption controls
     */
    setupLiveCaptionControls() {
        const startBtn = document.getElementById('start-recording');
        const stopBtn = document.getElementById('stop-recording');
        const pauseBtn = document.getElementById('pause-recording');
        const languageSelect = document.getElementById('recognition-language');

        if (startBtn) {
            startBtn.addEventListener('click', () => this.startRecording());
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopRecording());
        }
        
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pauseRecording());
        }

        if (languageSelect) {
            languageSelect.addEventListener('change', () => this.updateRecognitionLanguage());
        }
    }

    /**
     * Set up video upload controls
     */
    setupVideoUploadControls() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('video-file-input');
        const fileSelectBtn = document.getElementById('file-select-btn');
        const processBtn = document.getElementById('process-video');

        if (fileSelectBtn && fileInput) {
            fileSelectBtn.addEventListener('click', () => fileInput.click());
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleVideoFile(e.target.files[0]));
        }

        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        }

        if (processBtn) {
            processBtn.addEventListener('click', () => this.processVideo());
        }
    }

    /**
     * Set up caption editor controls
     */
    setupCaptionEditorControls() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        const splitBtn = document.getElementById('split-caption');
        const mergeBtn = document.getElementById('merge-captions');
        const deleteBtn = document.getElementById('delete-caption');
        const playPauseBtn = document.getElementById('play-pause');
        const timelineScrubber = document.getElementById('timeline-scrubber');
        const saveCaptionBtn = document.getElementById('save-caption');
        const addCaptionBtn = document.getElementById('add-caption');
        const searchInput = document.getElementById('search-input');
        const replaceInput = document.getElementById('replace-input');
        const replaceBtn = document.getElementById('replace-btn');
        const replaceAllBtn = document.getElementById('replace-all-btn');

        if (undoBtn) undoBtn.addEventListener('click', () => this.undo());
        if (redoBtn) redoBtn.addEventListener('click', () => this.redo());
        if (splitBtn) splitBtn.addEventListener('click', () => this.splitCaption());
        if (mergeBtn) mergeBtn.addEventListener('click', () => this.mergeCaptions());
        if (deleteBtn) deleteBtn.addEventListener('click', () => this.deleteCaption());
        if (playPauseBtn) playPauseBtn.addEventListener('click', () => this.togglePlayback());
        if (timelineScrubber) timelineScrubber.addEventListener('input', (e) => this.scrubTimeline(e.target.value));
        if (saveCaptionBtn) saveCaptionBtn.addEventListener('click', () => this.saveCaption());
        if (addCaptionBtn) addCaptionBtn.addEventListener('click', () => this.addCaption());
        if (replaceBtn) replaceBtn.addEventListener('click', () => this.replaceText());
        if (replaceAllBtn) replaceAllBtn.addEventListener('click', () => this.replaceAllText());

        // Timeline interaction
        const timeline = document.getElementById('timeline');
        if (timeline) {
            timeline.addEventListener('click', (e) => this.handleTimelineClick(e));
        }
    }

    /**
     * Set up styling controls
     */
    setupStylingControls() {
        const controls = [
            'font-family', 'font-size', 'font-weight',
            'text-color', 'background-color', 'background-opacity',
            'caption-position', 'text-outline', 'text-shadow', 'text-background',
            'target-language'
        ];

        controls.forEach(controlId => {
            const element = document.getElementById(controlId);
            if (element) {
                element.addEventListener('change', () => this.updateStylingPreview());
                if (element.type === 'range') {
                    element.addEventListener('input', () => this.updateStylingPreview());
                }
            }
        });

        // Color hex inputs
        const textColorHex = document.getElementById('text-color-hex');
        const bgColorHex = document.getElementById('background-color-hex');
        
        if (textColorHex) {
            textColorHex.addEventListener('input', (e) => {
                document.getElementById('text-color').value = e.target.value;
                this.updateStylingPreview();
            });
        }
        
        if (bgColorHex) {
            bgColorHex.addEventListener('input', (e) => {
                document.getElementById('background-color').value = e.target.value;
                this.updateStylingPreview();
            });
        }

        // Translate button
        const translateBtn = document.getElementById('translate-captions');
        if (translateBtn) {
            translateBtn.addEventListener('click', () => this.translateCaptions());
        }
    }

    /**
     * Set up export controls
     */
    setupExportControls() {
        const exportBtns = document.querySelectorAll('.export-btn');
        const batchExportBtn = document.getElementById('batch-export');
        const copyPreviewBtn = document.getElementById('copy-preview');
        const previewTabs = document.querySelectorAll('.preview-tab');

        exportBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.target.closest('.export-btn').dataset.format;
                this.exportCaptions(format);
            });
        });

        if (batchExportBtn) {
            batchExportBtn.addEventListener('click', () => this.batchExport());
        }

        if (copyPreviewBtn) {
            copyPreviewBtn.addEventListener('click', () => this.copyPreviewToClipboard());
        }

        previewTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const format = e.target.dataset.preview;
                this.updateExportPreview(format);
            });
        });
    }

    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Z - Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            
            // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z - Redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redo();
            }
            
            // Space - Play/Pause
            if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                this.togglePlayback();
            }
            
            // Delete - Delete selected caption
            if (e.key === 'Delete' && this.selectedCaption) {
                e.preventDefault();
                this.deleteCaption();
            }
            
            // Ctrl/Cmd + S - Save project
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveProject();
            }
            
            // Ctrl/Cmd + E - Export captions
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                this.exportCaptions('srt');
            }
        });
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive);
        });

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });

        this.currentTab = tabName;
        this.handleTabSwitch(tabName);
    }

    /**
     * Handle tab switch logic
     */
    handleTabSwitch(tabName) {
        switch (tabName) {
            case 'caption-editor':
                this.refreshTimeline();
                break;
            case 'styling':
                this.updateStylingPreview();
                break;
            case 'export':
                this.updateExportPreview('srt');
                break;
        }
    }

    /**
     * Theme management
     */
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        this.saveTheme();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = this.theme === 'light' ? '🌙' : '☀️';
        }
    }

    getStoredTheme() {
        const stored = localStorage.getItem('vcp-theme');
        if (stored) return stored;
        
        // Auto-detect user preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    saveTheme() {
        localStorage.setItem('vcp-theme', this.theme);
    }

    /**
     * Modal management
     */
    showModal(modal) {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        // Focus first focusable element
        const focusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable) focusable.focus();
    }

    hideModal(modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    /**
     * Toast notifications
     */
    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-title">${this.getToastTitle(type)}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Close notification">&times;</button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.removeToast(toast);
        });

        container.appendChild(toast);

        // Auto-remove after duration
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
    }

    getToastTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };
        return titles[type] || 'Notification';
    }

    removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }

    /**
     * State management
     */
    saveState() {
        const state = {
            captions: this.captions,
            theme: this.theme,
            currentTab: this.currentTab,
            styling: this.getStylingState()
        };
        
        try {
            localStorage.setItem('vcp-state', JSON.stringify(state));
        } catch (error) {
            console.warn('Failed to save state:', error);
        }
    }

    loadState() {
        try {
            const saved = localStorage.getItem('vcp-state');
            if (saved) {
                const state = JSON.parse(saved);
                this.captions = state.captions || [];
                this.applyStylingState(state.styling || {});
                this.refreshCaptionsDisplay();
            }
        } catch (error) {
            console.warn('Failed to load state:', error);
        }
    }

    getStylingState() {
        const controls = [
            'font-family', 'font-size', 'font-weight',
            'text-color', 'background-color', 'background-opacity',
            'caption-position', 'text-outline', 'text-shadow', 'text-background'
        ];

        const state = {};
        controls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                state[id] = element.type === 'checkbox' ? element.checked : element.value;
            }
        });

        return state;
    }

    applyStylingState(state) {
        Object.keys(state).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = state[id];
                } else {
                    element.value = state[id];
                }
            }
        });
    }

    /**
     * Utility functions
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        if (loadingScreen && app) {
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    app.style.display = 'flex';
                }, 300);
            }, 1000); // Show loading for at least 1 second for UX
        }
    }

    handleResize() {
        // Update timeline and other responsive elements
        this.refreshTimeline();
    }

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

    parseTime(timeString) {
        const parts = timeString.split(/[:,]/);
        if (parts.length === 4) {
            // HH:MM:SS,mmm format
            return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]) + parseInt(parts[3]) / 1000;
        } else if (parts.length === 3) {
            // MM:SS,mmm format
            return parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(parts[2]) / 1000;
        }
        return 0;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Placeholder methods for components that will be implemented in separate files
     */
    async initializeSpeechRecognition() {
        // Will be implemented in speech-recognition.js
        console.log('Speech recognition initialization placeholder');
    }

    startRecording() {
        // Will be implemented in speech-recognition.js
        console.log('Start recording placeholder');
    }

    stopRecording() {
        // Will be implemented in speech-recognition.js
        console.log('Stop recording placeholder');
    }

    pauseRecording() {
        // Will be implemented in speech-recognition.js
        console.log('Pause recording placeholder');
    }

    updateRecognitionLanguage() {
        // Will be implemented in speech-recognition.js
        console.log('Update recognition language placeholder');
    }

    handleVideoFile(file) {
        // Will be implemented in video-processor.js
        console.log('Handle video file placeholder:', file);
    }

    handleDragOver(e) {
        // Will be implemented in video-processor.js
        console.log('Handle drag over placeholder');
    }

    handleDragLeave(e) {
        // Will be implemented in video-processor.js
        console.log('Handle drag leave placeholder');
    }

    handleDrop(e) {
        // Will be implemented in video-processor.js
        console.log('Handle drop placeholder');
    }

    processVideo() {
        // Will be implemented in video-processor.js
        console.log('Process video placeholder');
    }

    setupDragAndDrop() {
        // Will be implemented in video-processor.js
        console.log('Setup drag and drop placeholder');
    }

    initializeTimeline() {
        // Will be implemented in caption-editor.js
        console.log('Initialize timeline placeholder');
    }

    refreshTimeline() {
        // Will be implemented in caption-editor.js
        console.log('Refresh timeline placeholder');
    }

    handleTimelineClick(e) {
        // Will be implemented in caption-editor.js
        console.log('Handle timeline click placeholder');
    }

    undo() {
        // Will be implemented in caption-editor.js
        console.log('Undo placeholder');
    }

    redo() {
        // Will be implemented in caption-editor.js
        console.log('Redo placeholder');
    }

    splitCaption() {
        // Will be implemented in caption-editor.js
        console.log('Split caption placeholder');
    }

    mergeCaptions() {
        // Will be implemented in caption-editor.js
        console.log('Merge captions placeholder');
    }

    deleteCaption() {
        // Will be implemented in caption-editor.js
        console.log('Delete caption placeholder');
    }

    togglePlayback() {
        // Will be implemented in caption-editor.js
        console.log('Toggle playback placeholder');
    }

    scrubTimeline(value) {
        // Will be implemented in caption-editor.js
        console.log('Scrub timeline placeholder:', value);
    }

    saveCaption() {
        // Will be implemented in caption-editor.js
        console.log('Save caption placeholder');
    }

    addCaption() {
        // Will be implemented in caption-editor.js
        console.log('Add caption placeholder');
    }

    replaceText() {
        // Will be implemented in caption-editor.js
        console.log('Replace text placeholder');
    }

    replaceAllText() {
        // Will be implemented in caption-editor.js
        console.log('Replace all text placeholder');
    }

    updateStylingPreview() {
        const preview = document.querySelector('.preview-caption');
        if (!preview) return;

        // Get current styling settings
        const fontFamily = document.getElementById('font-family')?.value || 'Arial, sans-serif';
        const fontSize = document.getElementById('font-size')?.value || '24';
        const fontWeight = document.getElementById('font-weight')?.value || 'normal';
        const textColor = document.getElementById('text-color')?.value || '#ffffff';
        const backgroundColor = document.getElementById('background-color')?.value || '#000000';
        const backgroundOpacity = document.getElementById('background-opacity')?.value || '80';
        const position = document.getElementById('caption-position')?.value || 'bottom';
        const textOutline = document.getElementById('text-outline')?.checked || false;
        const textShadow = document.getElementById('text-shadow')?.checked || false;
        const textBackground = document.getElementById('text-background')?.checked || true;

        // Apply styles
        preview.style.fontFamily = fontFamily;
        preview.style.fontSize = fontSize + 'px';
        preview.style.fontWeight = fontWeight;
        preview.style.color = textColor;
        
        if (textBackground) {
            preview.style.backgroundColor = Utils.getRgbaString(backgroundColor, backgroundOpacity / 100);
        } else {
            preview.style.backgroundColor = 'transparent';
        }

        // Position
        const container = preview.parentElement;
        container.style.bottom = position === 'bottom' ? '20px' : 'auto';
        container.style.top = position === 'top' ? '20px' : 'auto';
        container.style.top = position === 'middle' ? '50%' : container.style.top;
        container.style.transform = position === 'middle' ? 'translateX(-50%) translateY(-50%)' : 'translateX(-50%)';

        // Text effects
        let textShadowValue = '';
        if (textOutline) {
            textShadowValue += '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
        }
        if (textShadow) {
            if (textShadowValue) textShadowValue += ', ';
            textShadowValue += '2px 2px 4px rgba(0,0,0,0.5)';
        }
        preview.style.textShadow = textShadowValue;

        // Update range value displays
        const fontSizeValue = document.getElementById('font-size-value');
        const bgOpacityValue = document.getElementById('bg-opacity-value');
        
        if (fontSizeValue) fontSizeValue.textContent = fontSize + 'px';
        if (bgOpacityValue) bgOpacityValue.textContent = backgroundOpacity + '%';

        // Update hex color inputs
        const textColorHex = document.getElementById('text-color-hex');
        const bgColorHex = document.getElementById('background-color-hex');
        
        if (textColorHex) textColorHex.value = textColor;
        if (bgColorHex) bgColorHex.value = backgroundColor;
    }

    async translateCaptions() {
        const targetLanguage = document.getElementById('target-language')?.value;
        
        if (!targetLanguage) {
            this.showToast('Please select a target language', 'warning');
            return;
        }

        if (!this.captions || this.captions.length === 0) {
            this.showToast('No captions to translate', 'warning');
            return;
        }

        try {
            this.showToast('Starting translation...', 'info');
            
            // Note: This is a mock implementation
            // In production, you would integrate with Google Translate API or similar service
            const translatedCaptions = await this.mockTranslateService(this.captions, targetLanguage);
            
            // Update captions with translations
            this.captions = translatedCaptions;
            
            // Refresh displays
            this.refreshCaptionsDisplay();
            if (this.captionEditor) {
                this.captionEditor.refreshTimeline();
            }
            
            const languageName = Utils.getTranslationLanguages()[targetLanguage];
            this.showToast(`Captions translated to ${languageName}`, 'success');
            
        } catch (error) {
            console.error('Translation error:', error);
            this.showToast('Translation failed: ' + error.message, 'error');
        }
    }

    async mockTranslateService(captions, targetLanguage) {
        // Mock translation service - replace with real API in production
        const mockTranslations = {
            'es': {
                'Hello world': 'Hola mundo',
                'Welcome to our video': 'Bienvenido a nuestro video',
                'Thank you for watching': 'Gracias por ver'
            },
            'fr': {
                'Hello world': 'Bonjour le monde',
                'Welcome to our video': 'Bienvenue dans notre vidéo',
                'Thank you for watching': 'Merci d\'avoir regardé'
            }
        };

        const translations = mockTranslations[targetLanguage] || {};
        
        return captions.map(caption => ({
            ...caption,
            text: translations[caption.text] || `[${targetLanguage.toUpperCase()}] ${caption.text}`,
            language: targetLanguage
        }));
    }

    exportCaptions(format) {
        // Will be implemented in export-manager.js
        console.log('Export captions placeholder:', format);
    }

    batchExport() {
        // Will be implemented in export-manager.js
        console.log('Batch export placeholder');
    }

    copyPreviewToClipboard() {
        // Will be implemented in export-manager.js
        console.log('Copy preview to clipboard placeholder');
    }

    updateExportPreview(format) {
        // Will be implemented in export-manager.js
        console.log('Update export preview placeholder:', format);
    }

    saveProject() {
        try {
            const projectData = {
                metadata: {
                    name: 'Video Caption Project',
                    created: new Date().toISOString(),
                    version: '1.0'
                },
                captions: this.captions,
                styling: this.getStylingState(),
                settings: {
                    currentTab: this.currentTab,
                    theme: this.theme
                }
            };

            const content = JSON.stringify(projectData, null, 2);
            Utils.downloadFile(content, 'video-caption-project.json', 'application/json');
            
            this.showToast('Project saved successfully', 'success');
        } catch (error) {
            console.error('Save project error:', error);
            this.showToast('Failed to save project', 'error');
        }
    }

    refreshCaptionsDisplay() {
        const output = document.getElementById('live-captions-output');
        if (!output) return;

        if (!this.captions || this.captions.length === 0) {
            output.innerHTML = '<p class="placeholder-text">No captions available</p>';
            return;
        }

        output.innerHTML = '';
        
        this.captions.forEach(caption => {
            const segmentElement = document.createElement('div');
            segmentElement.className = 'caption-segment final';
            segmentElement.innerHTML = `
                <div class="caption-timestamp">[${Utils.formatTime(caption.startTime, 'display')} - ${Utils.formatTime(caption.endTime, 'display')}]</div>
                <div class="caption-text">${Utils.sanitizeText(caption.text)}</div>
            `;
            output.appendChild(segmentElement);
        });

        // Update caption count
        const countDisplay = document.getElementById('caption-count');
        if (countDisplay) {
            const count = this.captions.length;
            countDisplay.textContent = `${count} segment${count !== 1 ? 's' : ''}`;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.captionGenerator = new VideoCaptionGenerator();
});

// Make app globally available for debugging
window.VideoCaptionGenerator = VideoCaptionGenerator;