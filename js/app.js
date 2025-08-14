/**
 * Video Caption Generator - Main Application Controller
 * Orchestrates all components and manages application state
 */

class CaptionGenerator {
    constructor() {
        this.currentVideo = null;
        this.videoElement = null;
        this.subtitles = [];
        this.isRecording = false;
        this.currentLanguage = 'en-US';
        this.targetLanguage = 'en';
        this.exportInProgress = false;
        
        // Application state
        this.state = {
            currentTab: 'upload',
            videoLoaded: false,
            subtitlesGenerated: false,
            unsavedChanges: false
        };
        
        // Settings with defaults
        this.settings = {
            fontSize: 24,
            fontFamily: 'Arial',
            fontColor: '#FFFFFF',
            backgroundColor: '#000000',
            backgroundOpacity: 0.8,
            position: 'bottom',
            apiKeys: {
                googleTranslate: localStorage.getItem('googleTranslateKey') || ''
            },
            performance: {
                enableGPU: localStorage.getItem('enableGPU') === 'true'
            }
        };
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            this.initializeComponents();
            this.bindEvents();
            this.loadSettings();
            this.setupServiceWorker();
            this.restoreSession();
            
            // Initialize theme
            this.initializeTheme();
            
            console.log('Video Caption Generator initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.uiController.showError('Failed to initialize application. Please refresh and try again.');
        }
    }

    /**
     * Initialize all component instances
     */
    initializeComponents() {
        this.speechRecognition = new SpeechRecognitionHandler();
        this.videoProcessor = new VideoProcessor();
        this.translator = new TranslationService();
        this.subtitleEditor = new SubtitleEditor();
        this.exportHandler = new ExportHandler();
        this.uiController = new UIController();
        
        // Set up component communication
        this.setupComponentCommunication();
    }

