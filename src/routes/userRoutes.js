const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', userCtrl.register);
router.post('/login', userCtrl.login);
router.get('/profile', authMiddleware, userCtrl.getProfile);
router.put('/profile', authMiddleware, userCtrl.updateProfile);
router.get('/nearby', authMiddleware, userCtrl.searchNearby);

module.exports = router;
