const feedbackRepo = require('../repositories/dailyFeedbackRepo');
const orderRepo = require('../repositories/orderRepo');
const fosterHomeRepo = require('../repositories/fosterHomeRepo');

function createFeedback(userId, orderId, data) {
  const order = orderRepo.findById(orderId);
  if (!order) {
    const err = new Error('订单不存在');
    err.status = 404;
    throw err;
  }

  const home = fosterHomeRepo.findById(order.foster_home_id);
  if (!home || home.user_id !== userId) {
    const err = new Error('只有寄养家庭可以提交每日反馈');
    err.status = 403;
    throw err;
  }

  if (!['confirmed', 'active', 'completed'].includes(order.status)) {
    const err = new Error('订单状态不允许提交反馈');
    err.status = 400;
    throw err;
  }

  const feedbackDate = data.date;
  if (feedbackDate < order.start_date || feedbackDate > order.end_date) {
    const err = new Error('反馈日期不在寄养期间');
    err.status = 400;
    throw err;
  }

  if (!data.content || !data.content.trim()) {
    const err = new Error('反馈内容不能为空');
    err.status = 400;
    throw err;
  }

  const photoUrls = data.photo_urls || [];
  if (photoUrls.length < 1) {
    const err = new Error('每日反馈至少需要一张照片');
    err.status = 400;
    throw err;
  }

  const feedback = feedbackRepo.create({
    order_id: orderId,
    date: feedbackDate,
    content: data.content.trim(),
    photo_urls: JSON.stringify(photoUrls)
  });

  return parseFeedbackJson(feedback);
}

function getFeedbackById(id) {
  const feedback = feedbackRepo.findById(id);
  if (!feedback) {
    const err = new Error('反馈不存在');
    err.status = 404;
    throw err;
  }
  return parseFeedbackJson(feedback);
}

function listFeedbacksByOrder(orderId, page, pageSize) {
  const result = feedbackRepo.findByOrderId(orderId, page, pageSize);
  return {
    list: result.list.map(parseFeedbackJson),
    total: result.total
  };
}

function updateFeedback(userId, feedbackId, data) {
  const feedback = feedbackRepo.findById(feedbackId);
  if (!feedback) {
    const err = new Error('反馈不存在');
    err.status = 404;
    throw err;
  }

  const order = orderRepo.findById(feedback.order_id);
  const home = fosterHomeRepo.findById(order.foster_home_id);
  if (!home || home.user_id !== userId) {
    const err = new Error('无权修改此反馈');
    err.status = 403;
    throw err;
  }

  const updateData = {};
  if (data.content !== undefined) updateData.content = data.content.trim();
  if (data.photo_urls !== undefined) {
    if (data.photo_urls.length < 1) {
      const err = new Error('每日反馈至少需要一张照片');
      err.status = 400;
      throw err;
    }
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
