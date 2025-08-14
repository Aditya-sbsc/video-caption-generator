/**
 * Export Handler
 * Manages subtitle and video export functionality with multiple format support
 */

class ExportHandler {
    constructor() {
        this.isExporting = false;
        this.exportProgress = 0;
        this.cancelRequested = false;
        
        // Supported formats
        this.supportedSubtitleFormats = ['srt', 'vtt', 'ass', 'json'];
        this.supportedVideoFormats = ['mp4', 'webm'];
        
        // Export settings
        this.defaultSettings = {
            subtitleFormat: 'srt',
            videoFormat: 'mp4',
            quality: 'medium',
            includeVideo: false,
            fontSize: 24,
            fontFamily: 'Arial',
            fontColor: '#FFFFFF',
            backgroundColor: '#000000',
            backgroundOpacity: 0.8,
            position: 'bottom'
        };
        
        // Event callbacks
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;
        this.onCancel = null;
        
        this.initializeExporter();
    }

    /**
     * Initialize export handler
     */
    initializeExporter() {
        this.bindEvents();
        console.log('Export handler initialized');
    }

    /**
     * Bind export-related events
     */
    bindEvents() {
        // Cancel button
        const cancelBtn = document.getElementById('cancel-export-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.cancelExport.bind(this));
        }
        
        // Format change events
        const formatRadios = document.querySelectorAll('input[name="export-format"]');
        formatRadios.forEach(radio => {
            radio.addEventListener('change', this.handleFormatChange.bind(this));
        });
        
        // Video export checkbox
        const includeVideoCheckbox = document.getElementById('include-video');
        if (includeVideoCheckbox) {
            includeVideoCheckbox.addEventListener('change', this.handleVideoExportToggle.bind(this));
        }
    }

    /**
     * Export subtitles in specified format
     */
    async exportSubtitles(subtitles, format = 'srt', filename = null) {
        if (this.isExporting) {
            throw new Error('Export already in progress');
        }

        if (!subtitles || subtitles.length === 0) {
            throw new Error('No subtitles to export');
        }

        if (!this.supportedSubtitleFormats.includes(format.toLowerCase())) {
            throw new Error(`Unsupported subtitle format: ${format}`);
        }

        try {
            this.isExporting = true;
            this.exportProgress = 0;
            this.cancelRequested = false;
            
            this.showExportProgress();
            this.updateProgress(10, 'Preparing export...');

            // Generate content based on format
            let content;
            let mimeType;
            let extension;

            switch (format.toLowerCase()) {
                case 'srt':
                    content = this.generateSRT(subtitles);
                    mimeType = 'text/plain';
                    extension = 'srt';
                    break;
                case 'vtt':
                    content = this.generateVTT(subtitles);
                    mimeType = 'text/vtt';
                    extension = 'vtt';
                    break;
                case 'ass':
                    content = this.generateASS(subtitles);
                    mimeType = 'text/plain';
                    extension = 'ass';
                    break;
                case 'json':
                    content = this.generateJSON(subtitles);
                    mimeType = 'application/json';
                    extension = 'json';
                    break;
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }

            this.updateProgress(80, 'Generating file...');

            // Create and download file
            const blob = new Blob([content], { type: mimeType });
            const finalFilename = filename || `subtitles_${Date.now()}.${extension}`;
            
            this.updateProgress(90, 'Preparing download...');
            await this.downloadBlob(blob, finalFilename);

            this.updateProgress(100, 'Export completed!');
            
            if (this.onComplete) {
                this.onComplete({
                    format: format,
                    filename: finalFilename,
                    size: blob.size
                });
            }

            // Hide progress after delay
            setTimeout(() => {
                this.hideExportProgress();
            }, 2000);

            console.log(`Subtitles exported as ${format.toUpperCase()}: ${finalFilename}`);

        } catch (error) {
            console.error('Subtitle export failed:', error);
            
            if (this.onError) {
                this.onError(error);
            }
            
            this.hideExportProgress();
            throw error;
            
        } finally {
            this.isExporting = false;
        }
    }

