const orderRepo = require('../repositories/orderRepo');
const fosterHomeRepo = require('../repositories/fosterHomeRepo');
const petRepo = require('../repositories/petRepo');
const scheduleRepo = require('../repositories/scheduleRepo');
const { getDb } = require('../config/database');
const { assertExists, assertOwner, assertIn, AppError, assert } = require('../utils/validator');

function generateOrderNo() {
  const now = new Date();
  const ts = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PF${ts}${rand}`;
}

function createOrder(ownerId, data) {
  const pet = assertExists(petRepo.findById(data.pet_id), '宠物');
  assertOwner(pet.owner_id, ownerId, '只能为自己的宠物下单');

  const home = assertExists(fosterHomeRepo.findById(data.foster_home_id), '寄养家庭');

  const schedules = scheduleRepo.findByHomeIdAndDateRange(
    data.foster_home_id, data.start_date, data.end_date
  );

  const unavailableDays = schedules.filter(s => !s.is_available);
  assert(unavailableDays.length === 0, `所选日期中有${unavailableDays.length}天不可预约`, 400);

  const missingDays = countDays(data.start_date, data.end_date) - schedules.length;
  assert(missingDays === 0, `所选日期中有${missingDays}天未设置档期`, 400);

  let dailyPrice = home.daily_price;
  const priceOverrides = schedules.filter(s => s.daily_price !== null);
  if (priceOverrides.length > 0) {
    const totalOverride = priceOverrides.reduce((sum, s) => sum + s.daily_price, 0);
    const defaultDays = schedules.length - priceOverrides.length;
    dailyPrice = (totalOverride + defaultDays * home.daily_price) / schedules.length;
  }

  const totalDays = countDays(data.start_date, data.end_date);
  const totalPrice = Math.round(dailyPrice * totalDays * 100) / 100;

  return orderRepo.create({
    order_no: generateOrderNo(),
    owner_id: ownerId,
    foster_home_id: data.foster_home_id,
    pet_id: data.pet_id,
    start_date: data.start_date,
    end_date: data.end_date,
    total_price: totalPrice,
    daily_price: dailyPrice,
    status: 'pending',
    owner_note: data.owner_note || '',
    foster_note: ''
  });
}

function getOrderById(id) {
  return assertExists(orderRepo.findById(id), '订单');
}

function listMyOrders(ownerId, status, page, pageSize) {
  return orderRepo.findByOwnerId(ownerId, status, page, pageSize);
}

function listReceivedOrders(userId, status, page, pageSize) {
  const home = assertExists(fosterHomeRepo.findByUserId(userId), '您还未创建寄养家庭');
  if (!home) {
    throw AppError('您还未创建寄养家庭', 400);
  }
  return orderRepo.findByFosterHomeId(home.id, status, page, pageSize);
}

function confirmOrder(userId, orderId) {
  const order = assertExists(orderRepo.findById(orderId), '订单');
  const home = fosterHomeRepo.findById(order.foster_home_id);
  assertOwner(home?.user_id, userId, '无权操作此订单');
  assertIn(order.status, 'pending', '只能确认待确认的订单');

  const db = getDb();
  const transaction = db.transaction(() => {
    orderRepo.updateStatus(orderId, 'confirmed');
    const schedules = scheduleRepo.findByHomeIdAndDateRange(
      order.foster_home_id, order.start_date, order.end_date
    );
    for (const s of schedules) {
      scheduleRepo.update(s.id, { is_available: false });
    }
  });
  transaction();
  return orderRepo.findById(orderId);
}

function cancelOrder(userId, orderId) {
  const order = assertExists(orderRepo.findById(orderId), '订单');
  const home = fosterHomeRepo.findById(order.foster_home_id);
  const isOwner = order.owner_id === userId;
  const isFoster = home && home.user_id === userId;
  assert(isOwner || isFoster, '无权取消此订单', 403);
  assertIn(order.status, ['pending', 'confirmed'], '只能取消待确认或已确认的订单');

  const db = getDb();
  const transaction = db.transaction(() => {
    orderRepo.updateStatus(orderId, 'cancelled');
    if (order.status === 'confirmed') {
      const schedules = scheduleRepo.findByHomeIdAndDateRange(
        order.foster_home_id, order.start_date, order.end_date
      );
      for (const s of schedules) {
        scheduleRepo.update(s.id, { is_available: true });
      }
    }
  });
  transaction();
  return orderRepo.findById(orderId);
}

function activateOrder(orderId) {
  const order = assertExists(orderRepo.findById(orderId), '订单');
  assertIn(order.status, 'confirmed', '只能激活已确认的订单');
  return orderRepo.updateStatus(orderId, 'active');
}

function completeOrder(orderId) {
  const order = assertExists(orderRepo.findById(orderId), '订单');
  assertIn(order.status, 'active', '只能完成进行中的订单');

  const db = getDb();
  const transaction = db.transaction(() => {
    orderRepo.updateStatus(orderId, 'completed');
    const schedules = scheduleRepo.findByHomeIdAndDateRange(
      order.foster_home_id, order.start_date, order.end_date
    );
    for (const s of schedules) {
      scheduleRepo.update(s.id, { is_available: true });
    }
  });
  transaction();
  return orderRepo.findById(orderId);
}

function countDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

module.exports = {
  createOrder, getOrderById, listMyOrders, listReceivedOrders,
  confirmOrder, cancelOrder, activateOrder, completeOrder
};
