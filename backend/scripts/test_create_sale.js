const axios = require('axios');
(async ()=>{
  try{
    const base = 'http://localhost:5002/api';
    console.log('Login...');
    const login = await axios.post(`${base}/auth/login`, { email: 'admin@gatocafee.com', password: 'admin123' });
    const token = login.data.token;
    console.log('Token length', token.length);

    console.log('List products...');
    const prods = await axios.get(`${base}/productos?disponible=true`, { headers: { Authorization: `Bearer ${token}` } });
    const productos = prods.data.productos || [];
    if (!productos.length) { console.log('No products'); process.exit(0); }
    const p = productos[0];
    console.log('Using product', p.nombre, p._id);

    const payload = {
      items: [{ productoId: p._id, cantidad: 1 }],
      metodoPago: 'efectivo',
      montoPagado: 100000
    };

    console.log('Creating sale...');
    const res = await axios.post(`${base}/ventas`, payload, { headers: { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' } });
    console.log('Sale response:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('ERROR RESPONSE:', err.response.status, err.response.data);
    } else {
      console.error('ERROR', err.message);
    }
    process.exit(1);
  }
})();
