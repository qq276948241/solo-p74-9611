const bcrypt = require('bcryptjs');
const userRepo = require('../repositories/userRepo');
const { generateToken } = require('../middleware/auth');

async function register({ phone, password, nickname, role, latitude, longitude, address }) {
  const existing = userRepo.findByPhone(phone);
  if (existing) {
    const err = new Error('该手机号已注册');
    err.status = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, 10);
  const user = userRepo.create({
    phone,
    password_hash,
    nickname: nickname || '',
    role: role || 'owner',
    latitude: latitude || null,
    longitude: longitude || null,
    address: address || '',
    avatar_url: ''
  });

  const token = generateToken({ id: user.id, phone: user.phone, role: user.role });
  const { password_hash: _, ...safeUser } = user;
  return { user: safeUser, token };
}

async function login({ phone, password }) {
  const user = userRepo.findByPhone(phone);
  if (!user) {
    const err = new Error('手机号或密码错误');
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('手机号或密码错误');
    err.status = 401;
    throw err;
  }

  const token = generateToken({ id: user.id, phone: user.phone, role: user.role });
  const { password_hash: _, ...safeUser } = user;
  return { user: safeUser, token };
}

function getProfile(userId) {
  const user = userRepo.findById(userId);
  if (!user) {
    const err = new Error('用户不存在');
    err.status = 404;
    throw err;
  }
  const { password_hash: _, ...safeUser } = user;
  return safeUser;
}

function updateProfile(userId, data) {
  return userRepo.update(userId, data);
}

function searchNearbyUsers(latitude, longitude, radiusKm, page, pageSize) {
  return userRepo.searchNearby(latitude, longitude, radiusKm, page, pageSize);
}

module.exports = { register, login, getProfile, updateProfile, searchNearbyUsers };
