// ============================================
// middleware/auth.js
// Protección de rutas con JWT
// ============================================

const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { registrarAuditoria } = require('../utils/auditoria');

// ============================================
// MIDDLEWARE: Verificar token JWT
// ============================================
const protegerRuta = async (req, res, next) => {
  let token;

  // Buscar token en el header Authorization
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      mensaje: 'Acceso denegado. Inicia sesión para continuar.',
    });
  }

  try {
    // Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar el usuario (verificar que aún existe y está activo)
    const usuario = await Usuario.findById(decoded.id).select('+activo');

    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        success: false,
        mensaje: 'Usuario no encontrado o inactivo.',
      });
    }

    // Verificar si la cuenta está bloqueada
    if (usuario.estaBloqueado()) {
      return res.status(401).json({
        success: false,
        mensaje: 'Cuenta temporalmente bloqueada por múltiples intentos fallidos.',
      });
    }

    // Adjuntar usuario al request para uso en los controladores
    req.usuario = usuario;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        mensaje: 'Token inválido.',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        mensaje: 'Sesión expirada. Inicia sesión nuevamente.',
      });
    }

    return res.status(500).json({
      success: false,
      mensaje: 'Error en la autenticación.',
    });
  }
};


// ============================================
// MIDDLEWARE: Verificar roles
// Uso: autorizarRoles('administrador', 'gerente')
// ============================================
const autorizarRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        mensaje: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}. Tu rol actual es: ${req.usuario.rol}`,
      });
    }
    next();
  };
};


// ============================================
// MIDDLEWARE: Solo administrador
// ============================================
const soloAdmin = autorizarRoles('administrador');

// ============================================
// MIDDLEWARE: Admin o Gerente
// ============================================
const adminOGerente = autorizarRoles('administrador', 'gerente');


module.exports = {
  protegerRuta,
  autorizarRoles,
  soloAdmin,
  adminOGerente,
};
