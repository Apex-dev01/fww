const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve the static client-side files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Proxy middleware for handling decoded URLs
// The path looks like /proxy/{base64-encoded-url}
app.use('/proxy/:url', (req, res, next) => {
    try {
        // Decode the base64 URL from the request parameters
        const decodedUrl = Buffer.from(req.params.url, 'base64').toString('utf-8');
        
        // Remove the /proxy prefix from the request path before forwarding
        // and append the rest of the original path
        const restOfPath = req.originalUrl.substring(req.originalUrl.indexOf(req.params.url) + req.params.url.length);

        // Configure the proxy with the decoded target
        const proxyConfig = {
            target: decodedUrl,
            changeOrigin: true,
            selfHandleResponse: true, // Handle the response ourselves
            onProxyReq: (proxyReq, req, res) => {
                // Remove the 'host' header to prevent issues with some sites
                proxyReq.removeHeader('host');
                // Remove the /proxy path from the request before forwarding
                const targetUrl = new URL(decodedUrl);
                proxyReq.path = targetUrl.pathname + targetUrl.search + restOfPath;
            },
            onProxyRes: (proxyRes, req, res) => {
                // Set a custom header to identify the proxied response
                res.setHeader('X-Proxy-Response', 'true');
                proxyRes.pipe(res);
            },
            onError: (err, req, res) => {
                console.error('Proxy error:', err);
                res.status(500).send('Proxy Error');
            }
        };

        createProxyMiddleware(proxyConfig)(req, res, next);

    } catch (error) {
        console.error('URL decoding error:', error);
        res.status(400).send('Invalid URL format');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
