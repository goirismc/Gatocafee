// ============================================
// routes/productos.js
// ============================================
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productosController');
const { protegerRuta, adminOGerente } = require('../middleware/auth');

// Rutas públicas para listar/consultar productos (POS puede acceder sin login).
// Protegemos únicamente las rutas que modifican datos con protegerRuta + adminOGerente.

router.get('/', ctrl.getProductos);
router.get('/ranking/top', ctrl.getTopProductos);
router.get('/margenes', protegerRuta, adminOGerente, ctrl.getMargenes);
router.get('/:id', ctrl.getProducto);
router.post('/', protegerRuta, adminOGerente, ctrl.crearProducto);
router.put('/:id', protegerRuta, adminOGerente, ctrl.actualizarProducto);
router.delete('/:id', protegerRuta, adminOGerente, ctrl.eliminarProducto);

module.exports = router;


// ============================================
// routes/ventas.js
// ============================================
const ventasRouter = express.Router();
const ventasCtrl = require('../controllers/ventasController');
const facturasCtrl = require('../controllers/facturasController');

ventasRouter.use(protegerRuta);

ventasRouter.get('/', ventasCtrl.getVentas);
ventasRouter.get('/resumen/hoy', ventasCtrl.getResumenHoy);
ventasRouter.get('/horas-pico', ventasCtrl.getHorasPico);
ventasRouter.get('/comparacion', ventasCtrl.getComparacion);
ventasRouter.get('/:id', ventasCtrl.getVenta);
ventasRouter.post('/', ventasCtrl.crearVenta);
ventasRouter.post('/:id/devolucion', adminOGerente, ventasCtrl.registrarDevolucion);
// Generar factura (PDF) para una venta
ventasRouter.post('/:id/factura', facturasCtrl.generarFactura);

module.exports = { productosRouter: router, ventasRouter };
