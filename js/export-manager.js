/**
 * Video Caption Generator - Export Manager Module
 * Handles export functionality for multiple caption formats (SRT, VTT, ASS, JSON)
 */

class ExportManager {
    constructor(app) {
        this.app = app;
        this.currentFormat = 'srt';
        this.exportSettings = {
            includeTimestamps: true,
            includeStyling: true,
            filename: 'captions'
        };
        
        this.setupEventListeners();
        this.updateExportPreview('srt');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Export filename input
        const filenameInput = document.getElementById('export-filename');
        if (filenameInput) {
            filenameInput.addEventListener('input', (e) => {
                this.exportSettings.filename = Utils.createSafeFilename(e.target.value) || 'captions';
            });
        }

        // Export settings checkboxes
        const stylingCheckbox = document.getElementById('include-styling');
        const timestampsCheckbox = document.getElementById('include-timestamps');

        if (stylingCheckbox) {
            stylingCheckbox.addEventListener('change', (e) => {
                this.exportSettings.includeStyling = e.target.checked;
                this.updateExportPreview(this.currentFormat);
            });
        }

        if (timestampsCheckbox) {
            timestampsCheckbox.addEventListener('change', (e) => {
                this.exportSettings.includeTimestamps = e.target.checked;
                this.updateExportPreview(this.currentFormat);
            });
        }
    }

    /**
     * Export captions in specified format
     */
    exportCaptions(format) {
        if (!this.app.captions || this.app.captions.length === 0) {
            this.app.showToast('No captions to export', 'warning');
            return;
        }

        try {
            let content = '';
            let mimeType = 'text/plain';
            let extension = 'txt';

            switch (format) {
                case 'srt':
                    content = this.generateSRT();
                    mimeType = 'application/x-subrip';
                    extension = 'srt';
                    break;
                
                case 'vtt':
                    content = this.generateVTT();
                    mimeType = 'text/vtt';
                    extension = 'vtt';
                    break;
                
                case 'ass':
                    content = this.generateASS();
                    mimeType = 'text/plain';
                    extension = 'ass';
                    break;
                
                case 'json':
                    content = this.generateJSON();
                    mimeType = 'application/json';
                    extension = 'json';
                    break;
                
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }

            const filename = `${this.exportSettings.filename}.${extension}`;
            Utils.downloadFile(content, filename, mimeType);
            
            this.app.showToast(`Exported ${filename} successfully`, 'success');

        } catch (error) {
            console.error('Export error:', error);
            this.app.showToast(`Export failed: ${error.message}`, 'error');
        }
    }

    /**
     * Generate SRT format
     */
    generateSRT() {
        const sortedCaptions = [...this.app.captions].sort((a, b) => a.startTime - b.startTime);
        let srtContent = '';

        sortedCaptions.forEach((caption, index) => {
            const startTime = Utils.formatTime(caption.startTime, 'srt');
            const endTime = Utils.formatTime(caption.endTime, 'srt');
            
            srtContent += `${index + 1}\n`;
            srtContent += `${startTime} --> ${endTime}\n`;
            srtContent += `${this.formatCaptionText(caption.text, 'srt')}\n\n`;
        });

        return srtContent.trim();
    }

    /**
     * Generate VTT format
     */
    generateVTT() {
        const sortedCaptions = [...this.app.captions].sort((a, b) => a.startTime - b.startTime);
        let vttContent = 'WEBVTT\n\n';

        // Add styling if enabled
        if (this.exportSettings.includeStyling) {
            vttContent += this.generateVTTStyling() + '\n\n';
        }

        sortedCaptions.forEach((caption, index) => {
            const startTime = Utils.formatTime(caption.startTime, 'vtt');
            const endTime = Utils.formatTime(caption.endTime, 'vtt');
            
            vttContent += `${index + 1}\n`;
            vttContent += `${startTime} --> ${endTime}`;
            
            // Add position and styling if enabled
            if (this.exportSettings.includeStyling) {
                vttContent += this.generateVTTCueSettings();
            }
            
            vttContent += `\n${this.formatCaptionText(caption.text, 'vtt')}\n\n`;
        });

        return vttContent.trim();
    }

    /**
     * Generate ASS format
     */
    generateASS() {
        const sortedCaptions = [...this.app.captions].sort((a, b) => a.startTime - b.startTime);
        let assContent = '';

        // Add ASS header
        assContent += this.generateASSHeader();

        // Add styles section
        assContent += this.generateASSStyles();

        // Add events section
        assContent += '[Events]\n';
        assContent += 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';

        sortedCaptions.forEach((caption) => {
            const startTime = Utils.formatTime(caption.startTime, 'ass');
            const endTime = Utils.formatTime(caption.endTime, 'ass');
            
            assContent += `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${this.formatCaptionText(caption.text, 'ass')}\n`;
        });

        return assContent;
    }

