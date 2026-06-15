// Script de prueba sin dependencias externas: usa fetch global (Node 18+)
// Ejecutar: node backend/scripts/test_create_sale_fetch.js

const fs = require('fs');
const base = 'http://localhost:5002/api';

async function waitHealth(timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) return true;
    } catch (e) {
      // ignore
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

(async () => {
  try {
    console.log('Esperando health endpoint...');
    const ok = await waitHealth(15000);
    if (!ok) throw new Error('Backend no responde en /api/health');

    console.log('Haciendo login...');
    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gatocafee.com', password: 'admin123' }),
    });
    const loginJson = await loginRes.json();
    if (!loginRes.ok) throw new Error('Login falló: ' + JSON.stringify(loginJson));
    const token = loginJson.token;
    console.log('Token obtenido, len=', token?.length);

    console.log('Solicitando productos...');
    const prodsRes = await fetch(`${base}/productos?disponible=true`, { headers: { Authorization: `Bearer ${token}` } });
    const prodsJson = await prodsRes.json();
    if (!prodsRes.ok) throw new Error('Productos fetch falló: ' + JSON.stringify(prodsJson));
    const productos = prodsJson.productos || [];
    if (!productos.length) throw new Error('No hay productos disponibles para la prueba');
    const p = productos[0];
    console.log('Usando producto:', p.nombre, p._id);

    const payload = {
      items: [{ productoId: p._id, cantidad: 1 }],
      metodoPago: 'efectivo',
      montoPagado: Math.max(10000, p.precioVenta)
    };

    console.log('Creando venta...');
    const ventaRes = await fetch(`${base}/ventas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const ventaJson = await ventaRes.json();
    if (!ventaRes.ok) {
      console.error('RESPUESTA ERROR', ventaRes.status, ventaJson);
      process.exit(1);
    }
    console.log('Venta creada:', ventaJson);
    process.exit(0);
  } catch (e) {
    console.error('ERROR TEST:', e.message);
    process.exit(1);
  }
})();
