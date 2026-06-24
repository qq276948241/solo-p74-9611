const userService = require('../services/userService');
const { success, paginate } = require('../utils/response');

async function register(req, res, next) {
  try {
    const result = await userService.register(req.body);
    res.status(201).json(success(result, '注册成功'));
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await userService.login(req.body);
    res.json(success(result, '登录成功'));
  } catch (err) {
    next(err);
  }
}

function getProfile(req, res, next) {
  try {
    const user = userService.getProfile(req.user.id);
    res.json(success(user));
  } catch (err) {
    next(err);
  }
}

function updateProfile(req, res, next) {
  try {
    const user = userService.updateProfile(req.user.id, req.body);
    const { password_hash: _, ...safeUser } = user;
    res.json(success(safeUser, '更新成功'));
  } catch (err) {
    next(err);
  }
}

function searchNearby(req, res, next) {
  try {
    const { latitude, longitude, radius = 50, page = 1, pageSize = 20 } = req.query;
    if (!latitude || !longitude) {
      const err = new Error('请提供经纬度参数');
      err.status = 400;
      throw err;
    }
    const result = userService.searchNearbyUsers(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius),
      parseInt(page),
      parseInt(pageSize)
    );
    const safeList = result.list.map(({ password_hash, ...rest }) => rest);
    res.json(success(paginate(safeList, result.total, parseInt(page), parseInt(pageSize))));
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getProfile, updateProfile, searchNearby };
