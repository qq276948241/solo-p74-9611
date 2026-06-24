const { getDb } = require('../config/database');

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
  const offset = (page - 1) * pageSize;
  const list = db.prepare(
    'SELECT * FROM daily_feedbacks WHERE order_id = ? ORDER BY date ASC LIMIT ? OFFSET ?'
  ).all(orderId, pageSize, offset);
  const { total } = db.prepare(
    'SELECT COUNT(*) as total FROM daily_feedbacks WHERE order_id = ?'
  ).get(orderId);
  return { list, total };
}

function findByOrderIdAndDate(orderId, date) {
  const db = getDb();
  return db.prepare('SELECT * FROM daily_feedbacks WHERE order_id = ? AND date = ?')
    .get(orderId, date);
}

function update(id, data) {
  const db = getDb();
  const fields = [];
  const values = { id };

  const allowedFields = ['content', 'photo_urls'];
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = @${field}`);
      values[field] = data[field];
    }
  }

  if (fields.length === 0) return findById(id);

  fields.push('updated_at = CURRENT_TIMESTAMP');
  const sql = `UPDATE daily_feedbacks SET ${fields.join(', ')} WHERE id = @id`;
  db.prepare(sql).run(values);
  return findById(id);
}

module.exports = { create, findById, findByOrderId, findByOrderIdAndDate, update };
