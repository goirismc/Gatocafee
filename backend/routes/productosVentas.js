// ============================================
// routes/productos.js
// ============================================
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productosController');
const { protegerRuta, adminOGerente } = require('../middleware/auth');

router.use(protegerRuta); // Todas las rutas requieren token

router.get('/', ctrl.getProductos);
router.get('/ranking/top', ctrl.getTopProductos);
router.get('/margenes', adminOGerente, ctrl.getMargenes);
router.get('/:id', ctrl.getProducto);
router.post('/', adminOGerente, ctrl.crearProducto);
router.put('/:id', adminOGerente, ctrl.actualizarProducto);
router.delete('/:id', adminOGerente, ctrl.eliminarProducto);

module.exports = router;


// ============================================
// routes/ventas.js
// ============================================
const ventasRouter = express.Router();
const ventasCtrl = require('../controllers/ventasController');

ventasRouter.use(protegerRuta);

ventasRouter.get('/', ventasCtrl.getVentas);
ventasRouter.get('/resumen/hoy', ventasCtrl.getResumenHoy);
ventasRouter.get('/horas-pico', ventasCtrl.getHorasPico);
ventasRouter.get('/comparacion', ventasCtrl.getComparacion);
ventasRouter.get('/:id', ventasCtrl.getVenta);
ventasRouter.post('/', ventasCtrl.crearVenta);
ventasRouter.post('/:id/devolucion', adminOGerente, ventasCtrl.registrarDevolucion);

module.exports = { productosRouter: router, ventasRouter };
