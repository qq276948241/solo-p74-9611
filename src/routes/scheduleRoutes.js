const express = require('express');
const router = express.Router();
const scheduleCtrl = require('../controllers/fosterHomeController');
const { authMiddleware, requireRole } = require('../middleware/auth');

module.exports = router;
