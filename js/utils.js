/**
 * Utility Functions
 * Common helper functions used throughout the application
 */

class Utils {
    /**
     * Format time in various formats
     */
    static formatTime(seconds, format = 'mm:ss') {
        if (isNaN(seconds) || seconds < 0) return '00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 1000);
        
        switch (format.toLowerCase()) {
            case 'hh:mm:ss':
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                
            case 'hh:mm:ss.ms':
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
                
            case 'mm:ss.ms':
                return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${Math.floor(milliseconds/10).toString().padStart(2, '0')}`;
                
            case 'srt':
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
                
            case 'vtt':
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
                
            case 'ass':
                const centiseconds = Math.floor(milliseconds / 10);
                return `${hours.toString().padStart(1, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
                
            default: // 'mm:ss'
                return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Parse time string to seconds
     */
    static parseTime(timeString) {
        if (!timeString) return 0;
        
        // Handle different time formats
        timeString = timeString.trim();
        
        // SRT format: 00:01:23,456
        let match = timeString.match(/^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})$/);
        if (match) {
            const [, hours, minutes, seconds, ms] = match;
            return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(ms.padEnd(3, '0')) / 1000;
        }
        
        // MM:SS.MS format
        match = timeString.match(/^(\d{1,2}):(\d{2})\.(\d{1,2})$/);
        if (match) {
            const [, minutes, seconds, ms] = match;
            return parseInt(minutes) * 60 + parseInt(seconds) + parseInt(ms.padEnd(2, '0')) / 100;
        }
        
        // MM:SS format
        match = timeString.match(/^(\d{1,2}):(\d{2})$/);
        if (match) {
            const [, minutes, seconds] = match;
            return parseInt(minutes) * 60 + parseInt(seconds);
        }
        
        // Just seconds
        const numValue = parseFloat(timeString);
        return isNaN(numValue) ? 0 : Math.max(0, numValue);
    }

    /**
     * Format file size
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Debounce function
     */
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    }

    /**
     * Throttle function
     */
    static throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Deep clone object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => Utils.deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = Utils.deepClone(obj[key]);
            }
        }
        return cloned;
    }

    /**
     * Generate unique ID
     */
    static generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Validate email
     */
    static isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Validate URL
     */
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Escape HTML
     */
    static escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Unescape HTML
     */
    static unescapeHtml(safe) {
        return safe
            .replace(/&#039;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&gt;/g, ">")
            .replace(/&lt;/g, "<")
            .replace(/&amp;/g, "&");
    }

    /**
     * Get file extension
     */
    static getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    }

    /**
     * Check if file is video
     */
    static isVideoFile(file) {
        if (!file) return false;
        
        const videoTypes = [
            'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 
            'video/mov', 'video/wmv', 'video/flv', 'video/mkv'
        ];
        
        return videoTypes.includes(file.type);
    }

    /**
     * Check if file is audio
     */
    static isAudioFile(file) {
        if (!file) return false;
        
        const audioTypes = [
            'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
            'audio/aac', 'audio/flac', 'audio/wma'
        ];
        
        return audioTypes.includes(file.type);
    }

    /**
     * Convert blob to base64
     */
    static blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Convert base64 to blob
     */
    static base64ToBlob(base64, mimeType = '') {
        const byteCharacters = atob(base64.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    /**
     * Download blob as file
     */
    static downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    /**
     * Calculate text similarity (simple Levenshtein distance)
     */
    static textSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0) return len2;
        if (len2 === 0) return len1;
        
        const matrix = [];
        
        for (let i = 0; i <= len2; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= len1; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= len2; i++) {
            for (let j = 1; j <= len1; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        const distance = matrix[len2][len1];
        const maxLen = Math.max(len1, len2);
        return 1 - (distance / maxLen);
    }

    /**
     * Color manipulation utilities
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

    static hexToHsl(hex) {
        const rgb = Utils.hexToRgb(hex);
        if (!rgb) return null;
        
        const { r, g, b } = rgb;
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;
        
        const max = Math.max(rNorm, gNorm, bNorm);
        const min = Math.min(rNorm, gNorm, bNorm);
        
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
                case gNorm: h = (bNorm - rNorm) / d + 2; break;
                case bNorm: h = (rNorm - gNorm) / d + 4; break;
            }
            h /= 6;
        }
        
        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    /**
     * Local storage utilities
     */
    static setLocalStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
            return false;
        }
    }

    static getLocalStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn('Failed to read from localStorage:', e);
            return defaultValue;
        }
    }

    static removeLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn('Failed to remove from localStorage:', e);
            return false;
        }
    }

    /**
     * Device detection utilities
     */
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    static isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent);
    }

    static isAndroid() {
        return /Android/i.test(navigator.userAgent);
    }

    static isSafari() {
        return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    }

    static isChrome() {
        return /Chrome/i.test(navigator.userAgent) && /Google Inc/i.test(navigator.vendor);
    }

    static isFirefox() {
        return /Firefox/i.test(navigator.userAgent);
    }

    /**
     * Feature detection
     */
    static supportsWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
        } catch (e) {
            return false;
        }
    }

    static supportsWebAudio() {
        return !!(window.AudioContext || window.webkitAudioContext);
    }

    static supportsFileReader() {
        return !!(window.File && window.FileReader && window.FileList && window.Blob);
    }

    static supportsLocalStorage() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    static supportsServiceWorker() {
        return 'serviceWorker' in navigator;
    }

    static supportsSpeechRecognition() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    static supportsWebRTC() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Performance utilities
     */
    static measurePerformance(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        console.log(`${name} took ${end - start} milliseconds`);
        return result;
    }

    static async measureAsyncPerformance(name, fn) {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        
        console.log(`${name} took ${end - start} milliseconds`);
        return result;
    }

    /**
     * Array utilities
     */
    static chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    static unique(array) {
        return [...new Set(array)];
    }

    static shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    static groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }

    /**
     * String utilities
     */
    static capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    static camelCase(str) {
        return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
    }

    static kebabCase(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }

    static truncate(str, length, suffix = '...') {
        if (str.length <= length) return str;
        return str.slice(0, length - suffix.length) + suffix;
    }

    static stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    /**
     * Number utilities
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    static randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Promise utilities
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static timeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), ms)
            )
        ]);
    }

    static retry(fn, retries = 3, delay = 1000) {
        return fn().catch(err => {
            if (retries > 0) {
                return Utils.delay(delay).then(() => Utils.retry(fn, retries - 1, delay));
            }
            throw err;
        });
    }

    /**
     * Event utilities
     */
    static once(element, event, callback) {
        const handler = (...args) => {
            element.removeEventListener(event, handler);
            callback.apply(this, args);
        };
        element.addEventListener(event, handler);
    }

    static delegate(parent, selector, event, callback) {
        parent.addEventListener(event, (e) => {
            const target = e.target.closest(selector);
            if (target) {
                callback.call(target, e);
            }
        });
    }

    /**
     * CSS utilities
     */
    static getComputedStyle(element, property) {
        return window.getComputedStyle(element).getPropertyValue(property);
    }

    static setCSS(element, styles) {
        Object.assign(element.style, styles);
    }

    static addClass(element, className) {
        element.classList.add(className);
    }

    static removeClass(element, className) {
        element.classList.remove(className);
    }

    static toggleClass(element, className) {
        element.classList.toggle(className);
    }

    static hasClass(element, className) {
        return element.classList.contains(className);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}