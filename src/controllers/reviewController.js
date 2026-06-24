const reviewService = require('../services/reviewService');
const { success, paginate } = require('../utils/response');

function createReview(req, res, next) {
  try {
    const review = reviewService.createReview(req.user.id, req.body);
    res.status(201).json(success(review, '评价提交成功'));
  } catch (err) {
    next(err);
  }
}

function getReview(req, res, next) {
  try {
    const review = reviewService.getReviewById(parseInt(req.params.id));
    res.json(success(review));
  } catch (err) {
    next(err);
  }
}

function getReviewsByOrder(req, res, next) {
  try {
    const reviews = reviewService.getReviewsByOrder(parseInt(req.params.orderId));
    res.json(success(reviews));
  } catch (err) {
    next(err);
  }
}

function listReviewsByFosterHome(req, res, next) {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const result = reviewService.listReviewsByFosterHome(
      parseInt(req.params.fosterHomeId),
      parseInt(page),
      parseInt(pageSize)
    );
    res.json(success(paginate(result.list, result.total, parseInt(page), parseInt(pageSize))));
  } catch (err) {
    next(err);
  }
}

function listReviewsByPet(req, res, next) {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const result = reviewService.listReviewsByPet(
      parseInt(req.params.petId),
      parseInt(page),
      parseInt(pageSize)
    );
    res.json(success(paginate(result.list, result.total, parseInt(page), parseInt(pageSize))));
  } catch (err) {
    next(err);
  }
}

function getFosterHomeRating(req, res, next) {
  try {
    const rating = reviewService.getFosterHomeRating(parseInt(req.params.fosterHomeId));
    res.json(success(rating));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createReview, getReview, getReviewsByOrder,
  listReviewsByFosterHome, listReviewsByPet, getFosterHomeRating
};
