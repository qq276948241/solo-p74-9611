const orderService = require('../services/orderService');
const dailyFeedbackService = require('../services/dailyFeedbackService');
const { success, paginate } = require('../utils/response');

function createOrder(req, res, next) {
  try {
    const order = orderService.createOrder(req.user.id, req.body);
    res.status(201).json(success(order, '下单成功'));
  } catch (err) {
    next(err);
  }
}

function getOrder(req, res, next) {
  try {
    const order = orderService.getOrderById(parseInt(req.params.id));
    res.json(success(order));
  } catch (err) {
    next(err);
  }
}

function listMyOrders(req, res, next) {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;
    const result = orderService.listMyOrders(req.user.id, status, parseInt(page), parseInt(pageSize));
    res.json(success(paginate(result.list, result.total, parseInt(page), parseInt(pageSize))));
  } catch (err) {
    next(err);
  }
}

function listReceivedOrders(req, res, next) {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;
    const result = orderService.listReceivedOrders(req.user.id, status, parseInt(page), parseInt(pageSize));
    res.json(success(paginate(result.list, result.total, parseInt(page), parseInt(pageSize))));
  } catch (err) {
    next(err);
  }
}

function confirmOrder(req, res, next) {
  try {
    const order = orderService.confirmOrder(req.user.id, parseInt(req.params.id));
    res.json(success(order, '订单已确认'));
  } catch (err) {
    next(err);
  }
}

function cancelOrder(req, res, next) {
  try {
    const order = orderService.cancelOrder(req.user.id, parseInt(req.params.id));
    res.json(success(order, '订单已取消'));
  } catch (err) {
    next(err);
  }
}

function activateOrder(req, res, next) {
  try {
    const order = orderService.activateOrder(parseInt(req.params.id));
    res.json(success(order, '订单已开始'));
  } catch (err) {
    next(err);
  }
}

function completeOrder(req, res, next) {
  try {
    const order = orderService.completeOrder(parseInt(req.params.id));
    res.json(success(order, '订单已完成'));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrder, getOrder, listMyOrders, listReceivedOrders,
  confirmOrder, cancelOrder, activateOrder, completeOrder
};