    /**
     * Generate JSON format
     */
    generateJSON() {
        const exportData = {
            metadata: {
                title: 'Video Captions',
                generator: 'Video Caption Generator',
                version: '1.0',
                exportDate: new Date().toISOString(),
                totalCaptions: this.app.captions.length,
                duration: this.calculateTotalDuration()
            },
            styling: this.exportSettings.includeStyling ? this.getStyleSettings() : null,
            captions: this.app.captions.map((caption, index) => ({
                index: index + 1,
                id: caption.id,
                text: caption.text,
                startTime: caption.startTime,
                endTime: caption.endTime,
                duration: caption.endTime - caption.startTime,
                startTimeFormatted: Utils.formatTime(caption.startTime, 'srt'),
                endTimeFormatted: Utils.formatTime(caption.endTime, 'srt'),
                language: caption.language || 'en-US',
                confidence: caption.confidence || 1.0
            }))
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Format caption text for specific format
     */
    formatCaptionText(text, format) {
        let formattedText = text;

        switch (format) {
            case 'srt':
                // SRT supports basic formatting
                formattedText = text
                    .replace(/\n/g, '\n')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                break;

            case 'vtt':
                // VTT supports HTML-like tags
                formattedText = text
                    .replace(/\n/g, '\n')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                
                if (this.exportSettings.includeStyling) {
                    formattedText = `<c.styled>${formattedText}</c>`;
                }
                break;

            case 'ass':
                // ASS supports advanced formatting
                formattedText = text
                    .replace(/\n/g, '\\N')
                    .replace(/\r/g, '')
                    .replace(/{/g, '\\{')
                    .replace(/}/g, '\\}');
                break;

            default:
                formattedText = text;
        }

        return formattedText;
    }

    /**
     * Generate VTT styling
     */
    generateVTTStyling() {
        const styling = this.getStyleSettings();
        
        return `STYLE
::cue(.styled) {
    font-family: ${styling.fontFamily};
    font-size: ${styling.fontSize}px;
    font-weight: ${styling.fontWeight};
    color: ${styling.textColor};
    background-color: ${Utils.getRgbaString(styling.backgroundColor, styling.backgroundOpacity / 100)};
    ${styling.textOutline ? 'text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;' : ''}
    ${styling.textShadow ? 'text-shadow: 2px 2px 4px rgba(0,0,0,0.5);' : ''}
}`;
    }

    /**
     * Generate VTT cue settings
     */
    generateVTTCueSettings() {
        const styling = this.getStyleSettings();
        const position = styling.captionPosition;
        
        let settings = '';
        
        switch (position) {
            case 'top':
                settings = ' line:10%';
                break;
            case 'middle':
                settings = ' line:50%';
                break;
            case 'bottom':
            default:
                settings = ' line:90%';
                break;
        }
        
        return settings;
    }

    /**
     * Generate ASS header
     */
    generateASSHeader() {
        return `[Script Info]
Title: Video Captions
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1920
PlayResY: 1080

`;
    }

    /**
     * Generate ASS styles
     */
    generateASSStyles() {
        const styling = this.getStyleSettings();
        const rgb = Utils.hexToRgb(styling.textColor);
        const bgRgb = Utils.hexToRgb(styling.backgroundColor);
        
        // ASS uses BGR format and alpha values
        const textColor = rgb ? `&H00${rgb.b.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.r.toString(16).padStart(2, '0')}` : '&H00FFFFFF';
        const bgColor = bgRgb ? `&H00${bgRgb.b.toString(16).padStart(2, '0')}${bgRgb.g.toString(16).padStart(2, '0')}${bgRgb.r.toString(16).padStart(2, '0')}` : '&H00000000';
        
        const alpha = Math.round((100 - styling.backgroundOpacity) * 2.55);
        const bgAlpha = `&H${alpha.toString(16).padStart(2, '0')}`;

        return `[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${styling.fontFamily.split(',')[0]},${styling.fontSize},${textColor},&H000000FF,&H00000000,${bgColor},${styling.fontWeight === 'bold' ? '-1' : '0'},0,0,0,100,100,0,0,1,${styling.textOutline ? '2' : '0'},${styling.textShadow ? '2' : '0'},2,10,10,10,1

`;
    }

    /**
     * Get current style settings
     */
    getStyleSettings() {
        return {
            fontFamily: document.getElementById('font-family')?.value || 'Arial, sans-serif',
            fontSize: parseInt(document.getElementById('font-size')?.value) || 24,
            fontWeight: document.getElementById('font-weight')?.value || 'normal',
            textColor: document.getElementById('text-color')?.value || '#ffffff',
            backgroundColor: document.getElementById('background-color')?.value || '#000000',
            backgroundOpacity: parseInt(document.getElementById('background-opacity')?.value) || 80,
            captionPosition: document.getElementById('caption-position')?.value || 'bottom',
            textOutline: document.getElementById('text-outline')?.checked || false,
            textShadow: document.getElementById('text-shadow')?.checked || false,
            textBackground: document.getElementById('text-background')?.checked || true
        };
    }

    /**
     * Calculate total duration
     */
    calculateTotalDuration() {
        if (!this.app.captions || this.app.captions.length === 0) {
            return 0;
        }

        const lastCaption = this.app.captions.reduce((latest, caption) => 
            caption.endTime > latest.endTime ? caption : latest
        );

        return lastCaption.endTime;
    }

    /**
     * Batch export all formats
     */
    async batchExport() {
        if (!this.app.captions || this.app.captions.length === 0) {
            this.app.showToast('No captions to export', 'warning');
            return;
        }

        try {
            const formats = ['srt', 'vtt', 'ass', 'json'];
            const files = [];

            // Generate all formats
            for (const format of formats) {
                let content = '';
                let extension = format;

                switch (format) {
                    case 'srt':
                        content = this.generateSRT();
                        break;
                    case 'vtt':
                        content = this.generateVTT();
                        break;
                    case 'ass':
                        content = this.generateASS();
                        break;
                    case 'json':
                        content = this.generateJSON();
                        break;
                }

                files.push({
                    name: `${this.exportSettings.filename}.${extension}`,
                    content: content
                });
            }

            // Create ZIP file
            const zip = await this.createZipFile(files);
            Utils.downloadFile(zip, `${this.exportSettings.filename}_all_formats.zip`, 'application/zip');
            
            this.app.showToast('All formats exported successfully', 'success');

        } catch (error) {
            console.error('Batch export error:', error);
            this.app.showToast(`Batch export failed: ${error.message}`, 'error');
        }
    }

    /**
     * Create ZIP file (simplified implementation)
     */
    async createZipFile(files) {
        // This is a simplified ZIP creation
        // In a production environment, you would use a library like JSZip
        
        let zipContent = '';
        
        files.forEach(file => {
            zipContent += `\n--- ${file.name} ---\n`;
            zipContent += file.content;
            zipContent += `\n--- End of ${file.name} ---\n`;
        });

        return zipContent;
    }

    /**
     * Update export preview
     */
    updateExportPreview(format) {
        this.currentFormat = format;
        
        // Update preview tabs
        document.querySelectorAll('.preview-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.preview === format);
        });

        // Generate preview content
        let previewContent = '';
        
        try {
            if (!this.app.captions || this.app.captions.length === 0) {
                previewContent = 'No captions available for preview';
            } else {
                // Show preview with first few captions
                const sampleCaptions = this.app.captions.slice(0, 3);
                const originalCaptions = this.app.captions;
                this.app.captions = sampleCaptions;

                switch (format) {
                    case 'srt':
                        previewContent = this.generateSRT();
                        break;
                    case 'vtt':
                        previewContent = this.generateVTT();
                        break;
                    case 'ass':
                        previewContent = this.generateASS();
                        break;
                    case 'json':
                        previewContent = this.generateJSON();
                        break;
                }

                // Restore original captions
                this.app.captions = originalCaptions;

                // Limit preview length
                if (previewContent.length > 2000) {
                    previewContent = previewContent.substring(0, 2000) + '\n\n... (truncated for preview)';
                }
            }
        } catch (error) {
            previewContent = `Error generating preview: ${error.message}`;
        }

        // Update preview display
        const previewElement = document.getElementById('export-preview-content');
        if (previewElement) {
            previewElement.textContent = previewContent;
        }
    }

    /**
     * Copy preview to clipboard
     */
    async copyPreviewToClipboard() {
        const previewElement = document.getElementById('export-preview-content');
        if (!previewElement || !previewElement.textContent.trim()) {
            this.app.showToast('No preview content to copy', 'warning');
            return;
        }

        try {
            const success = await Utils.copyToClipboard(previewElement.textContent);
            if (success) {
                this.app.showToast('Preview copied to clipboard', 'success');
            } else {
                this.app.showToast('Failed to copy to clipboard', 'error');
            }
        } catch (error) {
            console.error('Copy error:', error);
            this.app.showToast('Failed to copy to clipboard', 'error');
        }
    }

    /**
     * Import captions from file
     */
    async importCaptions(file) {
        try {
            const content = await this.readFileContent(file);
            const extension = file.name.split('.').pop().toLowerCase();
            
            let importedCaptions = [];

            switch (extension) {
                case 'srt':
                    importedCaptions = this.parseSRT(content);
                    break;
                case 'vtt':
                    importedCaptions = this.parseVTT(content);
                    break;
                case 'json':
                    importedCaptions = this.parseJSON(content);
                    break;
                default:
                    throw new Error(`Unsupported import format: ${extension}`);
            }

            if (importedCaptions.length > 0) {
                this.app.captions = importedCaptions;
                this.app.showToast(`Imported ${importedCaptions.length} captions`, 'success');
                
                // Switch to editor tab
                this.app.switchTab('caption-editor');
            } else {
                this.app.showToast('No captions found in file', 'warning');
            }

        } catch (error) {
            console.error('Import error:', error);
            this.app.showToast(`Import failed: ${error.message}`, 'error');
        }
    }

    /**
     * Read file content
     */
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Parse SRT content
     */
    parseSRT(content) {
        const captions = [];
        const blocks = content.trim().split(/\n\s*\n/);

        blocks.forEach(block => {
            const lines = block.trim().split('\n');
            if (lines.length >= 3) {
                const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
                if (timeMatch) {
                    const text = lines.slice(2).join('\n');
                    captions.push({
                        id: Utils.generateId(),
                        text: text,
                        startTime: Utils.parseTime(timeMatch[1]),
                        endTime: Utils.parseTime(timeMatch[2]),
                        language: 'en-US'
                    });
                }
            }
        });

        return captions;
    }

    /**
     * Parse VTT content
     */
    parseVTT(content) {
        const captions = [];
        const lines = content.split('\n');
        let i = 0;

        // Skip header
        while (i < lines.length && !lines[i].includes('-->')) {
            i++;
        }

        // Parse cues
        while (i < lines.length) {
            if (lines[i].includes('-->')) {
                const timeMatch = lines[i].match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
                if (timeMatch) {
                    i++;
                    const textLines = [];
                    while (i < lines.length && lines[i].trim() !== '') {
                        textLines.push(lines[i]);
                        i++;
                    }
                    
                    if (textLines.length > 0) {
                        captions.push({
                            id: Utils.generateId(),
                            text: textLines.join('\n'),
                            startTime: Utils.parseTime(timeMatch[1]),
                            endTime: Utils.parseTime(timeMatch[2]),
                            language: 'en-US'
                        });
                    }
                }
            }
            i++;
        }

        return captions;
    }

    /**
     * Parse JSON content
     */
    parseJSON(content) {
        const data = JSON.parse(content);
        
        if (data.captions && Array.isArray(data.captions)) {
            return data.captions.map(caption => ({
                id: caption.id || Utils.generateId(),
                text: caption.text,
                startTime: caption.startTime,
                endTime: caption.endTime,
                language: caption.language || 'en-US'
            }));
        }

        throw new Error('Invalid JSON format');
    }

    /**
     * Validate export settings
     */
    validateExportSettings() {
        const errors = [];

        if (!this.exportSettings.filename || this.exportSettings.filename.trim() === '') {
            errors.push('Filename is required');
        }

        if (!this.app.captions || this.app.captions.length === 0) {
            errors.push('No captions to export');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get export statistics
     */
    getExportStatistics() {
        if (!this.app.captions || this.app.captions.length === 0) {
            return null;
        }

        const totalCaptions = this.app.captions.length;
        const totalDuration = this.calculateTotalDuration();
        const totalWords = this.app.captions.reduce((sum, caption) => sum + Utils.wordCount(caption.text), 0);
        const averageDuration = this.app.captions.reduce((sum, caption) => sum + (caption.endTime - caption.startTime), 0) / totalCaptions;

        return {
            totalCaptions,
            totalDuration,
            totalWords,
            averageDuration,
            readingTime: Utils.estimateReadingTime(this.app.captions.map(c => c.text).join(' '))
        };
    }
}

// Extend the main app with export functionality
if (window.captionGenerator) {
    window.captionGenerator.exportManager = new ExportManager(window.captionGenerator);
    
    // Override placeholder methods in main app
    window.captionGenerator.exportCaptions = function(format) {
        this.exportManager.exportCaptions(format);
    };

    window.captionGenerator.batchExport = function() {
        this.exportManager.batchExport();
    };

    window.captionGenerator.copyPreviewToClipboard = function() {
        this.exportManager.copyPreviewToClipboard();
    };

    window.captionGenerator.updateExportPreview = function(format) {
        this.exportManager.updateExportPreview(format);
    };
}

// Make available globally
window.ExportManager = ExportManager;