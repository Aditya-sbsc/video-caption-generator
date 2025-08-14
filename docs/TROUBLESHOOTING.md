# Troubleshooting Guide

## Video Caption Generator - Common Issues and Solutions

This guide helps you resolve common problems you might encounter while using the Video Caption Generator application.

### Table of Contents

1. [Quick Diagnostic Checklist](#quick-diagnostic-checklist)
2. [Browser Compatibility Issues](#browser-compatibility-issues)
3. [Speech Recognition Problems](#speech-recognition-problems)
4. [Video Processing Issues](#video-processing-issues)
5. [Translation Service Problems](#translation-service-problems)
6. [Export and Download Issues](#export-and-download-issues)
7. [Performance and Memory Issues](#performance-and-memory-issues)
8. [Mobile and Responsive Issues](#mobile-and-responsive-issues)
9. [API Configuration Problems](#api-configuration-problems)
10. [Frequently Asked Questions](#frequently-asked-questions)

---

## Quick Diagnostic Checklist

Before diving into specific issues, run through this quick checklist:

### ✅ Browser Requirements
- [ ] Using Chrome 80+, Firefox 75+, Safari 14+, or Edge 80+
- [ ] JavaScript is enabled
- [ ] Microphone permissions granted (for speech recognition)
- [ ] Camera permissions granted (if needed)
- [ ] Cookies and local storage enabled

### ✅ Network Requirements
- [ ] Stable internet connection
- [ ] Not behind restrictive firewall
- [ ] Can access external APIs (translation services)
- [ ] CDN resources loading (FFmpeg, etc.)

### ✅ File Requirements
- [ ] Video file under 100MB
- [ ] Supported format (MP4, WebM, MOV, AVI)
- [ ] Video has clear audio track
- [ ] Audio quality is good (minimal background noise)

---

## Browser Compatibility Issues

### Problem: Application Won't Load

**Symptoms:**
- Blank page or loading screen stuck
- Console errors about missing features
- Features not working

**Solutions:**

1. **Update Your Browser**
   ```
   Chrome: Settings → About Chrome → Update
   Firefox: Help → About Firefox → Update
   Safari: App Store → Updates
   Edge: Settings → About Microsoft Edge → Update
   ```

2. **Check Browser Support**
   - **Recommended**: Chrome 80+ or Edge 80+
   - **Limited Support**: Firefox 75+, Safari 14+
   - **Not Supported**: Internet Explorer, very old browsers

3. **Enable Required Features**
   - **JavaScript**: Must be enabled
   - **WebAssembly**: Required for video processing
   - **Web Workers**: Required for background processing

4. **Clear Browser Data**
   ```
   Chrome: Ctrl+Shift+Delete → Clear browsing data
   Firefox: Ctrl+Shift+Delete → Clear recent history
   Safari: Develop → Empty Caches
   ```

### Problem: Features Missing or Disabled

**Symptoms:**
- Upload button not working
- Recording button grayed out
- Export options unavailable

**Solution: Check Feature Support**

Open browser console (F12) and run:
```javascript
// Check feature support
console.log('Speech Recognition:', !!(window.SpeechRecognition || window.webkitSpeechRecognition));
console.log('File API:', !!(window.File && window.FileReader));
console.log('Web Audio:', !!(window.AudioContext || window.webkitAudioContext));
console.log('WebAssembly:', typeof WebAssembly === 'object');
```

---

## Speech Recognition Problems

### Problem: "Microphone Access Denied"

**Symptoms:**
- Recording button shows error
- Permission popup doesn't appear
- "Not allowed" error message

**Solutions:**

1. **Grant Microphone Permission**
   - **Chrome**: Click the microphone icon in address bar → Allow
   - **Firefox**: Click the microphone icon → Allow
   - **Safari**: Safari → Preferences → Websites → Microphone → Allow

2. **Check System Permissions**
   - **Windows**: Settings → Privacy → Microphone → Allow apps to access
   - **macOS**: System Preferences → Security & Privacy → Microphone
   - **Linux**: Check audio device permissions

3. **Reset Browser Permissions**
   ```
   Chrome: Settings → Advanced → Content settings → Microphone → Reset
   Firefox: Preferences → Privacy & Security → Permissions → Microphone → Settings
   ```

### Problem: "No Speech Detected"

**Symptoms:**
- Recording starts but no text appears
- Confidence levels always 0%
- Silent waveform

**Solutions:**

1. **Check Audio Input**
   - Verify microphone is connected and working
   - Test in other applications (Zoom, Discord, etc.)
   - Check audio levels in system settings

2. **Improve Audio Quality**
   - Move closer to microphone
   - Reduce background noise
   - Speak clearly and at moderate pace
   - Use headset or external microphone for better quality

3. **Adjust Recognition Settings**
   ```javascript
   // Try different language settings
   recognition.lang = 'en-US'; // For American English
   recognition.lang = 'en-GB'; // For British English
   ```

### Problem: Poor Recognition Accuracy

**Symptoms:**
- Text is frequently wrong
- Missing words or phrases
- Confidence scores below 50%

**Solutions:**

1. **Optimize Audio Environment**
   - Record in quiet room
   - Use noise-canceling microphone
   - Avoid echoing spaces
   - Close windows to reduce outside noise

2. **Improve Speaking Technique**
   - Speak at moderate pace (not too fast)
   - Enunciate clearly
   - Pause briefly between sentences
   - Avoid filler words (um, ah, etc.)

3. **Select Correct Language**
   - Match language setting to spoken language
   - Use regional variants when available
   - For accented English, try different English variants

---

## Video Processing Issues

### Problem: "Video Upload Failed"

**Symptoms:**
- Upload progress bar stuck
- Error message after selecting file
- Drag and drop not working

**Solutions:**

1. **Check File Requirements**
   - **Maximum size**: 100MB
   - **Supported formats**: MP4, WebM, MOV, AVI
   - **Audio track**: Must have audio for subtitle generation

2. **Verify File Integrity**
   - Try playing video in media player
   - Check if file is corrupted
   - Re-encode if necessary

3. **Browser-Specific Issues**
   ```javascript
   // Check file type support
   const video = document.createElement('video');
   console.log('MP4 support:', video.canPlayType('video/mp4'));
   console.log('WebM support:', video.canPlayType('video/webm'));
   ```

### Problem: "FFmpeg Not Loading"

**Symptoms:**
- Video processing fails immediately
- Console errors about FFmpeg
- Advanced features unavailable

**Solutions:**

1. **Check Internet Connection**
   - FFmpeg loads from CDN
   - Verify external resources can load
   - Try refreshing the page

2. **Firewall/Proxy Issues**
   - Allow access to unpkg.com
   - Whitelist WebAssembly downloads
   - Contact IT if on corporate network

3. **Browser Limitations**
   - Some corporate browsers block WebAssembly
   - Try using personal device/browser
   - Use alternative processing method

### Problem: "Audio Extraction Failed"

**Symptoms:**
- Video uploads but processing fails
- Error during subtitle generation
- No audio waveform visible

**Solutions:**

1. **Verify Audio Track**
   ```javascript
   // Check if video has audio
   video.addEventListener('loadedmetadata', () => {
       console.log('Audio tracks:', video.audioTracks.length);
   });
   ```

2. **Try Different Format**
   - Convert to MP4 with standard audio codec
   - Use video editing software to add audio track
   - Ensure audio is not corrupted

3. **Reduce File Complexity**
   - Lower video resolution
   - Simplify audio track (stereo to mono)
   - Remove multiple audio tracks

---

## Translation Service Problems

### Problem: "Translation API Key Required"

**Symptoms:**
- Translation button disabled
- Error when attempting translation
- API configuration warnings

**Solutions:**

1. **Obtain Google Translate API Key**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing
   - Enable Cloud Translation API
   - Create credentials (API Key)

2. **Configure API Key**
   - Go to Settings in application
   - Enter API key in translation configuration
   - Save settings and refresh page

3. **Verify API Key Permissions**
   - Check API key restrictions
   - Ensure Translation API is enabled
   - Verify billing account is active

### Problem: "Translation Quota Exceeded"

**Symptoms:**
- Translation works initially then stops
- Error messages about limits
- Only some text gets translated

**Solutions:**

1. **Check Usage Quotas**
   - Visit Google Cloud Console
   - Check API usage and quotas
   - Monitor billing alerts

2. **Implement Usage Controls**
   - Translate only essential text
   - Use caching to avoid repeat translations
   - Consider alternative translation services

3. **Upgrade Plan**
   - Review Google Cloud pricing
   - Upgrade to higher quota plan
   - Set up billing alerts

### Problem: "Translation Quality Poor"

**Symptoms:**
- Translated text doesn't make sense
- Wrong language detected
- Technical terms translated incorrectly

**Solutions:**

1. **Improve Source Text**
   - Edit subtitles before translation
   - Fix speech recognition errors
   - Use proper punctuation

2. **Language Detection**
   - Manually specify source language
   - Verify language auto-detection
   - Use language-specific models

3. **Post-Processing**
   - Review and edit translations
   - Use domain-specific terminology
   - Consider professional review for critical content

---

## Export and Download Issues

### Problem: "Export Failed"

**Symptoms:**
- Export progress stuck
- Download doesn't start
- Corrupted output files

**Solutions:**

1. **Check Browser Download Settings**
   - Verify downloads are allowed
   - Check download location has space
   - Disable download blocking extensions

2. **Try Different Format**
   - Start with simple SRT format
   - Avoid complex formatting initially
   - Test with smaller subtitle sets

3. **Clear Browser Storage**
   ```javascript
   // Clear application storage
   localStorage.clear();
   sessionStorage.clear();
   ```

### Problem: "Video Export Takes Too Long"

**Symptoms:**
- Export progress very slow
- Browser becomes unresponsive
- Process appears frozen

**Solutions:**

1. **Reduce Video Complexity**
   - Lower output resolution
   - Reduce subtitle complexity
   - Process shorter video segments

2. **Optimize Browser Performance**
   - Close other tabs and applications
   - Clear browser cache
   - Restart browser

3. **Use Alternative Method**
   - Export subtitles separately
   - Use external video editing software
   - Process on more powerful device

### Problem: "Downloaded Files Corrupted"

**Symptoms:**
- Subtitle files won't open
- Video files unplayable
- Missing or garbled content

**Solutions:**

1. **Verify File Integrity**
   ```javascript
   // Check file size and type
   console.log('File size:', blob.size);
   console.log('File type:', blob.type);
   ```

2. **Try Different Browser**
   - Test export in Chrome/Edge
   - Compare file outputs
   - Use alternative download method

3. **Check File Associations**
   - Verify correct application opens files
   - Test with different media players
   - Check encoding settings

---

## Performance and Memory Issues

### Problem: "Application Running Slowly"

**Symptoms:**
- UI responses delayed
- Video playback stuttering
- High CPU/memory usage

**Solutions:**

1. **Close Unnecessary Tabs**
   - Limit to 1-2 browser tabs
   - Close memory-intensive applications
   - Restart browser periodically

2. **Reduce Processing Load**
   - Process shorter video segments
   - Lower video quality settings
   - Disable real-time features if not needed

3. **Hardware Considerations**
   - Minimum 4GB RAM recommended
   - Modern processor preferred
   - Consider using desktop instead of mobile

### Problem: "Browser Crashes or Freezes"

**Symptoms:**
- Browser stops responding
- Tab crashes repeatedly
- System becomes sluggish

**Solutions:**

1. **Increase Available Memory**
   ```javascript
   // Monitor memory usage
   console.log('Memory:', performance.memory);
   ```

2. **Process Smaller Files**
   - Split large videos into segments
   - Process one section at a time
   - Save progress frequently

3. **Browser Optimization**
   - Update to latest browser version
   - Disable unnecessary extensions
   - Clear cache and restart

---

## Mobile and Responsive Issues

### Problem: "Interface Not Mobile-Friendly"

**Symptoms:**
- Buttons too small to tap
- Text overlapping
- Scroll issues

**Solutions:**

1. **Check Viewport Settings**
   - Ensure responsive meta tag present
   - Verify CSS media queries working
   - Test on different screen sizes

2. **Use Supported Browsers**
   - **iOS**: Safari 14+ or Chrome 80+
   - **Android**: Chrome 80+ or Firefox 75+
   - Avoid mobile IE or older browsers

3. **Optimize for Touch**
   - Use larger touch targets
   - Enable zoom if needed
   - Simplify complex interactions

### Problem: "Features Not Working on Mobile"

**Symptoms:**
- Speech recognition unavailable
- Video upload not working
- Export downloads failing

**Solutions:**

1. **Check Mobile Limitations**
   - Speech recognition limited on iOS Safari
   - File API restrictions on some devices
   - WebAssembly support varies

2. **Alternative Workflows**
   - Use device's built-in recording
   - Transfer files to desktop for processing
   - Use cloud-based solutions

3. **Progressive Enhancement**
   - Enable basic features first
   - Add advanced features progressively
   - Provide fallbacks for unsupported features

---

## API Configuration Problems

### Problem: "External Resources Not Loading"

**Symptoms:**
- FFmpeg unavailable
- Translation services timeout
- Missing dependencies

**Solutions:**

1. **Check Network Access**
   - Test loading external URLs directly
   - Verify no firewall blocking
   - Check for proxy issues

2. **Use Alternative CDNs**
   ```javascript
   // Try different CDN sources
   const cdnOptions = [
       'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js',
       'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js'
   ];
   ```

3. **Local Development**
   - Download dependencies locally
   - Use local development server
   - Configure CORS properly

### Problem: "API Rate Limits Exceeded"

**Symptoms:**
- Intermittent service failures
- "Too many requests" errors
- Delays in processing

**Solutions:**

1. **Implement Rate Limiting**
   ```javascript
   // Add request delays
   const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
   await delay(1000); // Wait 1 second between requests
   ```

2. **Optimize API Usage**
   - Cache translation results
   - Batch multiple requests
   - Use local processing when possible

3. **Monitor Usage**
   - Track API call frequency
   - Set up usage alerts
   - Plan capacity accordingly

---

## Frequently Asked Questions

### Q: Why isn't speech recognition working in my browser?

**A:** Speech recognition requires:
- Modern browser (Chrome/Edge recommended)
- Microphone permissions granted
- HTTPS connection (required by browsers)
- Stable internet connection

### Q: Can I use this application offline?

**A:** Partially. Basic features work offline, but:
- Speech recognition requires internet
- Translation needs API access
- Advanced video processing may need external libraries

### Q: What video formats are supported?

**A:** Supported formats:
- **Best**: MP4 with H.264 video and AAC audio
- **Good**: WebM, MOV with standard codecs
- **Limited**: AVI, older formats may need conversion

### Q: How accurate is the speech recognition?

**A:** Accuracy depends on:
- Audio quality (80-95% with clear audio)
- Language and accent (English typically most accurate)
- Speaking pace and clarity
- Background noise levels

### Q: Can I edit subtitles after generation?

**A:** Yes! The application provides:
- Text editing for all subtitles
- Timeline adjustment with drag-and-drop
- Timing controls for precise synchronization
- Real-time preview

### Q: How do I get better translations?

**A:** For better translations:
- Edit speech recognition errors first
- Use proper punctuation and grammar
- Specify source language manually
- Review and edit machine translations

### Q: What's the maximum video file size?

**A:** Current limits:
- **File size**: 100MB (browser limitation)
- **Duration**: No strict limit, but longer videos use more memory
- **Resolution**: Any resolution supported by browser

### Q: Can I use this for commercial purposes?

**A:** The application itself is open source, but:
- Check Google Translate API terms for commercial use
- Consider data privacy requirements
- Verify licensing for any external dependencies

### Q: How do I report bugs or request features?

**A:** You can:
- Check this troubleshooting guide first
- Look at the source code for technical issues
- Contact through appropriate channels if available
- Contribute improvements if familiar with web development

---

## Getting Additional Help

### Self-Service Resources

1. **Browser Console** (F12)
   - Check for error messages
   - Monitor network requests
   - Test feature availability

2. **Application Logs**
   - Enable verbose logging in settings
   - Check service worker console
   - Monitor performance metrics

3. **Test Environment**
   - Try in incognito/private mode
   - Test with different browser
   - Use minimal test files

### Technical Information

When seeking help, provide:

1. **Browser Information**
   - Browser name and version
   - Operating system
   - Device type (desktop/mobile/tablet)

2. **Error Details**
   - Exact error messages
   - Console output (if available)
   - Steps to reproduce

3. **File Information**
   - Video format and size
   - Audio characteristics
   - Processing settings used

4. **Expected vs Actual Behavior**
   - What you expected to happen
   - What actually happened
   - Screenshots if helpful

Remember: Most issues can be resolved by updating your browser, checking permissions, and ensuring a stable internet connection. The application is designed to work reliably with modern browsers and standard configurations.