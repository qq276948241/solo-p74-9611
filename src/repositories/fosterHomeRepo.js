const { getDb } = require('../config/database');

function create(home) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO foster_homes (user_id, title, description, daily_price, max_pets, pet_type_accepted,
      latitude, longitude, address, environment_photo_urls, yard_photo_urls, amenities)
    VALUES (@user_id, @title, @description, @daily_price, @max_pets, @pet_type_accepted,
      @latitude, @longitude, @address, @environment_photo_urls, @yard_photo_urls, @amenities)
  `);
  const result = stmt.run(home);
  return findById(result.lastInsertRowid);
}

function findById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM foster_homes WHERE id = ?').get(id);
}

function findByUserId(userId) {
  const db = getDb();
  return db.prepare('SELECT * FROM foster_homes WHERE user_id = ?').get(userId);
}

function update(id, data) {
  const db = getDb();
  const fields = [];
  const values = { id };

  const allowedFields = [
    'title', 'description', 'daily_price', 'max_pets', 'pet_type_accepted',
    'latitude', 'longitude', 'address', 'environment_photo_urls', 'yard_photo_urls', 'amenities'
  ];
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = @${field}`);
      values[field] = data[field];
    }
  }

  if (fields.length === 0) return findById(id);

  fields.push('updated_at = CURRENT_TIMESTAMP');
  const sql = `UPDATE foster_homes SET ${fields.join(', ')} WHERE id = @id`;
  db.prepare(sql).run(values);
  return findById(id);
}

function searchNearby(latitude, longitude, radiusKm, page, pageSize, petType) {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  let typeFilter = '';
  if (petType && petType !== 'all') {
    typeFilter = `AND (pet_type_accepted = 'all' OR pet_type_accepted LIKE @petType)`;
  }

  const sql = `
    SELECT * FROM (
      SELECT *, haversine_distance(@lat, @lng, latitude, longitude) AS distance
      FROM foster_homes
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ${typeFilter}
    )
    WHERE distance <= @radius
    ORDER BY distance ASC
    LIMIT @limit OFFSET @offset
  `;

  const countSql = `
    SELECT COUNT(*) as total FROM (
      SELECT id, haversine_distance(@lat, @lng, latitude, longitude) AS distance
      FROM foster_homes
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ${typeFilter}
    )
    WHERE distance <= @radius
  `;

  const params = { lat: latitude, lng: longitude, radius: radiusKm, limit: pageSize, offset };
  if (petType && petType !== 'all') {
    params.petType = `%${petType}%`;
  }

  const list = db.prepare(sql).all(params);
  const { total } = db.prepare(countSql).get(params);
  return { list, total };
}

module.exports = { create, findById, findByUserId, update, searchNearby };
