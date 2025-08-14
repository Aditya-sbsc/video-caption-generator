/**
 * Translation Service
 * Handles multi-language translation using Google Translate API and other services
 */

class TranslationService {
    constructor() {
        this.apiKey = '';
        this.baseURL = 'https://translation.googleapis.com/language/translate/v2';
        this.detectURL = 'https://translation.googleapis.com/language/translate/v2/detect';
        this.languagesURL = 'https://translation.googleapis.com/language/translate/v2/languages';
        
        // Cache for translations and languages
        this.translationCache = new Map();
        this.languageCache = null;
        this.detectionCache = new Map();
        
        // Rate limiting
        this.requestQueue = [];
        this.isProcessing = false;
        this.requestDelay = 100; // ms between requests
        
        // Offline fallback dictionary
        this.offlineDictionary = this.initializeOfflineDictionary();
        
        // Event callbacks
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;
    }

    /**
     * Set API key for Google Translate
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Get API key from storage or settings
     */
    getApiKey() {
        if (this.apiKey) return this.apiKey;
        
        // Try to get from localStorage
        const stored = localStorage.getItem('googleTranslateKey');
        if (stored) {
            this.apiKey = stored;
            return stored;
        }
        
        return null;
    }

    /**
     * Check if translation service is available
     */
    isAvailable() {
        return !!this.getApiKey();
    }

    /**
     * Translate a single text
     */
    async translateText(text, targetLanguage, sourceLanguage = null) {
        if (!text || !text.trim()) return text;
        
        // Check cache first
        const cacheKey = `${text}:${sourceLanguage || 'auto'}:${targetLanguage}`;
        if (this.translationCache.has(cacheKey)) {
            return this.translationCache.get(cacheKey);
        }
        
        try {
            let result;
            
            if (this.isAvailable()) {
                result = await this.translateWithGoogle(text, targetLanguage, sourceLanguage);
            } else {
                result = await this.translateOffline(text, targetLanguage, sourceLanguage);
            }
            
            // Cache the result
            this.translationCache.set(cacheKey, result);
            
            return result;
            
        } catch (error) {
            console.error('Translation failed:', error);
            
            // Fallback to offline translation
            if (this.isAvailable()) {
                try {
                    const fallback = await this.translateOffline(text, targetLanguage, sourceLanguage);
                    this.translationCache.set(cacheKey, fallback);
                    return fallback;
                } catch (fallbackError) {
                    console.error('Offline translation also failed:', fallbackError);
                }
            }
            
            throw error;
        }
    }

