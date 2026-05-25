const https = require('https');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const BYBIT_API_KEY=process.env.BYBIT_API_KEY || '';
const BYBIT_API_SECRET=process.env.BYBIT_API_SECRET || '';

console.log('Starting...');
console.log('KEY:', BYBIT_API_KEY ? 'SET' : 'NOT SET');

function signReq(ts, qs, body) {
  // v5: GET -> timestamp+apiKey+recv+queryString, POST -> timestamp+apiKey+recv+jsonBody
  const payload = body ? JSON.stringify(body) : (qs || '');
  const str = ts + BYBIT_API_KEY + '5000' + payload;
  return crypto.createHmac('sha256', BYBIT_API_SECRET).update(str).digest('hex');
}

function callApi(method, urlPath, qs, body) {
  return new Promise((resolve) => {
    const ts = Date.now().toString();
    const sig = signReq(ts, qs || '', body);
    const fullPath = urlPath + (qs ? '?' + qs : '');

    const opts = {
      hostname: 'api.bybit.com',
      path: fullPath,
      method,
      headers: {
        'X-BAPI-API-KEY': BYBIT_API_KEY,
        'X-BAPI-TIMESTAMP': ts,
        'X-BAPI-SIGN': sig,
        'X-BAPI-RECV-WINDOW': '5000',
      }
    };
    if (body) opts.headers['Content-Type'] = 'application/json';

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ s: res.statusCode, d: data }));
    });
    req.on('error', (e) => resolve({ s: 0, d: 'ERR:' + e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

app.get('/health', (req, res) => {
  res.json({ ok: true, ready: !!(BYBIT_API_KEY && BYBIT_API_SECRET) });
});

app.all('/bybit/*', async (req, res) => {
  try {
    if (!BYBIT_API_KEY || !BYBIT_API_SECRET) {
      return res.status(500).json({ e: 'no creds' });
    }
    const bp = req.path.replace(/^\/bybit/, '') || '/';
    const qs = req.url.split('?')[1] || '';
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : null;
    const r = await callApi(req.method, bp, qs, body);
    res.status(r.s || 502).type('json').send(r.d || '{}');
  } catch (err) {
    res.status(502).json({ e: err.message });
  }
});

app.listen(PORT, () => console.log('Running on', PORT));
