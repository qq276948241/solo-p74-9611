const { getDb } = require('../config/database');
const { buildWhereClause, appendOrderAndLimit, buildSetClause } = require('../utils/sql');

function create(feedback) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO daily_feedbacks (order_id, date, content, photo_urls)
    VALUES (@order_id, @date, @content, @photo_urls)
  `);
  try {
    const result = stmt.run(feedback);
    return findById(result.lastInsertRowid);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      const dupErr = new Error('该日期的反馈已提交，请使用更新接口');
      dupErr.status = 409;
      throw dupErr;
    }
    throw err;
  }
}

function findById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM daily_feedbacks WHERE id = ?').get(id);
}

function findByOrderId(orderId, page, pageSize) {
  const db = getDb();
  const { sql: whereSql, params } = buildWhereClause([
    { clause: 'order_id = ?', value: orderId }
  ]);
  const listSql = appendOrderAndLimit(
    `SELECT * FROM daily_feedbacks ${whereSql}`, params, 'date ASC', page, pageSize
  );
  const list = db.prepare(listSql.sql).all(...listSql.params);
  const { total } = db.prepare(`SELECT COUNT(*) as total FROM daily_feedbacks ${whereSql}`).get(...params);
  return { list, total };
}

function findByOrderIdAndDate(orderId, date) {
  const db = getDb();
  return db.prepare('SELECT * FROM daily_feedbacks WHERE order_id = ? AND date = ?')
    .get(orderId, date);
}

function update(id, data) {
  const db = getDb();
  const { sql: setSql, params } = buildSetClause(data, ['content', 'photo_urls']);
  if (!setSql) return findById(id);
  params.push(id);
  db.prepare(`UPDATE daily_feedbacks ${setSql}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...params);
  return findById(id);
}

module.exports = { create, findById, findByOrderId, findByOrderIdAndDate, update };
