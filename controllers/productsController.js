const { getHogarElectronicoProducts } = require('../services/productsService');

async function getHogarElectronico(req, res) {
  try {
    const productos = await getHogarElectronicoProducts();
    res.json(productos);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Error fetching products' });
  }
}

module.exports = {
  getHogarElectronico,
};