    /**
     * Set up communication between components
     */
    setupComponentCommunication() {
        // Speech recognition events
        this.speechRecognition.onResult = this.handleSpeechResult.bind(this);
        this.speechRecognition.onError = this.handleSpeechError.bind(this);
        this.speechRecognition.onEnd = this.handleSpeechEnd.bind(this);
        
        // Video processor events
        this.videoProcessor.onProgress = this.handleVideoProgress.bind(this);
        this.videoProcessor.onComplete = this.handleVideoComplete.bind(this);
        this.videoProcessor.onError = this.handleVideoError.bind(this);
        
        // Subtitle editor events
        this.subtitleEditor.onChange = this.handleSubtitleChange.bind(this);
        this.subtitleEditor.onSelect = this.handleSubtitleSelect.bind(this);
        
        // Export handler events
        this.exportHandler.onProgress = this.handleExportProgress.bind(this);
        this.exportHandler.onComplete = this.handleExportComplete.bind(this);
        this.exportHandler.onError = this.handleExportError.bind(this);
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', this.handleTabSwitch.bind(this));
        });
        
        // Upload and recording
        document.getElementById('upload-dropzone').addEventListener('click', () => {
            document.getElementById('video-upload').click();
        });
        document.getElementById('video-upload').addEventListener('change', this.handleVideoUpload.bind(this));
        document.getElementById('record-btn').addEventListener('click', this.toggleRecording.bind(this));
        
        // Drag and drop
        const dropzone = document.getElementById('upload-dropzone');
        dropzone.addEventListener('dragover', this.handleDragOver.bind(this));
        dropzone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        dropzone.addEventListener('drop', this.handleDrop.bind(this));
        
        // Language selection
        document.getElementById('input-language').addEventListener('change', this.handleLanguageChange.bind(this));
        document.getElementById('target-language').addEventListener('change', this.handleTargetLanguageChange.bind(this));
        
        // Video controls
        document.getElementById('play-pause-btn').addEventListener('click', this.togglePlayPause.bind(this));
        document.getElementById('timeline-slider').addEventListener('input', this.handleTimelineSeek.bind(this));
        
        // Subtitle editing
        document.getElementById('add-subtitle-btn').addEventListener('click', this.addSubtitle.bind(this));
        document.getElementById('translate-btn').addEventListener('click', this.translateSubtitles.bind(this));
        
        // Styling controls
        this.bindStylingControls();
        
        // Export
        document.getElementById('export-btn').addEventListener('click', this.handleExport.bind(this));
        document.getElementById('preview-export-btn').addEventListener('click', this.previewExport.bind(this));
        document.getElementById('include-video').addEventListener('change', this.toggleVideoExport.bind(this));
        
        // Modal controls
        document.getElementById('settings-btn').addEventListener('click', this.openSettings.bind(this));
        document.getElementById('help-btn').addEventListener('click', this.openHelp.bind(this));
        document.getElementById('theme-toggle').addEventListener('click', this.toggleTheme.bind(this));
        
        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', this.closeModals.bind(this));
        });
        
        // Settings modal
        document.getElementById('save-settings').addEventListener('click', this.saveSettings.bind(this));
        document.getElementById('cancel-settings').addEventListener('click', this.closeModals.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        // Window events
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    /**
     * Bind styling control events
     */
    bindStylingControls() {
        const controls = [
            'font-family', 'font-size', 'font-color', 
            'bg-color', 'bg-opacity'
        ];
        
        controls.forEach(controlId => {
            const element = document.getElementById(controlId);
            if (element) {
                element.addEventListener('change', this.handleStyleChange.bind(this));
                element.addEventListener('input', this.handleStyleChange.bind(this));
            }
        });
    }

    /**
     * Handle video file upload
     */
    async handleVideoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!this.isValidVideoFile(file)) {
            this.uiController.showError('Please select a valid video file (MP4, WebM, MOV, AVI)');
            return;
        }
        
        try {
            this.uiController.showLoading('Processing video...');
            
            // Load video
            this.currentVideo = file;
            await this.loadVideoPreview(file);
            
            // Extract audio and generate subtitles
            const subtitles = await this.videoProcessor.extractSubtitles(file);
            this.subtitles = subtitles;
            
            // Update UI
            this.subtitleEditor.loadSubtitles(subtitles);
            this.state.videoLoaded = true;
            this.state.subtitlesGenerated = true;
            
            // Switch to edit tab
            this.switchTab('edit');
            
            this.uiController.showSuccess('Video processed successfully!');
            
        } catch (error) {
            console.error('Video upload error:', error);
            this.uiController.showError(`Failed to process video: ${error.message}`);
        } finally {
            this.uiController.hideLoading();
        }
    }

    /**
     * Load video preview
     */
    async loadVideoPreview(file) {
        return new Promise((resolve, reject) => {
            const video = document.getElementById('preview-video');
            const placeholder = document.getElementById('video-placeholder');
            
            const url = URL.createObjectURL(file);
            video.src = url;
            
            video.onloadedmetadata = () => {
                placeholder.classList.add('hidden');
                video.classList.remove('hidden');
                
                // Update timeline
                document.getElementById('total-time').textContent = this.formatTime(video.duration);
                document.getElementById('timeline-slider').max = video.duration;
                document.getElementById('play-pause-btn').disabled = false;
                
                this.videoElement = video;
                resolve();
            };
            
            video.onerror = () => {
                reject(new Error('Failed to load video'));
            };
        });
    }

    /**
     * Toggle recording
     */
    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    /**
     * Start recording
     */
    async startRecording() {
        try {
            const language = document.getElementById('input-language').value;
            await this.speechRecognition.start(language);
            
            this.isRecording = true;
            this.uiController.updateRecordingState(true);
            
            // Show live captions
            document.getElementById('live-captions').classList.remove('hidden');
            
        } catch (error) {
            console.error('Recording start error:', error);
            this.uiController.showError(`Failed to start recording: ${error.message}`);
        }
    }

    /**
     * Stop recording
     */
    stopRecording() {
        this.speechRecognition.stop();
        this.isRecording = false;
        this.uiController.updateRecordingState(false);
    }

    /**
     * Handle speech recognition results
     */
    handleSpeechResult(result) {
        const display = document.getElementById('captions-display');
        const confidence = document.getElementById('confidence-fill');
        const confidenceValue = document.getElementById('confidence-value');
        
        // Update live display
        let text = result.final;
        if (result.interim) {
            text += `\n[${result.interim}]`;
        }
        display.textContent = text;
        
        // Update confidence
        const confidencePercent = Math.round((result.confidence || 0) * 100);
        confidence.style.width = `${confidencePercent}%`;
        confidenceValue.textContent = `${confidencePercent}%`;
        
        // Add to subtitles if final
        if (result.final && result.final.trim()) {
            const subtitle = {
                id: Date.now(),
                start: Date.now() / 1000,
                end: Date.now() / 1000 + 3, // Default 3 seconds
                text: result.final.trim(),
                confidence: result.confidence || 0
            };
            
            this.subtitles.push(subtitle);
            this.subtitleEditor.addSubtitle(subtitle);
            this.state.subtitlesGenerated = true;
        }
    }

    /**
     * Handle speech recognition errors
     */
    handleSpeechError(error) {
        console.error('Speech recognition error:', error);
        this.uiController.showError(`Speech recognition error: ${error}`);
        this.stopRecording();
    }

    /**
     * Handle speech recognition end
     */
    handleSpeechEnd() {
        if (this.isRecording) {
            // Auto-restart if recording should continue
            setTimeout(() => {
                this.speechRecognition.start(this.currentLanguage);
            }, 100);
        }
    }

    /**
     * Handle tab switching
     */
    handleTabSwitch(event) {
        const tabName = event.target.dataset.tab;
        this.switchTab(tabName);
    }

    /**
     * Switch to a specific tab
     */
    switchTab(tabName) {
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabName}-panel`).classList.add('active');
        
        this.state.currentTab = tabName;
    }

    /**
     * Handle drag and drop
     */
    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('dragover');
    }

    handleDragLeave(event) {
        event.currentTarget.classList.remove('dragover');
    }

    async handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('dragover');
        
        const files = Array.from(event.dataTransfer.files);
        const videoFile = files.find(file => this.isValidVideoFile(file));
        
        if (videoFile) {
            // Simulate file input
            const input = document.getElementById('video-upload');
            const dt = new DataTransfer();
            dt.items.add(videoFile);
            input.files = dt.files;
            
            await this.handleVideoUpload({ target: input });
        } else {
            this.uiController.showError('Please drop a valid video file');
        }
    }

    /**
     * Validate video file
     */
    isValidVideoFile(file) {
        const validTypes = ['video/mp4', 'video/webm', 'video/mov', 'video/avi', 'video/quicktime'];
        return validTypes.includes(file.type);
    }

    /**
     * Handle export
     */
    async handleExport() {
        if (this.exportInProgress) return;
        
        const format = document.querySelector('input[name="export-format"]:checked').value;
        const includeVideo = document.getElementById('include-video').checked;
        
        if (!this.subtitles.length) {
            this.uiController.showError('No subtitles to export');
            return;
        }
        
        try {
            this.exportInProgress = true;
            
            if (includeVideo && this.currentVideo) {
                await this.exportHandler.exportVideoWithSubtitles(
                    this.currentVideo, 
                    this.subtitles, 
                    this.settings
                );
            } else {
                await this.exportHandler.exportSubtitles(this.subtitles, format);
            }
            
        } catch (error) {
            console.error('Export error:', error);
            this.uiController.showError(`Export failed: ${error.message}`);
        } finally {
            this.exportInProgress = false;
        }
    }

    /**
     * Initialize theme based on system preference or saved setting
     */
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        const theme = savedTheme || (systemDark ? 'dark' : 'light');
        this.setTheme(theme);
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    /**
     * Set application theme
     */
    setTheme(theme) {
        document.body.className = `${theme}-theme`;
        localStorage.setItem('theme', theme);
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const currentTheme = document.body.className.includes('dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    /**
     * Open settings modal
     */
    openSettings() {
        // Populate current settings
        document.getElementById('google-translate-key').value = this.settings.apiKeys.googleTranslate;
        document.getElementById('enable-gpu').checked = this.settings.performance.enableGPU;
        
        document.getElementById('settings-modal').classList.remove('hidden');
    }

    /**
     * Save settings
     */
    saveSettings() {
        this.settings.apiKeys.googleTranslate = document.getElementById('google-translate-key').value;
        this.settings.performance.enableGPU = document.getElementById('enable-gpu').checked;
        
        // Save to localStorage
        localStorage.setItem('googleTranslateKey', this.settings.apiKeys.googleTranslate);
        localStorage.setItem('enableGPU', this.settings.performance.enableGPU);
        
        this.closeModals();
        this.uiController.showSuccess('Settings saved successfully');
    }

    /**
     * Open help modal
     */
    openHelp() {
        document.getElementById('help-modal').classList.remove('hidden');
    }

    /**
     * Close all modals
     */
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    /**
     * Load saved settings
     */
    loadSettings() {
        // Load from localStorage
        const savedSettings = localStorage.getItem('captionGeneratorSettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
    }

    /**
     * Setup service worker for PWA functionality
     */
    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('service-worker.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }
    }

    /**
     * Restore previous session
     */
    restoreSession() {
        const session = localStorage.getItem('captionGeneratorSession');
        if (session) {
            try {
                const data = JSON.parse(session);
                if (data.subtitles) {
                    this.subtitles = data.subtitles;
                    this.subtitleEditor.loadSubtitles(data.subtitles);
                }
            } catch (error) {
                console.warn('Failed to restore session:', error);
            }
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 's':
                    event.preventDefault();
                    this.saveSession();
                    break;
                case 'z':
                    event.preventDefault();
                    // Implement undo functionality
                    break;
            }
        } else if (event.key === ' ' && event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
            event.preventDefault();
            this.togglePlayPause();
        }
    }

    /**
     * Save current session
     */
    saveSession() {
        const session = {
            subtitles: this.subtitles,
            settings: this.settings,
            timestamp: Date.now()
        };
        localStorage.setItem('captionGeneratorSession', JSON.stringify(session));
        this.uiController.showSuccess('Session saved');
    }

    /**
     * Handle before unload
     */
    handleBeforeUnload(event) {
        if (this.state.unsavedChanges) {
            event.preventDefault();
            event.returnValue = '';
        }
    }

    /**
     * Utility methods
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Additional event handlers for completeness
    handleVideoProgress(progress) {
        this.uiController.updateProgress(progress);
    }

    handleVideoComplete(result) {
        this.subtitles = result.subtitles;
        this.subtitleEditor.loadSubtitles(result.subtitles);
    }

    handleVideoError(error) {
        this.uiController.showError(`Video processing error: ${error.message}`);
    }

    handleSubtitleChange() {
        this.state.unsavedChanges = true;
    }

    handleSubtitleSelect(subtitle) {
        if (this.videoElement) {
            this.videoElement.currentTime = subtitle.start;
        }
    }

    handleExportProgress(progress) {
        this.uiController.updateExportProgress(progress);
    }

    handleExportComplete(result) {
        this.uiController.showSuccess('Export completed successfully');
        this.uiController.hideExportProgress();
    }

    handleExportError(error) {
        this.uiController.showError(`Export failed: ${error.message}`);
        this.uiController.hideExportProgress();
    }

    handleLanguageChange(event) {
        this.currentLanguage = event.target.value;
    }

    handleTargetLanguageChange(event) {
        this.targetLanguage = event.target.value;
    }

    togglePlayPause() {
        if (this.videoElement) {
            if (this.videoElement.paused) {
                this.videoElement.play();
            } else {
                this.videoElement.pause();
            }
        }
    }

    handleTimelineSeek(event) {
        if (this.videoElement) {
            this.videoElement.currentTime = event.target.value;
        }
    }

    addSubtitle() {
        const newSubtitle = {
            id: Date.now(),
            start: this.videoElement ? this.videoElement.currentTime : 0,
            end: this.videoElement ? this.videoElement.currentTime + 3 : 3,
            text: ''
        };
        this.subtitles.push(newSubtitle);
        this.subtitleEditor.addSubtitle(newSubtitle);
    }

    async translateSubtitles() {
        if (!this.settings.apiKeys.googleTranslate) {
            this.uiController.showError('Please configure Google Translate API key in settings');
            return;
        }
        
        try {
            this.uiController.showLoading('Translating subtitles...');
            const translatedSubtitles = await this.translator.translateSubtitles(
                this.subtitles, 
                this.targetLanguage
            );
            this.subtitles = translatedSubtitles;
            this.subtitleEditor.loadSubtitles(translatedSubtitles);
            this.uiController.showSuccess('Subtitles translated successfully');
        } catch (error) {
            this.uiController.showError(`Translation failed: ${error.message}`);
        } finally {
            this.uiController.hideLoading();
        }
    }

    handleStyleChange() {
        // Update preview styling
        this.updateSubtitlePreview();
    }

    updateSubtitlePreview() {
        // Update subtitle styling in real-time
        const preview = document.querySelector('.subtitle-preview');
        if (preview) {
            preview.style.fontFamily = document.getElementById('font-family').value;
            preview.style.fontSize = document.getElementById('font-size').value + 'px';
            preview.style.color = document.getElementById('font-color').value;
            preview.style.backgroundColor = document.getElementById('bg-color').value;
            preview.style.opacity = document.getElementById('bg-opacity').value / 100;
        }
    }

    previewExport() {
        // Show export preview
        this.uiController.showExportPreview(this.subtitles, this.settings);
    }

    toggleVideoExport() {
        const qualitySection = document.getElementById('video-quality');
        const includeVideo = document.getElementById('include-video').checked;
        
        if (includeVideo) {
            qualitySection.classList.remove('hidden');
        } else {
            qualitySection.classList.add('hidden');
        }
    }

    handleResize() {
        // Handle responsive layout changes
        this.uiController.handleResize();
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance
    window.captionGenerator = new CaptionGenerator();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CaptionGenerator;
}