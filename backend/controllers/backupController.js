// ============================================
// controllers/backupController.js
// Controlador para backup de toda la cafetería
// ============================================

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

exports.crearBackup = async (req, res) => {
  try {
    // Obtener todos los modelos de mongoose
    const Cliente = mongoose.model('Cliente');
    const Producto = mongoose.model('Producto');
    const Venta = mongoose.model('Venta');
    const Factura = mongoose.model('Factura');
    const Usuario = mongoose.model('Usuario');

    // Crear objeto con toda la información
    const backup = {
      fecha: new Date(),
      version: '1.0',
      datos: {
        clientes: await Cliente.find(),
        productos: await Producto.find(),
        ventas: await Venta.find(),
        facturas: await Factura.find(),
        usuarios: await Usuario.find(),
      },
      resumen: {
        totalClientes: await Cliente.countDocuments(),
        totalProductos: await Producto.countDocuments(),
        totalVentas: await Venta.countDocuments(),
        totalFacturas: await Factura.countDocuments(),
        totalUsuarios: await Usuario.countDocuments(),
      },
    };

    // Crear carpeta de backups si no existe
    const backupDir = path.join(__dirname, '..', 'backups');
    try {
      await fs.mkdir(backupDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }

    // Generar nombre del archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `backup_gatocafee_${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);

    // Guardar el archivo
    await fs.writeFile(filePath, JSON.stringify(backup, null, 2), 'utf8');

    res.status(200).json({
      success: true,
      mensaje: 'Backup creado exitosamente',
      archivo: fileName,
      ruta: filePath,
      resumen: backup.resumen,
      fecha: backup.fecha,
    });
  } catch (error) {
    console.error('Error al crear backup:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al crear el backup',
      error: error.message,
    });
  }
};

exports.descargarBackup = async (req, res) => {
  try {
    const { archivo } = req.params;

    console.log('[backup] petición descarga:', { archivo, usuario: req.usuario ? { id: req.usuario._id, rol: req.usuario.rol } : null });

    // Validar que el archivo no intente salir del directorio de backups
    if (archivo.includes('..') || archivo.includes('/') || archivo.includes('\\')) {
      return res.status(400).json({
        success: false,
        mensaje: 'Nombre de archivo inválido',
      });
    }

    const backupDir = path.join(__dirname, '..', 'backups');
    const filePath = path.join(backupDir, archivo);

    // Verificar que el archivo existe
    try {
      await fs.access(filePath);
    } catch (err) {
      console.error('[backup] archivo no encontrado:', filePath, err && err.code);
      return res.status(404).json({
        success: false,
        mensaje: 'El archivo de backup no existe',
      });
    }

    // Descargar el archivo
    res.download(filePath, archivo, (err) => {
      if (err) console.error('[backup] error en res.download:', err);
      else console.log('[backup] descarga servida:', archivo);
    });
  } catch (error) {
    console.error('Error al descargar backup:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al descargar el backup',
      error: error.message,
    });
  }
};

exports.listarBackups = async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '..', 'backups');

    // Crear carpeta si no existe
    try {
      await fs.mkdir(backupDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }

    // Leer todos los archivos de backup
    const archivos = await fs.readdir(backupDir);
    const backups = [];

    for (const archivo of archivos) {
      if (archivo.endsWith('.json')) {
        const filePath = path.join(backupDir, archivo);
        const stats = await fs.stat(filePath);
        backups.push({
          nombre: archivo,
          tamaño: stats.size,
          fechaCreacion: stats.birthtime,
          fechaModificacion: stats.mtime,
        });
      }
    }

    // Ordenar por fecha más reciente primero
    backups.sort((a, b) => b.fechaCreacion - a.fechaCreacion);

    res.status(200).json({
      success: true,
      total: backups.length,
      backups,
    });
  } catch (error) {
    console.error('Error al listar backups:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al listar los backups',
      error: error.message,
    });
  }
};

exports.eliminarBackup = async (req, res) => {
  try {
    const { archivo } = req.params;

    // Validar que el archivo no intente salir del directorio de backups
    if (archivo.includes('..') || archivo.includes('/') || archivo.includes('\\')) {
      return res.status(400).json({
        success: false,
        mensaje: 'Nombre de archivo inválido',
      });
    }

    const backupDir = path.join(__dirname, '..', 'backups');
    const filePath = path.join(backupDir, archivo);

    // Verificar que el archivo existe
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        mensaje: 'El archivo de backup no existe',
      });
    }

    // Eliminar el archivo
    await fs.unlink(filePath);

    res.status(200).json({
      success: true,
      mensaje: 'Backup eliminado exitosamente',
      archivo,
    });
  } catch (error) {
    console.error('Error al eliminar backup:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al eliminar el backup',
      error: error.message,
    });
  }
};

exports.descargarBackupJSON = async (req, res) => {
  try {
    const { archivo } = req.params;

    // Validar nombre
    if (archivo.includes('..') || archivo.includes('/') || archivo.includes('\\')) {
      return res.status(400).json({ success: false, mensaje: 'Nombre de archivo inválido' });
    }

    const backupDir = path.join(__dirname, '..', 'backups');
    const filePath = path.join(backupDir, archivo);

    try {
      await fs.access(filePath);
    } catch (err) {
      return res.status(404).json({ success: false, mensaje: 'El archivo de backup no existe' });
    }

    const buffer = await fs.readFile(filePath);
    const contenidoBase64 = buffer.toString('base64');

    // Determinar content type simple por extensión
    const contentType = archivo.endsWith('.json') ? 'application/json' : 'application/octet-stream';

    res.status(200).json({ success: true, archivo, contentType, contenidoBase64 });
  } catch (error) {
    console.error('[backup] error descargarBackupJSON:', error);
    res.status(500).json({ success: false, mensaje: 'Error al leer el archivo de backup', error: error.message });
  }
};
