const fosterHomeRepo = require('../repositories/fosterHomeRepo');
const userRepo = require('../repositories/userRepo');

function createFosterHome(userId, data) {
  const user = userRepo.findById(userId);
  if (!user) {
    const err = new Error('用户不存在');
    err.status = 404;
    throw err;
  }

  const existing = fosterHomeRepo.findByUserId(userId);
  if (existing) {
    const err = new Error('您已创建寄养家庭，请使用更新接口');
    err.status = 409;
    throw err;
  }

  const home = fosterHomeRepo.create({
    user_id: userId,
    title: data.title,
    description: data.description || '',
    daily_price: data.daily_price,
    max_pets: data.max_pets || 1,
    pet_type_accepted: data.pet_type_accepted || 'all',
    latitude: data.latitude || user.latitude || null,
    longitude: data.longitude || user.longitude || null,
    address: data.address || user.address || '',
    environment_photo_urls: JSON.stringify(data.environment_photo_urls || []),
    yard_photo_urls: JSON.stringify(data.yard_photo_urls || []),
    amenities: JSON.stringify(data.amenities || [])
  });

  return parseHomeJson(home);
}

function getFosterHomeById(id) {
  const home = fosterHomeRepo.findById(id);
  if (!home) {
    const err = new Error('寄养家庭不存在');
    err.status = 404;
    throw err;
  }
  return parseHomeJson(home);
}

function getMyFosterHome(userId) {
  const home = fosterHomeRepo.findByUserId(userId);
  if (!home) {
    const err = new Error('您还未创建寄养家庭');
    err.status = 404;
    throw err;
  }
  return parseHomeJson(home);
}

function updateFosterHome(userId, data) {
  const home = fosterHomeRepo.findByUserId(userId);
  if (!home) {
    const err = new Error('您还未创建寄养家庭');
    err.status = 404;
    throw err;
  }

  const updateData = {};
  const jsonFields = ['environment_photo_urls', 'yard_photo_urls', 'amenities'];
  const simpleFields = ['title', 'description', 'daily_price', 'max_pets', 'pet_type_accepted',
    'latitude', 'longitude', 'address'];

  for (const field of simpleFields) {
    if (data[field] !== undefined) updateData[field] = data[field];
  }
  for (const field of jsonFields) {
    if (data[field] !== undefined) updateData[field] = JSON.stringify(data[field]);
  }

  const updated = fosterHomeRepo.update(home.id, updateData);
  return parseHomeJson(updated);
}

function searchNearbyHomes(latitude, longitude, radiusKm, page, pageSize, petType) {
  const result = fosterHomeRepo.searchNearby(latitude, longitude, radiusKm, page, pageSize, petType);
  return {
    list: result.list.map(parseHomeJson),
    total: result.total
  };
}

function parseHomeJson(home) {
  if (!home) return home;
  return {
    ...home,
    environment_photo_urls: JSON.parse(home.environment_photo_urls || '[]'),
    yard_photo_urls: JSON.parse(home.yard_photo_urls || '[]'),
    amenities: JSON.parse(home.amenities || '[]')
  };
}

module.exports = { createFosterHome, getFosterHomeById, getMyFosterHome, updateFosterHome, searchNearbyHomes };
