// This Service Worker intercepts all network requests from the proxied page.

const proxyPrefix = '/proxy/';

// Function to encode a URL to Base64
const encodeUrl = (url) => btoa(url);

// Main fetch event listener
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Do not intercept requests for the Service Worker itself
    if (url.pathname === '/sw.js') {
        return;
    }

    // Do not intercept already proxied URLs to avoid an infinite loop.
    // We check if the pathname starts with our defined proxy prefix.
    if (url.pathname.startsWith(proxyPrefix)) {
        return;
    }

    // A check to ensure we only proxy requests that originate from our own site.
    // This prevents the Service Worker from trying to proxy external URLs.
    if (url.origin !== self.location.origin) {
        return;
    }

    // Intercept the request and rewrite its URL to go through our proxy.
    const proxiedUrl = new URL(proxyPrefix + encodeUrl(event.request.url), self.location.origin);

    // Respond with the proxied request, enabling CORS
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
