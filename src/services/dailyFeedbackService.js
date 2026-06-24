const feedbackRepo = require('../repositories/dailyFeedbackRepo');
const orderRepo = require('../repositories/orderRepo');
const fosterHomeRepo = require('../repositories/fosterHomeRepo');
const { assertExists, assertOwner, assertIn, assertDateInRange, assertNotEmpty, assertMinLength, AppError } = require('../utils/validator');

function createFeedback(userId, orderId, data) {
  const order = assertExists(orderRepo.findById(orderId), '订单');
  const home = fosterHomeRepo.findById(order.foster_home_id);
  assertOwner(home?.user_id, userId, '只有寄养家庭可以提交每日反馈');
  assertIn(order.status, ['confirmed', 'active', 'completed'], '订单状态不允许提交反馈');

  assertDateInRange(data.date, order.start_date, order.end_date, '反馈日期');
  assertNotEmpty(data.content, '反馈内容');
  assertMinLength(data.photo_urls || [], 1, '每日反馈');

  const feedback = feedbackRepo.create({
    order_id: orderId,
    date: data.date,
    content: data.content.trim(),
    photo_urls: JSON.stringify(data.photo_urls)
  });

  return parseFeedbackJson(feedback);
}

function getFeedbackById(id) {
  return parseFeedbackJson(assertExists(feedbackRepo.findById(id), '反馈'));
}

function listFeedbacksByOrder(orderId, page, pageSize) {
  const result = feedbackRepo.findByOrderId(orderId, page, pageSize);
  return {
    list: result.list.map(parseFeedbackJson),
    total: result.total
  };
}

function updateFeedback(userId, feedbackId, data) {
  const feedback = assertExists(feedbackRepo.findById(feedbackId), '反馈');
  const order = orderRepo.findById(feedback.order_id);
  const home = fosterHomeRepo.findById(order.foster_home_id);
  assertOwner(home?.user_id, userId, '无权修改此反馈');

  const updateData = {};
  if (data.content !== undefined) updateData.content = data.content.trim();
  if (data.photo_urls !== undefined) {
    assertMinLength(data.photo_urls, 1, '每日反馈');
    updateData.photo_urls = JSON.stringify(data.photo_urls);
  }

  const updated = feedbackRepo.update(feedbackId, updateData);
  return parseFeedbackJson(updated);
}

function parseFeedbackJson(fb) {
  if (!fb) return fb;
  return {
    ...fb,
    photo_urls: JSON.parse(fb.photo_urls || '[]')
  };
}

module.exports = { createFeedback, getFeedbackById, listFeedbacksByOrder, updateFeedback };
