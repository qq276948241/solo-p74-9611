const express = require('express');
const router = express.Router({ mergeParams: true });
const feedbackCtrl = require('../controllers/dailyFeedbackController');
const { authMiddleware, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', authMiddleware, requireRole('foster'), upload.array('photos', 9), (req, res, next) => {
  if (req.files && req.files.length > 0) {
    req.body.photo_urls = req.files.map(f => `/uploads/${f.filename}`);
  }
  feedbackCtrl.createFeedback(req, res, next);
});

router.get('/', authMiddleware, feedbackCtrl.listFeedbacks);
router.get('/:id', authMiddleware, feedbackCtrl.getFeedback);
router.put('/:id', authMiddleware, requireRole('foster'), upload.array('photos', 9), (req, res, next) => {
  if (req.files && req.files.length > 0) {
    req.body.photo_urls = req.files.map(f => `/uploads/${f.filename}`);
  }
  feedbackCtrl.updateFeedback(req, res, next);
});

module.exports = router;
