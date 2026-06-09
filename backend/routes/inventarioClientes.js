// ============================================
// routes/inventario.js
// ============================================
const express = require('express');
const { protegerRuta, adminOGerente } = require('../middleware/auth');
const inventarioCtrl = require('../controllers/inventarioController');
const clientesCtrl = require('../controllers/clientesController');

// ── Inventario ──
const inventarioRouter = express.Router();
inventarioRouter.use(protegerRuta);

inventarioRouter.get('/', inventarioCtrl.getInventario);
inventarioRouter.get('/alertas', inventarioCtrl.getAlertas);
inventarioRouter.post('/', adminOGerente, inventarioCtrl.crearItem);
inventarioRouter.put('/:id', adminOGerente, inventarioCtrl.actualizarItem);
inventarioRouter.post('/:id/movimiento', inventarioCtrl.registrarMovimiento);
inventarioRouter.get('/:id/historial', inventarioCtrl.getHistorial);

// ── Clientes ──
const clientesRouter = express.Router();
clientesRouter.use(protegerRuta);

clientesRouter.get('/', clientesCtrl.getClientes);
clientesRouter.get('/frecuentes/top', clientesCtrl.getClientesFrecuentes);
clientesRouter.get('/buscar-rapido', clientesCtrl.buscarRapido);
clientesRouter.get('/:id', clientesCtrl.getCliente);
clientesRouter.post('/', clientesCtrl.crearCliente);
clientesRouter.put('/:id', clientesCtrl.actualizarCliente);

module.exports = { inventarioRouter, clientesRouter };
