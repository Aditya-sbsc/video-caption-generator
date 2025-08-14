/**
 * Video Caption Generator - Caption Editor Module
 * Handles timeline-based caption editing with drag-and-drop functionality
 */

class CaptionEditorManager {
    constructor(app) {
        this.app = app;
        this.timeline = null;
        this.timelineContainer = null;
        this.playhead = null;
        this.selectedCaption = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.totalDuration = 0;
        this.timelineScale = 1; // pixels per second
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;
        this.dragState = {
            isDragging: false,
            dragType: null, // 'move', 'resize-start', 'resize-end'
            draggedCaption: null,
            startX: 0,
            startTime: 0,
            originalStartTime: 0,
            originalEndTime: 0
        };

        this.initializeTimeline();
        this.setupEventListeners();
    }

    /**
     * Initialize timeline
     */
    initializeTimeline() {
        this.timeline = document.getElementById('timeline');
        this.timelineContainer = document.getElementById('timeline-captions');
        this.playhead = document.getElementById('playhead');
        
        if (this.timeline && this.timelineContainer) {
            this.calculateTimelineScale();
            this.setupTimelineInteraction();
            this.refreshTimeline();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Timeline interaction
        if (this.timeline) {
            this.timeline.addEventListener('click', (e) => this.handleTimelineClick(e));
            this.timeline.addEventListener('mousedown', (e) => this.handleTimelineMouseDown(e));
        }

        // Global mouse events for dragging
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Form inputs
        this.setupFormEventListeners();

        // Window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    /**
     * Setup form event listeners
     */
    setupFormEventListeners() {
        const captionText = document.getElementById('caption-text');
        const startTime = document.getElementById('start-time');
        const endTime = document.getElementById('end-time');

        if (captionText) {
            captionText.addEventListener('input', () => this.updateSelectedCaptionText());
        }

        if (startTime) {
            startTime.addEventListener('change', () => this.updateSelectedCaptionTiming());
        }

        if (endTime) {
            endTime.addEventListener('change', () => this.updateSelectedCaptionTiming());
        }
    }

    /**
     * Calculate timeline scale based on container width and total duration
     */
    calculateTimelineScale() {
        if (!this.timelineContainer) return;

        const containerWidth = this.timelineContainer.offsetWidth;
        this.totalDuration = this.calculateTotalDuration();
        
        if (this.totalDuration > 0) {
            this.timelineScale = Math.max(containerWidth / this.totalDuration, 50); // Minimum 50px per second
        } else {
            this.timelineScale = 100; // Default scale
        }
    }

    /**
     * Calculate total duration from captions
     */
    calculateTotalDuration() {
        if (!this.app.captions || this.app.captions.length === 0) {
            return 60; // Default 1 minute
        }

        const lastCaption = this.app.captions.reduce((latest, caption) => 
            caption.endTime > latest.endTime ? caption : latest
        );

        return Math.max(lastCaption.endTime + 5, 60); // Add 5 seconds buffer, minimum 1 minute
    }

    /**
     * Setup timeline interaction
     */
    setupTimelineInteraction() {
        if (!this.timelineContainer) return;

        // Prevent text selection during dragging
        this.timelineContainer.addEventListener('selectstart', (e) => {
            if (this.dragState.isDragging) {
                e.preventDefault();
            }
        });
    }

    /**
     * Refresh timeline display
     */
    refreshTimeline() {
        if (!this.timelineContainer) return;

        this.calculateTimelineScale();
        this.renderTimelineRuler();
        this.renderCaptions();
        this.updateTimeDisplay();
    }

    /**
     * Render timeline ruler
     */
    renderTimelineRuler() {
        const ruler = this.timeline?.querySelector('.timeline-ruler');
        if (!ruler) return;

        ruler.innerHTML = '';

        const totalWidth = this.totalDuration * this.timelineScale;
        ruler.style.width = `${totalWidth}px`;

        // Add time markers every 5 seconds
        for (let time = 0; time <= this.totalDuration; time += 5) {
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            marker.style.left = `${time * this.timelineScale}px`;
            marker.style.position = 'absolute';
            marker.style.height = '100%';
            marker.style.borderLeft = '1px solid var(--border-color)';
            marker.style.fontSize = '10px';
            marker.style.paddingLeft = '2px';
            marker.style.color = 'var(--text-muted)';
            marker.textContent = Utils.formatTime(time, 'display');
            ruler.appendChild(marker);
        }
    }

    /**
     * Render captions on timeline
     */
    renderCaptions() {
        if (!this.timelineContainer) return;

        this.timelineContainer.innerHTML = '';

        // Set container width
        const totalWidth = this.totalDuration * this.timelineScale;
        this.timelineContainer.style.width = `${totalWidth}px`;
        this.timelineContainer.style.minWidth = `${totalWidth}px`;

        // Render each caption
        this.app.captions.forEach((caption, index) => {
            const captionElement = this.createCaptionElement(caption, index);
            this.timelineContainer.appendChild(captionElement);
        });
    }

    /**
     * Create caption element for timeline
     */
    createCaptionElement(caption, index) {
        const element = document.createElement('div');
        element.className = 'timeline-segment';
        element.dataset.captionId = caption.id;
        element.dataset.index = index;

        // Position and size
        const left = caption.startTime * this.timelineScale;
        const width = Math.max((caption.endTime - caption.startTime) * this.timelineScale, 30);
        
        element.style.left = `${left}px`;
        element.style.width = `${width}px`;
        element.style.top = '10px';

        // Content
        element.innerHTML = `
            <div class="segment-text">${Utils.sanitizeText(caption.text.substring(0, 50))}${caption.text.length > 50 ? '...' : ''}</div>
            <div class="segment-time">${Utils.formatTime(caption.startTime, 'display')}</div>
            <div class="resize-handle resize-start"></div>
            <div class="resize-handle resize-end"></div>
        `;

        // Event listeners
        element.addEventListener('click', (e) => this.selectCaption(caption, element));
        element.addEventListener('mousedown', (e) => this.handleCaptionMouseDown(e, caption, element));

        // Resize handles
        const startHandle = element.querySelector('.resize-start');
        const endHandle = element.querySelector('.resize-end');

        if (startHandle) {
            startHandle.addEventListener('mousedown', (e) => this.handleResizeStart(e, caption, element, 'start'));
        }

        if (endHandle) {
            endHandle.addEventListener('mousedown', (e) => this.handleResizeStart(e, caption, element, 'end'));
        }

        return element;
    }

    /**
     * Handle timeline click
     */
    handleTimelineClick(e) {
        if (this.dragState.isDragging) return;

        const rect = this.timeline.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = x / this.timelineScale;

        this.setCurrentTime(time);
        this.updatePlayhead();
    }

    /**
     * Handle timeline mouse down
     */
    handleTimelineMouseDown(e) {
        if (e.target.closest('.timeline-segment')) return;

        // Start timeline scrubbing
        this.dragState.isDragging = true;
        this.dragState.dragType = 'scrub';
        this.handleTimelineClick(e);
    }

    /**
     * Handle caption mouse down
     */
    handleCaptionMouseDown(e, caption, element) {
        if (e.target.classList.contains('resize-handle')) return;

        e.stopPropagation();
        
        this.selectCaption(caption, element);
        
        // Start dragging
        this.dragState.isDragging = true;
        this.dragState.dragType = 'move';
        this.dragState.draggedCaption = caption;
        this.dragState.startX = e.clientX;
        this.dragState.startTime = this.currentTime;
        this.dragState.originalStartTime = caption.startTime;
        this.dragState.originalEndTime = caption.endTime;

        element.style.cursor = 'grabbing';
        element.style.zIndex = '1000';
    }

    /**
     * Handle resize start
     */
    handleResizeStart(e, caption, element, handle) {
        e.stopPropagation();
        
        this.selectCaption(caption, element);
        
        this.dragState.isDragging = true;
        this.dragState.dragType = handle === 'start' ? 'resize-start' : 'resize-end';
        this.dragState.draggedCaption = caption;
        this.dragState.startX = e.clientX;
        this.dragState.originalStartTime = caption.startTime;
        this.dragState.originalEndTime = caption.endTime;

        element.style.cursor = 'ew-resize';
    }

    /**
     * Handle mouse move
     */
    handleMouseMove(e) {
        if (!this.dragState.isDragging) return;

        const deltaX = e.clientX - this.dragState.startX;
        const deltaTime = deltaX / this.timelineScale;

        switch (this.dragState.dragType) {
            case 'move':
                this.handleCaptionMove(deltaTime);
                break;
            case 'resize-start':
                this.handleCaptionResizeStart(deltaTime);
                break;
            case 'resize-end':
                this.handleCaptionResizeEnd(deltaTime);
                break;
            case 'scrub':
                this.handleTimelineScrub(e);
                break;
        }
    }

    /**
     * Handle mouse up
     */
    handleMouseUp(e) {
        if (!this.dragState.isDragging) return;

        const caption = this.dragState.draggedCaption;
        
        if (caption && this.dragState.dragType !== 'scrub') {
            // Save state for undo
            this.saveUndoState();
            
            // Validate and snap to grid if needed
            this.validateCaptionTiming(caption);
            
            // Update UI
            this.refreshTimeline();
            this.updateCaptionForm();
        }

        // Reset drag state
        this.dragState = {
            isDragging: false,
            dragType: null,
            draggedCaption: null,
            startX: 0,
            startTime: 0,
            originalStartTime: 0,
            originalEndTime: 0
        };

        // Reset cursor
        const draggedElement = document.querySelector('.timeline-segment[style*="grabbing"], .timeline-segment[style*="ew-resize"]');
        if (draggedElement) {
            draggedElement.style.cursor = '';
            draggedElement.style.zIndex = '';
        }
    }

    /**
     * Handle caption move
     */
    handleCaptionMove(deltaTime) {
        const caption = this.dragState.draggedCaption;
        if (!caption) return;

        const duration = caption.endTime - caption.startTime;
        const newStartTime = Math.max(0, this.dragState.originalStartTime + deltaTime);
        const newEndTime = newStartTime + duration;

        // Update caption timing
        caption.startTime = newStartTime;
        caption.endTime = newEndTime;

        // Update visual representation
        this.updateCaptionElementPosition(caption);
    }

    /**
     * Handle caption resize start
     */
    handleCaptionResizeStart(deltaTime) {
        const caption = this.dragState.draggedCaption;
        if (!caption) return;

        const newStartTime = Math.max(0, this.dragState.originalStartTime + deltaTime);
        const minDuration = 0.1; // Minimum 100ms duration

        if (newStartTime < caption.endTime - minDuration) {
            caption.startTime = newStartTime;
            this.updateCaptionElementPosition(caption);
        }
    }

    /**
     * Handle caption resize end
     */
    handleCaptionResizeEnd(deltaTime) {
        const caption = this.dragState.draggedCaption;
        if (!caption) return;

        const newEndTime = Math.max(caption.startTime + 0.1, this.dragState.originalEndTime + deltaTime);
        caption.endTime = newEndTime;
        this.updateCaptionElementPosition(caption);
    }

    /**
     * Handle timeline scrub
     */
    handleTimelineScrub(e) {
        const rect = this.timeline.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = Math.max(0, x / this.timelineScale);

        this.setCurrentTime(time);
        this.updatePlayhead();
    }

    /**
     * Update caption element position
     */
    updateCaptionElementPosition(caption) {
        const element = document.querySelector(`[data-caption-id="${caption.id}"]`);
        if (!element) return;

        const left = caption.startTime * this.timelineScale;
        const width = Math.max((caption.endTime - caption.startTime) * this.timelineScale, 30);
        
        element.style.left = `${left}px`;
        element.style.width = `${width}px`;

        // Update time display
        const timeElement = element.querySelector('.segment-time');
        if (timeElement) {
            timeElement.textContent = Utils.formatTime(caption.startTime, 'display');
        }
    }

    /**
     * Select caption
     */
    selectCaption(caption, element) {
        // Deselect previous
        const previousSelected = document.querySelector('.timeline-segment.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

        // Select new
        if (element) {
            element.classList.add('selected');
        }

        this.selectedCaption = caption;
        this.app.selectedCaption = caption;
        this.updateCaptionForm();
    }

    /**
     * Update caption form with selected caption data
     */
    updateCaptionForm() {
        const captionText = document.getElementById('caption-text');
        const startTime = document.getElementById('start-time');
        const endTime = document.getElementById('end-time');

        if (this.selectedCaption) {
            if (captionText) captionText.value = this.selectedCaption.text;
            if (startTime) startTime.value = Utils.formatTime(this.selectedCaption.startTime);
            if (endTime) endTime.value = Utils.formatTime(this.selectedCaption.endTime);
        } else {
            if (captionText) captionText.value = '';
            if (startTime) startTime.value = '';
            if (endTime) endTime.value = '';
        }
    }

    /**
     * Update selected caption text
     */
    updateSelectedCaptionText() {
        if (!this.selectedCaption) return;

        const captionText = document.getElementById('caption-text');
        if (captionText) {
            this.saveUndoState();
            this.selectedCaption.text = captionText.value;
            
            // Update timeline display
            const element = document.querySelector(`[data-caption-id="${this.selectedCaption.id}"]`);
            if (element) {
                const textElement = element.querySelector('.segment-text');
                if (textElement) {
                    const displayText = this.selectedCaption.text.substring(0, 50);
                    textElement.textContent = displayText + (this.selectedCaption.text.length > 50 ? '...' : '');
                }
            }
        }
    }

    /**
     * Update selected caption timing
     */
    updateSelectedCaptionTiming() {
        if (!this.selectedCaption) return;

        const startTime = document.getElementById('start-time');
        const endTime = document.getElementById('end-time');

        if (startTime && endTime) {
            this.saveUndoState();
            
            const newStartTime = Utils.parseTime(startTime.value);
            const newEndTime = Utils.parseTime(endTime.value);

            this.selectedCaption.startTime = newStartTime;
            this.selectedCaption.endTime = newEndTime;

            this.validateCaptionTiming(this.selectedCaption);
            this.refreshTimeline();
        }
    }

    /**
     * Validate caption timing
     */
    validateCaptionTiming(caption) {
        // Ensure minimum duration
        const minDuration = 0.1;
        if (caption.endTime - caption.startTime < minDuration) {
            caption.endTime = caption.startTime + minDuration;
        }

        // Ensure non-negative start time
        if (caption.startTime < 0) {
            const duration = caption.endTime - caption.startTime;
            caption.startTime = 0;
            caption.endTime = duration;
        }

        // Check for overlaps with other captions
        this.resolveOverlaps(caption);
    }

    /**
     * Resolve overlaps with other captions
     */
    resolveOverlaps(caption) {
        const sortedCaptions = [...this.app.captions].sort((a, b) => a.startTime - b.startTime);
        const currentIndex = sortedCaptions.findIndex(c => c.id === caption.id);

        // Check overlap with previous caption
        if (currentIndex > 0) {
            const prevCaption = sortedCaptions[currentIndex - 1];
            if (caption.startTime < prevCaption.endTime) {
                caption.startTime = prevCaption.endTime + 0.01;
            }
        }

        // Check overlap with next caption
        if (currentIndex < sortedCaptions.length - 1) {
            const nextCaption = sortedCaptions[currentIndex + 1];
            if (caption.endTime > nextCaption.startTime) {
                caption.endTime = nextCaption.startTime - 0.01;
            }
        }
    }

    /**
     * Set current time
     */
    setCurrentTime(time) {
        this.currentTime = Math.max(0, Math.min(time, this.totalDuration));
        this.updateTimeDisplay();
    }

    /**
     * Update time display
     */
    updateTimeDisplay() {
        const currentTimeDisplay = document.getElementById('current-time');
        const totalTimeDisplay = document.getElementById('total-time');

        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = Utils.formatTime(this.currentTime, 'display');
        }

        if (totalTimeDisplay) {
            totalTimeDisplay.textContent = Utils.formatTime(this.totalDuration, 'display');
        }

        // Update scrubber
        const scrubber = document.getElementById('timeline-scrubber');
        if (scrubber) {
            const percentage = this.totalDuration > 0 ? (this.currentTime / this.totalDuration) * 100 : 0;
            scrubber.value = percentage;
        }
    }

    /**
     * Update playhead position
     */
    updatePlayhead() {
        if (!this.playhead) return;

        const left = this.currentTime * this.timelineScale;
        this.playhead.style.left = `${left}px`;
    }

    /**
     * Toggle playback
     */
    togglePlayback() {
        if (this.isPlaying) {
            this.pausePlayback();
        } else {
            this.startPlayback();
        }
    }

    /**
     * Start playback
     */
    startPlayback() {
        this.isPlaying = true;
        this.updatePlayButton();
        
        // Simple playback simulation
        this.playbackInterval = setInterval(() => {
            this.currentTime += 0.1;
            if (this.currentTime >= this.totalDuration) {
                this.pausePlayback();
                this.currentTime = 0;
            }
            this.updateTimeDisplay();
            this.updatePlayhead();
        }, 100);
    }

    /**
     * Pause playback
     */
    pausePlayback() {
        this.isPlaying = false;
        this.updatePlayButton();
        
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
    }

    /**
     * Update play button
     */
    updatePlayButton() {
        const playButton = document.getElementById('play-pause');
        if (playButton) {
            const icon = playButton.querySelector('.play-icon');
            if (icon) {
                icon.textContent = this.isPlaying ? '⏸️' : '▶️';
            }
        }
    }

    /**
     * Scrub timeline with scrubber
     */
    scrubTimeline(value) {
        const time = (value / 100) * this.totalDuration;
        this.setCurrentTime(time);
        this.updatePlayhead();
    }

    /**
     * Split caption at current time
     */
    splitCaption() {
        if (!this.selectedCaption) {
            this.app.showToast('Select a caption to split', 'warning');
            return;
        }

        const splitTime = this.currentTime;
        if (splitTime <= this.selectedCaption.startTime || splitTime >= this.selectedCaption.endTime) {
            this.app.showToast('Current time is not within the selected caption', 'warning');
            return;
        }

        this.saveUndoState();

        const newCaptions = Utils.splitCaptionSegment(this.selectedCaption, splitTime);
        
        // Replace the original caption with the split captions
        const index = this.app.captions.findIndex(c => c.id === this.selectedCaption.id);
        if (index !== -1) {
            this.app.captions.splice(index, 1, ...newCaptions);
            this.refreshTimeline();
            this.app.showToast('Caption split successfully', 'success');
        }
    }

    /**
     * Merge selected captions
     */
    mergeCaptions() {
        const selectedElements = document.querySelectorAll('.timeline-segment.selected');
        if (selectedElements.length < 2) {
            this.app.showToast('Select at least two captions to merge', 'warning');
            return;
        }

        this.saveUndoState();

        // Get selected captions
        const selectedCaptions = Array.from(selectedElements).map(el => {
            const id = el.dataset.captionId;
            return this.app.captions.find(c => c.id === id);
        }).filter(Boolean);

        // Sort by start time
        selectedCaptions.sort((a, b) => a.startTime - b.startTime);

        // Create merged caption
        const mergedCaption = {
            id: Utils.generateId(),
            text: selectedCaptions.map(c => c.text).join(' '),
            startTime: selectedCaptions[0].startTime,
            endTime: selectedCaptions[selectedCaptions.length - 1].endTime,
            language: selectedCaptions[0].language
        };

        // Remove original captions and add merged one
        selectedCaptions.forEach(caption => {
            const index = this.app.captions.findIndex(c => c.id === caption.id);
            if (index !== -1) {
                this.app.captions.splice(index, 1);
            }
        });

        this.app.captions.push(mergedCaption);
        this.app.captions.sort((a, b) => a.startTime - b.startTime);

        this.refreshTimeline();
        this.selectCaption(mergedCaption, null);
        this.app.showToast('Captions merged successfully', 'success');
    }

    /**
     * Delete selected caption
     */
    deleteCaption() {
        if (!this.selectedCaption) {
            this.app.showToast('Select a caption to delete', 'warning');
            return;
        }

        this.saveUndoState();

        const index = this.app.captions.findIndex(c => c.id === this.selectedCaption.id);
        if (index !== -1) {
            this.app.captions.splice(index, 1);
            this.selectedCaption = null;
            this.app.selectedCaption = null;
            this.refreshTimeline();
            this.updateCaptionForm();
            this.app.showToast('Caption deleted', 'success');
        }
    }

    /**
     * Add new caption
     */
    addCaption() {
        this.saveUndoState();

        const newCaption = {
            id: Utils.generateId(),
            text: 'New caption',
            startTime: this.currentTime,
            endTime: this.currentTime + 2,
            language: 'en-US'
        };

        this.app.captions.push(newCaption);
        this.app.captions.sort((a, b) => a.startTime - b.startTime);
        
        this.refreshTimeline();
        this.selectCaption(newCaption, null);
        this.app.showToast('New caption added', 'success');
    }

    /**
     * Save caption changes
     */
    saveCaption() {
        if (!this.selectedCaption) {
            this.app.showToast('No caption selected', 'warning');
            return;
        }

        this.updateSelectedCaptionText();
        this.updateSelectedCaptionTiming();
        this.app.showToast('Caption saved', 'success');
    }

    /**
     * Replace text in captions
     */
    replaceText() {
        const searchInput = document.getElementById('search-input');
        const replaceInput = document.getElementById('replace-input');

        if (!searchInput || !replaceInput) return;

        const searchText = searchInput.value.trim();
        const replaceText = replaceInput.value;

        if (!searchText) {
            this.app.showToast('Enter text to search for', 'warning');
            return;
        }

        this.saveUndoState();

        let replacedCount = 0;
        this.app.captions.forEach(caption => {
            if (caption.text.includes(searchText)) {
                caption.text = caption.text.replace(searchText, replaceText);
                replacedCount++;
            }
        });

        this.refreshTimeline();
        this.updateCaptionForm();
        
        if (replacedCount > 0) {
            this.app.showToast(`Replaced text in ${replacedCount} caption${replacedCount !== 1 ? 's' : ''}`, 'success');
        } else {
            this.app.showToast('No matches found', 'info');
        }
    }

    /**
     * Replace all text in captions
     */
    replaceAllText() {
        const searchInput = document.getElementById('search-input');
        const replaceInput = document.getElementById('replace-input');

        if (!searchInput || !replaceInput) return;

        const searchText = searchInput.value.trim();
        const replaceText = replaceInput.value;

        if (!searchText) {
            this.app.showToast('Enter text to search for', 'warning');
            return;
        }

        this.saveUndoState();

        let totalReplacements = 0;
        this.app.captions.forEach(caption => {
            const originalText = caption.text;
            caption.text = caption.text.replace(new RegExp(searchText, 'g'), replaceText);
            const replacements = (originalText.match(new RegExp(searchText, 'g')) || []).length;
            totalReplacements += replacements;
        });

        this.refreshTimeline();
        this.updateCaptionForm();
        
        if (totalReplacements > 0) {
            this.app.showToast(`Made ${totalReplacements} replacement${totalReplacements !== 1 ? 's' : ''}`, 'success');
        } else {
            this.app.showToast('No matches found', 'info');
        }
    }

    /**
     * Save state for undo
     */
    saveUndoState() {
        const state = Utils.deepClone(this.app.captions);
        this.undoStack.push(state);
        
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        
        // Clear redo stack when new action is performed
        this.redoStack = [];
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.undoStack.length === 0) {
            this.app.showToast('Nothing to undo', 'info');
            return;
        }

        // Save current state to redo stack
        const currentState = Utils.deepClone(this.app.captions);
        this.redoStack.push(currentState);

        // Restore previous state
        const previousState = this.undoStack.pop();
        this.app.captions = previousState;

        this.selectedCaption = null;
        this.app.selectedCaption = null;
        this.refreshTimeline();
        this.updateCaptionForm();
        this.app.showToast('Undone', 'info');
    }

    /**
     * Redo last undone action
     */
    redo() {
        if (this.redoStack.length === 0) {
            this.app.showToast('Nothing to redo', 'info');
            return;
        }

        // Save current state to undo stack
        const currentState = Utils.deepClone(this.app.captions);
        this.undoStack.push(currentState);

        // Restore next state
        const nextState = this.redoStack.pop();
        this.app.captions = nextState;

        this.selectedCaption = null;
        this.app.selectedCaption = null;
        this.refreshTimeline();
        this.updateCaptionForm();
        this.app.showToast('Redone', 'info');
    }

    /**
     * Handle window resize
     */
    handleResize() {
        Utils.debounce(() => {
            this.calculateTimelineScale();
            this.refreshTimeline();
        }, 250)();
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
        }
        
        this.pausePlayback();
        this.selectedCaption = null;
        this.undoStack = [];
        this.redoStack = [];
    }
}

