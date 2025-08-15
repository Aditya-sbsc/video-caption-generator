/**
 * Video Caption Generator - Video Processor Module
 * Handles video file upload, processing, and audio extraction for caption generation
 */

class VideoProcessorManager {
    constructor(app) {
        this.app = app;
        this.currentVideo = null;
        this.videoElement = null;
        this.audioContext = null;
        this.audioBuffer = null;
        this.isProcessing = false;
        this.processingProgress = 0;
        
        this.initializeVideoElement();
        this.setupDragAndDrop();
    }

    /**
     * Initialize video element
     */
    initializeVideoElement() {
        this.videoElement = document.getElementById('preview-video');
        if (this.videoElement) {
            this.videoElement.addEventListener('loadedmetadata', () => this.updateVideoInfo());
            this.videoElement.addEventListener('error', (e) => this.handleVideoError(e));
        }
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        const uploadArea = document.getElementById('upload-area');
        if (!uploadArea) return;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => this.handleDragEnter(uploadArea), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => this.handleDragLeave(uploadArea), false);
        });

        // Handle dropped files
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    /**
     * Prevent default drag behaviors
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Handle drag enter
     */
    handleDragEnter(uploadArea) {
        uploadArea.classList.add('dragover');
    }

    /**
     * Handle drag leave
     */
    handleDragLeave(uploadArea) {
        uploadArea.classList.remove('dragover');
    }

    /**
     * Handle file drop
     */
    handleDrop(e) {
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.classList.remove('dragover');
        }

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleVideoFile(files[0]);
        }
    }

    /**
     * Handle video file selection
     */
    async handleVideoFile(file) {
        try {
            // Validate file
            if (!this.validateVideoFile(file)) {
                return;
            }

            // Store file reference
            this.currentVideo = file;

            // Show video preview
            await this.showVideoPreview(file);

            // Update UI
            this.showVideoPreviewSection();

            this.app.showToast('Video loaded successfully', 'success');

        } catch (error) {
            console.error('Error handling video file:', error);
            this.app.showToast('Error loading video: ' + error.message, 'error');
        }
    }

    /**
     * Validate video file
     */
    validateVideoFile(file) {
        // Check file type
        if (!Utils.isValidVideoFile(file)) {
            this.app.showToast('Please select a valid video file (MP4, WebM, MOV, AVI)', 'error');
            return false;
        }

        // Check file size
        if (!Utils.isValidFileSize(file, 500)) {
            this.app.showToast('File size must be less than 500MB', 'error');
            return false;
        }

        return true;
    }

    /**
     * Show video preview
     */
    async showVideoPreview(file) {
        if (!this.videoElement) return;

        // Create object URL for video
        const videoURL = URL.createObjectURL(file);
        this.videoElement.src = videoURL;

        // Wait for metadata to load
        return new Promise((resolve, reject) => {
            const handleLoaded = () => {
                this.videoElement.removeEventListener('loadedmetadata', handleLoaded);
                this.videoElement.removeEventListener('error', handleError);
                resolve();
            };

            const handleError = (e) => {
                this.videoElement.removeEventListener('loadedmetadata', handleLoaded);
                this.videoElement.removeEventListener('error', handleError);
                URL.revokeObjectURL(videoURL);
                reject(new Error('Failed to load video'));
            };

            this.videoElement.addEventListener('loadedmetadata', handleLoaded);
            this.videoElement.addEventListener('error', handleError);
        });
    }

    /**
     * Show video preview section
     */
    showVideoPreviewSection() {
        const uploadArea = document.getElementById('upload-area');
        const videoPreview = document.getElementById('video-preview');

        if (uploadArea) {
            uploadArea.style.display = 'none';
        }

        if (videoPreview) {
            videoPreview.style.display = 'block';
        }
    }

    /**
     * Update video information display
     */
    updateVideoInfo() {
        if (!this.videoElement || !this.currentVideo) return;

        const info = {
            filename: this.currentVideo.name,
            duration: this.videoElement.duration,
            filesize: this.currentVideo.size,
            resolution: `${this.videoElement.videoWidth} × ${this.videoElement.videoHeight}`
        };

        // Update UI elements
        this.updateInfoElement('video-filename', info.filename);
        this.updateInfoElement('video-duration', Utils.formatTime(info.duration, 'display'));
        this.updateInfoElement('video-filesize', Utils.formatFileSize(info.filesize));
        this.updateInfoElement('video-resolution', info.resolution);
    }

    /**
     * Update info element
     */
    updateInfoElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Process video for caption extraction
     */
    async processVideo() {
        if (!this.currentVideo || this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.showProcessingUI();

            // Extract audio from video
            this.updateProgress(10, 'Extracting audio from video...');
            const audioBuffer = await this.extractAudioFromVideo(this.currentVideo);

            // Analyze audio for speech segments
            this.updateProgress(40, 'Analyzing audio for speech...');
            const speechSegments = await this.detectSpeechSegments(audioBuffer);

            // Generate captions using speech recognition
            this.updateProgress(60, 'Generating captions...');
            const captions = await this.generateCaptionsFromAudio(audioBuffer, speechSegments);

            // Process and clean captions
            this.updateProgress(80, 'Processing captions...');
            const processedCaptions = this.processCaptions(captions);

            // Add to app captions
            this.app.captions = processedCaptions;

            this.updateProgress(100, 'Processing complete!');
            
            setTimeout(() => {
                this.hideProcessingUI();
                this.app.showToast(`Generated ${processedCaptions.length} caption segments`, 'success');
                
                // Switch to editor tab to show results
                this.app.switchTab('caption-editor');
            }, 1000);

        } catch (error) {
            console.error('Error processing video:', error);
            this.app.showToast('Error processing video: ' + error.message, 'error');
            this.hideProcessingUI();
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Extract audio from video file
     */
    async extractAudioFromVideo(videoFile) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(videoFile);
            video.crossOrigin = 'anonymous';

            video.addEventListener('loadedmetadata', async () => {
                try {
                    // Create audio context
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    
                    // Create media element source
                    const source = audioContext.createMediaElementSource(video);
                    
                    // Create gain node for audio processing
                    const gainNode = audioContext.createGain();
                    source.connect(gainNode);
                    gainNode.connect(audioContext.destination);

                    // Create offline audio context for processing
                    const offlineContext = new OfflineAudioContext(
                        1, // mono
                        audioContext.sampleRate * video.duration,
                        audioContext.sampleRate
                    );

                    // Load and decode audio data
                    const response = await fetch(video.src);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await offlineContext.decodeAudioData(arrayBuffer);

                    URL.revokeObjectURL(video.src);
                    resolve(audioBuffer);

                } catch (error) {
                    URL.revokeObjectURL(video.src);
                    reject(error);
                }
            });

            video.addEventListener('error', () => {
                URL.revokeObjectURL(video.src);
                reject(new Error('Failed to load video for audio extraction'));
            });
        });
    }

    /**
     * Detect speech segments in audio
     */
    async detectSpeechSegments(audioBuffer) {
        const segments = [];
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        
        // Parameters for speech detection
        const windowSize = Math.floor(sampleRate * 0.025); // 25ms window
        const hopSize = Math.floor(windowSize / 2);
        const energyThreshold = 0.01; // Adjust based on testing
        const minSegmentLength = 0.5; // Minimum segment length in seconds
        const maxSilenceGap = 0.3; // Maximum silence gap in seconds

        let segmentStart = null;
        let lastSpeechTime = null;

        // Process audio in windows
        for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
            const window = channelData.slice(i, i + windowSize);
            const currentTime = i / sampleRate;
            
            // Calculate RMS energy
            const rms = Math.sqrt(window.reduce((sum, sample) => sum + sample * sample, 0) / window.length);
            
            const isSpeech = rms > energyThreshold;

            if (isSpeech) {
                if (segmentStart === null) {
                    segmentStart = currentTime;
                }
                lastSpeechTime = currentTime;
            } else if (segmentStart !== null && lastSpeechTime !== null) {
                // Check if silence gap is too long
                if (currentTime - lastSpeechTime > maxSilenceGap) {
                    // End current segment
                    const segmentDuration = lastSpeechTime - segmentStart;
                    if (segmentDuration >= minSegmentLength) {
                        segments.push({
                            startTime: segmentStart,
                            endTime: lastSpeechTime + 0.1, // Add small buffer
                            duration: segmentDuration
                        });
                    }
                    segmentStart = null;
                    lastSpeechTime = null;
                }
            }
        }

        // Handle final segment
        if (segmentStart !== null && lastSpeechTime !== null) {
            const segmentDuration = lastSpeechTime - segmentStart;
            if (segmentDuration >= minSegmentLength) {
                segments.push({
                    startTime: segmentStart,
                    endTime: lastSpeechTime + 0.1,
                    duration: segmentDuration
                });
            }
        }

        return segments;
    }

    /**
     * Generate captions from audio using speech recognition
     */
    async generateCaptionsFromAudio(audioBuffer, speechSegments) {
        // Note: This is a simplified implementation
        // In a real-world scenario, you would use a more sophisticated speech-to-text service
        // like Google Cloud Speech-to-Text, AWS Transcribe, or Azure Speech Services

        const captions = [];
        const language = document.getElementById('video-language')?.value || 'en-US';

        // Mock caption generation based on speech segments
        // In production, you would send audio chunks to a speech recognition service
        for (let i = 0; i < speechSegments.length; i++) {
            const segment = speechSegments[i];
            
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Generate mock caption text
            const mockTexts = [
                "Welcome to our video presentation.",
                "Today we'll be discussing important topics.",
                "Let's begin with the first section.",
                "This is a key point to remember.",
                "Moving on to the next topic.",
                "Here's an interesting example.",
                "Please note this important detail.",
                "Let's summarize what we've learned.",
                "Thank you for watching.",
                "We hope you found this helpful."
            ];

            const caption = {
                id: Utils.generateId(),
                text: mockTexts[i % mockTexts.length],
                startTime: segment.startTime,
                endTime: segment.endTime,
                confidence: 0.85,
                language: language
            };

            captions.push(caption);

            // Update progress
            const progress = 60 + (i / speechSegments.length) * 20;
            this.updateProgress(progress, `Processing segment ${i + 1} of ${speechSegments.length}...`);
        }

        return captions;
    }

    /**
     * Process and clean generated captions
     */
    processCaptions(captions) {
        return captions.map(caption => ({
            ...caption,
            text: Utils.cleanText(caption.text),
            duration: caption.endTime - caption.startTime
        })).filter(caption => caption.text.length > 0);
    }

    /**
     * Show processing UI
     */
    showProcessingUI() {
        const progressContainer = document.getElementById('processing-progress');
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }

        // Disable process button
        const processBtn = document.getElementById('process-video');
        if (processBtn) {
            processBtn.disabled = true;
            processBtn.innerHTML = '<span class="btn-icon">⚙️</span>Processing...';
        }
    }

    /**
     * Hide processing UI
     */
    hideProcessingUI() {
        const progressContainer = document.getElementById('processing-progress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }

        // Re-enable process button
        const processBtn = document.getElementById('process-video');
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.innerHTML = '<span class="btn-icon">⚙️</span>Extract Captions';
        }

        this.updateProgress(0, '');
    }

    /**
     * Update processing progress
     */
    updateProgress(percentage, status) {
        this.processingProgress = percentage;

        const progressFill = document.getElementById('progress-fill');
        const progressPercentage = document.getElementById('progress-percentage');
        const progressStatus = document.getElementById('progress-status');

        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }

        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(percentage)}%`;
        }

        if (progressStatus && status) {
            progressStatus.textContent = status;
        }
    }

    /**
     * Handle video error
     */
    handleVideoError(event) {
        console.error('Video error:', event);
        this.app.showToast('Error loading video', 'error');
    }

    /**
     * Reset video upload
     */
    resetVideoUpload() {
        // Clear current video
        this.currentVideo = null;
        
        if (this.videoElement) {
            this.videoElement.src = '';
            if (this.videoElement.src) {
                URL.revokeObjectURL(this.videoElement.src);
            }
        }

        // Reset UI
        const uploadArea = document.getElementById('upload-area');
        const videoPreview = document.getElementById('video-preview');
        const fileInput = document.getElementById('video-file-input');

        if (uploadArea) {
            uploadArea.style.display = 'block';
        }

        if (videoPreview) {
            videoPreview.style.display = 'none';
        }

        if (fileInput) {
            fileInput.value = '';
        }

        this.hideProcessingUI();
    }

    /**
     * Get current video info
     */
    getCurrentVideoInfo() {
        if (!this.currentVideo || !this.videoElement) {
            return null;
        }

        return {
            file: this.currentVideo,
            filename: this.currentVideo.name,
            size: this.currentVideo.size,
            type: this.currentVideo.type,
            duration: this.videoElement.duration,
            width: this.videoElement.videoWidth,
            height: this.videoElement.videoHeight
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.videoElement && this.videoElement.src) {
            URL.revokeObjectURL(this.videoElement.src);
            this.videoElement.src = '';
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }

        this.currentVideo = null;
        this.audioBuffer = null;
        this.isProcessing = false;
    }
}

// Extend the main app with video processing functionality
if (window.captionGenerator) {
    window.captionGenerator.videoProcessor = new VideoProcessorManager(window.captionGenerator);
    
    // Override placeholder methods in main app
    window.captionGenerator.handleVideoFile = function(file) {
        this.videoProcessor.handleVideoFile(file);
    };

    window.captionGenerator.handleDragOver = function(e) {
        this.videoProcessor.preventDefaults(e);
        const uploadArea = e.currentTarget;
        this.videoProcessor.handleDragEnter(uploadArea);
    };

    window.captionGenerator.handleDragLeave = function(e) {
        this.videoProcessor.preventDefaults(e);
        const uploadArea = e.currentTarget;
        this.videoProcessor.handleDragLeave(uploadArea);
    };

    window.captionGenerator.handleDrop = function(e) {
        this.videoProcessor.handleDrop(e);
    };

    window.captionGenerator.processVideo = function() {
        this.videoProcessor.processVideo();
    };

    window.captionGenerator.setupDragAndDrop = function() {
        // Already set up in constructor
    };
}

// Make available globally
window.VideoProcessorManager = VideoProcessorManager;