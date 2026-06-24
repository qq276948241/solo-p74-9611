const { getDb } = require('../config/database');

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
  const offset = (page - 1) * pageSize;
  const list = db.prepare('SELECT * FROM pets WHERE owner_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(ownerId, pageSize, offset);
  const { total } = db.prepare('SELECT COUNT(*) as total FROM pets WHERE owner_id = ?').get(ownerId);
  return { list, total };
}

function update(id, data) {
  const db = getDb();
  const fields = [];
  const values = { id };

  const allowedFields = ['name', 'breed', 'age', 'weight', 'gender', 'vaccination_records', 'personality_notes', 'photo_urls'];
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = @${field}`);
      values[field] = data[field];
    }
  }

  if (fields.length === 0) return findById(id);

  fields.push('updated_at = CURRENT_TIMESTAMP');
  const sql = `UPDATE pets SET ${fields.join(', ')} WHERE id = @id`;
  db.prepare(sql).run(values);
  return findById(id);
}

function remove(id) {
  const db = getDb();
  return db.prepare('DELETE FROM pets WHERE id = ?').run(id);
}

module.exports = { create, findById, findByOwnerId, update, remove };
