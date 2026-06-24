const reviewRepo = require('../repositories/reviewRepo');
const orderRepo = require('../repositories/orderRepo');
const fosterHomeRepo = require('../repositories/fosterHomeRepo');
const { assertExists, assertOwner, assertIn, assertRange, AppError } = require('../utils/validator');

function createReview(reviewerId, data) {
  const order = assertExists(orderRepo.findById(data.order_id), '订单');
  assertIn(order.status, 'completed', '只有已完成的订单才能评价');

  const reviewType = data.review_type;
  const rating = data.rating;
  assertRange(rating, 1, 5, '评分');

  if (reviewType === 'to_foster_home') {
    assertOwner(order.owner_id, reviewerId, '只有主人可以评价寄养家庭');
    const review = reviewRepo.create({
      order_id: data.order_id,
      reviewer_id: reviewerId,
      review_type: 'to_foster_home',
      target_id: order.foster_home_id,
      rating,
      content: data.content || ''
    });
    reviewRepo.updateFosterHomeRating(order.foster_home_id);
    return review;
  } else if (reviewType === 'to_pet') {
    const home = fosterHomeRepo.findById(order.foster_home_id);
    if (!home || home.user_id !== reviewerId) {
      throw AppError('只有寄养家庭可以评价宠物表现', 403);
    }
    return reviewRepo.create({
      order_id: data.order_id,
      reviewer_id: reviewerId,
      review_type: 'to_pet',
      target_id: order.pet_id,
      rating,
      content: data.content || ''
    });
  } else {
    throw AppError('无效的评价类型', 400);
  }
}

function getReviewById(id) {
  return assertExists(reviewRepo.findById(id), '评价');
}

function getReviewsByOrder(orderId) {
  return reviewRepo.findByOrderId(orderId);
}

function listReviewsByFosterHome(fosterHomeId, page, pageSize) {
  return reviewRepo.findByTargetId(fosterHomeId, 'to_foster_home', page, pageSize);
}

function listReviewsByPet(petId, page, pageSize) {
  return reviewRepo.findByTargetId(petId, 'to_pet', page, pageSize);
}

function getFosterHomeRating(fosterHomeId) {
  return reviewRepo.getAverageRatingByTargetId(fosterHomeId, 'to_foster_home');
}

module.exports = {
  createReview, getReviewById, getReviewsByOrder,
  listReviewsByFosterHome, listReviewsByPet, getFosterHomeRating
};
