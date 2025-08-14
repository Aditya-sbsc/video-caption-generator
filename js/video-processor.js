/**
 * Video Processor
 * Handles video file processing, audio extraction, and subtitle generation using FFmpeg.js
 */

class VideoProcessor {
    constructor() {
        this.ffmpeg = null;
        this.isLoaded = false;
        this.isProcessing = false;
        
        // Event callbacks
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;
        
        // Processing options
        this.audioFormat = 'wav';
        this.audioSampleRate = 16000;
        this.audioChannels = 1;
        
        this.initializeFFmpeg();
    }

    /**
     * Initialize FFmpeg.js
     */
    async initializeFFmpeg() {
        try {
            // Import FFmpeg if using modules
            if (typeof FFmpeg === 'undefined') {
                // Fallback to global FFmpeg from CDN
                if (typeof window !== 'undefined' && window.FFmpeg) {
                    const { FFmpeg } = window.FFmpeg;
                    this.ffmpeg = new FFmpeg();
                } else {
                    console.warn('FFmpeg not available, video processing will be limited');
                    return;
                }
            } else {
                this.ffmpeg = new FFmpeg();
            }

            // Set up logging
            this.ffmpeg.on('log', ({ message }) => {
                console.log('FFmpeg:', message);
            });

            // Set up progress tracking
            this.ffmpeg.on('progress', ({ progress }) => {
                if (this.onProgress) {
                    this.onProgress(progress);
                }
            });

            console.log('FFmpeg initialized');
            
        } catch (error) {
            console.error('Failed to initialize FFmpeg:', error);
        }
    }

    /**
     * Load FFmpeg core
     */
    async loadFFmpeg() {
        if (this.isLoaded || !this.ffmpeg) return;

        try {
            console.log('Loading FFmpeg core...');
            
            // Load with appropriate base URL
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.11.0/dist';
            await this.ffmpeg.load({
                coreURL: `${baseURL}/ffmpeg-core.js`,
                wasmURL: `${baseURL}/ffmpeg-core.wasm`,
            });
            
            this.isLoaded = true;
            console.log('FFmpeg loaded successfully');
            
        } catch (error) {
            console.error('Failed to load FFmpeg:', error);
            throw new Error('Failed to load video processing engine');
        }
    }

