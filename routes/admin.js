const express = require('express');
const {
  loginAdmin,
  updateAdminCredentialsHandler,
  getAdminHogarElectronico,
  createAdminHogarElectronico,
  updateAdminHogarElectronico,
  deleteAdminHogarElectronico,
  createAdminOrderHandler,
  resolveAdminOrderPayload,
  listAdminOrdersHandler,
  updateAdminOrderHandler,
} = require('../controllers/adminController');
const { adminAuth } = require('../middleware/adminAuth');
const { progressiveLoginLimiter } = require('../middleware/progressiveLoginLimiter');
const svgCaptcha = require('svg-captcha');
const { redisClient } = require('../db/redis');

const router = express.Router();

router.get('/captcha', async (req, res) => {
  const ip = req.ip || 'desconocida';
  const captcha = svgCaptcha.createMathExpr({
    mathMin: 1,
    mathMax: 9,
    mathOperator: '+',
    color: true,
    noise: 2
  });
  
  if (redisClient && redisClient.isOpen) {
    // Guardar respuesta del captcha en Redis por 5 minutos
    await redisClient.setEx(`captcha:${ip}`, 300, captcha.text);
  }
  
  res.type('svg');
  res.status(200).send(captcha.data);
});

router.post('/login', progressiveLoginLimiter, loginAdmin);
router.get('/verify', adminAuth, (req, res) => res.json({ valid: true, username: req.adminUser }));
router.put('/credentials', adminAuth, updateAdminCredentialsHandler);
router.get('/productos/hogar/electronico', adminAuth, getAdminHogarElectronico);
router.post('/productos/hogar/electronico', adminAuth, createAdminHogarElectronico);
router.patch('/productos/hogar/electronico/:sku', adminAuth, updateAdminHogarElectronico);
router.delete('/productos/hogar/electronico/:sku', adminAuth, deleteAdminHogarElectronico);

router.post('/ordenes', adminAuth, createAdminOrderHandler);
router.post('/ordenes/resolve', adminAuth, resolveAdminOrderPayload);
router.get('/ordenes', adminAuth, listAdminOrdersHandler);
router.patch('/ordenes/:id', adminAuth, updateAdminOrderHandler);

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/upload', adminAuth, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }

  try {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + '.webp';
    const filePath = path.join(uploadDir, filename);

    // Compress and convert to webp using sharp
    await sharp(req.file.buffer)
      .resize({ width: 1000, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filePath);

    res.json({ imageUrl: `/uploads/${filename}` });
  } catch (error) {
    console.error('Error procesando la imagen:', error);
    res.status(500).json({ error: 'Error procesando la imagen' });
  }
});

module.exports = router;