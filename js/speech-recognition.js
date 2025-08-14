/**
 * Speech Recognition Handler
 * Manages Web Speech API for real-time transcription
 */

class SpeechRecognitionHandler {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.currentText = '';
        this.language = 'en-US';
        this.continuous = true;
        this.interimResults = true;
        
        // Event callbacks
        this.onResult = null;
        this.onError = null;
        this.onStart = null;
        this.onEnd = null;
        
        // Voice activity detection
        this.vadEnabled = true;
        this.silenceThreshold = 1000; // ms
        this.silenceTimer = null;
        
        // Results buffer
        this.resultsBuffer = [];
        this.finalTranscript = '';
        this.interimTranscript = '';
        
        this.initializeRecognition();
    }

    /**
     * Initialize speech recognition
     */
    initializeRecognition() {
        // Check for browser support
        if (!this.isSupported()) {
            console.warn('Speech recognition not supported in this browser');
            return;
        }

        // Create recognition instance
        this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        
        this.setupRecognition();
        this.bindEvents();
    }

    /**
     * Check if speech recognition is supported
     */
    isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    /**
     * Setup recognition configuration
     */
    setupRecognition() {
        if (!this.recognition) return;

        this.recognition.continuous = this.continuous;
        this.recognition.interimResults = this.interimResults;
        this.recognition.maxAlternatives = 3;
        this.recognition.lang = this.language;
        
        // Audio settings for better recognition
        if (this.recognition.audioTrack) {
            this.recognition.audioTrack.echoCancellation = true;
            this.recognition.audioTrack.noiseSuppression = true;
            this.recognition.audioTrack.autoGainControl = true;
        }
    }

    /**
     * Bind recognition events
     */
    bindEvents() {
        if (!this.recognition) return;

        this.recognition.onstart = this.handleStart.bind(this);
        this.recognition.onresult = this.handleResult.bind(this);
        this.recognition.onerror = this.handleError.bind(this);
        this.recognition.onend = this.handleEnd.bind(this);
        this.recognition.onspeechstart = this.handleSpeechStart.bind(this);
        this.recognition.onspeechend = this.handleSpeechEnd.bind(this);
        this.recognition.onsoundstart = this.handleSoundStart.bind(this);
        this.recognition.onsoundend = this.handleSoundEnd.bind(this);
        this.recognition.onaudiostart = this.handleAudioStart.bind(this);
        this.recognition.onaudioend = this.handleAudioEnd.bind(this);
    }

    /**
     * Start speech recognition
     */
    async start(language = 'en-US') {
        if (!this.recognition) {
            throw new Error('Speech recognition not supported');
        }

        if (this.isListening) {
            console.warn('Speech recognition already running');
            return;
        }

        try {
            // Request microphone permission
            await this.requestMicrophonePermission();
            
            // Update language if different
            if (language !== this.language) {
                this.language = language;
                this.recognition.lang = language;
            }

            // Clear previous results
            this.resetResults();

            // Start recognition
            this.recognition.start();
            
            console.log('Speech recognition started with language:', language);
            
        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            throw error;
        }
    }

    /**
     * Stop speech recognition
     */
    stop() {
        if (!this.recognition || !this.isListening) {
            return;
        }

        this.recognition.stop();
        this.clearSilenceTimer();
        console.log('Speech recognition stopped');
    }

    /**
     * Request microphone permission
     */
    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the stream immediately as we just needed permission
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            throw new Error('Microphone permission denied or not available');
        }
    }

    /**
     * Handle recognition start
     */
    handleStart(event) {
        this.isListening = true;
        console.log('Speech recognition started');
        
        if (this.onStart) {
            this.onStart(event);
        }
    }

    /**
     * Handle recognition results
     */
    handleResult(event) {
        let finalTranscript = '';
        let interimTranscript = '';
        let maxConfidence = 0;

        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            const confidence = result[0].confidence || 0;

            if (result.isFinal) {
                finalTranscript += transcript;
                maxConfidence = Math.max(maxConfidence, confidence);
                
                // Add to results buffer
                this.resultsBuffer.push({
                    text: transcript,
                    confidence: confidence,
                    timestamp: Date.now(),
                    alternatives: this.extractAlternatives(result)
                });
                
                // Reset silence timer on final result
                this.resetSilenceTimer();
                
            } else {
                interimTranscript += transcript;
                
                // Update silence timer for interim results
                this.updateSilenceTimer();
            }
        }

        // Update transcripts
        this.finalTranscript += finalTranscript;
        this.interimTranscript = interimTranscript;

        // Trigger callback
        if (this.onResult) {
            this.onResult({
                final: finalTranscript,
                interim: interimTranscript,
                confidence: maxConfidence,
                fullTranscript: this.finalTranscript,
                alternatives: this.getLatestAlternatives()
            });
        }

        console.log('Recognition result:', {
            final: finalTranscript,
            interim: interimTranscript,
            confidence: maxConfidence
        });
    }

    /**
     * Handle recognition errors
     */
    handleError(event) {
        console.error('Speech recognition error:', event.error);
        
        const errorMessage = this.getErrorMessage(event.error);
        
        if (this.onError) {
            this.onError(errorMessage);
        }

        // Handle recoverable errors
        if (this.isRecoverableError(event.error)) {
            setTimeout(() => {
                if (this.isListening) {
                    this.restart();
                }
            }, 1000);
        } else {
            this.isListening = false;
        }
    }

    /**
     * Handle recognition end
     */
    handleEnd(event) {
        this.isListening = false;
        this.clearSilenceTimer();
        
        console.log('Speech recognition ended');
        
        if (this.onEnd) {
            this.onEnd(event);
        }
    }

    /**
     * Handle speech start
     */
    handleSpeechStart(event) {
        console.log('Speech detected');
        this.clearSilenceTimer();
    }

    /**
     * Handle speech end
     */
    handleSpeechEnd(event) {
        console.log('Speech ended');
        this.resetSilenceTimer();
    }

    /**
     * Handle sound start
     */
    handleSoundStart(event) {
        console.log('Sound detected');
    }

    /**
     * Handle sound end
     */
    handleSoundEnd(event) {
        console.log('Sound ended');
    }

    /**
     * Handle audio start
     */
    handleAudioStart(event) {
        console.log('Audio capture started');
    }

    /**
     * Handle audio end
     */
    handleAudioEnd(event) {
        console.log('Audio capture ended');
    }

    /**
     * Extract alternative transcriptions
     */
    extractAlternatives(result) {
        const alternatives = [];
        for (let i = 0; i < result.length && i < 3; i++) {
            alternatives.push({
                transcript: result[i].transcript,
                confidence: result[i].confidence || 0
            });
        }
        return alternatives;
    }

    /**
     * Get latest alternatives
     */
    getLatestAlternatives() {
        if (this.resultsBuffer.length === 0) return [];
        return this.resultsBuffer[this.resultsBuffer.length - 1].alternatives || [];
    }

    /**
     * Get error message from error code
     */
    getErrorMessage(error) {
        switch (error) {
            case 'no-speech':
                return 'No speech was detected. Please try speaking clearly.';
            case 'audio-capture':
                return 'Audio capture failed. Please check your microphone.';
            case 'not-allowed':
                return 'Microphone access denied. Please allow microphone access.';
            case 'network':
                return 'Network error occurred. Please check your connection.';
            case 'service-not-allowed':
                return 'Speech recognition service not allowed.';
            case 'bad-grammar':
                return 'Grammar error in recognition.';
            case 'language-not-supported':
                return 'Language not supported.';
            default:
                return `Speech recognition error: ${error}`;
        }
    }

    /**
     * Check if error is recoverable
     */
    isRecoverableError(error) {
        const recoverableErrors = ['no-speech', 'audio-capture', 'network'];
        return recoverableErrors.includes(error);
    }

    /**
     * Restart recognition after error
     */
    restart() {
        if (!this.recognition) return;
        
        try {
            this.recognition.start();
            console.log('Speech recognition restarted');
        } catch (error) {
            console.error('Failed to restart recognition:', error);
        }
    }

    /**
     * Reset recognition results
     */
    resetResults() {
        this.resultsBuffer = [];
        this.finalTranscript = '';
        this.interimTranscript = '';
    }

    /**
     * Voice Activity Detection - Reset silence timer
     */
    resetSilenceTimer() {
        if (!this.vadEnabled) return;
        
        this.clearSilenceTimer();
        this.silenceTimer = setTimeout(() => {
            console.log('Silence detected, pausing recognition');
            if (this.isListening) {
                this.stop();
                // Auto-restart after brief pause
                setTimeout(() => {
                    if (this.isListening) {
                        this.start(this.language);
                    }
                }, 500);
            }
        }, this.silenceThreshold);
    }

    /**
     * Update silence timer
     */
    updateSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.resetSilenceTimer();
        }
    }

    /**
     * Clear silence timer
     */
    clearSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }

    /**
     * Set recognition language
     */
    setLanguage(language) {
        this.language = language;
        if (this.recognition) {
            this.recognition.lang = language;
        }
    }

    /**
     * Set continuous mode
     */
    setContinuous(continuous) {
        this.continuous = continuous;
        if (this.recognition) {
            this.recognition.continuous = continuous;
        }
    }

    /**
     * Set interim results
     */
    setInterimResults(interimResults) {
        this.interimResults = interimResults;
        if (this.recognition) {
            this.recognition.interimResults = interimResults;
        }
    }

    /**
     * Enable/disable voice activity detection
     */
    setVAD(enabled) {
        this.vadEnabled = enabled;
        if (!enabled) {
            this.clearSilenceTimer();
        }
    }

    /**
     * Set silence threshold for VAD
     */
    setSilenceThreshold(threshold) {
        this.silenceThreshold = threshold;
    }

    /**
     * Get recognition statistics
     */
    getStats() {
        return {
            isListening: this.isListening,
            language: this.language,
            resultsCount: this.resultsBuffer.length,
            totalWords: this.finalTranscript.split(' ').length,
            averageConfidence: this.getAverageConfidence(),
            isSupported: this.isSupported()
        };
    }

    /**
     * Calculate average confidence
     */
    getAverageConfidence() {
        if (this.resultsBuffer.length === 0) return 0;
        
        const totalConfidence = this.resultsBuffer.reduce((sum, result) => {
            return sum + (result.confidence || 0);
        }, 0);
        
        return totalConfidence / this.resultsBuffer.length;
    }

    /**
     * Get all results as subtitles
     */
    getSubtitles() {
        return this.resultsBuffer.map((result, index) => ({
            id: index,
            start: (result.timestamp - this.resultsBuffer[0].timestamp) / 1000,
            end: (result.timestamp - this.resultsBuffer[0].timestamp) / 1000 + 3, // Default 3 seconds
            text: result.text,
            confidence: result.confidence
        }));
    }

    /**
     * Clear all results
     */
    clearResults() {
        this.resetResults();
    }

    /**
     * Export results as text
     */
    exportText() {
        return this.finalTranscript;
    }

    /**
     * Export results as JSON
     */
    exportJSON() {
        return JSON.stringify({
            transcript: this.finalTranscript,
            results: this.resultsBuffer,
            stats: this.getStats(),
            timestamp: Date.now()
        }, null, 2);
    }

    /**
     * Get supported languages (common ones)
     */
    static getSupportedLanguages() {
        return [
            { code: 'en-US', name: 'English (US)' },
            { code: 'en-GB', name: 'English (UK)' },
            { code: 'es-ES', name: 'Spanish (Spain)' },
            { code: 'es-MX', name: 'Spanish (Mexico)' },
            { code: 'fr-FR', name: 'French (France)' },
            { code: 'de-DE', name: 'German (Germany)' },
            { code: 'it-IT', name: 'Italian (Italy)' },
            { code: 'pt-PT', name: 'Portuguese (Portugal)' },
            { code: 'pt-BR', name: 'Portuguese (Brazil)' },
            { code: 'ru-RU', name: 'Russian (Russia)' },
            { code: 'zh-CN', name: 'Chinese (Simplified)' },
            { code: 'zh-TW', name: 'Chinese (Traditional)' },
            { code: 'ja-JP', name: 'Japanese (Japan)' },
            { code: 'ko-KR', name: 'Korean (South Korea)' },
            { code: 'hi-IN', name: 'Hindi (India)' },
            { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
            { code: 'th-TH', name: 'Thai (Thailand)' },
            { code: 'vi-VN', name: 'Vietnamese (Vietnam)' },
            { code: 'tr-TR', name: 'Turkish (Turkey)' },
            { code: 'pl-PL', name: 'Polish (Poland)' },
            { code: 'nl-NL', name: 'Dutch (Netherlands)' },
            { code: 'sv-SE', name: 'Swedish (Sweden)' },
            { code: 'da-DK', name: 'Danish (Denmark)' },
            { code: 'no-NO', name: 'Norwegian (Norway)' },
            { code: 'fi-FI', name: 'Finnish (Finland)' }
        ];
    }

    /**
     * Destroy recognition instance
     */
    destroy() {
        if (this.recognition) {
            this.stop();
            this.recognition = null;
        }
        this.clearSilenceTimer();
        this.resetResults();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpeechRecognitionHandler;
}