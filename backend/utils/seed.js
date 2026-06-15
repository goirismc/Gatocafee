// ============================================
// utils/seed.js
// Poblar la base de datos con datos iniciales
// Ejecutar: node utils/seed.js
// ============================================

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');

// Importar modelos
require('../models/index');
const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const { model } = require('mongoose');

const PRODUCTOS_INICIALES = [
  //  Bebidas calientes
  { nombre: 'Café Americano', categoria: 'bebidas_calientes', subcategoria: 'café', precioVenta: 8000, costoProduccion: 2000, tasaIVA: 0.10, disponible: true, destacado: true },
  { nombre: 'Espresso', categoria: 'bebidas_calientes', subcategoria: 'café', precioVenta: 6000, costoProduccion: 1800, tasaIVA: 0.10, disponible: true },
  { nombre: 'Latte', categoria: 'bebidas_calientes', subcategoria: 'café', precioVenta: 12000, costoProduccion: 4000, tasaIVA: 0.10, disponible: true, destacado: true },
  { nombre: 'Cappuccino', categoria: 'bebidas_calientes', subcategoria: 'café', precioVenta: 11000, costoProduccion: 3800, tasaIVA: 0.10, disponible: true },
  { nombre: 'Mocaccino', categoria: 'bebidas_calientes', subcategoria: 'café', precioVenta: 13000, costoProduccion: 4500, tasaIVA: 0.10, disponible: true },
  { nombre: 'Té Verde', categoria: 'bebidas_calientes', subcategoria: 'té', precioVenta: 7000, costoProduccion: 1500, tasaIVA: 0.10, disponible: true },
  { nombre: 'Té Negro', categoria: 'bebidas_calientes', subcategoria: 'té', precioVenta: 7000, costoProduccion: 1500, tasaIVA: 0.10, disponible: true },
  //  Bebidas frías
  { nombre: 'Jugo de Naranja', categoria: 'bebidas_frias', subcategoria: 'jugos', precioVenta: 9000, costoProduccion: 3000, tasaIVA: 0.05, disponible: true },
  { nombre: 'Jugo de Mango', categoria: 'bebidas_frias', subcategoria: 'jugos', precioVenta: 10000, costoProduccion: 3500, tasaIVA: 0.05, disponible: true },
  { nombre: 'Frappé de Café', categoria: 'bebidas_frias', subcategoria: 'café', precioVenta: 15000, costoProduccion: 5000, tasaIVA: 0.10, disponible: true, destacado: true },
  //  Comidas
  { nombre: 'Sandwich de Jamón y Queso', categoria: 'comidas', subcategoria: 'sandwich', precioVenta: 15000, costoProduccion: 6000, tasaIVA: 0.10, disponible: true },
  { nombre: 'Sandwich Vegetariano', categoria: 'comidas', subcategoria: 'sandwich', precioVenta: 14000, costoProduccion: 5500, tasaIVA: 0.10, disponible: true },
  { nombre: 'Tostado Mixto', categoria: 'comidas', subcategoria: 'sandwich', precioVenta: 12000, costoProduccion: 4500, tasaIVA: 0.10, disponible: true },
  //  Postres
  { nombre: 'Torta de Chocolate', categoria: 'postres', subcategoria: 'tortas', precioVenta: 18000, costoProduccion: 7000, tasaIVA: 0.10, disponible: true, destacado: true },
  { nombre: 'Cheesecake', categoria: 'postres', subcategoria: 'tortas', precioVenta: 20000, costoProduccion: 8000, tasaIVA: 0.10, disponible: true },
  { nombre: 'Brownie', categoria: 'postres', subcategoria: 'postres', precioVenta: 10000, costoProduccion: 3500, tasaIVA: 0.10, disponible: true },
  { nombre: 'Muffin de Arándanos', categoria: 'postres', subcategoria: 'postres', precioVenta: 8000, costoProduccion: 3000, tasaIVA: 0.10, disponible: true },
];

