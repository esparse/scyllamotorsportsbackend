const Event = require("../models/Event");
const Member = require("../models/Member");
const mongoose = require("mongoose");

// managed by admin
exports.createEvent = async (req, res) => {
  try {
    const { title, description, date } = req.body;

    const event = await Event.create({
      title,
      description,
      date,
    });

    res.status(201).json({
      success: true,
      event,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};