    /**
     * Translate text using Google Translate API
     */
    async translateWithGoogle(text, targetLanguage, sourceLanguage = null) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('Google Translate API key not configured');
        }

        const params = new URLSearchParams({
            key: apiKey,
            q: text,
            target: targetLanguage,
            format: 'text'
        });

        if (sourceLanguage && sourceLanguage !== 'auto') {
            params.append('source', sourceLanguage);
        }

        const response = await fetch(`${this.baseURL}?${params}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Google Translate API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const translation = data.data.translations[0];
        
        return {
            translatedText: translation.translatedText,
            detectedSourceLanguage: translation.detectedSourceLanguage,
            confidence: 1.0 // Google Translate doesn't provide confidence scores
        };
    }

    /**
     * Translate multiple texts in batch
     */
    async translateBatch(texts, targetLanguage, sourceLanguage = null) {
        if (!Array.isArray(texts) || texts.length === 0) {
            return [];
        }

        const results = [];
        const batchSize = 100; // Google Translate API limit
        
        try {
            for (let i = 0; i < texts.length; i += batchSize) {
                const batch = texts.slice(i, i + batchSize);
                const batchResults = await this.processBatch(batch, targetLanguage, sourceLanguage);
                results.push(...batchResults);
                
                // Report progress
                if (this.onProgress) {
                    this.onProgress({
                        completed: Math.min(i + batchSize, texts.length),
                        total: texts.length,
                        percentage: Math.round((Math.min(i + batchSize, texts.length) / texts.length) * 100)
                    });
                }
                
                // Add delay between batches to respect rate limits
                if (i + batchSize < texts.length) {
                    await this.delay(this.requestDelay);
                }
            }
            
            return results;
            
        } catch (error) {
            console.error('Batch translation failed:', error);
            throw error;
        }
    }

    /**
     * Process a batch of translations
     */
    async processBatch(texts, targetLanguage, sourceLanguage) {
        if (this.isAvailable()) {
            return await this.translateBatchWithGoogle(texts, targetLanguage, sourceLanguage);
        } else {
            return await this.translateBatchOffline(texts, targetLanguage, sourceLanguage);
        }
    }

    /**
     * Translate batch using Google Translate API
     */
    async translateBatchWithGoogle(texts, targetLanguage, sourceLanguage = null) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('Google Translate API key not configured');
        }

        const params = new URLSearchParams({
            key: apiKey,
            target: targetLanguage,
            format: 'text'
        });

        // Add multiple q parameters for batch translation
        texts.forEach(text => {
            if (text && text.trim()) {
                params.append('q', text);
            }
        });

        if (sourceLanguage && sourceLanguage !== 'auto') {
            params.append('source', sourceLanguage);
        }

        const response = await fetch(`${this.baseURL}?${params}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Google Translate API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        return data.data.translations.map(translation => ({
            translatedText: translation.translatedText,
            detectedSourceLanguage: translation.detectedSourceLanguage,
            confidence: 1.0
        }));
    }

    /**
     * Translate subtitles array
     */
    async translateSubtitles(subtitles, targetLanguage, sourceLanguage = null) {
        if (!Array.isArray(subtitles) || subtitles.length === 0) {
            return subtitles;
        }

        try {
            console.log(`Translating ${subtitles.length} subtitles to ${targetLanguage}`);
            
            // Extract texts for translation
            const texts = subtitles.map(subtitle => subtitle.text);
            
            // Translate all texts
            const translations = await this.translateBatch(texts, targetLanguage, sourceLanguage);
            
            // Create new subtitles with translations
            const translatedSubtitles = subtitles.map((subtitle, index) => ({
                ...subtitle,
                text: translations[index]?.translatedText || subtitle.text,
                originalText: subtitle.text,
                detectedLanguage: translations[index]?.detectedSourceLanguage,
                translationConfidence: translations[index]?.confidence || 0
            }));
            
            if (this.onComplete) {
                this.onComplete({
                    originalSubtitles: subtitles,
                    translatedSubtitles: translatedSubtitles,
                    targetLanguage: targetLanguage
                });
            }
            
            console.log('Subtitle translation completed');
            return translatedSubtitles;
            
        } catch (error) {
            console.error('Subtitle translation failed:', error);
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }

    /**
     * Detect language of text
     */
    async detectLanguage(text) {
        if (!text || !text.trim()) {
            return { language: 'unknown', confidence: 0 };
        }

        // Check cache
        if (this.detectionCache.has(text)) {
            return this.detectionCache.get(text);
        }

        try {
            let result;
            
            if (this.isAvailable()) {
                result = await this.detectLanguageWithGoogle(text);
            } else {
                result = await this.detectLanguageOffline(text);
            }
            
            // Cache result
            this.detectionCache.set(text, result);
            
            return result;
            
        } catch (error) {
            console.error('Language detection failed:', error);
            
            // Fallback to offline detection
            try {
                const fallback = await this.detectLanguageOffline(text);
                this.detectionCache.set(text, fallback);
                return fallback;
            } catch (fallbackError) {
                return { language: 'unknown', confidence: 0 };
            }
        }
    }

    /**
     * Detect language using Google Translate API
     */
    async detectLanguageWithGoogle(text) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('Google Translate API key not configured');
        }

        const params = new URLSearchParams({
            key: apiKey,
            q: text
        });

        const response = await fetch(`${this.detectURL}?${params}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Language detection error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const detection = data.data.detections[0][0];
        
        return {
            language: detection.language,
            confidence: detection.confidence || 0
        };
    }

    /**
     * Get supported languages
     */
    async getSupportedLanguages(targetLanguage = 'en') {
        // Return cached languages if available
        if (this.languageCache) {
            return this.languageCache;
        }

        try {
            if (this.isAvailable()) {
                return await this.getSupportedLanguagesFromGoogle(targetLanguage);
            } else {
                return this.getOfflineSupportedLanguages();
            }
        } catch (error) {
            console.error('Failed to get supported languages:', error);
            return this.getOfflineSupportedLanguages();
        }
    }

    /**
     * Get supported languages from Google Translate API
     */
    async getSupportedLanguagesFromGoogle(targetLanguage = 'en') {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('Google Translate API key not configured');
        }

        const params = new URLSearchParams({
            key: apiKey,
            target: targetLanguage
        });

        const response = await fetch(`${this.languagesURL}?${params}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Languages API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        this.languageCache = data.data.languages;
        
        return this.languageCache;
    }

    /**
     * Initialize offline dictionary for basic translations
     */
    initializeOfflineDictionary() {
        return {
            // Common phrases in multiple languages
            'hello': {
                'es': 'hola',
                'fr': 'bonjour',
                'de': 'hallo',
                'it': 'ciao',
                'pt': 'olá',
                'ru': 'привет',
                'zh': '你好',
                'ja': 'こんにちは',
                'ko': '안녕하세요',
                'ar': 'مرحبا',
                'hi': 'नमस्ते'
            },
            'thank you': {
                'es': 'gracias',
                'fr': 'merci',
                'de': 'danke',
                'it': 'grazie',
                'pt': 'obrigado',
                'ru': 'спасибо',
                'zh': '谢谢',
                'ja': 'ありがとう',
                'ko': '감사합니다',
                'ar': 'شكرا',
                'hi': 'धन्यवाद'
            },
            'yes': {
                'es': 'sí',
                'fr': 'oui',
                'de': 'ja',
                'it': 'sì',
                'pt': 'sim',
                'ru': 'да',
                'zh': '是',
                'ja': 'はい',
                'ko': '네',
                'ar': 'نعم',
                'hi': 'हाँ'
            },
            'no': {
                'es': 'no',
                'fr': 'non',
                'de': 'nein',
                'it': 'no',
                'pt': 'não',
                'ru': 'нет',
                'zh': '不',
                'ja': 'いいえ',
                'ko': '아니요',
                'ar': 'لا',
                'hi': 'नहीं'
            }
        };
    }

    /**
     * Offline translation fallback
     */
    async translateOffline(text, targetLanguage, sourceLanguage = null) {
        console.log('Using offline translation fallback');
        
        const lowerText = text.toLowerCase().trim();
        
        // Check dictionary
        if (this.offlineDictionary[lowerText] && this.offlineDictionary[lowerText][targetLanguage]) {
            return {
                translatedText: this.offlineDictionary[lowerText][targetLanguage],
                detectedSourceLanguage: sourceLanguage || 'en',
                confidence: 0.7
            };
        }
        
        // Basic text processing for unknown words
        let processedText = text;
        
        // Apply basic language-specific transformations
        switch (targetLanguage) {
            case 'es':
                // Spanish - add question marks
                if (text.includes('?')) {
                    processedText = '¿' + text;
                }
                break;
            case 'fr':
                // French - basic accent rules (very simplified)
                processedText = text.replace(/e$/g, 'é');
                break;
            case 'de':
                // German - capitalize nouns (simplified)
                processedText = text.replace(/\b[a-z]/g, char => char.toUpperCase());
                break;
        }
        
        return {
            translatedText: processedText,
            detectedSourceLanguage: sourceLanguage || 'unknown',
            confidence: 0.3
        };
    }

    /**
     * Offline batch translation
     */
    async translateBatchOffline(texts, targetLanguage, sourceLanguage) {
        return Promise.all(
            texts.map(text => this.translateOffline(text, targetLanguage, sourceLanguage))
        );
    }

    /**
     * Offline language detection
     */
    async detectLanguageOffline(text) {
        // Very basic language detection based on character patterns
        const patterns = {
            'zh': /[\u4e00-\u9fff]/,  // Chinese characters
            'ja': /[\u3040-\u309f\u30a0-\u30ff]/,  // Hiragana/Katakana
            'ko': /[\uac00-\ud7af]/,  // Korean
            'ar': /[\u0600-\u06ff]/,  // Arabic
            'ru': /[\u0400-\u04ff]/,  // Cyrillic
            'hi': /[\u0900-\u097f]/,  // Devanagari
            'th': /[\u0e00-\u0e7f]/   // Thai
        };
        
        for (const [lang, pattern] of Object.entries(patterns)) {
            if (pattern.test(text)) {
                return {
                    language: lang,
                    confidence: 0.8
                };
            }
        }
        
        // Default to English for Latin script
        return {
            language: 'en',
            confidence: 0.5
        };
    }

    /**
     * Get offline supported languages
     */
    getOfflineSupportedLanguages() {
        return [
            { language: 'en', name: 'English' },
            { language: 'es', name: 'Spanish' },
            { language: 'fr', name: 'French' },
            { language: 'de', name: 'German' },
            { language: 'it', name: 'Italian' },
            { language: 'pt', name: 'Portuguese' },
            { language: 'ru', name: 'Russian' },
            { language: 'zh', name: 'Chinese' },
            { language: 'ja', name: 'Japanese' },
            { language: 'ko', name: 'Korean' },
            { language: 'ar', name: 'Arabic' },
            { language: 'hi', name: 'Hindi' }
        ];
    }

    /**
     * Clear translation cache
     */
    clearCache() {
        this.translationCache.clear();
        this.detectionCache.clear();
        this.languageCache = null;
    }

    /**
     * Get translation statistics
     */
    getStats() {
        return {
            cacheSize: this.translationCache.size,
            detectionCacheSize: this.detectionCache.size,
            apiAvailable: this.isAvailable(),
            queueLength: this.requestQueue.length,
            isProcessing: this.isProcessing
        };
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get language name from code
     */
    getLanguageName(languageCode) {
        const languageNames = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'zh': 'Chinese',
            'ja': 'Japanese',
            'ko': 'Korean',
            'ar': 'Arabic',
            'hi': 'Hindi',
            'th': 'Thai',
            'vi': 'Vietnamese',
            'tr': 'Turkish',
            'pl': 'Polish',
            'nl': 'Dutch',
            'sv': 'Swedish',
            'da': 'Danish',
            'no': 'Norwegian',
            'fi': 'Finnish'
        };
        
        return languageNames[languageCode] || languageCode;
    }

    /**
     * Validate language code
     */
    isValidLanguageCode(code) {
        const validCodes = [
            'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
            'ar', 'hi', 'th', 'vi', 'tr', 'pl', 'nl', 'sv', 'da', 'no', 'fi'
        ];
        return validCodes.includes(code);
    }

    /**
     * Destroy translation service
     */
    destroy() {
        this.clearCache();
        this.requestQueue = [];
        this.isProcessing = false;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TranslationService;
}