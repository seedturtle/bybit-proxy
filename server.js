const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Read Bybit API credentials from environment
const BYBIT_API_KEY = process.env.BYBIT_API_KEY;
const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET;

function signRequest(timestamp, queryString) {
  const signStr = timestamp + BYBIT_API_KEY + '5000' + queryString;
  return crypto.createHmac('sha256', BYBIT_API_SECRET).update(signStr).digest('hex');
}

function bybitRequest(method, path, queryString, body) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now().toString();
    const qs = queryString || '';
    const signature = signRequest(timestamp, qs);
    
    const urlPath = path + (qs ? '?' + qs : '');
    const options = {
      hostname: 'api.bybit.com',
      path: urlPath,
      method: method,
      headers: {
        'X-BYBIT-API-KEY': BYBIT_API_KEY,
        'X-BYBIT-TIMESTAMP': timestamp,
        'X-BYBIT-SIGN': signature,
        'X-BYBIT-RECV-WINDOW': '5000',
        'Content-Type': 'application/json',
        'Origin': 'https://www.bybit.com',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Bybit proxy - any method, any path under /bybit/
app.all('/bybit/*', async (req, res) => {
  try {
    const bybitPath = req.path.replace('/bybit', '');
    const qs = req.url.split('?')[1] || '';
    
    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      body = req.body;
    }
    
    const result = await bybitRequest(req.method, bybitPath, qs, body);
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(502).json({ error: err.message, code: 'PROXY_ERROR' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bybit Proxy running on port ${PORT}`);
  console.log(`API Key configured: ${BYBIT_API_KEY ? '✅' : '❌'}`);
});
