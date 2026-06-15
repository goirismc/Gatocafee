(async () => {
  try {
    const fetchFn = (typeof fetch !== 'undefined') ? fetch : (await import('node-fetch')).default;
    const base = 'http://localhost:5001/api';

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

    // Crear venta de prueba
    const saleBody = {
      items: [ { productoId: '6a289269d5252ce5c663cb3a', cantidad: 1 } ],
      metodoPago: 'efectivo',
      montoPagado: 10000,
      canal: 'mostrador',
      nombreClienteRapido: 'Prueba Automática'
    };

    const saleResp = await fetchFn(`${base}/ventas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(saleBody),
    });

    const saleJson = await saleResp.json();
    console.log('SALE_RESPONSE:', JSON.stringify(saleJson));
    if (saleJson && saleJson.venta && saleJson.venta.id) {
      console.log('Venta creada con ID:', saleJson.venta.id);
      process.exit(0);
    }
    process.exit(1);
  } catch (e) {
    console.error('ERROR_SCRIPT:', e);
    process.exit(1);
  }
})();
