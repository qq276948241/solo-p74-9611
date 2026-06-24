const express = require('express');
const router = express.Router();
const reviewCtrl = require('../controllers/reviewController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, reviewCtrl.createReview);
router.get('/order/:orderId', authMiddleware, reviewCtrl.getReviewsByOrder);
router.get('/foster-home/:fosterHomeId', reviewCtrl.listReviewsByFosterHome);
router.get('/foster-home/:fosterHomeId/rating', reviewCtrl.getFosterHomeRating);
router.get('/pet/:petId', reviewCtrl.listReviewsByPet);
router.get('/:id', reviewCtrl.getReview);

module.exports = router;
