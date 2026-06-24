const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/fosterHomeController');
const { authMiddleware, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', authMiddleware, requireRole('foster'), upload.array('photos', 20), (req, res, next) => {
  if (req.files && req.files.length > 0) {
    const urls = req.files.map(f => `/uploads/${f.filename}`);
    if (req.body.photo_type === 'yard') {
      req.body.yard_photo_urls = urls;
    } else {
      req.body.environment_photo_urls = urls;
    }
  }
  ctrl.createFosterHome(req, res, next);
});

router.get('/my', authMiddleware, ctrl.getMyFosterHome);
router.get('/search', ctrl.searchNearby);
router.get('/:id', ctrl.getFosterHome);

router.put('/', authMiddleware, requireRole('foster'), upload.array('photos', 20), (req, res, next) => {
  if (req.files && req.files.length > 0) {
    const urls = req.files.map(f => `/uploads/${f.filename}`);
    if (req.body.photo_type === 'yard') {
      req.body.yard_photo_urls = urls;
    } else {
      req.body.environment_photo_urls = urls;
    }
  }
  ctrl.updateFosterHome(req, res, next);
});

router.post('/:homeId/schedules', authMiddleware, requireRole('foster'), ctrl.createSchedule);
router.post('/:homeId/schedules/batch', authMiddleware, requireRole('foster'), ctrl.batchCreateSchedules);
router.get('/:homeId/schedules', ctrl.listSchedules);
router.get('/:homeId/schedules/range', ctrl.getSchedulesInRange);
router.put('/schedules/:scheduleId', authMiddleware, requireRole('foster'), ctrl.updateSchedule);
router.delete('/schedules/:scheduleId', authMiddleware, requireRole('foster'), ctrl.deleteSchedule);

module.exports = router;
