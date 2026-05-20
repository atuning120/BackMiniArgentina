const express = require('express');
const {
  loginAdmin,
  getAdminHogarElectronico,
  createAdminHogarElectronico,
  updateAdminHogarElectronico,
  deleteAdminHogarElectronico,
  createAdminOrderHandler,
  resolveAdminOrderPayload,
  listAdminOrdersHandler,
} = require('../controllers/adminController');
const { adminAuth } = require('../middleware/adminAuth');

const router = express.Router();

router.post('/login', loginAdmin);
router.get('/productos/hogar/electronico', adminAuth, getAdminHogarElectronico);
router.post('/productos/hogar/electronico', adminAuth, createAdminHogarElectronico);
router.patch('/productos/hogar/electronico/:sku', adminAuth, updateAdminHogarElectronico);
router.delete('/productos/hogar/electronico/:sku', adminAuth, deleteAdminHogarElectronico);

router.post('/ordenes', adminAuth, createAdminOrderHandler);
router.post('/ordenes/resolve', adminAuth, resolveAdminOrderPayload);
router.get('/ordenes', adminAuth, listAdminOrdersHandler);

module.exports = router;