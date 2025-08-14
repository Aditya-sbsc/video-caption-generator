/**
 * Subtitle Editor
 * Handles subtitle editing, timeline management, and real-time preview
 */

class SubtitleEditor {
    constructor() {
        this.subtitles = [];
        this.selectedSubtitle = null;
        this.currentTime = 0;
        this.duration = 0;
        this.timelineWidth = 800;
        this.pixelsPerSecond = 100;
        this.isPlaying = false;
        
        // Event callbacks
        this.onChange = null;
        this.onSelect = null;
        this.onTimeUpdate = null;
        
        // Timeline elements
        this.timeline = null;
        this.timelineContainer = null;
        this.playhead = null;
        
        // Editing history for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        
        // Keyboard shortcuts
        this.shortcuts = {
            'Space': this.togglePlayPause.bind(this),
            'ArrowLeft': () => this.seekRelative(-1),
            'ArrowRight': () => this.seekRelative(1),
            'ArrowUp': () => this.selectPreviousSubtitle(),
            'ArrowDown': () => this.selectNextSubtitle(),
            'Delete': () => this.deleteSelectedSubtitle(),
            'Enter': () => this.addSubtitleAtCurrentTime(),
            'Escape': () => this.clearSelection()
        };
        
        this.initializeEditor();
    }

    /**
     * Initialize the subtitle editor
     */
    initializeEditor() {
        this.setupTimeline();
        this.bindEvents();
        this.setupKeyboardShortcuts();
        console.log('Subtitle editor initialized');
    }

    /**
     * Setup timeline elements
     */
    setupTimeline() {
        this.timeline = document.getElementById('subtitle-timeline');
        this.timelineContainer = this.timeline?.parentElement;
        
        if (this.timeline) {
            this.createPlayhead();
            this.makeTimelineInteractive();
        }
    }

    /**
     * Create playhead indicator
     */
    createPlayhead() {
        this.playhead = document.createElement('div');
        this.playhead.className = 'timeline-playhead';
        this.playhead.style.cssText = `
            position: absolute;
            top: 0;
            bottom: 0;
            width: 2px;
            background-color: var(--primary-color);
            pointer-events: none;
            z-index: 10;
            left: 0;
        `;
        this.timeline.appendChild(this.playhead);
    }

    /**
     * Make timeline interactive
     */
    makeTimelineInteractive() {
        if (!this.timeline) return;
        
        this.timeline.addEventListener('click', this.handleTimelineClick.bind(this));
        this.timeline.addEventListener('wheel', this.handleTimelineWheel.bind(this));
        
        // Add timeline ruler
        this.createTimelineRuler();
    }

