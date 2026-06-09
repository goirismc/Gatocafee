// ============================================
// routes/auth.js
// Rutas de autenticación
// ============================================

const express = require('express');
const router = express.Router();

const {
  login,
  registro,
  getPerfil,
  cambiarPassword,
  getUsuarios,
} = require('../controllers/authController');

const { protegerRuta, soloAdmin } = require('../middleware/auth');

// Rutas públicas (no necesitan token)
router.post('/login', login);

// Rutas protegidas (necesitan token)
router.get('/perfil', protegerRuta, getPerfil);
router.put('/cambiar-password', protegerRuta, cambiarPassword);

// Solo administradores
router.post('/registro', protegerRuta, soloAdmin, registro);
router.get('/usuarios', protegerRuta, soloAdmin, getUsuarios);

module.exports = router;