const INVENTARIO_INICIAL = [
  { nombre: 'Café molido', categoria: 'materia_prima', unidadMedida: 'kg', stockActual: 15, stockMinimo: 5, stockOptimo: 20, precioUnitario: 45000 },
  { nombre: 'Leche entera', categoria: 'materia_prima', unidadMedida: 'litro', stockActual: 30, stockMinimo: 10, stockOptimo: 40, precioUnitario: 4500 },
  { nombre: 'Azúcar', categoria: 'materia_prima', unidadMedida: 'kg', stockActual: 20, stockMinimo: 5, stockOptimo: 25, precioUnitario: 3500 },
  { nombre: 'Chocolate en polvo', categoria: 'materia_prima', unidadMedida: 'kg', stockActual: 8, stockMinimo: 3, stockOptimo: 10, precioUnitario: 35000 },
  { nombre: 'Vasos de cartón 8oz', categoria: 'packaging', unidadMedida: 'unidad', stockActual: 500, stockMinimo: 100, stockOptimo: 600, precioUnitario: 500 },
  { nombre: 'Vasos de cartón 12oz', categoria: 'packaging', unidadMedida: 'unidad', stockActual: 400, stockMinimo: 100, stockOptimo: 500, precioUnitario: 700 },
  { nombre: 'Servilletas', categoria: 'insumo', unidadMedida: 'unidad', stockActual: 1000, stockMinimo: 200, stockOptimo: 1200, precioUnitario: 100 },
  { nombre: 'Tapas para vasos', categoria: 'packaging', unidadMedida: 'unidad', stockActual: 450, stockMinimo: 100, stockOptimo: 500, precioUnitario: 300 },
  { nombre: 'Sorbetes', categoria: 'insumo', unidadMedida: 'unidad', stockActual: 300, stockMinimo: 50, stockOptimo: 400, precioUnitario: 150 },
  { nombre: 'Harina', categoria: 'materia_prima', unidadMedida: 'kg', stockActual: 12, stockMinimo: 5, stockOptimo: 15, precioUnitario: 4000 },
];

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('\n Iniciando seed de datos...\n');

    // Limpiar colecciones (incluir ventas, arqueos y promociones para evitar duplicados)
    await Usuario.deleteMany({});
    await Producto.deleteMany({});
    // Eliminar ventas y arqueos si existen
    try { const Venta = mongoose.model('Venta'); await Venta.deleteMany({}); } catch (e) {}
    try { const ArqueoCaja = mongoose.model('ArqueoCaja'); await ArqueoCaja.deleteMany({}); } catch (e) {}
    // Eliminar promociones y metas
    try { const Promocion = mongoose.model('Promocion'); await Promocion.deleteMany({}); } catch (e) {}
    try { const MetaMensual = mongoose.model('MetaMensual'); await MetaMensual.deleteMany({}); } catch (e) {}
    const Inventario = mongoose.model('Inventario');
    await Inventario.deleteMany({});
    console.log('  Colecciones limpiadas');

    // Crear usuarios
    const usuarios = await Usuario.create([
      {
        nombre: 'Admin',
        apellido: 'Gatocafee',
        email: 'admin@gatocafee.com',
        password: 'admin123',
        rol: 'administrador',
        turno: 'mañana',
      },
      {
        nombre: 'María',
        apellido: 'González',
        email: 'gerente@gatocafee.com',
        password: 'gerente123',
        rol: 'gerente',
        turno: 'mañana',
      },
      {
        nombre: 'Juan',
        apellido: 'López',
        email: 'cajero@gatocafee.com',
        password: 'cajero123',
        rol: 'cajero',
        turno: 'mañana',
      },
    ]);
    console.log(` ${usuarios.length} usuarios creados`);

    // Crear productos
    const productos = await Producto.create(PRODUCTOS_INICIALES);
    console.log(` ${productos.length} productos creados`);

    // Crear inventario
    const inventario = await Inventario.create(INVENTARIO_INICIAL);
    console.log(` ${inventario.length} ítems de inventario creados`);

    // Crear costos fijos de ejemplo
    const CostoFijo = mongoose.model('CostoFijo');
    await CostoFijo.create([
      { nombre: 'Alquiler del local', monto: 1500000, frecuencia: 'mensual', activo: true },
      { nombre: 'Salario cajero', monto: 2000000, frecuencia: 'mensual', activo: true },
      { nombre: 'Servicios básicos (luz, agua)', monto: 400000, frecuencia: 'mensual', activo: true },
      { nombre: 'Internet y teléfono', monto: 150000, frecuencia: 'mensual', activo: true },
    ]);
    console.log(' Costos fijos creados');

    // --- PROMOCIONES DE EJEMPLO ---
    // Asegurar que el modelo de Promocion esté registrado (se define en el controlador)
    try { require('../controllers/promocionesController'); } catch (e) {}
    const Promocion = mongoose.model('Promocion');
    try {
      await Promocion.create([
        {
          nombre: '10% OFF Semana',
          descripcion: 'Descuento del 10% en todas las compras esta semana',
          tipo: 'porcentaje',
          valor: 10,
          fechaInicio: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          fechaFin: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          activo: true,
          creadoPor: usuarios[0]._id,
        },
        {
          nombre: 'Cupón BIENVENIDA',
          descripcion: 'Gs. 5000 descuento en la primera compra',
          tipo: 'cupon',
          valor: 5000,
          codigo: 'BIENVENIDA',
          fechaInicio: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          activo: true,
          creadoPor: usuarios[0]._id,
        },
      ]);
      console.log(' Promociones creadas');
    } catch (e) {
      console.log(' Error creando promociones (puede que ya existan):', e.message);
    }

    // --- METAS FINANCIERAS DE EJEMPLO ---
    const MetaMensual = mongoose.model('MetaMensual');
    try {
      await MetaMensual.create([
        { mes: new Date().getMonth() + 1, año: new Date().getFullYear(), metaVentas: 2000000, metaCantidadVentas: 200, creadoPor: usuarios[0]._id },
      ]);
      console.log(' Metas financieras creadas');
    } catch (e) {
      console.log(' Error creando metas (puede que ya existan):', e.message);
    }

    // --- ARQUEOS Y VENTAS DE EJEMPLO ---
    const ArqueoCaja = mongoose.model('ArqueoCaja');
    // Asegurar que el modelo Venta esté registrado
    try { require('../models/Venta'); } catch (e) {}
    const Venta = mongoose.model('Venta');

    // Crear una caja cerrada y una abierta
    const cajaCerrada = await ArqueoCaja.create({
      fecha: new Date(Date.now() - 2 * 60 * 60 * 1000),
      turno: 'mañana',
      usuarioApertura: usuarios[0]._id,
      montoApertura: 100000,
      horaApertura: new Date(Date.now() - 2 * 60 * 60 * 1000),
      horaCierre: new Date(Date.now() - 1 * 60 * 60 * 1000),
      usuarioCierre: usuarios[0]._id,
      montoCierre: 350000,
      estado: 'cerrado',
      totalVentasEfectivo: 250000,
      totalVentasTarjeta: 0,
      totalVentas: 250000,
      cantidadVentas: 5,
      diferencia: 0,
    });

    const cajaAbierta = await ArqueoCaja.create({
      fecha: new Date(),
      turno: 'tarde',
      usuarioApertura: usuarios[0]._id,
      montoApertura: 50000,
      horaApertura: new Date(),
      estado: 'abierto',
    });

    // Crear algunas ventas de ejemplo (aleatorias entre productos existentes)
    const ventasEjemplo = [];
    for (let i = 0; i < 8; i++) {
      const p = productos[i % productos.length];
      const cantidad = Math.floor(Math.random() * 3) + 1;
      const precioUnit = p.precioVenta;
      const costoUnit = p.costoProduccion || Math.round(precioUnit * 0.3);
      const subtotal = precioUnit * cantidad;
      const iva = Math.round(subtotal * (p.tasaIVA || 0.1));
      const total = subtotal + iva;

      ventasEjemplo.push({
        usuario: usuarios[0]._id,
        items: [
          {
            producto: p._id,
            nombreProducto: p.nombre,
            categoria: p.categoria,
            cantidad,
            precioUnitario: precioUnit,
            costoUnitario: costoUnit,
            tasaIVA: p.tasaIVA || 0.1,
            subtotal,
          },
        ],
        subtotalSinIVA: subtotal,
        totalIVA: iva,
        totalDescuentos: 0,
        total,
        costoTotal: costoUnit * cantidad,
        gananciaTotal: total - (costoUnit * cantidad),
        metodoPago: i % 2 === 0 ? 'efectivo' : 'tarjeta',
        montoPagado: total,
        canal: 'mostrador',
        estado: 'completada',
        arqueoCaja: i % 2 === 0 ? cajaCerrada._id : cajaAbierta._id,
      });
    }

    // Insertar ventas una a una para que el middleware genere `numeroTicket` secuencialmente
    for (const vObj of ventasEjemplo) {
      const v = new Venta(vObj);
      await v.save();
    }
    console.log(' Ventas de ejemplo creadas');

    console.log('\n ¡Seed completado exitosamente!\n');
    console.log(' CREDENCIALES DE ACCESO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' Administrador: admin@gatocafee.com / admin123');
    console.log(' Gerente:       gerente@gatocafee.com / gerente123');
    console.log(' Cajero:        cajero@gatocafee.com / cajero123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error(' Error en seed:', error);
    process.exit(1);
  }
};

seedDatabase();
