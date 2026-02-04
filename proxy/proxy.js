const http = require('http');
const httpProxy = require('http-proxy');

// Create proxy server
const proxy = httpProxy.createProxyServer({});

// Error handling
proxy.on('error', (err, req, res) => {
    console.error('Proxy error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Proxy error');
});

// Create HTTP server
const server = http.createServer((req, res) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Route to backend API
    if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
        proxy.web(req, res, { target: 'http://localhost:4000' });
    }
    // Route to admin dashboard
    else {
        proxy.web(req, res, { target: 'http://localhost:3000' });
    }
});

// Listen on port 80 (or 8080 if you don't have root access)
const PORT = process.env.PORT || 80;

server.listen(PORT, () => {
    console.log(`🚀 RTM Proxy Server running on port ${PORT}`);
    console.log(`📍 Admin Dashboard: http://rtmadmin.e-clicks.net`);
    console.log(`📍 API: http://rtmadmin.e-clicks.net/api`);
    console.log('');
    console.log('Routing:');
    console.log('  /api/* -> http://localhost:4000');
    console.log('  /uploads/* -> http://localhost:4000');
    console.log('  /* -> http://localhost:3000');
});

// Handle WebSocket upgrades
server.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/api')) {
        proxy.ws(req, socket, head, { target: 'http://localhost:4000' });
    } else {
        proxy.ws(req, socket, head, { target: 'http://localhost:3000' });
    }
});
