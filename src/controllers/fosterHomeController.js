const fosterHomeService = require('../services/fosterHomeService');
const scheduleService = require('../services/scheduleService');
const { success, paginate } = require('../utils/response');

function createFosterHome(req, res, next) {
  try {
    const home = fosterHomeService.createFosterHome(req.user.id, req.body);
    res.status(201).json(success(home, '寄养家庭创建成功'));
  } catch (err) {
    next(err);
  }
}

function getFosterHome(req, res, next) {
  try {
    const home = fosterHomeService.getFosterHomeById(parseInt(req.params.id));
    res.json(success(home));
  } catch (err) {
    next(err);
  }
}

function getMyFosterHome(req, res, next) {
  try {
    const home = fosterHomeService.getMyFosterHome(req.user.id);
    res.json(success(home));
  } catch (err) {
    next(err);
  }
}

function updateFosterHome(req, res, next) {
  try {
    const home = fosterHomeService.updateFosterHome(req.user.id, req.body);
    res.json(success(home, '更新成功'));
  } catch (err) {
    next(err);
  }
}

function searchNearby(req, res, next) {
  try {
    const { latitude, longitude, radius = 50, page = 1, pageSize = 20, petType } = req.query;
    if (!latitude || !longitude) {
      const err = new Error('请提供经纬度参数');
      err.status = 400;
      throw err;
    }
    const result = fosterHomeService.searchNearbyHomes(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius),
      parseInt(page),
      parseInt(pageSize),
      petType
    );
    res.json(success(paginate(result.list, result.total, parseInt(page), parseInt(pageSize))));
  } catch (err) {
    next(err);
  }
}

function createSchedule(req, res, next) {
  try {
    const schedule = scheduleService.createSchedule(req.user.id, req.body);
    res.status(201).json(success(schedule, '档期创建成功'));
  } catch (err) {
    next(err);
  }
}

function batchCreateSchedules(req, res, next) {
  try {
    const results = scheduleService.batchCreateSchedules(req.user.id, req.body.schedules);
    res.status(201).json(success(results, '批量创建档期成功'));
  } catch (err) {
    next(err);
  }
}

function listSchedules(req, res, next) {
  try {
    const { page = 1, pageSize = 30 } = req.query;
    const result = scheduleService.listSchedulesByHome(parseInt(req.params.homeId), parseInt(page), parseInt(pageSize));
    res.json(success(paginate(result.list, result.total, parseInt(page), parseInt(pageSize))));
  } catch (err) {
    next(err);
  }
}

function getSchedulesInRange(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      const err = new Error('请提供起止日期');
      err.status = 400;
      throw err;
    }
    const list = scheduleService.getSchedulesInRange(parseInt(req.params.homeId), startDate, endDate);
    res.json(success(list));
  } catch (err) {
    next(err);
  }
}

function updateSchedule(req, res, next) {
  try {
    const schedule = scheduleService.updateSchedule(req.user.id, parseInt(req.params.scheduleId), req.body);
    res.json(success(schedule, '更新成功'));
  } catch (err) {
    next(err);
  }
}

function deleteSchedule(req, res, next) {
  try {
    scheduleService.deleteSchedule(req.user.id, parseInt(req.params.scheduleId));
    res.json(success(null, '删除成功'));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createFosterHome, getFosterHome, getMyFosterHome, updateFosterHome, searchNearby,
  createSchedule, batchCreateSchedules, listSchedules, getSchedulesInRange, updateSchedule, deleteSchedule
};
