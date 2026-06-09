// ============================================
// INTEGRAR-EN-SERVER.js — Parte 3
// Agrega estas líneas al server.js principal
// ============================================

// ── 1. AGREGAR ESTE REQUIRE (junto a los otros de rutas) ──

const {
  cajaRouter,
  financieroRouter,
  reportesRouter,
  promocionesRouter,
} = require('./routes/parte3');


// ── 2. AGREGAR ESTOS app.use() (en la sección de rutas) ──

// app.use('/api/caja',        cajaRouter);
// app.use('/api/financiero',  financieroRouter);
// app.use('/api/reportes',    reportesRouter);
// app.use('/api/promociones', promocionesRouter);


// ── 3. TU SECCIÓN DE RUTAS COMPLETA QUEDARÁ ASÍ ──

/*
// Parte 1
app.use('/api/auth',        require('./routes/auth'));

// Parte 2
const { productosRouter, ventasRouter } = require('./routes/productosVentas');
const { inventarioRouter, clientesRouter } = require('./routes/inventarioClientes');
app.use('/api/productos',   productosRouter);
app.use('/api/ventas',      ventasRouter);
app.use('/api/inventario',  inventarioRouter);
app.use('/api/clientes',    clientesRouter);

// Parte 3
const { cajaRouter, financieroRouter, reportesRouter, promocionesRouter } = require('./routes/parte3');
app.use('/api/caja',        cajaRouter);
app.use('/api/financiero',  financieroRouter);
app.use('/api/reportes',    reportesRouter);
app.use('/api/promociones', promocionesRouter);
*/

console.log('✅ Instrucciones de integración Parte 3 cargadas');
