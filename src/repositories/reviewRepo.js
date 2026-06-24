const { getDb } = require('../config/database');
const { buildWhereClause } = require('../utils/sql');

function create(review) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO reviews (order_id, reviewer_id, review_type, target_id, rating, content)
    VALUES (@order_id, @reviewer_id, @review_type, @target_id, @rating, @content)
  `);
  try {
    const result = stmt.run(review);
    return findById(result.lastInsertRowid);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      const dupErr = new Error('您已对此订单该类型提交过评价');
      dupErr.status = 409;
      throw dupErr;
    }
    throw err;
  }
}

function findById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
}

function findByOrderId(orderId) {
  const db = getDb();
  return db.prepare('SELECT * FROM reviews WHERE order_id = ? ORDER BY created_at DESC').all(orderId);
}

function findByTargetId(targetId, reviewType, page, pageSize) {
  const db = getDb();
  const offset = (page - 1) * pageSize;
  const list = db.prepare(`
    SELECT r.*, u.nickname as reviewer_nickname
    FROM reviews r
    LEFT JOIN users u ON r.reviewer_id = u.id
    WHERE r.target_id = ? AND r.review_type = ?
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `).all(targetId, reviewType, pageSize, offset);

  const { total } = db.prepare(`
    SELECT COUNT(*) as total FROM reviews WHERE target_id = ? AND review_type = ?
  `).get(targetId, reviewType);

  return { list, total };
}

function getAverageRatingByTargetId(targetId, reviewType) {
  const db = getDb();
  const result = db.prepare(`
    SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
    FROM reviews WHERE target_id = ? AND review_type = ?
  `).get(targetId, reviewType);

  return {
    avg_rating: result.avg_rating ? Math.round(result.avg_rating * 100) / 100 : 0,
    review_count: result.review_count || 0
  };
}

function updateFosterHomeRating(fosterHomeId) {
  const db = getDb();
  const stats = getAverageRatingByTargetId(fosterHomeId, 'to_foster_home');
  db.prepare(`
    UPDATE foster_homes SET rating = @rating, review_count = @review_count, updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `).run({ rating: stats.avg_rating, review_count: stats.review_count, id: fosterHomeId });
}

module.exports = {
  create, findById, findByOrderId, findByTargetId,
  getAverageRatingByTargetId, updateFosterHomeRating
};
