// ============================================
// utils/auditoria.js
// Registro automático de acciones del sistema
// ============================================

const mongoose = require('mongoose');

/**
 * Registra una acción en el log de auditoría
 * @param {Object} datos - Datos de la auditoría
 * @param {string} datos.usuarioId - ID del usuario que realizó la acción
 * @param {string} datos.accion - Nombre de la acción (ej: 'LOGIN', 'CREAR_VENTA')
 * @param {string} datos.modulo - Módulo del sistema
 * @param {string} datos.descripcion - Descripción legible
 * @param {Object} datos.datosAntes - Estado antes del cambio (opcional)
 * @param {Object} datos.datosDespues - Estado después del cambio (opcional)
 * @param {string} datos.ip - IP del cliente
 * @param {boolean} datos.exitoso - Si la acción fue exitosa
 * @param {string} datos.error - Mensaje de error si falló
 */
const registrarAuditoria = async (datos) => {
  try {
    const Auditoria = mongoose.model('Auditoria');
    await Auditoria.create({
      usuario: datos.usuarioId,
      accion: datos.accion,
      modulo: datos.modulo || 'sistema',
      descripcion: datos.descripcion,
      datosAntes: datos.datosAntes,
      datosDespues: datos.datosDespues,
      ip: datos.ip,
      exitoso: datos.exitoso !== false, // default: true
      error: datos.error,
    });
  } catch (err) {
    // No interrumpir el flujo principal si falla la auditoría
    console.error(' Error al registrar auditoría:', err.message);
  }
};

module.exports = { registrarAuditoria };
