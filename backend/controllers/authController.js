// ============================================
// controllers/authController.js
// Login, Registro y gestión de sesiones
// ============================================

const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// ============================================
// HELPER: Generar token JWT
// ============================================
const generarToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
};

// ============================================
// HELPER: Respuesta con token
// ============================================
const responderConToken = (usuario, statusCode, res) => {
  const token = generarToken(usuario._id);

  res.status(statusCode).json({
    success: true,
    token,
    usuario: {
      id: usuario._id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
      turno: usuario.turno,
    },
  });
};


// ============================================
// POST /api/auth/login
// Inicio de sesión
// ============================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validación básica
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        mensaje: 'Email y contraseña son obligatorios',
      });
    }

    // Buscar usuario (incluir password que está oculto por defecto)
    const usuario = await Usuario.findOne({ email }).select('+password');

    if (!usuario) {
      return res.status(401).json({
        success: false,
        mensaje: 'Credenciales incorrectas',
      });
    }

    // Verificar si está bloqueado
    if (usuario.estaBloqueado()) {
      const minutosRestantes = Math.ceil(
        (usuario.bloqueadoHasta - Date.now()) / 60000
      );
      return res.status(401).json({
        success: false,
        mensaje: `Cuenta bloqueada. Intenta en ${minutosRestantes} minuto(s).`,
      });
    }

    // Verificar si está activo
    if (!usuario.activo) {
      return res.status(401).json({
        success: false,
        mensaje: 'Tu cuenta está desactivada. Contacta al administrador.',
      });
    }

    // Comparar contraseña
    const passwordCorrecta = await usuario.compararPassword(password);

    if (!passwordCorrecta) {
      // Incrementar intentos fallidos
      usuario.intentosFallidos += 1;

      // Bloquear después de 5 intentos fallidos (30 minutos)
      if (usuario.intentosFallidos >= 5) {
        usuario.bloqueadoHasta = new Date(Date.now() + 30 * 60 * 1000);
        usuario.intentosFallidos = 0;
      }

      await usuario.save({ validateBeforeSave: false });

      return res.status(401).json({
        success: false,
        mensaje: 'Credenciales incorrectas',
      });
    }

    // Login exitoso: resetear contadores
    usuario.intentosFallidos = 0;
    usuario.bloqueadoHasta = undefined;
    usuario.ultimoLogin = new Date();
    await usuario.save({ validateBeforeSave: false });

    responderConToken(usuario, 200, res);

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor',
    });
  }
};


// ============================================
// POST /api/auth/registro
// Registrar nuevo usuario (solo admin)
// ============================================
exports.registro = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol, turno } = req.body;

    // Verificar si el email ya existe
    const existente = await Usuario.findOne({ email });
    if (existente) {
      return res.status(400).json({
        success: false,
        mensaje: 'Ya existe un usuario con ese email',
      });
    }

    const usuario = await Usuario.create({
      nombre,
      apellido,
      email,
      password,
      rol: rol || 'cajero',
      turno: turno || 'mañana',
    });

    res.status(201).json({
      success: true,
      mensaje: `Usuario ${usuario.getNombreCompleto()} creado correctamente`,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
      },
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const errores = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        mensaje: 'Error de validación',
        errores,
      });
    }
    console.error('Error en registro:', error);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor' });
  }
};


// ============================================
// GET /api/auth/perfil
// Obtener perfil del usuario autenticado
// ============================================
exports.getPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id);

    res.json({
      success: true,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
        turno: usuario.turno,
        ultimoLogin: usuario.ultimoLogin,
        createdAt: usuario.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error interno' });
  }
};


// ============================================
// PUT /api/auth/cambiar-password
// Cambiar contraseña del usuario actual
// ============================================
exports.cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNuevo } = req.body;

    const usuario = await Usuario.findById(req.usuario._id).select('+password');

    const esCorrecta = await usuario.compararPassword(passwordActual);
    if (!esCorrecta) {
      return res.status(400).json({
        success: false,
        mensaje: 'La contraseña actual es incorrecta',
      });
    }

    usuario.password = passwordNuevo;
    await usuario.save();

    res.json({
      success: true,
      mensaje: 'Contraseña actualizada correctamente',
    });

  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error interno' });
  }
};


// ============================================
// GET /api/auth/usuarios (solo admin)
// Listar todos los usuarios
// ============================================
exports.getUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      total: usuarios.length,
      usuarios,
    });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error interno' });
  }
};
