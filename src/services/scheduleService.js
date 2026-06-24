const scheduleRepo = require('../repositories/scheduleRepo');
const fosterHomeRepo = require('../repositories/fosterHomeRepo');

function createSchedule(userId, data) {
  const home = fosterHomeRepo.findByUserId(userId);
  if (!home) {
    const err = new Error('请先创建寄养家庭');
    err.status = 400;
    throw err;
  }

  const schedule = scheduleRepo.create({
    foster_home_id: home.id,
    date: data.date,
    is_available: data.is_available !== undefined ? (data.is_available ? 1 : 0) : 1,
    daily_price: data.daily_price || home.daily_price,
    note: data.note || ''
  });

  return schedule;
}

function batchCreateSchedules(userId, schedules) {
  const home = fosterHomeRepo.findByUserId(userId);
  if (!home) {
    const err = new Error('请先创建寄养家庭');
    err.status = 400;
    throw err;
  }

  return scheduleRepo.batchCreate(home.id, schedules.map(s => ({
    ...s,
    daily_price: s.daily_price || home.daily_price
  })));
}

function listSchedulesByHome(homeId, page, pageSize) {
  return scheduleRepo.findByHomeId(homeId, page, pageSize);
}

function getSchedulesInRange(homeId, startDate, endDate) {
  return scheduleRepo.findByHomeIdAndDateRange(homeId, startDate, endDate);
}

function updateSchedule(userId, scheduleId, data) {
  const schedule = scheduleRepo.findById(scheduleId);
  if (!schedule) {
    const err = new Error('档期不存在');
    err.status = 404;
    throw err;
  }

  const home = fosterHomeRepo.findById(schedule.foster_home_id);
  if (!home || home.user_id !== userId) {
    const err = new Error('无权修改该档期');
    err.status = 403;
    throw err;
  }

  return scheduleRepo.update(scheduleId, data);
}

function deleteSchedule(userId, scheduleId) {
  const schedule = scheduleRepo.findById(scheduleId);
  if (!schedule) {
    const err = new Error('档期不存在');
    err.status = 404;
    throw err;
  }

  const home = fosterHomeRepo.findById(schedule.foster_home_id);
  if (!home || home.user_id !== userId) {
    const err = new Error('无权删除该档期');
    err.status = 403;
    throw err;
  }

  scheduleRepo.remove(scheduleId);
}

module.exports = { createSchedule, batchCreateSchedules, listSchedulesByHome, getSchedulesInRange, updateSchedule, deleteSchedule };
