// This Service Worker intercepts all network requests from the proxied page.

const proxyPrefix = location.protocol + '//' + location.host + '/proxy/';

// Function to encode a URL to Base64
const encodeUrl = (url) => btoa(url);

// Main fetch event listener
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Do not intercept our own proxy URL
    if (url.pathname.startsWith('/proxy/')) {
        return;
    }

    // Intercept requests for resources and links from the proxied page.
    // We check if the request is coming from our own origin, which means it
    // is a resource loaded by the content inside the iframe.
    if (url.origin === location.origin) {
        const newUrl = proxyPrefix + encodeUrl(url.href);
        // Respond with the proxied request, enabling CORS
        event.respondWith(fetch(newUrl, { mode: 'cors' }));
        return;
    }
});
