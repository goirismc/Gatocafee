// ============================================
// routes/auth.js
// Rutas de autenticación
// ============================================

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');

const {
  login,
  registro,
  getPerfil,
  cambiarPassword,
  getUsuarios,
} = require('../controllers/authController');

const { protegerRuta, soloAdmin } = require('../middleware/auth');

// Rutas públicas (no necesitan token)
router.post(
  '/login',
  [
    check('email').isEmail().withMessage('Email inválido'),
    check('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errores: errors.array().map((e) => e.msg) });
    }
    return login(req, res, next);
  }
);

// Rutas protegidas (necesitan token)
router.get('/perfil', protegerRuta, getPerfil);
router.put('/cambiar-password', protegerRuta, cambiarPassword);

// Solo administradores
router.post(
  '/registro',
  protegerRuta,
  soloAdmin,
  [
    check('nombre').isLength({ min: 2 }).withMessage('Nombre demasiado corto'),
    check('apellido').optional().isLength({ min: 1 }).withMessage('Apellido inválido'),
    check('email').isEmail().withMessage('Email inválido'),
    check('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    check('rol').optional().isIn(['administrador', 'gerente', 'cajero']).withMessage('Rol inválido'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errores: errors.array().map((e) => e.msg) });
    }
    return registro(req, res, next);
  }
);
router.get('/usuarios', protegerRuta, soloAdmin, getUsuarios);

module.exports = router;