    /**
     * Extract audio from video file
     */
    async extractAudio(videoFile) {
        if (!this.ffmpeg) {
            throw new Error('FFmpeg not available');
        }

        await this.loadFFmpeg();

        try {
            this.isProcessing = true;
            console.log('Extracting audio from video...');

            // Write video file to FFmpeg file system
            const videoData = new Uint8Array(await videoFile.arrayBuffer());
            await this.ffmpeg.writeFile('input.mp4', videoData);

            // Extract audio
            await this.ffmpeg.exec([
                '-i', 'input.mp4',
                '-vn', // No video
                '-acodec', 'pcm_s16le', // PCM 16-bit
                '-ar', this.audioSampleRate.toString(), // Sample rate
                '-ac', this.audioChannels.toString(), // Channels
                'output.wav'
            ]);

            // Read the extracted audio
            const audioData = await this.ffmpeg.readFile('output.wav');
            
            // Clean up
            await this.ffmpeg.deleteFile('input.mp4');
            await this.ffmpeg.deleteFile('output.wav');

            console.log('Audio extraction completed');
            return new Blob([audioData], { type: 'audio/wav' });

        } catch (error) {
            console.error('Audio extraction failed:', error);
            throw new Error('Failed to extract audio from video');
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Generate subtitles from video file
     */
    async extractSubtitles(videoFile) {
        try {
            console.log('Generating subtitles from video...');
            
            // Extract audio first
            const audioBlob = await this.extractAudio(videoFile);
            
            // Convert audio to text using speech recognition
            const subtitles = await this.audioToSubtitles(audioBlob);
            
            if (this.onComplete) {
                this.onComplete({ subtitles });
            }
            
            return subtitles;
            
        } catch (error) {
            console.error('Subtitle extraction failed:', error);
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }

    /**
     * Convert audio to subtitles using Web Speech API
     */
    async audioToSubtitles(audioBlob) {
        return new Promise((resolve, reject) => {
            try {
                const audio = new Audio();
                const url = URL.createObjectURL(audioBlob);
                audio.src = url;
                
                const subtitles = [];
                let currentSubtitle = null;
                let startTime = 0;
                
                // Create speech recognition for audio processing
                const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
                recognition.continuous = true;
                recognition.interimResults = false;
                recognition.maxAlternatives = 1;
                
                recognition.onresult = (event) => {
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        if (event.results[i].isFinal) {
                            const transcript = event.results[i][0].transcript;
                            const confidence = event.results[i][0].confidence || 0;
                            
                            const subtitle = {
                                id: subtitles.length,
                                start: startTime,
                                end: startTime + 3, // Default 3 seconds, will be adjusted
                                text: transcript.trim(),
                                confidence: confidence
                            };
                            
                            subtitles.push(subtitle);
                            startTime += 3; // Move start time forward
                        }
                    }
                };
                
                recognition.onerror = (error) => {
                    console.error('Speech recognition error:', error);
                    // Continue with empty subtitles rather than failing
                    resolve([]);
                };
                
                recognition.onend = () => {
                    URL.revokeObjectURL(url);
                    
                    // Adjust subtitle timing based on audio duration
                    if (subtitles.length > 0 && audio.duration) {
                        this.adjustSubtitleTiming(subtitles, audio.duration);
                    }
                    
                    resolve(subtitles);
                };
                
                // Play audio and start recognition
                audio.onloadedmetadata = () => {
                    audio.play();
                    recognition.start();
                    
                    // Stop recognition when audio ends
                    audio.onended = () => {
                        recognition.stop();
                    };
                };
                
                audio.onerror = () => {
                    reject(new Error('Failed to process audio'));
                };
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Adjust subtitle timing to fit audio duration
     */
    adjustSubtitleTiming(subtitles, duration) {
        if (subtitles.length === 0) return;
        
        const totalDefaultTime = subtitles.length * 3;
        const scaleFactor = duration / totalDefaultTime;
        
        let currentTime = 0;
        subtitles.forEach(subtitle => {
            subtitle.start = currentTime;
            subtitle.end = currentTime + (3 * scaleFactor);
            currentTime = subtitle.end;
        });
    }

    /**
     * Generate waveform data from audio
     */
    async generateWaveform(audioBlob, width = 800, height = 100) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            const url = URL.createObjectURL(audioBlob);
            audio.src = url;
            
            audio.onloadedmetadata = async () => {
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const arrayBuffer = await audioBlob.arrayBuffer();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    
                    const channelData = audioBuffer.getChannelData(0);
                    const samples = width;
                    const blockSize = Math.floor(channelData.length / samples);
                    const waveformData = [];
                    
                    for (let i = 0; i < samples; i++) {
                        let sum = 0;
                        for (let j = 0; j < blockSize; j++) {
                            sum += Math.abs(channelData[i * blockSize + j] || 0);
                        }
                        waveformData.push(sum / blockSize);
                    }
                    
                    // Normalize
                    const max = Math.max(...waveformData);
                    const normalizedData = waveformData.map(value => (value / max) * height);
                    
                    URL.revokeObjectURL(url);
                    resolve(normalizedData);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            audio.onerror = () => {
                reject(new Error('Failed to load audio for waveform'));
            };
        });
    }

    /**
     * Burn subtitles into video
     */
    async burnSubtitles(videoFile, subtitles, styling = {}) {
        if (!this.ffmpeg) {
            throw new Error('FFmpeg not available');
        }

        await this.loadFFmpeg();

        try {
            this.isProcessing = true;
            console.log('Burning subtitles into video...');

            // Write video file
            const videoData = new Uint8Array(await videoFile.arrayBuffer());
            await this.ffmpeg.writeFile('input.mp4', videoData);

            // Generate SRT file
            const srtContent = this.generateSRT(subtitles);
            await this.ffmpeg.writeFile('subtitles.srt', srtContent);

            // Configure subtitle styling
            const subtitleStyle = this.buildSubtitleStyle(styling);

            // Burn subtitles into video
            await this.ffmpeg.exec([
                '-i', 'input.mp4',
                '-vf', `subtitles=subtitles.srt:${subtitleStyle}`,
                '-c:a', 'copy',
                'output.mp4'
            ]);

            // Read the output video
            const outputData = await this.ffmpeg.readFile('output.mp4');
            
            // Clean up
            await this.ffmpeg.deleteFile('input.mp4');
            await this.ffmpeg.deleteFile('subtitles.srt');
            await this.ffmpeg.deleteFile('output.mp4');

            console.log('Subtitle burning completed');
            return new Blob([outputData], { type: 'video/mp4' });

        } catch (error) {
            console.error('Subtitle burning failed:', error);
            throw new Error('Failed to burn subtitles into video');
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Build subtitle style string for FFmpeg
     */
    buildSubtitleStyle(styling = {}) {
        const style = {
            fontsize: styling.fontSize || 24,
            fontcolor: styling.fontColor || 'white',
            bordercolor: styling.borderColor || 'black',
            borderw: styling.borderWidth || 2,
            fontname: styling.fontFamily || 'Arial'
        };

        return Object.entries(style)
            .map(([key, value]) => `${key}=${value}`)
            .join(':');
    }

    /**
     * Generate SRT content from subtitles
     */
    generateSRT(subtitles) {
        return subtitles.map((subtitle, index) => {
            const startTime = this.formatSRTTime(subtitle.start);
            const endTime = this.formatSRTTime(subtitle.end);
            
            return `${index + 1}\n${startTime} --> ${endTime}\n${subtitle.text}\n`;
        }).join('\n');
    }

    /**
     * Format time for SRT format
     */
    formatSRTTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    }

    /**
     * Convert video format
     */
    async convertVideo(videoFile, outputFormat = 'mp4', quality = 'medium') {
        if (!this.ffmpeg) {
            throw new Error('FFmpeg not available');
        }

        await this.loadFFmpeg();

        try {
            this.isProcessing = true;
            console.log(`Converting video to ${outputFormat}...`);

            const videoData = new Uint8Array(await videoFile.arrayBuffer());
            await this.ffmpeg.writeFile('input.mp4', videoData);

            const qualitySettings = this.getQualitySettings(quality);
            const outputFile = `output.${outputFormat}`;

            await this.ffmpeg.exec([
                '-i', 'input.mp4',
                ...qualitySettings,
                outputFile
            ]);

            const outputData = await this.ffmpeg.readFile(outputFile);
            
            // Clean up
            await this.ffmpeg.deleteFile('input.mp4');
            await this.ffmpeg.deleteFile(outputFile);

            console.log('Video conversion completed');
            return new Blob([outputData], { type: `video/${outputFormat}` });

        } catch (error) {
            console.error('Video conversion failed:', error);
            throw new Error('Failed to convert video');
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Get quality settings for video encoding
     */
    getQualitySettings(quality) {
        switch (quality) {
            case 'high':
                return ['-crf', '18', '-preset', 'slow'];
            case 'medium':
                return ['-crf', '23', '-preset', 'medium'];
            case 'low':
                return ['-crf', '28', '-preset', 'fast'];
            default:
                return ['-crf', '23', '-preset', 'medium'];
        }
    }

    /**
     * Get video metadata
     */
    async getVideoMetadata(videoFile) {
        if (!this.ffmpeg) {
            // Fallback using HTML5 video element
            return this.getVideoMetadataHTML5(videoFile);
        }

        await this.loadFFmpeg();

        try {
            const videoData = new Uint8Array(await videoFile.arrayBuffer());
            await this.ffmpeg.writeFile('input.mp4', videoData);

            // Get metadata using ffprobe
            const output = await this.ffmpeg.exec([
                '-i', 'input.mp4',
                '-hide_banner'
            ]);

            await this.ffmpeg.deleteFile('input.mp4');

            // Parse metadata from output (simplified)
            return {
                duration: 0, // Would need to parse from ffmpeg output
                width: 0,
                height: 0,
                fps: 0,
                format: videoFile.type
            };

        } catch (error) {
            console.warn('Failed to get metadata with FFmpeg, using fallback');
            return this.getVideoMetadataHTML5(videoFile);
        }
    }

    /**
     * Get video metadata using HTML5 video element
     */
    async getVideoMetadataHTML5(videoFile) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const url = URL.createObjectURL(videoFile);
            video.src = url;

            video.onloadedmetadata = () => {
                const metadata = {
                    duration: video.duration,
                    width: video.videoWidth,
                    height: video.videoHeight,
                    fps: 0, // Not available in HTML5
                    format: videoFile.type,
                    size: videoFile.size
                };

                URL.revokeObjectURL(url);
                resolve(metadata);
            };

            video.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load video metadata'));
            };
        });
    }

    /**
     * Create video thumbnail
     */
    async createThumbnail(videoFile, timeOffset = 1) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const url = URL.createObjectURL(videoFile);

            video.src = url;
            video.currentTime = timeOffset;

            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            };

            video.onseeked = () => {
                ctx.drawImage(video, 0, 0);
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(url);
                    resolve(blob);
                }, 'image/jpeg', 0.8);
            };

            video.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to create thumbnail'));
            };
        });
    }

    /**
     * Check if FFmpeg is available and loaded
     */
    isReady() {
        return this.ffmpeg && this.isLoaded;
    }

    /**
     * Get processing status
     */
    getStatus() {
        return {
            isLoaded: this.isLoaded,
            isProcessing: this.isProcessing,
            ffmpegAvailable: !!this.ffmpeg
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.ffmpeg && this.isLoaded) {
            try {
                // Clean up any remaining files
                const files = await this.ffmpeg.listFiles();
                for (const file of files) {
                    if (file.name !== '.') {
                        await this.ffmpeg.deleteFile(file.name);
                    }
                }
            } catch (error) {
                console.warn('Cleanup warning:', error);
            }
        }
    }

    /**
     * Destroy processor instance
     */
    destroy() {
        this.cleanup();
        this.ffmpeg = null;
        this.isLoaded = false;
        this.isProcessing = false;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoProcessor;
}