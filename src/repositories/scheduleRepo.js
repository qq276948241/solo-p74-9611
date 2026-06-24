const { getDb } = require('../config/database');

function create(schedule) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO schedules (foster_home_id, date, is_available, daily_price, note)
    VALUES (@foster_home_id, @date, @is_available, @daily_price, @note)
  `);
  try {
    const result = stmt.run(schedule);
    return findById(result.lastInsertRowid);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      const updateErr = new Error('该日期的档期已存在，请使用更新接口');
      updateErr.status = 409;
      throw updateErr;
    }
    throw err;
  }
}

function findById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
}

function findByHomeIdAndDateRange(fosterHomeId, startDate, endDate) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM schedules WHERE foster_home_id = ? AND date >= ? AND date <= ? ORDER BY date ASC'
  ).all(fosterHomeId, startDate, endDate);
}

function findByHomeId(fosterHomeId, page, pageSize) {
  const db = getDb();
  const offset = (page - 1) * pageSize;
  const list = db.prepare(
    'SELECT * FROM schedules WHERE foster_home_id = ? ORDER BY date ASC LIMIT ? OFFSET ?'
  ).all(fosterHomeId, pageSize, offset);
  const { total } = db.prepare(
    'SELECT COUNT(*) as total FROM schedules WHERE foster_home_id = ?'
  ).get(fosterHomeId);
  return { list, total };
}

function update(id, data) {
  const db = getDb();
  const fields = [];
  const values = { id };

  const allowedFields = ['is_available', 'daily_price', 'note'];
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      let val = data[field];
      if (field === 'is_available') val = val ? 1 : 0;
      fields.push(`${field} = @${field}`);
      values[field] = val;
    }
  }

  if (fields.length === 0) return findById(id);

  fields.push('updated_at = CURRENT_TIMESTAMP');
  const sql = `UPDATE schedules SET ${fields.join(', ')} WHERE id = @id`;
  db.prepare(sql).run(values);
  return findById(id);
}

function batchCreate(fosterHomeId, schedules) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO schedules (foster_home_id, date, is_available, daily_price, note)
    VALUES (@foster_home_id, @date, @is_available, @daily_price, @note)
  `);

  const results = [];
  const transaction = db.transaction((items) => {
    for (const item of items) {
      const result = stmt.run({
        foster_home_id: fosterHomeId,
        date: item.date,
        is_available: item.is_available !== undefined ? (item.is_available ? 1 : 0) : 1,
        daily_price: item.daily_price || null,
        note: item.note || ''
      });
      results.push(findById(result.lastInsertRowid));
    }
  });

  transaction(schedules);
  return results;
}

function remove(id) {
  const db = getDb();
  return db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
}

module.exports = { create, findById, findByHomeIdAndDateRange, findByHomeId, update, batchCreate, remove };
