const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to decode the Base64 URL
const decodeUrlMiddleware = (req, res, next) => {
    try {
        const decodedUrl = Buffer.from(req.params.encodedUrl, 'base64').toString('utf-8');
        req.targetUrl = decodedUrl;
        next();
    } catch (e) {
        res.status(400).send('Invalid URL encoding');
    }
};

// New route to handle direct requests to /search/
app.get('/search/:encodedUrl', (req, res) => {
    // Redirect the request to the correct proxy route
    res.redirect(`/proxy/${req.params.encodedUrl}`);
});

// Proxy route that takes a Base64 encoded URL
app.use('/proxy/:encodedUrl', decodeUrlMiddleware, (req, res, next) => {
    const target = req.targetUrl;

    // Remove protocol for the proxy target
    const proxyTarget = target.startsWith('http') ? target : `https://${target}`;

    // Create the proxy middleware instance for the dynamic target
    const proxy = createProxyMiddleware({
        target: proxyTarget,
        changeOrigin: true,
        selfHandleResponse: true, // Handle the response ourselves to potentially rewrite it
        logger: console,
        onProxyRes: function (proxyRes, req, res) {
            // Check content type to avoid messing with non-text files
            const contentType = proxyRes.headers['content-type'];
            if (contentType && contentType.includes('text/html')) {
                // Buffer the response
                const originalWrite = res.write;
                const originalEnd = res.end;
                let body = Buffer.from([]);
                proxyRes.on('data', (chunk) => {
                    body = Buffer.concat([body, chunk]);
                });
                proxyRes.on('end', () => {
                    const html = body.toString('utf8');
                    // Simple URL rewrite to ensure relative links work correctly
                    const rewrittenHtml = html.replace(/href="\//g, `href="/proxy/${req.params.encodedUrl}/`);
                    res.setHeader('Content-Length', Buffer.byteLength(rewrittenHtml));
                    res.write(rewrittenHtml);
                    res.end();
                });
            } else {
                // For non-HTML files, just stream the response as-is
                proxyRes.pipe(res);
            }
        },
        onProxyReq: (proxyReq, req, res) => {
            // Optional: Modify the proxy request
            if (proxyReq.getHeader('referer')) {
                proxyReq.setHeader('referer', proxyTarget);
            }
        },
        onError: (err, req, res) => {
            console.error('Proxy error:', err);
            res.status(500).send('Proxy error: ' + err.message);
        }
    });
    proxy(req, res, next);
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to serve the main HTML page for any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
