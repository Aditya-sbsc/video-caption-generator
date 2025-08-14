/**
 * Video Caption Generator - Utility Functions
 * Common utility functions used throughout the application
 */

class Utils {
    /**
     * Format time in seconds to HH:MM:SS,mmm format (SRT style)
     */
    static formatTime(seconds, format = 'srt') {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);

        switch (format) {
            case 'srt':
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
            
            case 'vtt':
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
            
            case 'ass':
                const centiseconds = Math.floor((seconds % 1) * 100);
                return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
            
            case 'display':
                if (hours > 0) {
                    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                } else {
                    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                }
            
            default:
                return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Parse time string to seconds
     */
    static parseTime(timeString) {
        if (!timeString) return 0;
        
        // Handle different time formats
        const cleaned = timeString.replace(/[,\.]/g, ':');
        const parts = cleaned.split(':').map(part => parseFloat(part) || 0);
        
        if (parts.length === 4) {
            // HH:MM:SS:mmm
            return parts[0] * 3600 + parts[1] * 60 + parts[2] + parts[3] / 1000;
        } else if (parts.length === 3) {
            // MM:SS:mmm or HH:MM:SS
            if (parts[2] < 60) {
                // HH:MM:SS
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else {
                // MM:SS:mmm
                return parts[0] * 60 + parts[1] + parts[2] / 1000;
            }
        } else if (parts.length === 2) {
            // MM:SS
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 1) {
            // SS
            return parts[0];
        }
        
        return 0;
    }

    /**
     * Generate a unique ID
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Debounce function calls
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function calls
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Deep clone an object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => Utils.deepClone(item));
        if (obj instanceof Object) {
            const clonedObj = {};
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = Utils.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    /**
     * Sanitize text for HTML display
     */
    static sanitizeText(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Format file size in human readable format
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get video duration from file
     */
    static getVideoDuration(file) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                resolve(video.duration);
            };
            
            video.onerror = () => {
                window.URL.revokeObjectURL(video.src);
                reject(new Error('Failed to load video metadata'));
            };
            
            video.src = URL.createObjectURL(file);
        });
    }

    /**
     * Get video dimensions from file
     */
    static getVideoDimensions(file) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                resolve({
                    width: video.videoWidth,
                    height: video.videoHeight
                });
            };
            
            video.onerror = () => {
                window.URL.revokeObjectURL(video.src);
                reject(new Error('Failed to load video metadata'));
            };
            
            video.src = URL.createObjectURL(file);
        });
    }

    /**
     * Download file to user's computer
     */
    static downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    /**
     * Copy text to clipboard
     */
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (fallbackError) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    }

    /**
     * Check if browser supports a feature
     */
    static browserSupports(feature) {
        switch (feature) {
            case 'speechRecognition':
                return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
            
            case 'mediaRecorder':
                return !!window.MediaRecorder;
            
            case 'audioContext':
                return !!(window.AudioContext || window.webkitAudioContext);
            
            case 'getUserMedia':
                return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
            
            case 'serviceWorker':
                return 'serviceWorker' in navigator;
            
            case 'webWorker':
                return !!window.Worker;
            
            case 'fileReader':
                return !!window.FileReader;
            
            case 'dragAndDrop':
                return 'draggable' in document.createElement('div');
            
            default:
                return false;
        }
    }

    /**
     * Validate file type
     */
    static isValidVideoFile(file) {
        const validTypes = [
            'video/mp4',
            'video/webm',
            'video/quicktime',
            'video/x-msvideo', // AVI
            'video/avi'
        ];
        
        return validTypes.includes(file.type);
    }

    /**
     * Validate file size
     */
    static isValidFileSize(file, maxSizeMB = 500) {
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        return file.size <= maxSizeBytes;
    }

    /**
     * Create a safe filename
     */
    static createSafeFilename(name) {
        return name
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^_|_$/g, '');
    }

    /**
     * Color utility functions
     */
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    static rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    static getRgbaString(hex, alpha = 1) {
        const rgb = Utils.hexToRgb(hex);
        return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : hex;
    }

    /**
     * Language utilities
     */
    static getLanguageNames() {
        return {
            'en-US': 'English (US)',
            'en-GB': 'English (UK)',
            'es-ES': 'Spanish (Spain)',
            'es-MX': 'Spanish (Mexico)',
            'fr-FR': 'French',
            'de-DE': 'German',
            'it-IT': 'Italian',
            'pt-BR': 'Portuguese (Brazil)',
            'ru-RU': 'Russian',
            'ja-JP': 'Japanese',
            'ko-KR': 'Korean',
            'zh-CN': 'Chinese (Simplified)',
            'zh-TW': 'Chinese (Traditional)',
            'ar-SA': 'Arabic',
            'hi-IN': 'Hindi'
        };
    }

    static getTranslationLanguages() {
        return {
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh': 'Chinese',
            'ar': 'Arabic',
            'hi': 'Hindi'
        };
    }

    /**
     * Audio processing utilities
     */
    static analyzeAudioBuffer(audioBuffer, sampleRate = 44100) {
        const channelData = audioBuffer.getChannelData(0);
        const windowSize = Math.floor(sampleRate * 0.025); // 25ms window
        const hopSize = Math.floor(windowSize / 2);
        const features = [];

        for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
            const window = channelData.slice(i, i + windowSize);
            
            // Calculate RMS (energy)
            const rms = Math.sqrt(window.reduce((sum, sample) => sum + sample * sample, 0) / window.length);
            
            // Calculate zero crossing rate
            let zcr = 0;
            for (let j = 1; j < window.length; j++) {
                if ((window[j] >= 0) !== (window[j - 1] >= 0)) {
                    zcr++;
                }
            }
            zcr = zcr / (window.length - 1);

            features.push({ rms, zcr, timestamp: i / sampleRate });
        }

        return features;
    }

    /**
     * Text processing utilities
     */
    static cleanText(text) {
        return text
            .replace(/\s+/g, ' ') // Multiple spaces to single space
            .replace(/[^\w\s.,!?;:'"()-]/g, '') // Remove special characters
            .trim();
    }

    static splitIntoSentences(text) {
        return text
            .split(/[.!?]+/)
            .map(sentence => sentence.trim())
            .filter(sentence => sentence.length > 0);
    }

    static wordCount(text) {
        return text.trim().split(/\s+/).length;
    }

    static estimateReadingTime(text, wordsPerSecond = 2.5) {
        const wordCount = Utils.wordCount(text);
        return wordCount / wordsPerSecond;
    }

    /**
     * Performance utilities
     */
    static measurePerformance(fn, name = 'operation') {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`${name} took ${end - start} milliseconds`);
        return result;
    }

    static async measureAsyncPerformance(fn, name = 'async operation') {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        console.log(`${name} took ${end - start} milliseconds`);
        return result;
    }

    /**
     * Error handling utilities
     */
    static createError(message, code, details = {}) {
        const error = new Error(message);
        error.code = code;
        error.details = details;
        return error;
    }

    static logError(error, context = '') {
        console.error(`Error ${context}:`, {
            message: error.message,
            stack: error.stack,
            code: error.code,
            details: error.details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Storage utilities
     */
    static setStorageItem(key, value, storage = localStorage) {
        try {
            storage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('Failed to save to storage:', error);
            return false;
        }
    }

    static getStorageItem(key, defaultValue = null, storage = localStorage) {
        try {
            const item = storage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Failed to read from storage:', error);
            return defaultValue;
        }
    }

    static removeStorageItem(key, storage = localStorage) {
        try {
            storage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Failed to remove from storage:', error);
            return false;
        }
    }

    /**
     * Animation utilities
     */
    static easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    static animate(duration, callback, easing = Utils.easeInOutCubic) {
        const start = performance.now();
        
        function frame(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easing(progress);
            
            callback(easedProgress);
            
            if (progress < 1) {
                requestAnimationFrame(frame);
            }
        }
        
        requestAnimationFrame(frame);
    }

    /**
     * DOM utilities
     */
    static createElement(tag, className = '', content = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (content) element.textContent = content;
        return element;
    }

    static getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height
        };
    }

    static isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Caption processing utilities
     */
    static mergeCaptionSegments(segments, maxGap = 0.5) {
        if (!segments || segments.length === 0) return [];

        const merged = [segments[0]];
        
        for (let i = 1; i < segments.length; i++) {
            const current = segments[i];
            const previous = merged[merged.length - 1];
            
            if (current.startTime - previous.endTime <= maxGap) {
                // Merge with previous segment
                previous.endTime = current.endTime;
                previous.text += ' ' + current.text;
            } else {
                merged.push(current);
            }
        }
        
        return merged;
    }

    static splitCaptionSegment(segment, splitTime) {
        if (!segment || splitTime <= segment.startTime || splitTime >= segment.endTime) {
            return [segment];
        }

        const words = segment.text.split(' ');
        const duration = segment.endTime - segment.startTime;
        const splitRatio = (splitTime - segment.startTime) / duration;
        const splitIndex = Math.floor(words.length * splitRatio);

        const firstText = words.slice(0, splitIndex).join(' ');
        const secondText = words.slice(splitIndex).join(' ');

        return [
            {
                ...segment,
                endTime: splitTime,
                text: firstText
            },
            {
                ...segment,
                startTime: splitTime,
                text: secondText
            }
        ];
    }

    /**
     * Validation utilities
     */
    static validateCaption(caption) {
        const errors = [];

        if (!caption.text || caption.text.trim().length === 0) {
            errors.push('Caption text is required');
        }

        if (typeof caption.startTime !== 'number' || caption.startTime < 0) {
            errors.push('Invalid start time');
        }

        if (typeof caption.endTime !== 'number' || caption.endTime <= caption.startTime) {
            errors.push('Invalid end time');
        }

        if (caption.text && caption.text.length > 1000) {
            errors.push('Caption text is too long (max 1000 characters)');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static validateCaptionsList(captions) {
        const errors = [];
        
        for (let i = 0; i < captions.length; i++) {
            const caption = captions[i];
            const validation = Utils.validateCaption(caption);
            
            if (!validation.isValid) {
                errors.push(`Caption ${i + 1}: ${validation.errors.join(', ')}`);
            }

            // Check for overlaps with next caption
            if (i < captions.length - 1) {
                const nextCaption = captions[i + 1];
                if (caption.endTime > nextCaption.startTime) {
                    errors.push(`Caption ${i + 1} overlaps with caption ${i + 2}`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Export for use in other modules
window.Utils = Utils;