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
// Ruta pública para consultar una meta por id (útil para checks desde frontend)
financieroRouter.get('/metas/:id', finCtrl.getMetaPublic);
// Protegemos el resto de rutas
financieroRouter.use(protegerRuta);
financieroRouter.get('/dashboard', finCtrl.getDashboard);
financieroRouter.get('/punto-equilibrio', adminOGerente, finCtrl.getPuntoEquilibrio);
financieroRouter.get('/costos-fijos', adminOGerente, finCtrl.getCostosFijos);
financieroRouter.post('/costos-fijos', adminOGerente, finCtrl.crearCostoFijo);
financieroRouter.put('/costos-fijos/:id', adminOGerente, finCtrl.actualizarCostoFijo);
financieroRouter.delete('/costos-fijos/:id', soloAdmin, finCtrl.eliminarCostoFijo);
financieroRouter.get('/metas', adminOGerente, finCtrl.getMetas);
financieroRouter.post('/metas', adminOGerente, finCtrl.crearOMeta);
financieroRouter.put('/metas/:id', adminOGerente, finCtrl.actualizarMeta);
// Fallback: permitir eliminar por mes+año cuando no haya _id (p.ej. restauraciones)
financieroRouter.delete('/metas/por-mes', soloAdmin, finCtrl.eliminarMetaPorMes);
financieroRouter.delete('/metas/:id', soloAdmin, finCtrl.eliminarMeta);

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

// Permitir que el POS consulte promociones y valide cupones sin token.
promocionesRouter.get('/', promoCtrl.getPromociones);
promocionesRouter.post('/validar-cupon', promoCtrl.validarCupon);
// Rutas de administración requieren autenticación + rol
promocionesRouter.post('/', protegerRuta, adminOGerente, promoCtrl.crearPromocion);
promocionesRouter.put('/:id', protegerRuta, adminOGerente, promoCtrl.actualizarPromocion);

module.exports = { cajaRouter, financieroRouter, reportesRouter, promocionesRouter };
