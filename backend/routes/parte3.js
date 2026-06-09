// ============================================
// routes/parte3.js
// Rutas de Caja, Reportes, Financiero y Promociones
// ============================================

const express = require('express');
const { protegerRuta, adminOGerente, soloAdmin } = require('../middleware/auth');

// ── CAJA ──
const cajaRouter = express.Router();
const cajaCtrl = require('../controllers/cajaController');
cajaRouter.use(protegerRuta);
cajaRouter.get('/actual', cajaCtrl.getCajaActual);
cajaRouter.get('/historial', adminOGerente, cajaCtrl.getHistorial);
cajaRouter.post('/abrir', cajaCtrl.abrirCaja);
cajaRouter.post('/:id/cerrar', cajaCtrl.cerrarCaja);

// ── FINANCIERO ──
const financieroRouter = express.Router();
const finCtrl = require('../controllers/financieroController');
financieroRouter.use(protegerRuta);
financieroRouter.get('/dashboard', finCtrl.getDashboard);
financieroRouter.get('/punto-equilibrio', adminOGerente, finCtrl.getPuntoEquilibrio);
financieroRouter.get('/costos-fijos', adminOGerente, finCtrl.getCostosFijos);
financieroRouter.post('/costos-fijos', adminOGerente, finCtrl.crearCostoFijo);
financieroRouter.put('/costos-fijos/:id', adminOGerente, finCtrl.actualizarCostoFijo);
financieroRouter.delete('/costos-fijos/:id', soloAdmin, finCtrl.eliminarCostoFijo);
financieroRouter.get('/metas', adminOGerente, finCtrl.getMetas);
financieroRouter.post('/metas', adminOGerente, finCtrl.crearOMeta);

// ── REPORTES ──
const reportesRouter = express.Router();
const reportesCtrl = require('../controllers/reportesController');
reportesRouter.use(protegerRuta);
reportesRouter.get('/factura/:ventaId', reportesCtrl.generarFacturaPDF);
reportesRouter.get('/ventas/excel', adminOGerente, reportesCtrl.exportarVentasExcel);
reportesRouter.get('/turno/:turno', reportesCtrl.getReporteTurno);

// ── PROMOCIONES ──
const promocionesRouter = express.Router();
const promoCtrl = require('../controllers/promocionesController');
promocionesRouter.use(protegerRuta);
promocionesRouter.get('/', promoCtrl.getPromociones);
promocionesRouter.post('/', adminOGerente, promoCtrl.crearPromocion);
promocionesRouter.post('/validar-cupon', promoCtrl.validarCupon);
promocionesRouter.put('/:id', adminOGerente, promoCtrl.actualizarPromocion);

module.exports = { cajaRouter, financieroRouter, reportesRouter, promocionesRouter };
