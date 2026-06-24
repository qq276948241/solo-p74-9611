const { getDb } = require('../config/database');
const { buildWhereClause, appendOrderAndLimit, buildSetClause } = require('../utils/sql');

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
  const { sql: whereSql, params } = buildWhereClause([
    { clause: 'foster_home_id = ?', value: fosterHomeId },
    { clause: 'date >= ?', value: startDate },
    { clause: 'date <= ?', value: endDate }
  ]);
  return db.prepare(`SELECT * FROM schedules ${whereSql} ORDER BY date ASC`).all(...params);
}

function findByHomeId(fosterHomeId, page, pageSize) {
  const db = getDb();
  const { sql: whereSql, params } = buildWhereClause([
    { clause: 'foster_home_id = ?', value: fosterHomeId }
  ]);
  const listSql = appendOrderAndLimit(
    `SELECT * FROM schedules ${whereSql}`, params, 'date ASC', page, pageSize
  );
  const list = db.prepare(listSql.sql).all(...listSql.params);
  const { total } = db.prepare(`SELECT COUNT(*) as total FROM schedules ${whereSql}`).get(...params);
  return { list, total };
}

function update(id, data) {
  const db = getDb();
  const rawFields = {};
  if (data.is_available !== undefined) rawFields.is_available = data.is_available ? 1 : 0;
  if (data.daily_price !== undefined) rawFields.daily_price = data.daily_price;
  if (data.note !== undefined) rawFields.note = data.note;

  if (Object.keys(rawFields).length === 0) return findById(id);
  const values = Object.values(rawFields);
  const setClauses = Object.keys(rawFields).map(f => `${f} = ?`);
  values.push(id);
  db.prepare(`UPDATE schedules SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
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
