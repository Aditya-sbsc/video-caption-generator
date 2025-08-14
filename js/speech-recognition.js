/**
 * Video Caption Generator - Speech Recognition Module
 * Handles real-time speech-to-text conversion with multi-language support
 */

class SpeechRecognitionManager {
    constructor(app) {
        this.app = app;
        this.recognition = null;
        this.isRecording = false;
        this.isPaused = false;
        this.currentLanguage = 'en-US';
        this.audioContext = null;
        this.mediaStream = null;
        this.audioAnalyser = null;
        this.canvas = null;
        this.canvasContext = null;
        this.animationFrame = null;
        this.recordingStartTime = null;
        this.recordingTimer = null;
        this.transcriptBuffer = '';
        this.captionSegments = [];
        this.segmentStartTime = null;
        
        this.initializeAudioVisualization();
        this.setupRecognition();
    }

    /**
     * Initialize speech recognition
     */
    setupRecognition() {
        if (!Utils.browserSupports('speechRecognition')) {
            console.warn('Speech recognition not supported');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configure recognition settings
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.language = this.currentLanguage;
        this.recognition.maxAlternatives = 1;

        // Event handlers
        this.recognition.onstart = () => this.handleRecognitionStart();
        this.recognition.onresult = (event) => this.handleRecognitionResult(event);
        this.recognition.onerror = (event) => this.handleRecognitionError(event);
        this.recognition.onend = () => this.handleRecognitionEnd();
    }

    /**
     * Initialize audio visualization
     */
    initializeAudioVisualization() {
        this.canvas = document.getElementById('audio-canvas');
        if (this.canvas) {
            this.canvasContext = this.canvas.getContext('2d');
            this.setupCanvasSize();
        }
    }

    /**
     * Setup canvas size for audio visualization
     */
    setupCanvasSize() {
        if (!this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.canvasContext.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    /**
     * Start recording and speech recognition
     */
    async startRecording() {
        try {
            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });

            // Setup audio analysis
            await this.setupAudioAnalysis();

            // Start speech recognition
            if (this.recognition) {
                this.recognition.start();
            }

            // Update UI
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.updateRecordingUI();
            this.startRecordingTimer();
            this.startAudioVisualization();

            this.app.showToast('Recording started', 'success');

        } catch (error) {
            console.error('Failed to start recording:', error);
            this.app.showToast('Failed to start recording: ' + error.message, 'error');
        }
    }

    /**
     * Stop recording and speech recognition
     */
    stopRecording() {
        try {
            // Stop recognition
            if (this.recognition) {
                this.recognition.stop();
            }

            // Stop audio stream
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }

            // Stop audio context
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }

            // Stop visualization
            this.stopAudioVisualization();

            // Update UI
            this.isRecording = false;
            this.isPaused = false;
            this.updateRecordingUI();
            this.stopRecordingTimer();

            // Finalize any pending transcript
            this.finalizeCurrentSegment();

            this.app.showToast('Recording stopped', 'info');

        } catch (error) {
            console.error('Failed to stop recording:', error);
            this.app.showToast('Failed to stop recording: ' + error.message, 'error');
        }
    }

    /**
     * Pause/resume recording
     */
    pauseRecording() {
        if (!this.isRecording) return;

        if (this.isPaused) {
            // Resume
            if (this.recognition) {
                this.recognition.start();
            }
            this.isPaused = false;
            this.startRecordingTimer();
            this.app.showToast('Recording resumed', 'info');
        } else {
            // Pause
            if (this.recognition) {
                this.recognition.stop();
            }
            this.isPaused = true;
            this.stopRecordingTimer();
            this.finalizeCurrentSegment();
            this.app.showToast('Recording paused', 'info');
        }

        this.updateRecordingUI();
    }

    /**
     * Setup audio analysis for visualization
     */
    async setupAudioAnalysis() {
        if (!this.mediaStream) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        
        this.audioAnalyser = this.audioContext.createAnalyser();
        this.audioAnalyser.fftSize = 256;
        this.audioAnalyser.smoothingTimeConstant = 0.8;
        
        source.connect(this.audioAnalyser);
    }

    /**
     * Start audio visualization animation
     */
    startAudioVisualization() {
        if (!this.audioAnalyser || !this.canvasContext) return;

        const bufferLength = this.audioAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!this.isRecording) return;

            this.animationFrame = requestAnimationFrame(draw);
            this.audioAnalyser.getByteFrequencyData(dataArray);

            // Clear canvas
            this.canvasContext.fillStyle = '#0f172a';
            this.canvasContext.fillRect(0, 0, this.canvas.offsetWidth, this.canvas.offsetHeight);

            // Draw frequency bars
            const barWidth = this.canvas.offsetWidth / bufferLength * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * this.canvas.offsetHeight * 0.8;

                // Create gradient
                const gradient = this.canvasContext.createLinearGradient(0, this.canvas.offsetHeight, 0, this.canvas.offsetHeight - barHeight);
                gradient.addColorStop(0, '#10b981');
                gradient.addColorStop(0.5, '#3b82f6');
                gradient.addColorStop(1, '#8b5cf6');

                this.canvasContext.fillStyle = gradient;
                this.canvasContext.fillRect(x, this.canvas.offsetHeight - barHeight, barWidth, barHeight);

                x += barWidth + 1;
            }

            // Update audio level indicator
            this.updateAudioLevel(dataArray);
        };

        draw();
    }

    /**
     * Stop audio visualization
     */
    stopAudioVisualization() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Clear canvas
        if (this.canvasContext) {
            this.canvasContext.fillStyle = '#0f172a';
            this.canvasContext.fillRect(0, 0, this.canvas.offsetWidth, this.canvas.offsetHeight);
        }

        // Reset audio level
        this.updateAudioLevel([]);
    }

    /**
     * Update audio level indicator
     */
    updateAudioLevel(dataArray) {
        const levelIndicator = document.getElementById('level-indicator');
        if (!levelIndicator || !dataArray.length) {
            if (levelIndicator) levelIndicator.style.width = '0%';
            return;
        }

        // Calculate average level
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const percentage = (average / 255) * 100;

        levelIndicator.style.width = `${percentage}%`;
    }

    /**
     * Start recording timer
     */
    startRecordingTimer() {
        this.stopRecordingTimer(); // Clear existing timer
        
        this.recordingTimer = setInterval(() => {
            if (this.recordingStartTime && this.isRecording && !this.isPaused) {
                const elapsed = (Date.now() - this.recordingStartTime) / 1000;
                const timeDisplay = document.getElementById('recording-time');
                if (timeDisplay) {
                    timeDisplay.textContent = Utils.formatTime(elapsed, 'display');
                }
            }
        }, 100);
    }

    /**
     * Stop recording timer
     */
    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    /**
     * Update recording UI state
     */
    updateRecordingUI() {
        const startBtn = document.getElementById('start-recording');
        const stopBtn = document.getElementById('stop-recording');
        const pauseBtn = document.getElementById('pause-recording');
        const languageSelect = document.getElementById('recognition-language');

        if (startBtn) {
            startBtn.disabled = this.isRecording;
        }

        if (stopBtn) {
            stopBtn.disabled = !this.isRecording;
        }

        if (pauseBtn) {
            pauseBtn.disabled = !this.isRecording;
            const icon = pauseBtn.querySelector('.btn-icon');
            if (icon) {
                icon.textContent = this.isPaused ? '▶️' : '⏸️';
            }
            const text = pauseBtn.textContent.replace(/^[^a-zA-Z]*/, '');
            pauseBtn.innerHTML = `<span class="btn-icon">${this.isPaused ? '▶️' : '⏸️'}</span>${this.isPaused ? 'Resume' : 'Pause'}`;
        }

        if (languageSelect) {
            languageSelect.disabled = this.isRecording;
        }
    }

    /**
     * Handle recognition start
     */
    handleRecognitionStart() {
        console.log('Speech recognition started');
        this.segmentStartTime = Date.now();
    }

    /**
     * Handle recognition results
     */
    handleRecognitionResult(event) {
        let interimTranscript = '';
        let finalTranscript = '';

        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        // Update live display
        this.updateLiveDisplay(finalTranscript, interimTranscript);

        // Add final results to captions
        if (finalTranscript) {
            this.addCaptionSegment(finalTranscript);
        }
    }

    /**
     * Handle recognition errors
     */
    handleRecognitionError(event) {
        console.error('Speech recognition error:', event.error);
        
        let errorMessage = 'Speech recognition error';
        switch (event.error) {
            case 'network':
                errorMessage = 'Network error during speech recognition';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone access denied';
                break;
            case 'no-speech':
                errorMessage = 'No speech detected';
                break;
            case 'audio-capture':
                errorMessage = 'Audio capture failed';
                break;
            default:
                errorMessage = `Speech recognition error: ${event.error}`;
        }

        this.app.showToast(errorMessage, 'error');

        // Attempt to restart if it's a temporary error
        if (this.isRecording && !this.isPaused && ['network', 'no-speech'].includes(event.error)) {
            setTimeout(() => {
                if (this.isRecording && !this.isPaused) {
                    try {
                        this.recognition.start();
                    } catch (error) {
                        console.error('Failed to restart recognition:', error);
                    }
                }
            }, 1000);
        }
    }

    /**
     * Handle recognition end
     */
    handleRecognitionEnd() {
        console.log('Speech recognition ended');
        
        // Restart recognition if still recording and not paused
        if (this.isRecording && !this.isPaused) {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Failed to restart recognition:', error);
            }
        }
    }

    /**
     * Update live captions display
     */
    updateLiveDisplay(finalText, interimText) {
        const output = document.getElementById('live-captions-output');
        if (!output) return;

        // Clear placeholder text
        const placeholder = output.querySelector('.placeholder-text');
        if (placeholder) {
            placeholder.remove();
        }

        // Update or create current display
        let currentDisplay = output.querySelector('.current-transcript');
        if (!currentDisplay) {
            currentDisplay = document.createElement('div');
            currentDisplay.className = 'current-transcript';
            output.appendChild(currentDisplay);
        }

        const displayText = (this.transcriptBuffer + finalText + interimText).trim();
        if (displayText) {
            const timestamp = Utils.formatTime((Date.now() - this.recordingStartTime) / 1000, 'display');
            currentDisplay.innerHTML = `
                <div class="caption-timestamp">[${timestamp}]</div>
                <div class="caption-text">${Utils.sanitizeText(displayText)}</div>
            `;
        }

        // Scroll to bottom
        output.scrollTop = output.scrollHeight;
    }

    /**
     * Add a caption segment
     */
    addCaptionSegment(text) {
        if (!text.trim()) return;

        const now = Date.now();
        const startTime = (this.segmentStartTime - this.recordingStartTime) / 1000;
        const endTime = (now - this.recordingStartTime) / 1000;

        const segment = {
            id: Utils.generateId(),
            text: text.trim(),
            startTime: Math.max(0, startTime),
            endTime: endTime,
            confidence: 0.8, // Mock confidence score
            language: this.currentLanguage
        };

        this.captionSegments.push(segment);
        this.app.captions.push(segment);

        // Add to live display as final segment
        this.addFinalSegmentToDisplay(segment);

        // Update transcript buffer
        this.transcriptBuffer += text + ' ';
        this.segmentStartTime = now;

        // Update caption count
        this.updateCaptionCount();
    }

    /**
     * Add final segment to display
     */
    addFinalSegmentToDisplay(segment) {
        const output = document.getElementById('live-captions-output');
        if (!output) return;

        const segmentElement = document.createElement('div');
        segmentElement.className = 'caption-segment final';
        segmentElement.innerHTML = `
            <div class="caption-timestamp">[${Utils.formatTime(segment.startTime, 'display')} - ${Utils.formatTime(segment.endTime, 'display')}]</div>
            <div class="caption-text">${Utils.sanitizeText(segment.text)}</div>
        `;

        // Insert before current transcript
        const currentTranscript = output.querySelector('.current-transcript');
        if (currentTranscript) {
            output.insertBefore(segmentElement, currentTranscript);
        } else {
            output.appendChild(segmentElement);
        }
    }

    /**
     * Finalize current segment
     */
    finalizeCurrentSegment() {
        if (this.transcriptBuffer.trim()) {
            // Clear current transcript display
            const output = document.getElementById('live-captions-output');
            const currentDisplay = output?.querySelector('.current-transcript');
            if (currentDisplay) {
                currentDisplay.remove();
            }
        }
        
        this.transcriptBuffer = '';
    }

    /**
     * Update caption count display
     */
    updateCaptionCount() {
        const countDisplay = document.getElementById('caption-count');
        if (countDisplay) {
            const count = this.captionSegments.length;
            countDisplay.textContent = `${count} segment${count !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Update recognition language
     */
    updateRecognitionLanguage() {
        const languageSelect = document.getElementById('recognition-language');
        if (!languageSelect) return;

        const newLanguage = languageSelect.value;
        if (newLanguage !== this.currentLanguage) {
            this.currentLanguage = newLanguage;
            
            if (this.recognition) {
                this.recognition.language = newLanguage;
            }

            console.log('Recognition language updated to:', newLanguage);
            this.app.showToast(`Language changed to ${Utils.getLanguageNames()[newLanguage] || newLanguage}`, 'info');
        }
    }

    /**
     * Clear all captions
     */
    clearCaptions() {
        this.captionSegments = [];
        this.transcriptBuffer = '';
        
        const output = document.getElementById('live-captions-output');
        if (output) {
            output.innerHTML = '<p class="placeholder-text">Start recording to see live captions appear here...</p>';
        }

        this.updateCaptionCount();
    }

    /**
     * Get all caption segments
     */
    getCaptionSegments() {
        return [...this.captionSegments];
    }

    /**
     * Export live captions to app captions
     */
    exportToEditor() {
        if (this.captionSegments.length === 0) {
            this.app.showToast('No captions to export', 'warning');
            return;
        }

        // Merge segments that are close together
        const mergedSegments = Utils.mergeCaptionSegments(this.captionSegments, 0.5);
        
        // Replace app captions
        this.app.captions = mergedSegments;
        
        // Switch to editor tab
        this.app.switchTab('caption-editor');
        
        this.app.showToast(`Exported ${mergedSegments.length} caption segments to editor`, 'success');
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopRecording();
        this.stopAudioVisualization();
        this.stopRecordingTimer();
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}

// Extend the main app with speech recognition functionality
if (window.captionGenerator) {
    window.captionGenerator.speechRecognition = new SpeechRecognitionManager(window.captionGenerator);
    
    // Override placeholder methods in main app
    window.captionGenerator.initializeSpeechRecognition = async function() {
        // Already initialized in constructor
        return Promise.resolve();
    };

    window.captionGenerator.startRecording = function() {
        this.speechRecognition.startRecording();
    };

    window.captionGenerator.stopRecording = function() {
        this.speechRecognition.stopRecording();
    };

    window.captionGenerator.pauseRecording = function() {
        this.speechRecognition.pauseRecording();
    };

    window.captionGenerator.updateRecognitionLanguage = function() {
        this.speechRecognition.updateRecognitionLanguage();
    };
}

// Make available globally
window.SpeechRecognitionManager = SpeechRecognitionManager;