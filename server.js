const https = require('https');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const BYBIT_API_KEY = process.env.BYBIT_API_KEY || '';
const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET || '';

console.log('=== Bybit Proxy Starting ===');
console.log('BYBIT_API_KEY:', BYBIT_API_KEY ? 'SET' : 'NOT SET');
console.log('BYBIT_API_SECRET:', BYBIT_API_SECRET ? 'SET' : 'NOT SET');

function sign(timestamp, qs) {
  const data = timestamp + BYBIT_API_KEY + '5000' + (qs || '');
  return crypto.createHmac('sha256', BYBIT_API_SECRET).update(data).digest('hex');
}

function doRequest(method, path, qs, body) {
  return new Promise((resolve, reject) => {
    const ts = Date.now().toString();
    const sig = sign(ts, qs);
    
    const urlPath = path + (qs ? '?' + qs : '');
    const opts = {
      hostname: 'api.bybit.com',
      path: urlPath,
      method,
      headers: {
        'X-BYBIT-API-KEY': BYBIT_API_KEY,
        'X-BYBIT-TIMESTAMP': ts,
        'X-BYBIT-SIGN': sig,
        'X-BYBIT-RECV-WINDOW': '5000',
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), ready: !!(BYBIT_API_KEY && BYBIT_API_SECRET) });
});

app.all('/bybit/*', async (req, res) => {
  try {
    if (!BYBIT_API_KEY || !BYBIT_API_SECRET) {
      return res.status(500).json({ error: 'Bybit credentials not configured' });
    }
    const bp = req.path.replace(/^\/bybit/, '');
    const qs = req.url.split('?')[1] || '';
    const body = ['POST','PUT','PATCH'].includes(req.method) ? req.body : null;
    const result = await doRequest(req.method, bp, qs, body);
    res.status(result.status).json(result.body);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
