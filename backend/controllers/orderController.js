const Order = require('../models/Order');

exports.createOrder = async (req, res) => {
  try {
    // We expect the customer's name, the fixed shop location, and prep time
    const { customerName, shopLocation, prepTime } = req.body;

    const newOrder = new Order({
      customerName,
      shopLocation, // This is your Stationary Anchor { lat, lng }
      prepTime,     // JIT Constant (e.g., 10 mins)
      status: 'TRACKING'
    });

    const savedOrder = await newOrder.save();
    
    // Send back the created order, specifically the _id for the mobile app to use
    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(400).json({ message: "Failed to create order", error: error.message });
  }
};