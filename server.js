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

console.log('=== Starting ===');
console.log('KEY:', BYBIT_API_KEY ? 'set' : 'NOT SET');
console.log('SECRET:', BYBIT_API_SECRET ? 'set' : 'NOT SET');

function sign(ts, path, body) {
  const str = ts + BYBIT_API_KEY + '5000' + (body ? JSON.stringify(body) : path);
  return crypto.createHmac('sha256', BYBIT_API_SECRET).update(str).digest('hex');
}

function api(method, urlPath, body) {
  return new Promise((resolve) => {
    const ts = Date.now().toString();
    const bodyStr = body ? JSON.stringify(body) : '';
    const signStr = body ? bodyStr : urlPath;
    const sig = sign(ts, urlPath, body);

    const opts = {
      hostname: 'api.bybit.com',
      path: urlPath,
      method,
      headers: {
        'X-BYBIT-API-KEY': BYBIT_API_KEY,
        'X-BYBIT-TIMESTAMP': ts,
        'X-BYBIT-SIGN': sig,
        'X-BYBIT-RECV-WINDOW': '5000',
      }
    };
    if (body) opts.headers['Content-Type'] = 'application/json';

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, raw: data }));
    });
    req.on('error', (e) => resolve({ status: 0, raw: 'ERROR:' + e.message }));
    if (body) req.write(bodyStr);
    req.end();
  });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), ready: !!(BYBIT_API_KEY && BYBIT_API_SECRET) });
});

// Debug endpoint - raw test
app.all('/test', async (req, res) => {
  const method = req.query.method || 'GET';
  const rp = req.query.path || '/v5/market/time';
  const body = req.query.body ? JSON.parse(req.query.body) : null;
  const result = await api(method, rp, body);
  res.json(result);
});

// Bybit proxy
app.all('/bybit/*', async (req, res) => {
  try {
    const bp = req.path.replace(/^\/bybit/, '') || '/';
    const qs = req.url.split('?')[1] || '';
    const urlPath = bp + (qs ? '?' + qs : '');
    const body = ['POST','PUT','PATCH'].includes(req.method) ? req.body : null;
    
    const result = await api(req.method, urlPath, body);
    if (result.raw) {
      try {
        res.status(result.status).json(JSON.parse(result.raw));
      } catch {
        res.status(result.status).send(result.raw);
      }
    } else {
      res.status(result.status || 502).json({ error: 'empty response' });
    }
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Running on ${PORT}`));

// Debug: show what signing would produce
app.get('/debug-env', (req, res) => {
  const ts = Date.now().toString();
  const qs = req.query.qs || '';
  const str = ts + BYBIT_API_KEY + '5000' + qs;
  const sig = crypto.createHmac('sha256', BYBIT_API_SECRET).update(str).digest('hex');
  res.json({
    keyPrefix: BYBIT_API_KEY ? BYBIT_API_KEY.substring(0, 8) + '...' : 'EMPTY',
    keyLength: BYBIT_API_KEY ? BYBIT_API_KEY.length : 0,
    secretSet: !!BYBIT_API_SECRET,
    timestamp: ts,
    signString: str.substring(0, 20) + '...' + str.substring(str.length - 8),
    signature: sig.substring(0, 20) + '...',
  });
});

app.get('/debug-env', (req, res) => {
  const ts = Date.now().toString();
  const qs = req.query.qs || '';
  const str = ts + BYBIT_API_KEY + '5000' + qs;
  const sig = crypto.createHmac('sha256', BYBIT_API_SECRET).update(str).digest('hex');
  res.json({
    keyPrefix: BYBIT_API_KEY ? BYBIT_API_KEY.substring(0, 8) + '...' : 'EMPTY',
    keyLength: BYBIT_API_KEY ? BYBIT_API_KEY.length : 0,
    secretSet: !!BYBIT_API_SECRET,
    timestamp: ts,
    signStr: str.substring(0, 25) + '...',
    signature: sig.substring(0, 20) + '...',
  });
});
