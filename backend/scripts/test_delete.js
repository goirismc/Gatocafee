const http = require('http');

const data = JSON.stringify({ mes: 6, ['a\u00f1o']: 2026 });

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/financiero/metas/por-mes',
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
  timeout: 5000,
};

const req = http.request(options, (res) => {
  console.log('STATUS', res.statusCode);
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    try {
      console.log('BODY', body);
    } catch (e) {
      console.log('BODY-RAW', body);
    }
    process.exit(0);
  });
});

req.on('error', (err) => {
  console.error('ERR', err.stack || err);
  process.exit(1);
});

req.write(data);
req.end();