// Extend the main app with caption editor functionality
if (window.captionGenerator) {
    window.captionGenerator.captionEditor = new CaptionEditorManager(window.captionGenerator);
    
    // Override placeholder methods in main app
    window.captionGenerator.initializeTimeline = function() {
        // Already initialized in constructor
    };

    window.captionGenerator.refreshTimeline = function() {
        this.captionEditor.refreshTimeline();
    };

    window.captionGenerator.handleTimelineClick = function(e) {
        this.captionEditor.handleTimelineClick(e);
    };

    window.captionGenerator.undo = function() {
        this.captionEditor.undo();
    };

    window.captionGenerator.redo = function() {
        this.captionEditor.redo();
    };

    window.captionGenerator.splitCaption = function() {
        this.captionEditor.splitCaption();
    };

    window.captionGenerator.mergeCaptions = function() {
        this.captionEditor.mergeCaptions();
    };

    window.captionGenerator.deleteCaption = function() {
        this.captionEditor.deleteCaption();
    };

    window.captionGenerator.togglePlayback = function() {
        this.captionEditor.togglePlayback();
    };

    window.captionGenerator.scrubTimeline = function(value) {
        this.captionEditor.scrubTimeline(value);
    };

    window.captionGenerator.saveCaption = function() {
        this.captionEditor.saveCaption();
    };

    window.captionGenerator.addCaption = function() {
        this.captionEditor.addCaption();
    };

    window.captionGenerator.replaceText = function() {
        this.captionEditor.replaceText();
    };

    window.captionGenerator.replaceAllText = function() {
        this.captionEditor.replaceAllText();
    };
}

// Make available globally
window.CaptionEditorManager = CaptionEditorManager;