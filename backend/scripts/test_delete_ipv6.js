const http = require('http');

function doReq(host) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ mes: 6, ['a\u00f1o']: 2026 });
    const options = {
      hostname: host,
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
      console.log('HOST', host, 'STATUS', res.statusCode);
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        console.log('BODY', body);
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error('HOST', host, 'ERR', err && err.stack ? err.stack : err);
      resolve();
    });

    req.write(data);
    req.end();
  });
}

(async () => {
  await doReq('127.0.0.1');
  await doReq('::1');
})();
