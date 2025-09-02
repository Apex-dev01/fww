// This Service Worker intercepts all network requests from the proxied page.

const proxyPrefix = '/proxy/';

// Function to encode a URL to Base64
const encodeUrl = (url) => btoa(url);

// Main fetch event listener
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Only handle requests that are not for the Service Worker itself
    // to avoid an infinite loop.
    if (url.pathname === '/sw.js') {
        return;
    }
    
    // Do not intercept our own proxy URL
    if (url.pathname.startsWith(proxyPrefix)) {
        return;
    }

    // Intercept all requests originating from the proxied page
    // and rewrite their URL to go through our proxy.
    const newUrl = new URL(event.request.url);
    const proxiedUrl = proxyPrefix + encodeUrl(newUrl.href);

    event.respondWith(
        fetch(proxiedUrl, { mode: 'cors' })
        .catch(error => {
            console.error('Fetch failed:', error);
            // Optionally, return a custom error response
            return new Response("An error occurred while fetching the proxied resource.", {
                status: 500
            });
        })
    );
});
