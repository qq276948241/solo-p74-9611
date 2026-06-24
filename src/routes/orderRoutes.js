const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/orderController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.post('/', authMiddleware, requireRole('owner'), orderCtrl.createOrder);
router.get('/my', authMiddleware, orderCtrl.listMyOrders);
router.get('/received', authMiddleware, requireRole('foster'), orderCtrl.listReceivedOrders);
router.get('/:id', authMiddleware, orderCtrl.getOrder);
router.put('/:id/confirm', authMiddleware, requireRole('foster'), orderCtrl.confirmOrder);
router.put('/:id/cancel', authMiddleware, orderCtrl.cancelOrder);
router.put('/:id/activate', authMiddleware, orderCtrl.activateOrder);
router.put('/:id/complete', authMiddleware, orderCtrl.completeOrder);

module.exports = router;
