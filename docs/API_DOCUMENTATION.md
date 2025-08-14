# API Documentation

## Video Caption Generator API Reference

This document provides comprehensive information about the APIs and services used in the Video Caption Generator application.

### Table of Contents

1. [Overview](#overview)
2. [Core Application APIs](#core-application-apis)
3. [External Service APIs](#external-service-apis)
4. [Configuration](#configuration)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Examples](#examples)

---

## Overview

The Video Caption Generator integrates multiple APIs to provide comprehensive subtitle generation and translation capabilities:

- **Web Speech API** - Browser-based speech recognition
- **Google Translate API** - Multi-language translation
- **FFmpeg.js** - Video/audio processing
- **Web Audio API** - Audio analysis and waveform generation

---

## Core Application APIs

### 1. Speech Recognition API

#### `SpeechRecognitionHandler`

**Purpose**: Handles real-time speech-to-text conversion using the browser's Web Speech API.

**Initialization**:
```javascript
const speechHandler = new SpeechRecognitionHandler();
speechHandler.onResult = (result) => {
    console.log('Transcription:', result.final);
};
```

**Methods**:

##### `start(language)`
Starts speech recognition.

**Parameters**:
- `language` (string) - Language code (e.g., 'en-US', 'es-ES')

**Example**:
```javascript
await speechHandler.start('en-US');
```

##### `stop()`
Stops speech recognition.

**Example**:
```javascript
speechHandler.stop();
```

##### `setLanguage(language)`
Changes recognition language.

**Parameters**:
- `language` (string) - New language code

**Events**:
- `onResult(result)` - Called when transcription is available
- `onError(error)` - Called when an error occurs
- `onStart()` - Called when recognition starts
- `onEnd()` - Called when recognition ends

**Result Object Structure**:
```javascript
{
    final: "Final transcription text",
    interim: "Interim text being processed",
    confidence: 0.95,
    alternatives: [
        {
            transcript: "Alternative transcription",
            confidence: 0.87
        }
    ]
}
```

---

### 2. Video Processing API

#### `VideoProcessor`

**Purpose**: Handles video file processing, audio extraction, and subtitle generation.

**Initialization**:
```javascript
const processor = new VideoProcessor();
processor.onProgress = (progress) => {
    console.log('Progress:', progress + '%');
};
```

**Methods**:

##### `extractAudio(videoFile)`
Extracts audio from video file.

**Parameters**:
- `videoFile` (File) - Video file object

**Returns**: Promise<Blob> - Audio blob

**Example**:
```javascript
const audioBlob = await processor.extractAudio(videoFile);
```

##### `extractSubtitles(videoFile)`
Generates subtitles from video file.

**Parameters**:
- `videoFile` (File) - Video file object

**Returns**: Promise<Array> - Array of subtitle objects

**Example**:
```javascript
const subtitles = await processor.extractSubtitles(videoFile);
```

##### `burnSubtitles(videoFile, subtitles, styling)`
Burns subtitles into video.

**Parameters**:
- `videoFile` (File) - Source video file
- `subtitles` (Array) - Subtitle objects
- `styling` (Object) - Styling options

**Returns**: Promise<Blob> - Video with burned subtitles

**Styling Options**:
```javascript
{
    fontSize: 24,
    fontFamily: 'Arial',
    fontColor: '#FFFFFF',
    backgroundColor: '#000000',
    backgroundOpacity: 0.8,
    position: 'bottom'
}
```

---

### 3. Translation API

#### `TranslationService`

**Purpose**: Provides multi-language translation capabilities.

**Initialization**:
```javascript
const translator = new TranslationService();
translator.setApiKey('YOUR_GOOGLE_TRANSLATE_KEY');
```

**Methods**:

##### `translateText(text, targetLanguage, sourceLanguage)`
Translates a single text string.

**Parameters**:
- `text` (string) - Text to translate
- `targetLanguage` (string) - Target language code
- `sourceLanguage` (string, optional) - Source language code

**Returns**: Promise<Object> - Translation result

**Example**:
```javascript
const result = await translator.translateText(
    'Hello world', 
    'es', 
    'en'
);
console.log(result.translatedText); // "Hola mundo"
```

##### `translateSubtitles(subtitles, targetLanguage)`
Translates an array of subtitles.

**Parameters**:
- `subtitles` (Array) - Array of subtitle objects
- `targetLanguage` (string) - Target language code

**Returns**: Promise<Array> - Translated subtitles

**Example**:
```javascript
const translatedSubs = await translator.translateSubtitles(
    subtitles, 
    'fr'
);
```

##### `detectLanguage(text)`
Detects the language of text.

**Parameters**:
- `text` (string) - Text to analyze

**Returns**: Promise<Object> - Detection result

**Example**:
```javascript
const detection = await translator.detectLanguage('Bonjour');
console.log(detection.language); // "fr"
console.log(detection.confidence); // 0.99
```

---

### 4. Subtitle Editor API

#### `SubtitleEditor`

**Purpose**: Manages subtitle editing and timeline functionality.

**Initialization**:
```javascript
const editor = new SubtitleEditor();
editor.onChange = (action, subtitle) => {
    console.log('Subtitle changed:', action, subtitle);
};
```

**Methods**:

##### `loadSubtitles(subtitles)`
Loads subtitles into the editor.

**Parameters**:
- `subtitles` (Array) - Array of subtitle objects

##### `addSubtitle(subtitle)`
Adds a new subtitle.

**Parameters**:
- `subtitle` (Object, optional) - Subtitle object (auto-generated if not provided)

##### `deleteSubtitle(subtitle)`
Removes a subtitle.

**Parameters**:
- `subtitle` (Object) - Subtitle to remove

##### `exportSubtitles(format)`
Exports subtitles in specified format.

**Parameters**:
- `format` (string) - Export format ('srt', 'vtt', 'ass', 'json')

**Returns**: string - Formatted subtitle content

**Subtitle Object Structure**:
```javascript
{
    id: 1234567890,
    start: 10.5,      // Start time in seconds
    end: 13.2,        // End time in seconds
    text: "Subtitle text",
    confidence: 0.95  // Recognition confidence (0-1)
}
```

---

### 5. Export Handler API

#### `ExportHandler`

**Purpose**: Manages file export functionality.

**Initialization**:
```javascript
const exporter = new ExportHandler();
exporter.onProgress = (progress) => {
    console.log('Export progress:', progress.percentage + '%');
};
```

**Methods**:

##### `exportSubtitles(subtitles, format, filename)`
Exports subtitles to file.

**Parameters**:
- `subtitles` (Array) - Subtitle objects
- `format` (string) - Export format
- `filename` (string, optional) - Custom filename

**Supported Formats**:
- `srt` - SubRip format
- `vtt` - WebVTT format
- `ass` - Advanced SubStation Alpha
- `json` - JSON format

##### `exportVideoWithSubtitles(videoFile, subtitles, settings)`
Exports video with burned-in subtitles.

**Parameters**:
- `videoFile` (File) - Source video
- `subtitles` (Array) - Subtitle objects
- `settings` (Object) - Export settings

---

## External Service APIs

### 1. Google Translate API

**Base URL**: `https://translation.googleapis.com/language/translate/v2`

**Authentication**: API Key required

**Setup**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Translation API
3. Create an API key
4. Configure in application settings

**Endpoints Used**:

#### Translate Text
```http
POST https://translation.googleapis.com/language/translate/v2?key=API_KEY
Content-Type: application/x-www-form-urlencoded

q=Hello+world&target=es&source=en
```

#### Detect Language
```http
POST https://translation.googleapis.com/language/translate/v2/detect?key=API_KEY
Content-Type: application/x-www-form-urlencoded

q=Hello+world
```

#### List Languages
```http
GET https://translation.googleapis.com/language/translate/v2/languages?key=API_KEY&target=en
```

**Rate Limits**:
- 100 requests per 100 seconds per user
- 1,000 characters per request recommended

---

### 2. Web Speech API

**Browser Support**:
- Chrome: Full support
- Firefox: Partial support
- Safari: Limited support
- Edge: Full support

**Configuration**:
```javascript
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';
```

**Supported Languages**:
- English: en-US, en-GB, en-AU
- Spanish: es-ES, es-MX, es-AR
- French: fr-FR, fr-CA
- German: de-DE
- Italian: it-IT
- Portuguese: pt-BR, pt-PT
- Russian: ru-RU
- Chinese: zh-CN, zh-TW
- Japanese: ja-JP
- Korean: ko-KR
- Hindi: hi-IN
- Arabic: ar-SA

---

### 3. FFmpeg.js API

**Installation**:
```html
<script src="https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js"></script>
<script src="https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js"></script>
```

**Basic Usage**:
```javascript
const ffmpeg = new FFmpeg();
await ffmpeg.load();

// Extract audio
await ffmpeg.exec([
    '-i', 'input.mp4',
    '-vn',
    '-acodec', 'pcm_s16le',
    'output.wav'
]);
```

**Common Commands**:

#### Audio Extraction
```javascript
await ffmpeg.exec([
    '-i', 'input.mp4',
    '-vn', // No video
    '-ar', '16000', // Sample rate
    '-ac', '1', // Mono
    'output.wav'
]);
```

#### Subtitle Burning
```javascript
await ffmpeg.exec([
    '-i', 'input.mp4',
    '-vf', 'subtitles=subtitles.srt',
    '-c:a', 'copy',
    'output.mp4'
]);
```

---

## Configuration

### Environment Variables

Create a `.env` file for API keys:

```env
GOOGLE_TRANSLATE_API_KEY=your_google_translate_key
```

### Application Settings

Configure in `js/app.js`:

```javascript
const settings = {
    // Speech Recognition
    speechRecognition: {
        language: 'en-US',
        continuous: true,
        interimResults: true
    },
    
    // Translation
    translation: {
        apiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
        defaultTargetLanguage: 'en',
        cacheEnabled: true
    },
    
    // Video Processing
    videoProcessing: {
        audioFormat: 'wav',
        audioSampleRate: 16000,
        maxFileSize: 100 * 1024 * 1024 // 100MB
    },
    
    // Export
    export: {
        defaultFormat: 'srt',
        quality: 'medium'
    }
};
```

---

## Error Handling

### Common Error Types

#### Speech Recognition Errors
```javascript
speechHandler.onError = (error) => {
    switch(error) {
        case 'no-speech':
            console.log('No speech detected');
            break;
        case 'audio-capture':
            console.log('Microphone access denied');
            break;
        case 'network':
            console.log('Network error');
            break;
    }
};
```

#### Translation Errors
```javascript
try {
    const result = await translator.translateText(text, 'es');
} catch (error) {
    if (error.message.includes('API key')) {
        console.log('Invalid API key');
    } else if (error.message.includes('quota')) {
        console.log('API quota exceeded');
    }
}
```

#### Video Processing Errors
```javascript
processor.onError = (error) => {
    if (error.message.includes('FFmpeg')) {
        console.log('Video processing unavailable');
    } else if (error.message.includes('format')) {
        console.log('Unsupported video format');
    }
};
```

---

## Rate Limiting

### Best Practices

1. **Implement request queuing**:
```javascript
class RequestQueue {
    constructor(maxConcurrent = 3) {
        this.queue = [];
        this.running = 0;
        this.maxConcurrent = maxConcurrent;
    }
    
    async add(requestFn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ requestFn, resolve, reject });
            this.process();
        });
    }
    
    async process() {
        if (this.running >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }
        
        this.running++;
        const { requestFn, resolve, reject } = this.queue.shift();
        
        try {
            const result = await requestFn();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.running--;
            this.process();
        }
    }
}
```

2. **Add delays between requests**:
```javascript
async function delayedRequest(fn, delay = 1000) {
    await new Promise(resolve => setTimeout(resolve, delay));
    return await fn();
}
```

3. **Implement exponential backoff**:
```javascript
async function withRetry(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            
            const delay = Math.pow(2, i) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

---

## Examples

### Complete Workflow Example

```javascript
// Initialize components
const speechHandler = new SpeechRecognitionHandler();
const processor = new VideoProcessor();
const translator = new TranslationService();
const editor = new SubtitleEditor();
const exporter = new ExportHandler();

// Configure translation
translator.setApiKey('your-api-key');

// Process video file
async function processVideo(videoFile) {
    try {
        // 1. Extract subtitles from video
        const subtitles = await processor.extractSubtitles(videoFile);
        
        // 2. Translate to Spanish
        const translatedSubtitles = await translator.translateSubtitles(
            subtitles, 
            'es'
        );
        
        // 3. Load into editor
        editor.loadSubtitles(translatedSubtitles);
        
        // 4. Export as SRT
        await exporter.exportSubtitles(translatedSubtitles, 'srt');
        
        console.log('Video processing complete!');
        
    } catch (error) {
        console.error('Processing failed:', error);
    }
}
```

### Real-time Speech Recognition Example

```javascript
// Set up real-time transcription
speechHandler.onResult = (result) => {
    if (result.final) {
        // Add to subtitle list
        const subtitle = {
            id: Date.now(),
            start: getCurrentTime(),
            end: getCurrentTime() + 3,
            text: result.final,
            confidence: result.confidence
        };
        
        editor.addSubtitle(subtitle);
    } else {
        // Show interim results
        updateLiveDisplay(result.interim);
    }
};

// Start recording
await speechHandler.start('en-US');
```

### Batch Translation Example

```javascript
// Translate subtitles to multiple languages
async function translateToMultipleLanguages(subtitles, languages) {
    const results = {};
    
    for (const lang of languages) {
        try {
            results[lang] = await translator.translateSubtitles(
                subtitles, 
                lang
            );
            
            // Export each translation
            await exporter.exportSubtitles(
                results[lang], 
                'srt', 
                `subtitles_${lang}.srt`
            );
            
        } catch (error) {
            console.error(`Translation to ${lang} failed:`, error);
        }
    }
    
    return results;
}

// Usage
const languages = ['es', 'fr', 'de', 'it'];
const translations = await translateToMultipleLanguages(
    originalSubtitles, 
    languages
);
```

---

This API documentation provides a comprehensive reference for integrating with and extending the Video Caption Generator application. For additional examples and advanced usage, refer to the source code and inline comments.