    /**
     * Create timeline ruler with time markers
     */
    createTimelineRuler() {
        const ruler = document.createElement('div');
        ruler.className = 'timeline-ruler';
        ruler.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 20px;
            border-bottom: 1px solid var(--outline);
            background-color: var(--surface-variant);
            font-size: 10px;
            color: var(--on-surface-variant);
        `;
        
        this.timeline.insertBefore(ruler, this.timeline.firstChild);
        this.updateTimelineRuler();
    }

    /**
     * Update timeline ruler with time markers
     */
    updateTimelineRuler() {
        const ruler = this.timeline.querySelector('.timeline-ruler');
        if (!ruler || !this.duration) return;
        
        ruler.innerHTML = '';
        
        const interval = this.getOptimalTimeInterval();
        const rulerWidth = this.timeline.offsetWidth;
        
        for (let time = 0; time <= this.duration; time += interval) {
            const position = (time / this.duration) * rulerWidth;
            const marker = document.createElement('div');
            marker.style.cssText = `
                position: absolute;
                left: ${position}px;
                top: 2px;
                font-size: 10px;
                white-space: nowrap;
            `;
            marker.textContent = this.formatTime(time);
            ruler.appendChild(marker);
        }
    }

    /**
     * Get optimal time interval for ruler
     */
    getOptimalTimeInterval() {
        const rulerWidth = this.timeline.offsetWidth;
        const pixelsPerSecond = rulerWidth / this.duration;
        
        if (pixelsPerSecond > 100) return 1; // 1 second intervals
        if (pixelsPerSecond > 50) return 2;  // 2 second intervals
        if (pixelsPerSecond > 20) return 5;  // 5 second intervals
        if (pixelsPerSecond > 10) return 10; // 10 second intervals
        if (pixelsPerSecond > 5) return 20;  // 20 second intervals
        return 30; // 30 second intervals
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Video time updates
        const video = document.getElementById('preview-video');
        if (video) {
            video.addEventListener('timeupdate', this.handleVideoTimeUpdate.bind(this));
            video.addEventListener('loadedmetadata', this.handleVideoLoaded.bind(this));
            video.addEventListener('play', () => this.isPlaying = true);
            video.addEventListener('pause', () => this.isPlaying = false);
        }
        
        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Only handle shortcuts when not typing in an input
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            const handler = this.shortcuts[event.code];
            if (handler) {
                event.preventDefault();
                handler();
            }
        });
    }

    /**
     * Load subtitles into the editor
     */
    loadSubtitles(subtitles) {
        this.subtitles = subtitles || [];
        this.selectedSubtitle = null;
        this.saveToHistory();
        this.renderSubtitles();
        this.renderTimeline();
        console.log(`Loaded ${this.subtitles.length} subtitles`);
    }

    /**
     * Render subtitles in the editor list
     */
    renderSubtitles() {
        const container = document.getElementById('subtitle-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.subtitles.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'subtitle-placeholder';
            placeholder.style.cssText = `
                padding: var(--spacing-xl);
                text-align: center;
                color: var(--on-surface-variant);
            `;
            placeholder.innerHTML = `
                <p>No subtitles yet</p>
                <p>Upload a video or start recording to generate subtitles</p>
            `;
            container.appendChild(placeholder);
            return;
        }
        
        this.subtitles.forEach((subtitle, index) => {
            const item = this.createSubtitleItem(subtitle, index);
            container.appendChild(item);
        });
    }

    /**
     * Create a subtitle item element
     */
    createSubtitleItem(subtitle, index) {
        const item = document.createElement('div');
        item.className = 'subtitle-item';
        item.dataset.id = subtitle.id;
        item.dataset.index = index;
        
        if (this.selectedSubtitle && this.selectedSubtitle.id === subtitle.id) {
            item.classList.add('selected');
        }
        
        item.innerHTML = `
            <div class="time-inputs">
                <input type="text" class="time-input start-time" 
                       value="${this.formatTime(subtitle.start)}" 
                       data-field="start">
                <span>→</span>
                <input type="text" class="time-input end-time" 
                       value="${this.formatTime(subtitle.end)}" 
                       data-field="end">
            </div>
            <textarea class="subtitle-text" 
                      data-field="text" 
                      placeholder="Enter subtitle text...">${subtitle.text || ''}</textarea>
            <div class="subtitle-actions">
                <button class="action-btn play-btn" title="Play from this subtitle">
                    <svg width="12" height="12" fill="currentColor">
                        <polygon points="2,1 10,6 2,11"/>
                    </svg>
                </button>
                <button class="action-btn delete-btn" title="Delete subtitle">
                    <svg width="12" height="12" fill="currentColor">
                        <path d="M3 6h6M5 6v6M7 6v6M4 3h4l-1-2H5l-1 2z"/>
                    </svg>
                </button>
            </div>
        `;
        
        // Bind events
        this.bindSubtitleItemEvents(item, subtitle, index);
        
        return item;
    }

    /**
     * Bind events for subtitle item
     */
    bindSubtitleItemEvents(item, subtitle, index) {
        // Selection
        item.addEventListener('click', () => {
            this.selectSubtitle(subtitle);
        });
        
        // Time input changes
        const timeInputs = item.querySelectorAll('.time-input');
        timeInputs.forEach(input => {
            input.addEventListener('change', (event) => {
                this.updateSubtitleTime(subtitle, event.target.dataset.field, event.target.value);
            });
            
            input.addEventListener('focus', () => {
                this.selectSubtitle(subtitle);
            });
        });
        
        // Text changes
        const textArea = item.querySelector('.subtitle-text');
        textArea.addEventListener('input', (event) => {
            this.updateSubtitleText(subtitle, event.target.value);
        });
        
        textArea.addEventListener('focus', () => {
            this.selectSubtitle(subtitle);
        });
        
        // Action buttons
        const playBtn = item.querySelector('.play-btn');
        playBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            this.seekToSubtitle(subtitle);
        });
        
        const deleteBtn = item.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            this.deleteSubtitle(subtitle);
        });
    }

    /**
     * Render timeline visualization
     */
    renderTimeline() {
        if (!this.timeline || !this.duration) return;
        
        // Clear existing subtitle blocks
        const existingBlocks = this.timeline.querySelectorAll('.subtitle-block');
        existingBlocks.forEach(block => block.remove());
        
        // Render each subtitle as a block on timeline
        this.subtitles.forEach(subtitle => {
            const block = this.createTimelineBlock(subtitle);
            this.timeline.appendChild(block);
        });
        
        this.updateTimelineRuler();
    }

    /**
     * Create timeline block for subtitle
     */
    createTimelineBlock(subtitle) {
        const block = document.createElement('div');
        block.className = 'subtitle-block';
        block.dataset.id = subtitle.id;
        
        const left = (subtitle.start / this.duration) * 100;
        const width = ((subtitle.end - subtitle.start) / this.duration) * 100;
        
        block.style.cssText = `
            position: absolute;
            left: ${left}%;
            width: ${width}%;
            top: 25px;
            height: 30px;
            background-color: var(--timeline-subtitle);
            border: 1px solid var(--outline);
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            padding: 0 4px;
            font-size: 10px;
            color: white;
            overflow: hidden;
            z-index: 5;
        `;
        
        if (this.selectedSubtitle && this.selectedSubtitle.id === subtitle.id) {
            block.style.backgroundColor = 'var(--primary-color)';
            block.style.transform = 'scale(1.05)';
        }
        
        // Add text preview
        const textPreview = document.createElement('span');
        textPreview.textContent = subtitle.text || 'Empty subtitle';
        textPreview.style.cssText = `
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        block.appendChild(textPreview);
        
        // Add resize handles
        const leftHandle = this.createResizeHandle('left');
        const rightHandle = this.createResizeHandle('right');
        block.appendChild(leftHandle);
        block.appendChild(rightHandle);
        
        // Bind events
        this.bindTimelineBlockEvents(block, subtitle);
        
        return block;
    }

