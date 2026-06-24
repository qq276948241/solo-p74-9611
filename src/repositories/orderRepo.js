const { getDb } = require('../config/database');

function create(order) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO orders (order_no, owner_id, foster_home_id, pet_id, start_date, end_date,
      total_price, daily_price, status, owner_note, foster_note)
    VALUES (@order_no, @owner_id, @foster_home_id, @pet_id, @start_date, @end_date,
      @total_price, @daily_price, @status, @owner_note, @foster_note)
  `);
  const result = stmt.run(order);
  return findById(result.lastInsertRowid);
}

function findById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
}

function findByOrderNo(orderNo) {
  const db = getDb();
  return db.prepare('SELECT * FROM orders WHERE order_no = ?').get(orderNo);
}

function findByOwnerId(ownerId, status, page, pageSize) {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  let whereClause = 'WHERE owner_id = ?';
  const params = [ownerId];

  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }

  const list = db.prepare(
    `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset);

  const { total } = db.prepare(
    `SELECT COUNT(*) as total FROM orders ${whereClause}`
  ).get(...params);

  return { list, total };
}

function findByFosterHomeId(fosterHomeId, status, page, pageSize) {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  let whereClause = 'WHERE foster_home_id = ?';
  const params = [fosterHomeId];

  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }

  const list = db.prepare(
    `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset);

  const { total } = db.prepare(
    `SELECT COUNT(*) as total FROM orders ${whereClause}`
  ).get(...params);

  return { list, total };
}

function updateStatus(id, status) {
  const db = getDb();
  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, id);
  return findById(id);
}

function findActiveByFosterHomeId(fosterHomeId) {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM orders WHERE foster_home_id = ? AND status IN ('confirmed', 'active') ORDER BY start_date ASC"
  ).all(fosterHomeId);
}

module.exports = {
  create, findById, findByOrderNo, findByOwnerId, findByFosterHomeId,
  updateStatus, findActiveByFosterHomeId
};
