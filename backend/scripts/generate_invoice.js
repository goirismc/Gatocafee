(async () => {
  try {
    const fetchFn = (typeof fetch !== 'undefined') ? fetch : (await import('node-fetch')).default;
    const base = 'http://localhost:5001/api';
    const saleId = '6a2a428004d4dc47d2b14588';

    // Login
    const loginResp = await fetchFn(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cajero@gatocafee.com', password: 'cajero123' }),
    });
    const loginJson = await loginResp.json();
    console.log('LOGIN_RESPONSE:', JSON.stringify(loginJson));
    if (!loginJson || !loginJson.token) {
      console.error('No se obtuvo token.');
      process.exit(1);
    }
    const token = loginJson.token;

    // Generar factura
    const resp = await fetchFn(`${base}/ventas/${saleId}/factura`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({}),
    });

    const json = await resp.json();
    console.log('FACTURA_RESPONSE:', JSON.stringify(json));
    if (json && json.success) {
      console.log('Factura generada con archivoUrl:', json.archivoUrl || json.factura?.archivoUrl);
      process.exit(0);
    }
    process.exit(1);
  } catch (e) {
    console.error('ERROR_SCRIPT:', e);
    process.exit(1);
  }
})();