    /**
     * Create resize handle for timeline block
     */
    createResizeHandle(side) {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-${side}`;
        handle.style.cssText = `
            position: absolute;
            top: 0;
            bottom: 0;
            width: 6px;
            background-color: rgba(255, 255, 255, 0.3);
            cursor: ${side === 'left' ? 'w-resize' : 'e-resize'};
            ${side}: -3px;
            opacity: 0;
            transition: opacity 0.2s;
        `;
        
        return handle;
    }

    /**
     * Bind events for timeline block
     */
    bindTimelineBlockEvents(block, subtitle) {
        // Selection and seeking
        block.addEventListener('click', (event) => {
            if (event.target.classList.contains('resize-handle')) return;
            
            this.selectSubtitle(subtitle);
            this.seekToSubtitle(subtitle);
        });
        
        // Show resize handles on hover
        block.addEventListener('mouseenter', () => {
            const handles = block.querySelectorAll('.resize-handle');
            handles.forEach(handle => handle.style.opacity = '1');
        });
        
        block.addEventListener('mouseleave', () => {
            const handles = block.querySelectorAll('.resize-handle');
            handles.forEach(handle => handle.style.opacity = '0');
        });
        
        // Dragging and resizing
        this.makeBlockDraggable(block, subtitle);
        this.makeBlockResizable(block, subtitle);
    }

    /**
     * Make timeline block draggable
     */
    makeBlockDraggable(block, subtitle) {
        let isDragging = false;
        let startX = 0;
        let startTime = 0;
        
        block.addEventListener('mousedown', (event) => {
            if (event.target.classList.contains('resize-handle')) return;
            
            isDragging = true;
            startX = event.clientX;
            startTime = subtitle.start;
            
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', handleDragEnd);
            
            event.preventDefault();
        });
        
        const handleDrag = (event) => {
            if (!isDragging) return;
            
            const deltaX = event.clientX - startX;
            const timelineWidth = this.timeline.offsetWidth;
            const deltaTime = (deltaX / timelineWidth) * this.duration;
            
            const newStartTime = Math.max(0, startTime + deltaTime);
            const duration = subtitle.end - subtitle.start;
            const newEndTime = Math.min(this.duration, newStartTime + duration);
            
            this.updateSubtitleTiming(subtitle, newStartTime, newEndTime);
        };
        
        const handleDragEnd = () => {
            isDragging = false;
            document.removeEventListener('mousemove', handleDrag);
            document.removeEventListener('mouseup', handleDragEnd);
            this.saveToHistory();
        };
    }

    /**
     * Make timeline block resizable
     */
    makeBlockResizable(block, subtitle) {
        const leftHandle = block.querySelector('.resize-left');
        const rightHandle = block.querySelector('.resize-right');
        
        if (leftHandle) {
            this.bindResizeHandle(leftHandle, subtitle, 'start');
        }
        
        if (rightHandle) {
            this.bindResizeHandle(rightHandle, subtitle, 'end');
        }
    }

    /**
     * Bind resize handle events
     */
    bindResizeHandle(handle, subtitle, edge) {
        let isResizing = false;
        let startX = 0;
        let startTime = 0;
        
        handle.addEventListener('mousedown', (event) => {
            isResizing = true;
            startX = event.clientX;
            startTime = subtitle[edge];
            
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', handleResizeEnd);
            
            event.stopPropagation();
            event.preventDefault();
        });
        
        const handleResize = (event) => {
            if (!isResizing) return;
            
            const deltaX = event.clientX - startX;
            const timelineWidth = this.timeline.offsetWidth;
            const deltaTime = (deltaX / timelineWidth) * this.duration;
            
            let newTime = startTime + deltaTime;
            
            if (edge === 'start') {
                newTime = Math.max(0, Math.min(newTime, subtitle.end - 0.1));
                this.updateSubtitleTiming(subtitle, newTime, subtitle.end);
            } else {
                newTime = Math.min(this.duration, Math.max(newTime, subtitle.start + 0.1));
                this.updateSubtitleTiming(subtitle, subtitle.start, newTime);
            }
        };
        
        const handleResizeEnd = () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', handleResizeEnd);
            this.saveToHistory();
        };
    }

    /**
     * Handle timeline click for seeking
     */
    handleTimelineClick(event) {
        if (event.target.classList.contains('subtitle-block') || 
            event.target.classList.contains('resize-handle')) {
            return;
        }
        
        const rect = this.timeline.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const percentage = x / rect.width;
        const time = percentage * this.duration;
        
        this.seekToTime(time);
    }

    /**
     * Handle timeline wheel for zooming
     */
    handleTimelineWheel(event) {
        event.preventDefault();
        
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        this.pixelsPerSecond *= zoomFactor;
        this.pixelsPerSecond = Math.max(10, Math.min(1000, this.pixelsPerSecond));
        
        this.updateTimelineZoom();
    }

    /**
     * Update timeline zoom level
     */
    updateTimelineZoom() {
        if (!this.duration) return;
        
        const newWidth = this.duration * this.pixelsPerSecond;
        this.timeline.style.width = `${newWidth}px`;
        
        this.renderTimeline();
    }

    /**
     * Add new subtitle
     */
    addSubtitle(subtitle = null) {
        const newSubtitle = subtitle || {
            id: Date.now(),
            start: this.currentTime,
            end: this.currentTime + 3,
            text: '',
            confidence: 1.0
        };
        
        this.subtitles.push(newSubtitle);
        this.sortSubtitlesByTime();
        this.saveToHistory();
        this.renderSubtitles();
        this.renderTimeline();
        this.selectSubtitle(newSubtitle);
        
        if (this.onChange) {
            this.onChange('add', newSubtitle);
        }
        
        console.log('Added subtitle:', newSubtitle);
    }

    /**
     * Delete subtitle
     */
    deleteSubtitle(subtitle) {
        const index = this.subtitles.findIndex(s => s.id === subtitle.id);
        if (index !== -1) {
            this.subtitles.splice(index, 1);
            this.saveToHistory();
            this.renderSubtitles();
            this.renderTimeline();
            
            if (this.selectedSubtitle && this.selectedSubtitle.id === subtitle.id) {
                this.selectedSubtitle = null;
            }
            
            if (this.onChange) {
                this.onChange('delete', subtitle);
            }
            
            console.log('Deleted subtitle:', subtitle);
        }
    }

    /**
     * Update subtitle text
     */
    updateSubtitleText(subtitle, newText) {
        subtitle.text = newText;
        
        // Update timeline block preview
        const block = this.timeline.querySelector(`[data-id="${subtitle.id}"]`);
        if (block) {
            const textSpan = block.querySelector('span');
            if (textSpan) {
                textSpan.textContent = newText || 'Empty subtitle';
            }
        }
        
        if (this.onChange) {
            this.onChange('edit', subtitle);
        }
    }

    /**
     * Update subtitle timing
     */
    updateSubtitleTiming(subtitle, newStart, newEnd) {
        subtitle.start = newStart;
        subtitle.end = newEnd;
        
        this.sortSubtitlesByTime();
        this.renderTimeline();
        
        // Update time inputs in the list
        const item = document.querySelector(`.subtitle-item[data-id="${subtitle.id}"]`);
        if (item) {
            const startInput = item.querySelector('.start-time');
            const endInput = item.querySelector('.end-time');
            if (startInput) startInput.value = this.formatTime(newStart);
            if (endInput) endInput.value = this.formatTime(newEnd);
        }
        
        if (this.onChange) {
            this.onChange('edit', subtitle);
        }
    }

    /**
     * Update subtitle time from input
     */
    updateSubtitleTime(subtitle, field, timeString) {
        const time = this.parseTime(timeString);
        if (time !== null) {
            if (field === 'start') {
                subtitle.start = Math.max(0, Math.min(time, subtitle.end - 0.1));
            } else {
                subtitle.end = Math.min(this.duration, Math.max(time, subtitle.start + 0.1));
            }
            
            this.sortSubtitlesByTime();
            this.renderTimeline();
            this.saveToHistory();
            
            if (this.onChange) {
                this.onChange('edit', subtitle);
            }
        }
    }

    /**
     * Select subtitle
     */
    selectSubtitle(subtitle) {
        this.selectedSubtitle = subtitle;
        
        // Update visual selection
        document.querySelectorAll('.subtitle-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        document.querySelectorAll('.subtitle-block').forEach(block => {
            block.style.backgroundColor = 'var(--timeline-subtitle)';
            block.style.transform = 'scale(1)';
        });
        
        if (subtitle) {
            const item = document.querySelector(`.subtitle-item[data-id="${subtitle.id}"]`);
            if (item) {
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            
            const block = this.timeline.querySelector(`[data-id="${subtitle.id}"]`);
            if (block) {
                block.style.backgroundColor = 'var(--primary-color)';
                block.style.transform = 'scale(1.05)';
            }
            
            if (this.onSelect) {
                this.onSelect(subtitle);
            }
        }
    }

    /**
     * Sort subtitles by start time
     */
    sortSubtitlesByTime() {
        this.subtitles.sort((a, b) => a.start - b.start);
    }

    /**
     * Seek to specific time
     */
    seekToTime(time) {
        this.currentTime = Math.max(0, Math.min(time, this.duration));
        
        const video = document.getElementById('preview-video');
        if (video) {
            video.currentTime = this.currentTime;
        }
        
        this.updatePlayhead();
        
        if (this.onTimeUpdate) {
            this.onTimeUpdate(this.currentTime);
        }
    }

    /**
     * Seek to subtitle
     */
    seekToSubtitle(subtitle) {
        this.seekToTime(subtitle.start);
    }

    /**
     * Seek relative to current time
     */
    seekRelative(seconds) {
        this.seekToTime(this.currentTime + seconds);
    }

    /**
     * Update playhead position
     */
    updatePlayhead() {
        if (!this.playhead || !this.duration) return;
        
        const percentage = (this.currentTime / this.duration) * 100;
        this.playhead.style.left = `${percentage}%`;
    }

    /**
     * Handle video time update
     */
    handleVideoTimeUpdate(event) {
        this.currentTime = event.target.currentTime;
        this.updatePlayhead();
        
        // Update current time display
        const currentTimeDisplay = document.getElementById('current-time');
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = this.formatTime(this.currentTime);
        }
        
        // Update timeline slider
        const timelineSlider = document.getElementById('timeline-slider');
        if (timelineSlider) {
            timelineSlider.value = this.currentTime;
        }
    }

    /**
     * Handle video loaded
     */
    handleVideoLoaded(event) {
        this.duration = event.target.duration;
        
        // Update duration display
        const totalTimeDisplay = document.getElementById('total-time');
        if (totalTimeDisplay) {
            totalTimeDisplay.textContent = this.formatTime(this.duration);
        }
        
        // Update timeline slider
        const timelineSlider = document.getElementById('timeline-slider');
        if (timelineSlider) {
            timelineSlider.max = this.duration;
        }
        
        this.renderTimeline();
        this.updateTimelineRuler();
    }

    /**
     * Format time in MM:SS format
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    /**
     * Parse time string to seconds
     */
    parseTime(timeString) {
        const parts = timeString.split(':');
        if (parts.length < 2) return null;
        
        const minutes = parseInt(parts[0], 10) || 0;
        const secondsParts = parts[1].split('.');
        const seconds = parseInt(secondsParts[0], 10) || 0;
        const ms = parseInt(secondsParts[1], 10) || 0;
        
        return minutes * 60 + seconds + ms / 100;
    }

    /**
     * Save current state to history
     */
    saveToHistory() {
        const state = JSON.parse(JSON.stringify(this.subtitles));
        
        // Remove future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        this.history.push(state);
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.subtitles = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.renderSubtitles();
            this.renderTimeline();
            
            if (this.onChange) {
                this.onChange('undo', null);
            }
        }
    }

    /**
     * Redo last undone action
     */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.subtitles = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.renderSubtitles();
            this.renderTimeline();
            
            if (this.onChange) {
                this.onChange('redo', null);
            }
        }
    }

    /**
     * Keyboard shortcut handlers
     */
    togglePlayPause() {
        const video = document.getElementById('preview-video');
        if (video) {
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        }
    }

    selectPreviousSubtitle() {
        if (!this.selectedSubtitle || this.subtitles.length === 0) return;
        
        const currentIndex = this.subtitles.findIndex(s => s.id === this.selectedSubtitle.id);
        const newIndex = Math.max(0, currentIndex - 1);
        this.selectSubtitle(this.subtitles[newIndex]);
    }

    selectNextSubtitle() {
        if (!this.selectedSubtitle || this.subtitles.length === 0) return;
        
        const currentIndex = this.subtitles.findIndex(s => s.id === this.selectedSubtitle.id);
        const newIndex = Math.min(this.subtitles.length - 1, currentIndex + 1);
        this.selectSubtitle(this.subtitles[newIndex]);
    }

    deleteSelectedSubtitle() {
        if (this.selectedSubtitle) {
            this.deleteSubtitle(this.selectedSubtitle);
        }
    }

    addSubtitleAtCurrentTime() {
        this.addSubtitle();
    }

    clearSelection() {
        this.selectSubtitle(null);
    }

    /**
     * Handle window resize
     */
    handleResize() {
        this.renderTimeline();
        this.updateTimelineRuler();
    }

    /**
     * Get subtitle at current time
     */
    getSubtitleAtTime(time) {
        return this.subtitles.find(subtitle => 
            time >= subtitle.start && time <= subtitle.end
        );
    }

    /**
     * Get all subtitles
     */
    getSubtitles() {
        return [...this.subtitles];
    }

    /**
     * Clear all subtitles
     */
    clearSubtitles() {
        this.subtitles = [];
        this.selectedSubtitle = null;
        this.saveToHistory();
        this.renderSubtitles();
        this.renderTimeline();
        
        if (this.onChange) {
            this.onChange('clear', null);
        }
    }

    /**
     * Export subtitles in various formats
     */
    exportSubtitles(format = 'srt') {
        switch (format.toLowerCase()) {
            case 'srt':
                return this.exportSRT();
            case 'vtt':
                return this.exportVTT();
            case 'ass':
                return this.exportASS();
            case 'json':
                return this.exportJSON();
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Export as SRT format
     */
    exportSRT() {
        return this.subtitles.map((subtitle, index) => {
            const startTime = this.formatSRTTime(subtitle.start);
            const endTime = this.formatSRTTime(subtitle.end);
            
            return `${index + 1}\n${startTime} --> ${endTime}\n${subtitle.text}\n`;
        }).join('\n');
    }

    /**
     * Export as WebVTT format
     */
    exportVTT() {
        const header = 'WEBVTT\n\n';
        const content = this.subtitles.map(subtitle => {
            const startTime = this.formatVTTTime(subtitle.start);
            const endTime = this.formatVTTTime(subtitle.end);
            
            return `${startTime} --> ${endTime}\n${subtitle.text}\n`;
        }).join('\n');
        
        return header + content;
    }

    /**
     * Export as ASS format
     */
    exportASS() {
        const header = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,24,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
        
        const content = this.subtitles.map(subtitle => {
            const startTime = this.formatASSTime(subtitle.start);
            const endTime = this.formatASSTime(subtitle.end);
            
            return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${subtitle.text}`;
        }).join('\n');
        
        return header + content;
    }

    /**
     * Export as JSON format
     */
    exportJSON() {
        return JSON.stringify({
            version: '1.0',
            subtitles: this.subtitles,
            metadata: {
                duration: this.duration,
                count: this.subtitles.length,
                exported: new Date().toISOString()
            }
        }, null, 2);
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
        const cs = Math.floor((seconds % 1) * 100); // centiseconds

        return `${hours.toString().padStart(1, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
    }

    /**
     * Destroy subtitle editor
     */
    destroy() {
        this.subtitles = [];
        this.selectedSubtitle = null;
        this.history = [];
        this.historyIndex = -1;
        
        // Remove event listeners
        const video = document.getElementById('preview-video');
        if (video) {
            video.removeEventListener('timeupdate', this.handleVideoTimeUpdate);
            video.removeEventListener('loadedmetadata', this.handleVideoLoaded);
        }
        
        window.removeEventListener('resize', this.handleResize);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SubtitleEditor;
}