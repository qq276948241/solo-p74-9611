const reviewRepo = require('../repositories/reviewRepo');
const orderRepo = require('../repositories/orderRepo');
const fosterHomeRepo = require('../repositories/fosterHomeRepo');

function createReview(reviewerId, data) {
  const order = orderRepo.findById(data.order_id);
  if (!order) {
    const err = new Error('订单不存在');
    err.status = 404;
    throw err;
  }

  if (order.status !== 'completed') {
    const err = new Error('只有已完成的订单才能评价');
    err.status = 400;
    throw err;
  }

  const reviewType = data.review_type;
  if (reviewType === 'to_foster_home') {
    if (order.owner_id !== reviewerId) {
      const err = new Error('只有主人可以评价寄养家庭');
      err.status = 403;
      throw err;
    }
    if (data.rating < 1 || data.rating > 5) {
      const err = new Error('评分必须在 1 到 5 星之间');
      err.status = 400;
      throw err;
    }
    const review = reviewRepo.create({
      order_id: data.order_id,
      reviewer_id: reviewerId,
      review_type: 'to_foster_home',
      target_id: order.foster_home_id,
      rating: data.rating,
      content: data.content || ''
    });
    reviewRepo.updateFosterHomeRating(order.foster_home_id);
    return review;
  } else if (reviewType === 'to_pet') {
    const home = fosterHomeRepo.findById(order.foster_home_id);
    if (!home || home.user_id !== reviewerId) {
      const err = new Error('只有寄养家庭可以评价宠物表现');
      err.status = 403;
      throw err;
    }
    if (data.rating < 1 || data.rating > 5) {
      const err = new Error('评分必须在 1 到 5 星之间');
      err.status = 400;
      throw err;
    }
    return reviewRepo.create({
      order_id: data.order_id,
      reviewer_id: reviewerId,
      review_type: 'to_pet',
      target_id: order.pet_id,
      rating: data.rating,
      content: data.content || ''
    });
  } else {
    const err = new Error('无效的评价类型');
    err.status = 400;
    throw err;
  }
}

function getReviewById(id) {
  const review = reviewRepo.findById(id);
  if (!review) {
    const err = new Error('评价不存在');
    err.status = 404;
    throw err;
  }
  return review;
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
