const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Bybit API base
const BYBIT_API = 'https://api.bybit.com';

app.use(cors());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Proxy all /bybit/* to Bybit API
app.use('/bybit', createProxyMiddleware({
  target: BYBIT_API,
  changeOrigin: true,
  pathRewrite: { '^/bybit': '' },
  onProxyReq: (proxyReq) => {
    proxyReq.setHeader('origin', 'https://www.bybit.com');
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(502).json({ error: err.message });
  }
}));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bybit Proxy running on port ${PORT}`);
});
