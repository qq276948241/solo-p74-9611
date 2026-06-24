const { getDb } = require('../config/database');

function create(user) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO users (phone, password_hash, nickname, role, latitude, longitude, address, avatar_url)
    VALUES (@phone, @password_hash, @nickname, @role, @latitude, @longitude, @address, @avatar_url)
  `);
  const result = stmt.run(user);
  return findById(result.lastInsertRowid);
}

function findById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function findByPhone(phone) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
}

function update(id, data) {
  const db = getDb();
  const fields = [];
  const values = { id };

  const allowedFields = ['nickname', 'role', 'latitude', 'longitude', 'address', 'avatar_url'];
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = @${field}`);
      values[field] = data[field];
    }
  }

  if (fields.length === 0) return findById(id);

  fields.push('updated_at = CURRENT_TIMESTAMP');
  const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = @id`;
  db.prepare(sql).run(values);
  return findById(id);
}

function searchNearby(latitude, longitude, radiusKm, page, pageSize) {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  const sql = `
    SELECT * FROM (
      SELECT *, haversine_distance(@lat, @lng, latitude, longitude) AS distance
      FROM users
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    )
    WHERE distance <= @radius
    ORDER BY distance ASC
    LIMIT @limit OFFSET @offset
  `;

  const countSql = `
    SELECT COUNT(*) as total FROM (
      SELECT id, haversine_distance(@lat, @lng, latitude, longitude) AS distance
      FROM users
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    )
    WHERE distance <= @radius
  `;

  const params = { lat: latitude, lng: longitude, radius: radiusKm, limit: pageSize, offset };
  const list = db.prepare(sql).all(params);
  const { total } = db.prepare(countSql).get(params);
  return { list, total };
}

module.exports = { create, findById, findByPhone, update, searchNearby };
