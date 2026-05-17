const { getDb } = require('../db/mongo');
const { DB_NAME, ELECTRONICO_COLLECTION } = require('../config/constants');

async function getHogarElectronicoProducts() {
  const db = await getDb(DB_NAME);
  return db.collection(ELECTRONICO_COLLECTION).find({}).toArray();
}

module.exports = {
  getHogarElectronicoProducts,
};