    /**
     * Export video with burned-in subtitles
     */
    async exportVideoWithSubtitles(videoFile, subtitles, settings = {}) {
        if (this.isExporting) {
            throw new Error('Export already in progress');
        }

        if (!videoFile) {
            throw new Error('No video file provided');
        }

        if (!subtitles || subtitles.length === 0) {
            throw new Error('No subtitles to burn into video');
        }

        try {
            this.isExporting = true;
            this.exportProgress = 0;
            this.cancelRequested = false;
            
            this.showExportProgress();
            this.updateProgress(5, 'Initializing video processor...');

            // Check if we have FFmpeg available
            if (typeof FFmpeg === 'undefined' && !window.FFmpeg) {
                // Fallback to canvas-based subtitle burning
                return await this.exportVideoWithCanvasSubtitles(videoFile, subtitles, settings);
            }

            // Use FFmpeg for professional subtitle burning
            return await this.exportVideoWithFFmpeg(videoFile, subtitles, settings);

        } catch (error) {
            console.error('Video export failed:', error);
            
            if (this.onError) {
                this.onError(error);
            }
            
            this.hideExportProgress();
            throw error;
            
        } finally {
            this.isExporting = false;
        }
    }

    /**
     * Export video with FFmpeg subtitle burning
     */
    async exportVideoWithFFmpeg(videoFile, subtitles, settings) {
        const mergedSettings = { ...this.defaultSettings, ...settings };
        
        this.updateProgress(10, 'Loading video processor...');

        // Initialize FFmpeg
        const { FFmpeg } = window.FFmpeg || { FFmpeg: null };
        if (!FFmpeg) {
            throw new Error('FFmpeg not available for video processing');
        }

        const ffmpeg = new FFmpeg();
        
        ffmpeg.on('progress', ({ progress }) => {
            const exportProgress = 20 + (progress * 0.7); // 20-90% range
            this.updateProgress(exportProgress, 'Processing video...');
        });

        await ffmpeg.load();
        this.updateProgress(20, 'Preparing video and subtitles...');

        // Write video file
        const videoData = new Uint8Array(await videoFile.arrayBuffer());
        await ffmpeg.writeFile('input.mp4', videoData);

        // Generate SRT file for FFmpeg
        const srtContent = this.generateSRT(subtitles);
        await ffmpeg.writeFile('subtitles.srt', srtContent);

        // Build subtitle style
        const subtitleStyle = this.buildFFmpegSubtitleStyle(mergedSettings);

        this.updateProgress(30, 'Burning subtitles into video...');

        // Execute FFmpeg command
        const quality = this.getFFmpegQualitySettings(mergedSettings.quality);
        await ffmpeg.exec([
            '-i', 'input.mp4',
            '-vf', `subtitles=subtitles.srt:${subtitleStyle}`,
            '-c:a', 'copy',
            ...quality,
            'output.mp4'
        ]);

        this.updateProgress(90, 'Finalizing export...');

        // Read output
        const outputData = await ffmpeg.readFile('output.mp4');
        
        // Clean up
        await ffmpeg.deleteFile('input.mp4');
        await ffmpeg.deleteFile('subtitles.srt');
        await ffmpeg.deleteFile('output.mp4');

        // Create blob and download
        const blob = new Blob([outputData], { type: 'video/mp4' });
        const filename = `video_with_subtitles_${Date.now()}.mp4`;
        
        this.updateProgress(95, 'Preparing download...');
        await this.downloadBlob(blob, filename);

        this.updateProgress(100, 'Video export completed!');
        
        if (this.onComplete) {
            this.onComplete({
                format: 'mp4',
                filename: filename,
                size: blob.size,
                hasSubtitles: true
            });
        }

        setTimeout(() => {
            this.hideExportProgress();
        }, 2000);

        console.log(`Video with subtitles exported: ${filename}`);
        return blob;
    }

