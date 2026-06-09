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

    // Limpiar colecciones
    await Usuario.deleteMany({});
    await Producto.deleteMany({});
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
