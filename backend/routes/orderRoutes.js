const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Route for the mobile app to POST a new order
router.post('/create', orderController.createOrder);

module.exports = router;