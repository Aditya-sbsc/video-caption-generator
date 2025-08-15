/**
 * Video Caption Generator - Service Worker
 * Provides offline functionality and caching for the PWA
 */

const CACHE_NAME = 'video-caption-generator-v1.0.0';
const OFFLINE_PAGE = '/index.html';

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/themes.css',
    '/css/responsive.css',
    '/js/app.js',
    '/js/utils.js',
    '/js/speech-recognition.js',
    '/js/video-processor.js',
    '/js/caption-editor.js',
    '/js/export-manager.js',
    '/manifest.json'
];

// Files that should be cached dynamically
const DYNAMIC_CACHE_PATTERNS = [
    /^\/assets\//,
    /^\/docs\//,
    /^\/examples\//
];

// Network-first cache patterns (for frequently updated content)
const NETWORK_FIRST_PATTERNS = [
    /^\/api\//,
    /googleapis\.com/,
    /google-analytics\.com/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                console.log('[SW] Static assets cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Failed to cache static assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Claiming clients');
                return self.clients.claim();
            })
    );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-HTTP requests
    if (!request.url.startsWith('http')) {
        return;
    }

    // Handle different types of requests
    if (shouldUseNetworkFirst(url)) {
        event.respondWith(networkFirst(request));
    } else if (shouldUseCacheFirst(url)) {
        event.respondWith(cacheFirst(request));
    } else {
        event.respondWith(staleWhileRevalidate(request));
    }
});

// Network-first strategy for frequently updated content
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', error);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            return caches.match(OFFLINE_PAGE);
        }
        
        throw error;
    }
}

// Cache-first strategy for static assets
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Failed to fetch resource:', request.url);
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            return caches.match(OFFLINE_PAGE);
        }
        
        throw error;
    }
}

// Stale-while-revalidate strategy for balanced performance
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch((error) => {
        console.log('[SW] Network fetch failed:', error);
        return null;
    });
    
    // Return cached response immediately if available
    if (cachedResponse) {
        // Update cache in background
        fetchPromise;
        return cachedResponse;
    }
    
    // Wait for network response if no cache
    const networkResponse = await fetchPromise;
    
    if (networkResponse) {
        return networkResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
        return cache.match(OFFLINE_PAGE);
    }
    
    throw new Error('No cached response and network failed');
}

// Check if URL should use network-first strategy
function shouldUseNetworkFirst(url) {
    return NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.href));
}

// Check if URL should use cache-first strategy
function shouldUseCacheFirst(url) {
    return DYNAMIC_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname)) ||
           STATIC_CACHE_URLS.includes(url.pathname);
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered:', event.tag);
    
    if (event.tag === 'background-export') {
        event.waitUntil(handleBackgroundExport());
    } else if (event.tag === 'background-save') {
        event.waitUntil(handleBackgroundSave());
    }
});

// Handle background export
async function handleBackgroundExport() {
    try {
        console.log('[SW] Processing background export');
        
        // Get pending export data from IndexedDB
        const exportData = await getFromIndexedDB('pendingExports');
        
        if (exportData && exportData.length > 0) {
            // Process exports when online
            for (const data of exportData) {
                await processExport(data);
            }
            
            // Clear pending exports
            await clearFromIndexedDB('pendingExports');
            
            // Notify client
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'BACKGROUND_EXPORT_COMPLETE',
                        count: exportData.length
                    });
                });
            });
        }
    } catch (error) {
        console.error('[SW] Background export failed:', error);
    }
}

// Handle background save
async function handleBackgroundSave() {
    try {
        console.log('[SW] Processing background save');
        
        // Get pending save data from IndexedDB
        const saveData = await getFromIndexedDB('pendingSaves');
        
        if (saveData && saveData.length > 0) {
            // Process saves when online
            for (const data of saveData) {
                await processSave(data);
            }
            
            // Clear pending saves
            await clearFromIndexedDB('pendingSaves');
            
            // Notify client
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'BACKGROUND_SAVE_COMPLETE',
                        count: saveData.length
                    });
                });
            });
        }
    } catch (error) {
        console.error('[SW] Background save failed:', error);
    }
}

// Process export data
async function processExport(exportData) {
    // Implementation for processing export when online
    console.log('[SW] Processing export:', exportData.format);
    // This would typically send data to a server or cloud storage
}

// Process save data
async function processSave(saveData) {
    // Implementation for processing save when online
    console.log('[SW] Processing save:', saveData.projectName);
    // This would typically sync with cloud storage
}

// IndexedDB helpers
function getFromIndexedDB(storeName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('VideoCaptionGenerator', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const getRequest = store.getAll();
            
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => reject(getRequest.error);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { autoIncrement: true });
            }
        };
    });
}

function clearFromIndexedDB(storeName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('VideoCaptionGenerator', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => resolve();
            clearRequest.onerror = () => reject(clearRequest.error);
        };
    });
}

// Push notification handler
self.addEventListener('push', (event) => {
    const options = {
        body: 'Your video caption generation is complete!',
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/badge-72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Captions',
                icon: '/assets/icons/checkmark.png'
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
        options.title = data.title || 'Video Caption Generator';
    }
    
    event.waitUntil(
        self.registration.showNotification('Video Caption Generator', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/?tab=caption-editor')
        );
    } else if (event.action === 'close') {
        // Just close the notification
    } else {
        // Default action - open the app
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handler for communication with the main app
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({ version: CACHE_NAME });
            break;
            
        case 'CLEAR_CACHE':
            event.waitUntil(
                caches.delete(CACHE_NAME).then(() => {
                    event.ports[0].postMessage({ success: true });
                })
            );
            break;
            
        case 'CACHE_URLS':
            event.waitUntil(
                cacheUrls(data.urls).then(() => {
                    event.ports[0].postMessage({ success: true });
                })
            );
            break;
    }
});

// Cache additional URLs
async function cacheUrls(urls) {
    const cache = await caches.open(CACHE_NAME);
    return cache.addAll(urls);
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'content-sync') {
        event.waitUntil(doPeriodicSync());
    }
});

async function doPeriodicSync() {
    console.log('[SW] Performing periodic sync');
    
    try {
        // Sync any pending data
        await handleBackgroundExport();
        await handleBackgroundSave();
        
        // Update cache with fresh content
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(STATIC_CACHE_URLS);
        
        console.log('[SW] Periodic sync completed');
    } catch (error) {
        console.error('[SW] Periodic sync failed:', error);
    }
}

console.log('[SW] Service Worker loaded');