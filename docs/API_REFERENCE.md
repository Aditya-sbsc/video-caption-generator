# Video Caption Generator - API Reference

## Overview

This document provides comprehensive technical documentation for the Video Caption Generator application. It covers the JavaScript APIs, class structures, methods, events, and integration patterns for developers who want to understand, extend, or integrate with this application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Classes](#core-classes)
3. [Utility Functions](#utility-functions)
4. [Event System](#event-system)
5. [Data Structures](#data-structures)
6. [Configuration Options](#configuration-options)
7. [Error Handling](#error-handling)
8. [Performance Considerations](#performance-considerations)
9. [Browser Compatibility](#browser-compatibility)
10. [Extension Guidelines](#extension-guidelines)

## Architecture Overview

### Application Structure

The Video Caption Generator follows a modular architecture with clear separation of concerns:

```
VideoCaptionGenerator (Main App)
├── SpeechRecognitionManager
├── VideoProcessorManager  
├── CaptionEditorManager
├── ExportManager
└── Utils (Static Helper Class)
```

### Design Patterns

- **Module Pattern**: Each major feature is encapsulated in its own class
- **Observer Pattern**: Event-driven communication between components
- **Strategy Pattern**: Multiple export formats with pluggable implementations
- **Factory Pattern**: Dynamic creation of caption objects with unique IDs

### Data Flow

```
User Input → Event Handlers → Manager Classes → Data Processing → UI Updates
                                      ↓
                              State Management ← → Local Storage
```

## Core Classes

### VideoCaptionGenerator

The main application class that orchestrates all functionality.

#### Constructor

```javascript
class VideoCaptionGenerator {
    constructor()
}
```

**Description**: Initializes the application, sets up event listeners, and loads saved state.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `currentTab` | string | Currently active tab ('live-captions', 'video-upload', etc.) |
| `theme` | string | Current theme ('light' or 'dark') |
| `captions` | Array<Caption> | Array of caption objects |
| `selectedCaption` | Caption\|null | Currently selected caption in editor |
| `isRecording` | boolean | Whether speech recognition is active |
| `videoFile` | File\|null | Currently loaded video file |
| `undoStack` | Array | History of caption states for undo functionality |
| `redoStack` | Array | Forward history for redo functionality |

#### Methods

##### `init()`

```javascript
async init(): Promise<void>
```

**Description**: Initializes all application components and shows the interface.

**Returns**: Promise that resolves when initialization is complete.

**Example**:
```javascript
const app = new VideoCaptionGenerator();
await app.init();
```

##### `switchTab(tabName)`

```javascript
switchTab(tabName: string): void
```

**Description**: Switches to the specified tab and updates navigation state.

**Parameters**:
- `tabName` (string): The tab to switch to

**Example**:
```javascript
app.switchTab('caption-editor');
```

##### `showToast(message, type, duration)`

```javascript
showToast(message: string, type: string = 'info', duration: number = 5000): void
```

**Description**: Displays a notification toast to the user.

**Parameters**:
- `message` (string): The message to display
- `type` (string): Toast type ('success', 'error', 'warning', 'info')
- `duration` (number): Display duration in milliseconds

**Example**:
```javascript
app.showToast('Caption saved successfully', 'success');
```

##### `saveState()`

```javascript
saveState(): void
```

**Description**: Saves current application state to localStorage.

##### `loadState()`

```javascript
loadState(): void
```

**Description**: Loads previously saved state from localStorage.

### SpeechRecognitionManager

Handles real-time speech-to-text conversion with audio visualization.

#### Constructor

```javascript
class SpeechRecognitionManager {
    constructor(app: VideoCaptionGenerator)
}
```

**Parameters**:
- `app` (VideoCaptionGenerator): Reference to main application instance

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `recognition` | SpeechRecognition | Web Speech API recognition instance |
| `isRecording` | boolean | Current recording state |
| `isPaused` | boolean | Whether recording is paused |
| `currentLanguage` | string | Current recognition language code |
| `audioContext` | AudioContext | Web Audio API context for visualization |
| `captionSegments` | Array<Caption> | Generated caption segments |

#### Methods

##### `startRecording()`

```javascript
async startRecording(): Promise<void>
```

**Description**: Starts audio recording and speech recognition.

**Throws**: Error if microphone access is denied or not available.

**Example**:
```javascript
try {
    await speechManager.startRecording();
} catch (error) {
    console.error('Failed to start recording:', error);
}
```

##### `stopRecording()`

```javascript
stopRecording(): void
```

**Description**: Stops recording and cleans up resources.

##### `pauseRecording()`

```javascript
pauseRecording(): void
```

**Description**: Pauses or resumes the current recording session.

##### `updateRecognitionLanguage()`

```javascript
updateRecognitionLanguage(): void
```

**Description**: Updates the speech recognition language based on UI selection.

##### `getCaptionSegments()`

```javascript
getCaptionSegments(): Array<Caption>
```

**Description**: Returns all generated caption segments.

**Returns**: Array of caption objects.

#### Events

The SpeechRecognitionManager fires the following custom events:

- `recognitionstart`: When speech recognition begins
- `recognitionend`: When speech recognition stops
- `captionadded`: When a new caption segment is created
- `audiolevelsupdate`: When audio level changes (for visualization)

### VideoProcessorManager

Handles video file upload, validation, and processing for caption extraction.

#### Constructor

```javascript
class VideoProcessorManager {
    constructor(app: VideoCaptionGenerator)
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `currentVideo` | File\|null | Currently loaded video file |
| `videoElement` | HTMLVideoElement | Video preview element |
| `isProcessing` | boolean | Whether video is being processed |
| `processingProgress` | number | Processing progress (0-100) |

#### Methods

##### `handleVideoFile(file)`

```javascript
async handleVideoFile(file: File): Promise<void>
```

**Description**: Processes an uploaded video file and extracts metadata.

**Parameters**:
- `file` (File): The video file to process

**Throws**: Error if file is invalid or processing fails.

##### `processVideo()`

```javascript
async processVideo(): Promise<void>
```

**Description**: Extracts audio from video and generates captions.

**Returns**: Promise that resolves when processing is complete.

##### `validateVideoFile(file)`

```javascript
validateVideoFile(file: File): boolean
```

**Description**: Validates video file type and size.

**Parameters**:
- `file` (File): File to validate

**Returns**: true if file is valid, false otherwise.

##### `getCurrentVideoInfo()`

```javascript
getCurrentVideoInfo(): VideoInfo | null
```

**Description**: Returns information about the currently loaded video.

**Returns**: VideoInfo object or null if no video loaded.

### CaptionEditorManager

Provides timeline-based caption editing with drag-and-drop functionality.

#### Constructor

```javascript
class CaptionEditorManager {
    constructor(app: VideoCaptionGenerator)
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `timeline` | HTMLElement | Timeline container element |
| `selectedCaption` | Caption\|null | Currently selected caption |
| `isPlaying` | boolean | Timeline playback state |
| `currentTime` | number | Current playhead position in seconds |
| `totalDuration` | number | Total timeline duration in seconds |
| `timelineScale` | number | Pixels per second scaling factor |

#### Methods

##### `refreshTimeline()`

```javascript
refreshTimeline(): void
```

**Description**: Redraws the timeline with current captions.

##### `selectCaption(caption, element)`

```javascript
selectCaption(caption: Caption, element: HTMLElement): void
```

**Description**: Selects a caption for editing.

**Parameters**:
- `caption` (Caption): Caption object to select
- `element` (HTMLElement): DOM element representing the caption

##### `splitCaption()`

```javascript
splitCaption(): void
```

**Description**: Splits the selected caption at the current timeline position.

##### `mergeCaptions()`

```javascript
mergeCaptions(): void
```

**Description**: Merges multiple selected captions into one.

##### `deleteCaption()`

```javascript
deleteCaption(): void
```

**Description**: Deletes the currently selected caption.

##### `addCaption()`

```javascript
addCaption(): void
```

**Description**: Adds a new caption at the current timeline position.

##### `undo()`

```javascript
undo(): void
```

**Description**: Undoes the last editing action.

##### `redo()`

```javascript
redo(): void
```

**Description**: Redoes the last undone action.

##### `setCurrentTime(time)`

```javascript
setCurrentTime(time: number): void
```

**Description**: Sets the current playhead position.

**Parameters**:
- `time` (number): Time in seconds

### ExportManager

Handles caption export in multiple formats and import functionality.

#### Constructor

```javascript
class ExportManager {
    constructor(app: VideoCaptionGenerator)
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `currentFormat` | string | Currently selected export format |
| `exportSettings` | ExportSettings | Export configuration options |

#### Methods

##### `exportCaptions(format)`

```javascript
exportCaptions(format: string): void
```

**Description**: Exports captions in the specified format.

**Parameters**:
- `format` (string): Export format ('srt', 'vtt', 'ass', 'json')

##### `batchExport()`

```javascript
async batchExport(): Promise<void>
```

**Description**: Exports captions in all supported formats as a ZIP file.

##### `updateExportPreview(format)`

```javascript
updateExportPreview(format: string): void
```

**Description**: Updates the export preview for the specified format.

**Parameters**:
- `format` (string): Format to preview

##### `copyPreviewToClipboard()`

```javascript
async copyPreviewToClipboard(): Promise<void>
```

**Description**: Copies the current export preview to the clipboard.

##### `importCaptions(file)`

```javascript
async importCaptions(file: File): Promise<void>
```

**Description**: Imports captions from a file.

**Parameters**:
- `file` (File): Caption file to import (SRT, VTT, or JSON)

## Utility Functions

### Utils Class

Static utility class providing common functionality across the application.

#### Time Formatting

##### `Utils.formatTime(seconds, format)`

```javascript
static formatTime(seconds: number, format: string = 'srt'): string
```

**Description**: Formats time in seconds to various string formats.

**Parameters**:
- `seconds` (number): Time in seconds
- `format` (string): Output format ('srt', 'vtt', 'ass', 'display')

**Returns**: Formatted time string.

**Example**:
```javascript
Utils.formatTime(90.5, 'srt'); // "00:01:30,500"
Utils.formatTime(90.5, 'display'); // "01:30"
```

##### `Utils.parseTime(timeString)`

```javascript
static parseTime(timeString: string): number
```

**Description**: Parses time string to seconds.

**Parameters**:
- `timeString` (string): Time in various formats

**Returns**: Time in seconds.

**Example**:
```javascript
Utils.parseTime("00:01:30,500"); // 90.5
Utils.parseTime("01:30"); // 90
```

#### File Operations

##### `Utils.downloadFile(content, filename, mimeType)`

```javascript
static downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void
```

**Description**: Triggers download of content as a file.

**Parameters**:
- `content` (string): File content
- `filename` (string): Name for downloaded file
- `mimeType` (string): MIME type of content

##### `Utils.formatFileSize(bytes)`

```javascript
static formatFileSize(bytes: number): string
```

**Description**: Formats byte count as human-readable size.

**Parameters**:
- `bytes` (number): Size in bytes

**Returns**: Formatted size string.

**Example**:
```javascript
Utils.formatFileSize(1024); // "1 KB"
Utils.formatFileSize(1536000); // "1.46 MB"
```

#### Validation

##### `Utils.isValidVideoFile(file)`

```javascript
static isValidVideoFile(file: File): boolean
```

**Description**: Validates if file is a supported video format.

##### `Utils.validateCaption(caption)`

```javascript
static validateCaption(caption: Caption): ValidationResult
```

**Description**: Validates caption object structure and content.

**Returns**: Object with `isValid` boolean and `errors` array.

#### Browser Support

##### `Utils.browserSupports(feature)`

```javascript
static browserSupports(feature: string): boolean
```

**Description**: Checks if browser supports a specific feature.

**Parameters**:
- `feature` (string): Feature to check ('speechRecognition', 'mediaRecorder', etc.)

**Returns**: true if feature is supported.

#### Text Processing

##### `Utils.cleanText(text)`

```javascript
static cleanText(text: string): string
```

**Description**: Cleans and normalizes text content.

##### `Utils.wordCount(text)`

```javascript
static wordCount(text: string): number
```

**Description**: Counts words in text.

##### `Utils.sanitizeText(text)`

```javascript
static sanitizeText(text: string): string
```

**Description**: Sanitizes text for safe HTML display.

## Event System

### Global Events

The application uses a custom event system for component communication:

#### Event Types

| Event | Description | Data |
|-------|-------------|------|
| `captionAdded` | New caption created | `{caption: Caption}` |
| `captionUpdated` | Caption modified | `{caption: Caption, changes: Object}` |
| `captionDeleted` | Caption removed | `{captionId: string}` |
| `captionSelected` | Caption selected in editor | `{caption: Caption}` |
| `timelineUpdated` | Timeline position changed | `{currentTime: number}` |
| `recordingStateChanged` | Recording state changed | `{isRecording: boolean, isPaused: boolean}` |
| `exportCompleted` | Export operation finished | `{format: string, filename: string}` |
| `themeChanged` | Theme switched | `{theme: string}` |

#### Event Listening

```javascript
// Listen for caption events
document.addEventListener('captionAdded', (event) => {
    console.log('New caption:', event.detail.caption);
});

// Listen for theme changes
document.addEventListener('themeChanged', (event) => {
    console.log('Theme changed to:', event.detail.theme);
});
```

#### Event Dispatching

```javascript
// Dispatch custom event
const event = new CustomEvent('captionAdded', {
    detail: { caption: newCaption }
});
document.dispatchEvent(event);
```

### DOM Events

#### Button Events

```javascript
// Recording controls
document.getElementById('start-recording').addEventListener('click', () => {
    app.startRecording();
});

// Timeline controls
document.getElementById('play-pause').addEventListener('click', () => {
    app.togglePlayback();
});
```

#### Form Events

```javascript
// Caption text editing
document.getElementById('caption-text').addEventListener('input', (e) => {
    app.updateSelectedCaptionText();
});

// Styling controls
document.getElementById('font-size').addEventListener('input', (e) => {
    app.updateStylingPreview();
});
```

## Data Structures

### Caption Object

```typescript
interface Caption {
    id: string;           // Unique identifier
    text: string;         // Caption text content
    startTime: number;    // Start time in seconds
    endTime: number;      // End time in seconds
    language?: string;    // Language code (e.g., 'en-US')
    confidence?: number;  // Recognition confidence (0-1)
    speaker?: string;     // Speaker identification
    styling?: CaptionStyling; // Visual styling options
}
```

### CaptionStyling Object

```typescript
interface CaptionStyling {
    fontFamily: string;      // Font family name
    fontSize: number;        // Font size in pixels
    fontWeight: string;      // Font weight ('normal', 'bold', etc.)
    textColor: string;       // Text color (hex format)
    backgroundColor: string; // Background color (hex format)
    backgroundOpacity: number; // Background opacity (0-100)
    position: string;        // Position ('top', 'middle', 'bottom')
    textOutline: boolean;    // Whether to show text outline
    textShadow: boolean;     // Whether to show text shadow
    textBackground: boolean; // Whether to show background
}
```

### VideoInfo Object

```typescript
interface VideoInfo {
    file: File;          // Original file object
    filename: string;    // File name
    size: number;        // File size in bytes
    type: string;        // MIME type
    duration: number;    // Duration in seconds
    width: number;       // Video width in pixels
    height: number;      // Video height in pixels
}
```

### ExportSettings Object

```typescript
interface ExportSettings {
    includeTimestamps: boolean;  // Include precise timestamps
    includeStyling: boolean;     // Include styling information
    filename: string;            // Base filename for exports
}
```

### ValidationResult Object

```typescript
interface ValidationResult {
    isValid: boolean;    // Whether validation passed
    errors: string[];    // Array of error messages
}
```

## Configuration Options

### Application Configuration

```javascript
const config = {
    // Speech recognition settings
    speechRecognition: {
        continuous: true,
        interimResults: true,
        maxAlternatives: 1,
        lang: 'en-US'
    },
    
    // Video processing settings
    videoProcessing: {
        maxFileSize: 500 * 1024 * 1024, // 500MB
        supportedFormats: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
        audioSampleRate: 44100,
        energyThreshold: 0.01
    },
    
    // Timeline settings
    timeline: {
        minScale: 50,        // Minimum pixels per second
        maxScale: 1000,      // Maximum pixels per second
        snapThreshold: 0.1,  // Snap threshold in seconds
        minDuration: 0.1     // Minimum caption duration
    },
    
    // Export settings
    export: {
        defaultFormat: 'srt',
        batchFormats: ['srt', 'vtt', 'ass', 'json'],
        maxPreviewLength: 2000
    },
    
    // UI settings
    ui: {
        toastDuration: 5000,
        animationDuration: 300,
        autoSaveInterval: 30000
    }
};
```

### Theme Configuration

```javascript
const themes = {
    light: {
        primary: '#2563eb',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#0f172a',
        textSecondary: '#475569'
    },
    dark: {
        primary: '#3b82f6',
        background: '#1e293b',
        surface: '#0f172a',
        text: '#f8fafc',
        textSecondary: '#cbd5e1'
    }
};
```

## Error Handling

### Error Types

#### ApplicationError

```javascript
class ApplicationError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'ApplicationError';
        this.code = code;
        this.details = details;
    }
}
```

#### Common Error Codes

| Code | Description | Handling |
|------|-------------|----------|
| `MICROPHONE_ACCESS_DENIED` | User denied microphone permission | Show permission request dialog |
| `UNSUPPORTED_BROWSER` | Browser lacks required features | Display compatibility message |
| `INVALID_VIDEO_FORMAT` | Unsupported video file format | Show format requirements |
| `FILE_TOO_LARGE` | Video file exceeds size limit | Display size limit message |
| `PROCESSING_FAILED` | Video processing encountered error | Retry with error details |
| `EXPORT_FAILED` | Caption export failed | Check format and retry |
| `STORAGE_QUOTA_EXCEEDED` | Local storage quota exceeded | Prompt to clear data |

### Error Handling Patterns

#### Try-Catch with User Feedback

```javascript
async function processVideo() {
    try {
        await videoProcessor.processVideo();
        app.showToast('Video processed successfully', 'success');
    } catch (error) {
        console.error('Processing failed:', error);
        app.showToast(`Processing failed: ${error.message}`, 'error');
    }
}
```

#### Graceful Degradation

```javascript
function initializeSpeechRecognition() {
    if (Utils.browserSupports('speechRecognition')) {
        this.speechRecognition = new SpeechRecognitionManager(this);
    } else {
        // Disable speech recognition features
        this.disableSpeechFeatures();
        this.showToast('Speech recognition not available', 'warning');
    }
}
```

## Performance Considerations

### Memory Management

#### Audio Context Cleanup

```javascript
// Always close audio contexts when done
if (this.audioContext && this.audioContext.state !== 'closed') {
    await this.audioContext.close();
}
```

#### Object URL Cleanup

```javascript
// Clean up object URLs to prevent memory leaks
if (this.videoElement.src) {
    URL.revokeObjectURL(this.videoElement.src);
}
```

### Optimization Techniques

#### Debounced Updates

```javascript
// Debounce timeline updates for better performance
const updateTimeline = Utils.debounce(() => {
    this.refreshTimeline();
}, 250);
```

#### Efficient DOM Updates

```javascript
// Batch DOM updates to avoid layout thrashing
requestAnimationFrame(() => {
    element.style.left = `${left}px`;
    element.style.width = `${width}px`;
});
```

#### Canvas Optimization

```javascript
// Use efficient canvas drawing for audio visualization
const draw = () => {
    if (!this.isRecording) return;
    
    // Clear and redraw
    this.canvasContext.clearRect(0, 0, width, height);
    
    // Batch drawing operations
    this.canvasContext.beginPath();
    // ... drawing code
    this.canvasContext.stroke();
    
    requestAnimationFrame(draw);
};
```

### Resource Monitoring

```javascript
// Monitor performance
const performanceObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        if (entry.duration > 16) { // Longer than one frame
            console.warn('Slow operation detected:', entry.name, entry.duration);
        }
    }
});

performanceObserver.observe({ entryTypes: ['measure'] });
```

## Browser Compatibility

### Minimum Requirements

| Browser | Version | Notes |
|---------|---------|--------|
| Chrome | 60+ | Full feature support |
| Firefox | 55+ | Speech recognition requires flag |
| Safari | 12+ | Limited speech recognition |
| Edge | 79+ | Full feature support |

### Feature Detection

```javascript
const compatibility = {
    speechRecognition: Utils.browserSupports('speechRecognition'),
    mediaRecorder: Utils.browserSupports('mediaRecorder'),
    audioContext: Utils.browserSupports('audioContext'),
    serviceWorker: Utils.browserSupports('serviceWorker'),
    fileReader: Utils.browserSupports('fileReader')
};

// Disable features based on support
if (!compatibility.speechRecognition) {
    this.disableLiveCaptions();
}
```

### Polyfills and Fallbacks

```javascript
// Service Worker registration with fallback
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
} else {
    console.warn('Service Worker not supported');
    // Implement alternative caching strategy
}

// Web Audio API fallback
if (!window.AudioContext && !window.webkitAudioContext) {
    // Disable audio visualization
    this.disableAudioVisualization();
}
```

## Extension Guidelines

### Adding New Export Formats

```javascript
class CustomExportManager extends ExportManager {
    generateCustomFormat() {
        const sortedCaptions = [...this.app.captions].sort((a, b) => a.startTime - b.startTime);
        let content = '';
        
        // Your custom format logic here
        sortedCaptions.forEach((caption, index) => {
            content += `${index + 1}: ${caption.text}\n`;
        });
        
        return content;
    }
    
    exportCaptions(format) {
        if (format === 'custom') {
            const content = this.generateCustomFormat();
            Utils.downloadFile(content, 'captions.custom', 'text/plain');
        } else {
            super.exportCaptions(format);
        }
    }
}
```

### Custom Caption Styling

```javascript
class AdvancedStylingManager {
    constructor(app) {
        this.app = app;
        this.customStyles = new Map();
    }
    
    addCustomStyle(name, styleConfig) {
        this.customStyles.set(name, styleConfig);
    }
    
    applyCustomStyle(captionId, styleName) {
        const style = this.customStyles.get(styleName);
        if (style) {
            const caption = this.app.captions.find(c => c.id === captionId);
            if (caption) {
                caption.styling = { ...caption.styling, ...style };
                this.app.updateStylingPreview();
            }
        }
    }
}
```

### Plugin Architecture

```javascript
class PluginManager {
    constructor(app) {
        this.app = app;
        this.plugins = new Map();
    }
    
    registerPlugin(name, plugin) {
        if (this.validatePlugin(plugin)) {
            this.plugins.set(name, plugin);
            plugin.initialize(this.app);
        }
    }
    
    validatePlugin(plugin) {
        return typeof plugin.initialize === 'function' &&
               typeof plugin.getName === 'function' &&
               typeof plugin.getVersion === 'function';
    }
    
    getPlugin(name) {
        return this.plugins.get(name);
    }
}

// Example plugin
class TimestampPlugin {
    initialize(app) {
        this.app = app;
        this.addTimestampButtons();
    }
    
    getName() {
        return 'Timestamp Plugin';
    }
    
    getVersion() {
        return '1.0.0';
    }
    
    addTimestampButtons() {
        // Add UI elements for timestamp functionality
    }
}
```

### Testing Integration

```javascript
// Unit testing example
describe('CaptionEditorManager', () => {
    let editor;
    let mockApp;
    
    beforeEach(() => {
        mockApp = {
            captions: [],
            showToast: jest.fn()
        };
        editor = new CaptionEditorManager(mockApp);
    });
    
    test('should split caption correctly', () => {
        const caption = {
            id: 'test-1',
            text: 'Hello world',
            startTime: 0,
            endTime: 2
        };
        
        editor.selectedCaption = caption;
        editor.currentTime = 1;
        editor.splitCaption();
        
        expect(mockApp.captions).toHaveLength(2);
        expect(mockApp.captions[0].endTime).toBe(1);
        expect(mockApp.captions[1].startTime).toBe(1);
    });
});
```

---

This API reference provides comprehensive documentation for developers working with the Video Caption Generator. For additional examples and use cases, see the [Beginner's Guide](BEGINNER_GUIDE.md) and [Business Applications](BUSINESS_APPLICATIONS.md) documentation.