/**
 * Service Worker for Video Caption Generator
 * Provides offline functionality and caching strategies
 */

const CACHE_NAME = 'video-caption-generator-v1.0.0';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/responsive.css',
    '/css/themes.css',
    '/js/app.js',
    '/js/speech-recognition.js',
    '/js/video-processor.js',
    '/js/translator.js',
    '/js/subtitle-editor.js',
    '/js/export-handler.js',
    '/js/ui-controller.js',
    '/js/utils.js',
    '/manifest.json',
    // Add fonts and icons when available
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png'
];

// Network-first resources (always try network first)
const NETWORK_FIRST = [
    '/api/',
    'https://translation.googleapis.com/',
    'https://unpkg.com/'
];

// Cache-first resources (try cache first, fallback to network)
const CACHE_FIRST = [
    '/css/',
    '/js/',
    '/assets/',
    'https://unpkg.com/@ffmpeg/'
];

/**
 * Install event - Cache static resources
 */
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker: Installed successfully');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Installation failed', error);
            })
    );
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated successfully');
                return self.clients.claim();
            })
    );
});

/**
 * Fetch event - Handle network requests with caching strategies
 */
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Choose caching strategy based on URL
    if (isNetworkFirst(request.url)) {
        event.respondWith(networkFirst(request));
    } else if (isCacheFirst(request.url)) {
        event.respondWith(cacheFirst(request));
    } else {
        event.respondWith(staleWhileRevalidate(request));
    }
});

/**
 * Network-first strategy
 * Try network first, fallback to cache, then offline page
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Update cache with fresh response
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
    } catch (error) {
        console.log('Service Worker: Network failed, trying cache');
    }
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // Return offline fallback for HTML requests
    if (request.destination === 'document') {
        return caches.match('/index.html');
    }
    
    // Return error response for other requests
    return new Response('Offline', { 
        status: 503, 
        statusText: 'Service Unavailable' 
    });
}

/**
 * Cache-first strategy
 * Try cache first, fallback to network
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
    } catch (error) {
        console.error('Service Worker: Cache-first strategy failed', error);
    }
    
    return new Response('Resource not available', { 
        status: 404, 
        statusText: 'Not Found' 
    });
}

/**
 * Stale-while-revalidate strategy
 * Return cached version immediately, update cache in background
 */
async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);
    
    // Start fetch in background
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            const cache = caches.open(DYNAMIC_CACHE);
            cache.then(c => c.put(request, networkResponse.clone()));
        }
        return networkResponse;
    }).catch(error => {
        console.log('Service Worker: Background fetch failed', error);
    });
    
    // Return cached version if available, otherwise wait for network
    return cachedResponse || fetchPromise;
}

/**
 * Check if URL should use network-first strategy
 */
function isNetworkFirst(url) {
    return NETWORK_FIRST.some(pattern => url.includes(pattern));
}

/**
 * Check if URL should use cache-first strategy
 */
function isCacheFirst(url) {
    return CACHE_FIRST.some(pattern => url.includes(pattern));
}

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync', event.tag);
    
    if (event.tag === 'background-export') {
        event.waitUntil(handleBackgroundExport());
    }
    
    if (event.tag === 'background-translation') {
        event.waitUntil(handleBackgroundTranslation());
    }
});

/**
 * Handle background export
 */
async function handleBackgroundExport() {
    try {
        // Get pending exports from IndexedDB or localStorage
        const pendingExports = await getPendingExports();
        
        for (const exportTask of pendingExports) {
            try {
                await processExport(exportTask);
                await removePendingExport(exportTask.id);
                
                // Notify clients of completion
                notifyClients({
                    type: 'EXPORT_COMPLETE',
                    data: exportTask
                });
                
            } catch (error) {
                console.error('Service Worker: Export failed', error);
                
                // Notify clients of failure
                notifyClients({
                    type: 'EXPORT_FAILED',
                    data: { ...exportTask, error: error.message }
                });
            }
        }
    } catch (error) {
        console.error('Service Worker: Background export error', error);
    }
}

/**
 * Handle background translation
 */
async function handleBackgroundTranslation() {
    try {
        const pendingTranslations = await getPendingTranslations();
        
        for (const translation of pendingTranslations) {
            try {
                const result = await processTranslation(translation);
                await removePendingTranslation(translation.id);
                
                notifyClients({
                    type: 'TRANSLATION_COMPLETE',
                    data: result
                });
                
            } catch (error) {
                console.error('Service Worker: Translation failed', error);
                
                notifyClients({
                    type: 'TRANSLATION_FAILED',
                    data: { ...translation, error: error.message }
                });
            }
        }
    } catch (error) {
        console.error('Service Worker: Background translation error', error);
    }
}

/**
 * Handle push notifications
 */
self.addEventListener('push', event => {
    const options = {
        body: 'Your video processing is complete!',
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/icon-72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Results',
                icon: '/assets/icons/explore.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/assets/icons/close.png'
            }
        ]
    };
    
    if (event.data) {
        const data = event.data.json();
        options.body = data.body || options.body;
        options.data = { ...options.data, ...data };
    }
    
    event.waitUntil(
        self.registration.showNotification('Video Caption Generator', options)
    );
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'close') {
        // Just close the notification
        return;
    } else {
        // Default action - open the app
        event.waitUntil(
            clients.matchAll({ includeUncontrolled: true, type: 'window' })
                .then(clientList => {
                    if (clientList.length > 0) {
                        // Focus existing window
                        return clientList[0].focus();
                    }
                    // Open new window
                    return clients.openWindow('/');
                })
        );
    }
});

/**
 * Message handling for communication with main thread
 */
self.addEventListener('message', event => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({ version: CACHE_NAME });
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        case 'CACHE_FILE':
            cacheFile(data.url, data.cacheName).then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        case 'SCHEDULE_EXPORT':
            scheduleBackgroundExport(data);
            break;
            
        case 'SCHEDULE_TRANSLATION':
            scheduleBackgroundTranslation(data);
            break;
    }
});

/**
 * Notify all clients of an event
 */
async function notifyClients(message) {
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach(client => client.postMessage(message));
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(cacheNames.map(name => caches.delete(name)));
}

/**
 * Cache a specific file
 */
async function cacheFile(url, cacheName = DYNAMIC_CACHE) {
    const cache = await caches.open(cacheName);
    return cache.add(url);
}

/**
 * Utility functions for background tasks
 * These would typically use IndexedDB for persistence
 */
async function getPendingExports() {
    // Implementation would use IndexedDB
    return [];
}

async function removePendingExport(id) {
    // Implementation would use IndexedDB
    return true;
}

async function processExport(exportTask) {
    // Implementation would handle the actual export
    return exportTask;
}

async function getPendingTranslations() {
    // Implementation would use IndexedDB
    return [];
}

async function removePendingTranslation(id) {
    // Implementation would use IndexedDB
    return true;
}

async function processTranslation(translation) {
    // Implementation would handle the actual translation
    return translation;
}

async function scheduleBackgroundExport(data) {
    // Store export task for background processing
    // Implementation would use IndexedDB
    return self.registration.sync.register('background-export');
}

async function scheduleBackgroundTranslation(data) {
    // Store translation task for background processing
    // Implementation would use IndexedDB
    return self.registration.sync.register('background-translation');
}

console.log('Service Worker: Script loaded successfully');