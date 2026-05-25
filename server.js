const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;
const BYBIT_API = 'https://api.bybit.com';

app.use(cors());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Logging middleware
app.use('/bybit', (req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.originalUrl}`);
  console.log(`  Headers:`, JSON.stringify({
    'x-bybit-apikey': req.headers['x-bybit-api-key'] ? '***' : '(none)',
    'x-bybit-sign': req.headers['x-bybit-sign'] ? '***' : '(none)',
    'x-bybit-timestamp': req.headers['x-bybit-timestamp'] || '(none)',
    'content-type': req.headers['content-type'] || '(none)',
  }));
  next();
});

// Proxy /bybit/* → https://api.bybit.com/*
app.use('/bybit', createProxyMiddleware({
  target: BYBIT_API,
  changeOrigin: true,
  followRedirects: true,
  proxyTimeout: 15000,
  timeout: 15000,
  pathRewrite: { '^/bybit': '' },
  on: {
    proxyReq: (proxyReq, req) => {
      // Preserve all original headers
      if (req.headers['x-bybit-api-key']) {
        proxyReq.setHeader('X-BYBIT-API-KEY', req.headers['x-bybit-api-key']);
      }
      if (req.headers['x-bybit-sign']) {
        proxyReq.setHeader('X-BYBIT-SIGN', req.headers['x-bybit-sign']);
      }
      if (req.headers['x-bybit-timestamp']) {
        proxyReq.setHeader('X-BYBIT-TIMESTAMP', req.headers['x-bybit-timestamp']);
      }
      if (req.headers['x-bybit-recv-window']) {
        proxyReq.setHeader('X-BYBIT-RECV-WINDOW', req.headers['x-bybit-recv-window']);
      }
      proxyReq.setHeader('Origin', 'https://www.bybit.com');
      console.log(`  Proxied: ${req.method} ${proxyReq.path}`);
    },
    proxyRes: (proxyRes, req) => {
      console.log(`  Response: ${proxyRes.statusCode}`);
    },
    error: (err, req, res) => {
      console.error(`  Error: ${err.message}`);
      res.status(502).json({ error: err.message, code: 'PROXY_ERROR' });
    }
  }
}));

// Fallback
app.use((req, res) => {
  res.status(404).json({ error: 'not found', path: req.path });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bybit Proxy running on port ${PORT}`);
});
