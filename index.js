const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const productsRouter = require('./routes/products');
const adminRouter = require('./routes/admin');

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Cambiar a la URL de tu frontend en producción
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.',
});
app.use(limiter);

app.use(express.json());
// app.use(mongoSanitize()); // Incompatible con Express 5.x por el getter de req.query

app.get('/', (req, res) => {
  res.send('¡Backend funcionando!');
});

app.use('/api/productos', productsRouter);
app.use('/api/admin', adminRouter);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
  });
}

module.exports = app;
