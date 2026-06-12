// ============================================
// server.js
// Servidor principal de Gatocafee API
// ============================================

const path = require('path');
// Cargar variables de entorno desde backend/.env por seguridad cuando se ejecuta desde repo root
require('dotenv').config({ path: path.join(__dirname, '.env') }); // SIEMPRE primero: carga variables de entorno
const express = require('express');
// --- Validación temprana de variables de entorno (fail-fast para variables críticas) ---
function validateEnv() {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('ERROR: faltan variables de entorno críticas:', missing.join(', '));
    console.error('Asegurate de definirlas en backend/.env o en tu entorno de despliegue.');
    // Fallar solo si falta MONGODB_URI (sin DB no podemos seguir).
    if (missing.includes('MONGODB_URI')) process.exit(1);
  }
}

validateEnv();
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');

// Cargar todos los modelos
require('./models/index');

const app = express();
const { productosRouter, ventasRouter } = require('./routes/productosVentas');
const { inventarioRouter, clientesRouter } = require('./routes/inventarioClientes');
// ============================================
// CONEXIÓN A MONGODB
// ============================================
connectDB();

// ============================================
// MIDDLEWARES DE SEGURIDAD
// ============================================

// Helmet: headers HTTP seguros
app.use(helmet());

// CORS: permitir peticiones del frontend
// En development permitimos orígenes localhost dinámicos (puertos diferentes, p.ej. 3000/3001)
const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  // Headers permitidos
  allowedHeaders: ['Content-Type', 'Authorization'],
};

if (process.env.NODE_ENV === 'production') {
  corsOptions.origin = process.env.FRONTEND_URL || 'http://localhost:3000';
} else {
  // En dev reflejamos el Origin si viene de localhost:* para evitar bloqueos por puertos
  corsOptions.origin = function (origin, callback) {
    // Si no hay origin (petición desde curl o servidor) permitir
    if (!origin) return callback(null, true);
    try {
      const url = new URL(origin);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return callback(null, true);
    } catch (e) {
      // Si falla el parse, negar por seguridad
    }
    // Por defecto, permitir solo FRONTEND_URL cuando esté definido
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return callback(null, true);
    callback(new Error('CORS no permitido por servidor'));
  };
}

app.use(cors(corsOptions));

// Rate limiting: máximo por IP cada 15 minutos
// En desarrollo relajamos el límite para evitar bloqueos durante pruebas locales
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    success: false,
    mensaje: 'Demasiadas peticiones. Intenta en 15 minutos.',
  },
});
app.use('/api/', limiter);

// Rate limiting más estricto para login (proteger contra brute force)
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 intentos
  message: {
    success: false,
    mensaje: 'Demasiados intentos de login. Intenta en 1 hora.',
  },
});
app.use('/api/auth/login', loginLimiter);

// ============================================
// MIDDLEWARES GENERALES
// ============================================
app.use(express.json({ limit: '10mb' }));          // Parsear JSON
app.use(express.urlencoded({ extended: true }));    // Parsear form data
app.use(morgan('dev'));                             // Logs de peticiones

// ============================================
// RUTAS
// ============================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos',   productosRouter);
app.use('/api/ventas',      ventasRouter);
app.use('/api/inventario',  inventarioRouter);
app.use('/api/clientes',    clientesRouter);
app.use('/api/uploads',     require('./routes/uploads'));
app.use('/api/backup',      require('./routes/backup'));

// Servir facturas generadas localmente (si no se usa Cloudinary)
app.use('/invoices', express.static(path.join(__dirname, 'public', 'invoices')));

// PARTE 3 — Caja, Financiero, Reportes, Promociones
try {
  const { cajaRouter, financieroRouter, reportesRouter, promocionesRouter } = require('./routes/parte3');
  const finCtrl = require('./controllers/financieroController');
  // Ruta pública alternativa para consultar una meta por id sin pasar por el router protegido
  app.get('/api/public/financiero/metas/:id', finCtrl.getMetaPublic);
  app.use('/api/caja',        cajaRouter);
  app.use('/api/financiero',  financieroRouter);
  app.use('/api/reportes',    reportesRouter);
  app.use('/api/promociones', promocionesRouter);
  console.log(' Rutas Parte 3 cargadas');
} catch (e) {
  console.log('  Rutas Parte 3 no disponibles aún:', e.message);
}


// Ruta de salud del servidor
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    mensaje: ' Gatocafee API funcionando correctamente',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ambiente: process.env.NODE_ENV,
  });
});

// ============================================
// MANEJO DE RUTAS NO ENCONTRADAS
// ============================================
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    mensaje: `Ruta ${req.originalUrl} no encontrada`,
    rutasDisponibles: [
      'GET  /api/health',
      'POST /api/auth/login',
      'GET  /api/auth/perfil',
      'GET  /api/productos',
      'POST /api/ventas',
      'GET  /api/inventario',
      'GET  /api/clientes',
    ],
  });
});

// ============================================
// MANEJO GLOBAL DE ERRORES
// ============================================
app.use((err, req, res, next) => {
  console.error(' Error no manejado:', err);

  // Errores de MongoDB
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      mensaje: 'ID inválido',
    });
  }

  if (err.code === 11000) {
    const campo = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      mensaje: `Ya existe un registro con ese ${campo}`,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    mensaje: err.message || 'Error interno del servidor',
  });
});

// ============================================
// INICIAR SERVIDOR (con manejo EADDRINUSE)
// ============================================
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 5000;

function startServer(port = DEFAULT_PORT, attempts = 0) {
  const server = app.listen(port, () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' GATOCAFEE API - Sistema de Gestión');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Servidor:     http://localhost:${port}`);
    console.log(`API Base:     http://localhost:${port}/api`);
    console.log(`Health:       http://localhost:${port}/api/health`);
    console.log(`Ambiente:     ${process.env.NODE_ENV || 'development'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`Puerto ${port} en uso.`);
      if (attempts < 10) {
        const nextPort = port + 1;
        console.log(`Intentando puerto alternativo: ${nextPort} (intento ${attempts + 1}/10)`);
        // esperar un momento antes de reintentar
        setTimeout(() => startServer(nextPort, attempts + 1), 500);
      } else {
        console.error('No se pudo iniciar el servidor: puertos ocupados. Especifica PORT en .env o libera el puerto.');
        process.exit(1);
      }
    } else {
      console.error('Error al iniciar el servidor:', err);
      process.exit(1);
    }
  });

  // Manejo de señales para cerrar limpiamente
  process.on('SIGINT', () => {
    console.log('\nCerrando servidor...');
    server.close(() => process.exit(0));
  });
}

startServer();

module.exports = app;
