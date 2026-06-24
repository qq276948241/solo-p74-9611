const { getDb } = require('../config/database');
const { buildWhereClause, appendOrderAndLimit, buildSetClause } = require('../utils/sql');

function create(pet) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO pets (owner_id, name, breed, age, weight, gender, vaccination_records, personality_notes, photo_urls)
    VALUES (@owner_id, @name, @breed, @age, @weight, @gender, @vaccination_records, @personality_notes, @photo_urls)
  `);
  const result = stmt.run(pet);
  return findById(result.lastInsertRowid);
}

function findById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM pets WHERE id = ?').get(id);
}

function findByOwnerId(ownerId, page, pageSize) {
  const db = getDb();
  const { sql: whereSql, params } = buildWhereClause([
    { clause: 'owner_id = ?', value: ownerId }
  ]);
  const listSql = appendOrderAndLimit(
    `SELECT * FROM pets ${whereSql}`, params, 'created_at DESC', page, pageSize
  );
  const list = db.prepare(listSql.sql).all(...listSql.params);
  const { total } = db.prepare(`SELECT COUNT(*) as total FROM pets ${whereSql}`).get(...params);
  return { list, total };
}

function update(id, data) {
  const db = getDb();
  const allowedFields = ['name', 'breed', 'age', 'weight', 'gender', 'vaccination_records', 'personality_notes', 'photo_urls'];
  const fields = {};
  for (const f of allowedFields) {
    if (data[f] !== undefined) fields[f] = data[f];
  }
  if (Object.keys(fields).length === 0) return findById(id);
  const values = Object.values(fields);
  const setClauses = Object.keys(fields).map(f => `${f} = ?`);
  values.push(id);
  db.prepare(`UPDATE pets SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
  return findById(id);
}

function remove(id) {
  const db = getDb();
  return db.prepare('DELETE FROM pets WHERE id = ?').run(id);
}

module.exports = { create, findById, findByOwnerId, update, remove };
