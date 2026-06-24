const express = require('express');
const router = express.Router();
const petCtrl = require('../controllers/petController');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', authMiddleware, upload.array('photos', 9), (req, res, next) => {
  if (req.files && req.files.length > 0) {
    req.body.photo_urls = req.files.map(f => `/uploads/${f.filename}`);
  }
  petCtrl.createPet(req, res, next);
});

router.get('/my', authMiddleware, petCtrl.listMyPets);
router.get('/:id', petCtrl.getPet);
router.put('/:id', authMiddleware, upload.array('photos', 9), (req, res, next) => {
  if (req.files && req.files.length > 0) {
    req.body.photo_urls = req.files.map(f => `/uploads/${f.filename}`);
  }
  petCtrl.updatePet(req, res, next);
});
router.delete('/:id', authMiddleware, petCtrl.deletePet);

module.exports = router;
