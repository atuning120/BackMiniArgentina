const { getDb } = require('../db/mongo');
const {
  DB_NAME,
  ELECTRONICO_COLLECTION,
  ORDERS_COLLECTION,
} = require('../config/constants');

async function getHogarElectronicoProducts() {
  const db = await getDb(DB_NAME);
  return db.collection(ELECTRONICO_COLLECTION).find({}).toArray();
}

async function createHogarElectronicoProduct(product) {
  const db = await getDb(DB_NAME);
  const result = await db.collection(ELECTRONICO_COLLECTION).insertOne(product);
  return { ...product, _id: result.insertedId };
}

async function updateHogarElectronicoProductBySku(sku, updates) {
  const db = await getDb(DB_NAME);
  const result = await db
    .collection(ELECTRONICO_COLLECTION)
    .findOneAndUpdate(
      { sku },
      { $set: updates },
      { returnDocument: 'after' }
    );
  return result;
}

async function deleteHogarElectronicoProductBySku(sku) {
  const db = await getDb(DB_NAME);
  const result = await db.collection(ELECTRONICO_COLLECTION).deleteOne({ sku });
  return result.deletedCount > 0;
}

async function createAdminOrder(order) {
  const db = await getDb(DB_NAME);
  const result = await db.collection(ORDERS_COLLECTION).insertOne(order);
  return { ...order, _id: result.insertedId };
}

async function listAdminOrders() {
  const db = await getDb(DB_NAME);
  return db
    .collection(ORDERS_COLLECTION)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
}

module.exports = {
  getHogarElectronicoProducts,
  createHogarElectronicoProduct,
  updateHogarElectronicoProductBySku,
  deleteHogarElectronicoProductBySku,
  createAdminOrder,
  listAdminOrders,
};
