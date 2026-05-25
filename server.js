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

console.log('Starting...');
console.log('KEY:', BYBIT_API_KEY ? 'SET' : 'NOT SET');
console.log('SECRET:', BYBIT_API_SECRET ? 'SET' : 'NOT SET');

function signRequest(ts, qs, bodyData) {
  const payload = bodyData ? JSON.stringify(bodyData) : (qs || '');
  const str = String(ts) + BYBIT_API_KEY + '5000' + payload;
  return crypto.createHmac('sha256', BYBIT_API_SECRET).update(str).digest('hex');
}

function apiCall(method, urlPath, queryString, bodyData) {
  return new Promise((resolve) => {
    const ts = String(Date.now());
    const sig = signRequest(ts, queryString || '', bodyData);
    const fullPath = urlPath + (queryString ? '?' + queryString : '');
    
    const options = {
      hostname: 'api.bybit.com',
      path: fullPath,
      method: method,
      headers: {
        'X-BYBIT-API-KEY': BYBIT_API_KEY,
        'X-BYBIT-TIMESTAMP': ts,
        'X-BYBIT-SIGN': sig,
        'X-BYBIT-RECV-WINDOW': '5000',
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.stringify(JSON.parse(data)) }); }
        catch { resolve({ status: res.statusCode, data: data }); }
      });
    });
    req.on('error', (e) => resolve({ status: 0, data: JSON.stringify({ error: e.message }) }));
    if (bodyData) req.write(JSON.stringify(bodyData));
    req.end();
  });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', ready: !!(BYBIT_API_KEY && BYBIT_API_SECRET) });
});

app.all('/bybit/*', async (req, res) => {
  try {
    if (!BYBIT_API_KEY || !BYBIT_API_SECRET) {
      return res.status(500).json({ error: 'credentials not set' });
    }
    const bp = req.path.replace(/^\/bybit/, '') || '/';
    const qs = req.url.split('?')[1] || '';
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : null;
    const result = await apiCall(req.method, bp, qs, body);
    res.status(result.status || 502).type('json').send(result.data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log('Running on', PORT));
