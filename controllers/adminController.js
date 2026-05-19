const {
  getHogarElectronicoProducts,
  createHogarElectronicoProduct,
  updateHogarElectronicoProductBySku,
  deleteHogarElectronicoProductBySku,
  createAdminOrder,
  listAdminOrders,
} = require('../services/productsService');
const { createToken, getAdminCredentials } = require('../middleware/adminAuth');

const DEFAULT_CATEGORIES = ['iluminacion', 'ferreteria', 'limpieza'];

const normalizeCategory = (value) => (value || '').trim().toLowerCase();

function normalizeProductPayload(
  payload,
  { allowSku, partial } = { allowSku: true, partial: false }
) {
  const hasKey = (key) => Object.prototype.hasOwnProperty.call(payload, key);
  const result = {};

  if (!partial || hasKey('nombre')) {
    result.nombre = payload.nombre || 'Producto sin nombre';
  }

  if (!partial || hasKey('descripcion')) {
    result.descripcion = payload.descripcion || '';
  }

  if (!partial || hasKey('precio')) {
    const price = Number(payload.precio);
    result.precio = Number.isFinite(price) ? price : 0;
  }

  if (!partial || hasKey('categoria')) {
    const normalizedCategory = normalizeCategory(payload.categoria || '');
    result.categoria = DEFAULT_CATEGORIES.includes(normalizedCategory)
      ? normalizedCategory
      : DEFAULT_CATEGORIES[0];
  }

  if (!partial || hasKey('moneda')) {
    result.moneda = payload.moneda || 'ARS';
  }

  if (!partial || hasKey('imagen')) {
    result.imagen = payload.imagen || '';
  }

  if (!partial || hasKey('en_oferta')) {
    result.en_oferta = Boolean(payload.en_oferta);
  }

  if (!partial || hasKey('destacado')) {
    result.destacado = Boolean(payload.destacado);
  }

  if (!partial || hasKey('porcentaje_oferta') || hasKey('en_oferta')) {
    const percentage = Number(payload.porcentaje_oferta);
    const enOferta = hasKey('en_oferta') ? Boolean(payload.en_oferta) : true;
    result.porcentaje_oferta =
      enOferta && Number.isFinite(percentage) ? percentage : 0;
  }

  if (allowSku) {
    result.sku = payload.sku || '';
  }

  if (payload.id_catalogo !== undefined) {
    result.id_catalogo = payload.id_catalogo;
  }

  return result;
}

async function loginAdmin(req, res) {
  const { user, password } = getAdminCredentials();
  if (!user || !password) {
    return res.status(500).json({ error: 'Admin credentials not configured' });
  }

  const { username, password: inputPassword } = req.body || {};
  if (username !== user || inputPassword !== password) {
    return res.status(401).json({ error: 'Credenciales invalidas' });
  }

  try {
    const { token, expiresAt } = createToken(username);
    return res.json({ token, expiresAt });
  } catch (error) {
    console.error('Error creating token:', error);
    return res.status(500).json({ error: 'Token error' });
  }
}

async function getAdminHogarElectronico(req, res) {
  try {
    const productos = await getHogarElectronicoProducts();
    res.json(productos);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Error fetching products' });
  }
}

async function createAdminHogarElectronico(req, res) {
  const payload = req.body || {};
  if (!payload.sku) {
    return res.status(400).json({ error: 'Missing sku' });
  }

  const product = normalizeProductPayload(payload, { allowSku: true });

  try {
    const created = await createHogarElectronicoProduct(product);
    return res.status(201).json(created);
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({ error: 'Error creating product' });
  }
}

async function updateAdminHogarElectronico(req, res) {
  const { sku } = req.params;
  if (!sku) {
    return res.status(400).json({ error: 'Missing sku parameter' });
  }

  const updates = { ...(req.body || {}) };
  delete updates._id;
  delete updates.sku;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const cleaned = normalizeProductPayload(updates, {
    allowSku: false,
    partial: true,
  });

  try {
    const updated = await updateHogarElectronicoProductBySku(sku, cleaned);
    if (!updated) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    return res.json(updated);
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ error: 'Error updating product' });
  }
}

async function deleteAdminHogarElectronico(req, res) {
  const { sku } = req.params;
  if (!sku) {
    return res.status(400).json({ error: 'Missing sku parameter' });
  }

  try {
    const deleted = await deleteHogarElectronicoProductBySku(sku);
    if (!deleted) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ error: 'Error deleting product' });
  }
}

async function createAdminOrderHandler(req, res) {
  const { items = [], notes = '' } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items are required' });
  }

  const normalizedItems = items
    .map((item) => ({
      sku: item.sku,
      name: item.name || '',
      quantity: Number(item.quantity) || 0,
      price: Number(item.price) || 0,
    }))
    .filter((item) => item.sku && item.quantity > 0);

  if (normalizedItems.length === 0) {
    return res.status(400).json({ error: 'Items are invalid' });
  }

  const total = normalizedItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const order = {
    items: normalizedItems,
    total,
    notes,
    status: 'pendiente',
    createdAt: new Date().toISOString(),
  };

  try {
    const created = await createAdminOrder(order);
    return res.status(201).json(created);
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({ error: 'Error creating order' });
  }
}

async function listAdminOrdersHandler(req, res) {
  try {
    const orders = await listAdminOrders();
    return res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ error: 'Error fetching orders' });
  }
}

module.exports = {
  loginAdmin,
  getAdminHogarElectronico,
  createAdminHogarElectronico,
  updateAdminHogarElectronico,
  deleteAdminHogarElectronico,
  createAdminOrderHandler,
  listAdminOrdersHandler,
};