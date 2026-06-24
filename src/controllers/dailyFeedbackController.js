const dailyFeedbackService = require('../services/dailyFeedbackService');
const { success, paginate } = require('../utils/response');

function createFeedback(req, res, next) {
  try {
    const feedback = dailyFeedbackService.createFeedback(
      req.user.id,
      parseInt(req.params.orderId),
      req.body
    );
    res.status(201).json(success(feedback, '每日反馈提交成功'));
  } catch (err) {
    next(err);
  }
}

function getFeedback(req, res, next) {
  try {
    const feedback = dailyFeedbackService.getFeedbackById(parseInt(req.params.id));
    res.json(success(feedback));
  } catch (err) {
    next(err);
  }
}

function listFeedbacks(req, res, next) {
  try {
    const { page = 1, pageSize = 30 } = req.query;
    const result = dailyFeedbackService.listFeedbacksByOrder(
      parseInt(req.params.orderId),
      parseInt(page),
      parseInt(pageSize)
    );
    res.json(success(paginate(result.list, result.total, parseInt(page), parseInt(pageSize))));
  } catch (err) {
    next(err);
  }
}

function updateFeedback(req, res, next) {
  try {
    const feedback = dailyFeedbackService.updateFeedback(
      req.user.id,
      parseInt(req.params.id),
      req.body
    );
    res.json(success(feedback, '反馈更新成功'));
  } catch (err) {
    next(err);
  }
}

module.exports = { createFeedback, getFeedback, listFeedbacks, updateFeedback };
