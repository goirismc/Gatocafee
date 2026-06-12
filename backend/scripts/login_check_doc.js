const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const Usuario = require('../models/Usuario');
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const usuario = await Usuario.findOne({ email: 'admin@gatocafee.com' }).select('+password');
    console.log('found user:', usuario && usuario._id, 'type:', usuario && usuario._id && usuario._id.constructor && usuario._id.constructor.name);
    console.log('is Mongoose doc:', usuario && usuario.$isMongooseDocument);
    if (usuario && usuario.toObject) console.log('toObject _id type:', typeof usuario._id);
    await mongoose.disconnect();
  } catch (e) { console.error(e); try{ await mongoose.disconnect(); } catch(e2){} }
})();