    /**
     * Export video with canvas-based subtitle rendering (fallback)
     */
    async exportVideoWithCanvasSubtitles(videoFile, subtitles, settings) {
        const mergedSettings = { ...this.defaultSettings, ...settings };
        
        this.updateProgress(10, 'Loading video...');

        // Create video element
        const video = document.createElement('video');
        const url = URL.createObjectURL(videoFile);
        video.src = url;
        video.muted = true;

        await new Promise((resolve, reject) => {
            video.onloadedmetadata = resolve;
            video.onerror = reject;
        });

        this.updateProgress(20, 'Setting up canvas...');

        // Create canvas for rendering
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Setup MediaRecorder for output
        const stream = canvas.captureStream(30); // 30 FPS
        const recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
        });

        const chunks = [];
        recorder.ondataavailable = event => chunks.push(event.data);

        this.updateProgress(30, 'Starting video processing...');

        // Start recording
        recorder.start();
        
        let frameCount = 0;
        const totalFrames = Math.ceil(video.duration * 30); // Assuming 30 FPS

        const processFrame = () => {
            if (this.cancelRequested) {
                recorder.stop();
                return;
            }

            // Draw video frame
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Find and draw subtitle for current time
            const currentSubtitle = this.getSubtitleAtTime(subtitles, video.currentTime);
            if (currentSubtitle) {
                this.drawSubtitleOnCanvas(ctx, currentSubtitle, canvas.width, canvas.height, mergedSettings);
            }

            frameCount++;
            const progress = 30 + ((frameCount / totalFrames) * 60); // 30-90% range
            this.updateProgress(progress, `Processing frame ${frameCount}/${totalFrames}...`);

            // Continue to next frame
            if (video.currentTime < video.duration) {
                video.currentTime += 1/30; // Next frame
                setTimeout(processFrame, 33); // ~30 FPS
            } else {
                recorder.stop();
            }
        };

        return new Promise((resolve, reject) => {
            recorder.onstop = async () => {
                URL.revokeObjectURL(url);
                
                this.updateProgress(90, 'Finalizing video...');
                
                const blob = new Blob(chunks, { type: 'video/webm' });
                const filename = `video_with_subtitles_${Date.now()}.webm`;
                
                this.updateProgress(95, 'Preparing download...');
                await this.downloadBlob(blob, filename);

                this.updateProgress(100, 'Video export completed!');
                
                if (this.onComplete) {
                    this.onComplete({
                        format: 'webm',
                        filename: filename,
                        size: blob.size,
                        hasSubtitles: true
                    });
                }

                setTimeout(() => {
                    this.hideExportProgress();
                }, 2000);

                resolve(blob);
            };

            video.currentTime = 0;
            video.play().then(() => {
                processFrame();
            }).catch(reject);
        });
    }

    /**
     * Draw subtitle on canvas
     */
    drawSubtitleOnCanvas(ctx, subtitle, width, height, settings) {
        const text = subtitle.text;
        if (!text) return;

        // Set font properties
        ctx.font = `${settings.fontSize}px ${settings.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Calculate text position
        const x = width / 2;
        const y = height - 50; // Bottom position with margin

        // Draw background if needed
        if (settings.backgroundOpacity > 0) {
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            const textHeight = settings.fontSize;
            
            ctx.fillStyle = `${settings.backgroundColor}${Math.round(settings.backgroundOpacity * 255).toString(16).padStart(2, '0')}`;
            ctx.fillRect(x - textWidth/2 - 10, y - textHeight - 5, textWidth + 20, textHeight + 10);
        }

        // Draw text
        ctx.fillStyle = settings.fontColor;
        ctx.fillText(text, x, y);
    }

    /**
     * Generate SRT format content
     */
    generateSRT(subtitles) {
        return subtitles.map((subtitle, index) => {
            const startTime = this.formatSRTTime(subtitle.start);
            const endTime = this.formatSRTTime(subtitle.end);
            
            return `${index + 1}\n${startTime} --> ${endTime}\n${subtitle.text}\n`;
        }).join('\n');
    }

    /**
     * Generate WebVTT format content
     */
    generateVTT(subtitles) {
        const header = 'WEBVTT\n\n';
        const content = subtitles.map(subtitle => {
            const startTime = this.formatVTTTime(subtitle.start);
            const endTime = this.formatVTTTime(subtitle.end);
            
            return `${startTime} --> ${endTime}\n${subtitle.text}\n`;
        }).join('\n');
        
        return header + content;
    }

    /**
     * Generate ASS format content
     */
    generateASS(subtitles) {
        const header = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,24,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
        
        const content = subtitles.map(subtitle => {
            const startTime = this.formatASSTime(subtitle.start);
            const endTime = this.formatASSTime(subtitle.end);
            
            return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${subtitle.text}`;
        }).join('\n');
        
        return header + content;
    }

    /**
     * Generate JSON format content
     */
    generateJSON(subtitles) {
        return JSON.stringify({
            version: '1.0',
            subtitles: subtitles,
            metadata: {
                count: subtitles.length,
                exported: new Date().toISOString(),
                generator: 'Video Caption Generator'
            }
        }, null, 2);
    }

    /**
     * Build FFmpeg subtitle style string
     */
    buildFFmpegSubtitleStyle(settings) {
        const style = {
            fontsize: settings.fontSize || 24,
            fontcolor: settings.fontColor || 'white',
            bordercolor: 'black',
            borderw: 2,
            fontname: settings.fontFamily || 'Arial'
        };

        return Object.entries(style)
            .map(([key, value]) => `${key}=${value}`)
            .join(':');
    }

    /**
     * Get FFmpeg quality settings
     */
    getFFmpegQualitySettings(quality) {
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
     * Format time for SRT
     */
    formatSRTTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    }

    /**
     * Format time for WebVTT
     */
    formatVTTTime(seconds) {
        return this.formatSRTTime(seconds).replace(',', '.');
    }

    /**
     * Format time for ASS
     */
    formatASSTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const cs = Math.floor((seconds % 1) * 100);

        return `${hours.toString().padStart(1, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
    }

    /**
     * Get subtitle at specific time
     */
    getSubtitleAtTime(subtitles, time) {
        return subtitles.find(subtitle => 
            time >= subtitle.start && time <= subtitle.end
        );
    }

    /**
     * Download blob as file
     */
    async downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up URL after a delay
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    /**
     * Show export progress UI
     */
    showExportProgress() {
        const progressContainer = document.getElementById('export-progress');
        if (progressContainer) {
            progressContainer.classList.remove('hidden');
        }
    }

    /**
     * Hide export progress UI
     */
    hideExportProgress() {
        const progressContainer = document.getElementById('export-progress');
        if (progressContainer) {
            progressContainer.classList.add('hidden');
        }
    }

    /**
     * Update progress display
     */
    updateProgress(percentage, message = '') {
        this.exportProgress = percentage;
        
        const progressFill = document.getElementById('export-progress-fill');
        const statusText = document.getElementById('export-status');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (statusText && message) {
            statusText.textContent = message;
        }
        
        if (this.onProgress) {
            this.onProgress({
                percentage: percentage,
                message: message
            });
        }
    }

    /**
     * Cancel current export
     */
    cancelExport() {
        if (this.isExporting) {
            this.cancelRequested = true;
            this.isExporting = false;
            this.hideExportProgress();
            
            if (this.onCancel) {
                this.onCancel();
            }
            
            console.log('Export cancelled');
        }
    }

    /**
     * Handle format change
     */
    handleFormatChange(event) {
        const format = event.target.value;
        console.log('Export format changed to:', format);
        
        // Update UI based on format capabilities
        this.updateFormatOptions(format);
    }

    /**
     * Update format-specific options
     */
    updateFormatOptions(format) {
        // Different formats might have different styling options
        // This can be extended based on format capabilities
        
        const stylingSection = document.querySelector('.styling-section');
        if (stylingSection) {
            if (format === 'ass') {
                // ASS format supports advanced styling
                stylingSection.style.display = 'block';
            } else if (format === 'srt' || format === 'vtt') {
                // SRT and VTT have limited styling
                stylingSection.style.display = 'block';
            } else if (format === 'json') {
                // JSON doesn't need styling options
                stylingSection.style.display = 'none';
            }
        }
    }

    /**
     * Handle video export toggle
     */
    handleVideoExportToggle(event) {
        const includeVideo = event.target.checked;
        const videoOptions = document.getElementById('video-quality');
        
        if (videoOptions) {
            if (includeVideo) {
                videoOptions.classList.remove('hidden');
            } else {
                videoOptions.classList.add('hidden');
            }
        }
        
        console.log('Video export toggled:', includeVideo);
    }

    /**
     * Batch export multiple formats
     */
    async batchExport(subtitles, formats, settings = {}) {
        const results = [];
        const totalFormats = formats.length;
        
        try {
            this.showExportProgress();
            
            for (let i = 0; i < formats.length; i++) {
                if (this.cancelRequested) break;
                
                const format = formats[i];
                const overallProgress = (i / totalFormats) * 100;
                
                this.updateProgress(overallProgress, `Exporting ${format.toUpperCase()}... (${i + 1}/${totalFormats})`);
                
                try {
                    await this.exportSubtitles(subtitles, format);
                    results.push({ format, success: true });
                } catch (error) {
                    console.error(`Failed to export ${format}:`, error);
                    results.push({ format, success: false, error: error.message });
                }
                
                // Brief delay between exports
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            this.updateProgress(100, 'Batch export completed!');
            
            setTimeout(() => {
                this.hideExportProgress();
            }, 2000);
            
            return results;
            
        } catch (error) {
            this.hideExportProgress();
            throw error;
        }
    }

    /**
     * Preview export before downloading
     */
    generatePreview(subtitles, format) {
        let content;
        
        switch (format.toLowerCase()) {
            case 'srt':
                content = this.generateSRT(subtitles.slice(0, 3)); // Preview first 3 subtitles
                break;
            case 'vtt':
                content = this.generateVTT(subtitles.slice(0, 3));
                break;
            case 'ass':
                content = this.generateASS(subtitles.slice(0, 3));
                break;
            case 'json':
                content = this.generateJSON(subtitles.slice(0, 3));
                break;
            default:
                content = 'Preview not available for this format';
        }
        
        return content;
    }

    /**
     * Get export statistics
     */
    getExportStats() {
        return {
            isExporting: this.isExporting,
            progress: this.exportProgress,
            supportedSubtitleFormats: this.supportedSubtitleFormats,
            supportedVideoFormats: this.supportedVideoFormats,
            cancelRequested: this.cancelRequested
        };
    }

    /**
     * Validate subtitles before export
     */
    validateSubtitles(subtitles) {
        const errors = [];
        const warnings = [];
        
        if (!Array.isArray(subtitles) || subtitles.length === 0) {
            errors.push('No subtitles to export');
            return { valid: false, errors, warnings };
        }
        
        subtitles.forEach((subtitle, index) => {
            if (!subtitle.text || subtitle.text.trim() === '') {
                warnings.push(`Subtitle ${index + 1} has empty text`);
            }
            
            if (subtitle.start < 0) {
                errors.push(`Subtitle ${index + 1} has negative start time`);
            }
            
            if (subtitle.end <= subtitle.start) {
                errors.push(`Subtitle ${index + 1} has invalid timing (end <= start)`);
            }
            
            if (subtitle.text && subtitle.text.length > 200) {
                warnings.push(`Subtitle ${index + 1} text is very long (${subtitle.text.length} characters)`);
            }
        });
        
        // Check for overlapping subtitles
        for (let i = 0; i < subtitles.length - 1; i++) {
            const current = subtitles[i];
            const next = subtitles[i + 1];
            
            if (current.end > next.start) {
                warnings.push(`Subtitles ${i + 1} and ${i + 2} overlap`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Destroy export handler
     */
    destroy() {
        this.cancelExport();
        this.hideExportProgress();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportHandler;
}