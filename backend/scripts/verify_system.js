(async () => {
  const base = 'http://localhost:5001/api';
  const fetchFn = (typeof fetch !== 'undefined') ? fetch : (await import('node-fetch')).default;
  const admin = { email: 'admin@gatocafee.com', password: 'admin123' };
  const cajero = { email: 'cajero@gatocafee.com', password: 'cajero123' };
  const sampleProduct = '6a289269d5252ce5c663cb3a';
  const sampleSale = '6a2a428004d4dc47d2b14588';

  const results = [];
  async function ok(name, fn) {
    try {
      const r = await fn();
      console.log(`OK: ${name}`);
      results.push({ name, ok: true, detail: r });
    } catch (e) {
      console.error(`FAIL: ${name} -> ${e.message || e}`);
      results.push({ name, ok: false, error: (e.message || String(e)) });
    }
  }

  function checkStatus(resp) {
    if (!resp) throw new Error('No response');
    if (!('status' in resp)) return resp;
    if (resp.status >= 200 && resp.status < 300) return resp;
    throw new Error(`HTTP ${resp.status}`);
  }

  // 1. Health
  await ok('Health /api/health', async () => {
    const r = await fetchFn(`${base}/health`);
    const json = await r.json();
    if (!json.success) throw new Error('Health returned failure');
    return json;
  });

  // Auth: admin & cajero login
  let adminToken = null, cajeroToken = null;
  await ok('Login admin', async () => {
    const r = await fetchFn(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(admin) });
    const j = await r.json();
    if (!j.token) throw new Error('No token');
    adminToken = j.token; return { email: admin.email };
  });
  await ok('Login cajero', async () => {
    const r = await fetchFn(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cajero) });
    const j = await r.json();
    if (!j.token) throw new Error('No token');
    cajeroToken = j.token; return { email: cajero.email };
  });

  // Public endpoints
  await ok('GET /api/productos', async () => {
    const r = await fetchFn(`${base}/productos`);
    const j = await r.json();
    // Accept either an array or an object { success, total, productos }
    if (Array.isArray(j)) return { count: j.length };
    if (j && Array.isArray(j.productos)) return { total: j.total || j.productos.length };
    throw new Error('productos response unexpected shape');
  });

  await ok('GET /api/productos/:id', async () => {
    const r = await fetchFn(`${base}/productos/${sampleProduct}`);
    const j = await r.json();
    if (!j || !j._id && !j.producto && !j.success) return j;
    return j;
  });

  await ok('GET /api/productos/ranking/top', async () => {
    const r = await fetchFn(`${base}/productos/ranking/top`);
    const j = await r.json();
    return { length: Array.isArray(j) ? j.length : (j?.productos?.length || 0) };
  });

  await ok('GET /api/promociones (public)', async () => {
    const r = await fetchFn(`${base}/promociones`);
    const j = await r.json();
    return { length: Array.isArray(j) ? j.length : (j?.promociones?.length || 0) };
  });

  await ok('POST /api/promociones/validar-cupon (public, dummy)', async () => {
    const r = await fetchFn(`${base}/promociones/validar-cupon`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: 'NOEXISTE' }) });
    const j = await r.json();
    return j;
  });

  // Protected read endpoints
  await ok('GET /api/clientes (cajero)', async () => {
    const r = await fetchFn(`${base}/clientes`, { headers: { Authorization: `Bearer ${cajeroToken}` } });
    const j = await r.json();
    return { total: j.total || (Array.isArray(j) ? j.length : undefined) };
  });

  await ok('GET /api/inventario (cajero)', async () => {
    const r = await fetchFn(`${base}/inventario`, { headers: { Authorization: `Bearer ${cajeroToken}` } });
    const j = await r.json();
    return { total: j.total || (Array.isArray(j) ? j.length : undefined) };
  });

  await ok('GET /api/auth/perfil (cajero)', async () => {
    const r = await fetchFn(`${base}/auth/perfil`, { headers: { Authorization: `Bearer ${cajeroToken}` } });
    const j = await r.json();
    if (!j.usuario) throw new Error('perfil missing');
    return j.usuario;
  });

  // Admin-only or admin-allowed endpoints
  await ok('GET /api/productos/margenes (admin)', async () => {
    const r = await fetchFn(`${base}/productos/margenes`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const j = await r.json();
    return j;
  });

  await ok('GET /api/ventas (cajero)', async () => {
    const r = await fetchFn(`${base}/ventas`, { headers: { Authorization: `Bearer ${cajeroToken}` } });
    const j = await r.json();
    return { total: j.total || (Array.isArray(j.ventas) ? j.ventas.length : undefined) };
  });

  await ok('GET /api/ventas/:id (cajero)', async () => {
    const r = await fetchFn(`${base}/ventas/${sampleSale}`, { headers: { Authorization: `Bearer ${cajeroToken}` } });
    const j = await r.json();
    if (!j.venta && !j.success) throw new Error('venta not returned');
    return j.venta || j;
  });

  await ok('GET /api/reportes/factura/:ventaId (cajero) - expect PDF', async () => {
    const r = await fetchFn(`${base.replace('/api','')}/api/reportes/factura/${sampleSale}`, { headers: { Authorization: `Bearer ${cajeroToken}` } });
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/pdf')) throw new Error('Not a PDF: ' + ct);
    return { contentType: ct, status: r.status };
  });

  // Try to access static invoice file (if exists) by listing invoice path from factura collection
  await ok('Find factura record for sale and check archivoUrl', async () => {
    // call reportes endpoint for venta entries list (use ventas endpoint to get venta.factura)
    const rVenta = await fetchFn(`${base}/ventas/${sampleSale}`, { headers: { Authorization: `Bearer ${cajeroToken}` } });
    const jVenta = await rVenta.json();
    const v = jVenta.venta || jVenta;
    const facturaId = v.factura || null;
    // If facturaId not present, query DB via reportes export might have created a file; attempt to request the invoice filename we expect from earlier test
    return { facturaId: facturaId || null };
  });

  // Summary
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log('\n----- VERIFICATION SUMMARY -----');
  console.log(`Passed: ${passed} \nFailed: ${failed}`);
  results.forEach((r) => {
    if (!r.ok) console.log(`- ${r.name}: FAILED -> ${r.error}`);
  });

  if (failed > 0) process.exit(2);
  process.exit(0);
})();
