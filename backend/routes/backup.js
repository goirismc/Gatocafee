// ============================================
// routes/backup.js
// Rutas para crear, listar, descargar y eliminar backups
// ============================================

const express = require('express');
const { protegerRuta, adminOGerente, soloAdmin } = require('../middleware/auth');
const backupCtrl = require('../controllers/backupController');

const router = express.Router();

router.use(protegerRuta);

// Crear backup completo (administrador o gerente)
router.post('/crear', adminOGerente, backupCtrl.crearBackup);

// Listar archivos de backup (administrador o gerente)
router.get('/listar', adminOGerente, backupCtrl.listarBackups);

// Descargar backup por nombre
router.get('/descargar/:archivo', adminOGerente, backupCtrl.descargarBackup);

// Descargar como JSON base64 (fallback para clientes que no soporten descarga directa)
router.get('/descargar-json/:archivo', adminOGerente, backupCtrl.descargarBackupJSON);

// Eliminar backup (solo administrador)
router.delete('/:archivo', soloAdmin, backupCtrl.eliminarBackup);

module.exports = router;
