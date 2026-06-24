const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pet_foster_platform_secret_key_2024';
const JWT_EXPIRES_IN = '7d';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未提供认证令牌' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 401, message: '令牌已过期' });
    }
    return res.status(401).json({ code: 401, message: '无效的认证令牌' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }
    if (!roles.includes(req.user.role) && req.user.role !== 'both') {
      return res.status(403).json({ code: 403, message: '权限不足' });
    }
    next();
  };
}

module.exports = { generateToken, authMiddleware, requireRole, JWT_SECRET };
