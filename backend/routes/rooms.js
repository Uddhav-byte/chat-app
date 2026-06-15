const express = require('express');
const Room = require('../models/Room');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/rooms
// @desc    Get all rooms
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate('creator', 'username')
      .populate('members', 'username isOnline')
      .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/rooms
// @desc    Create a new room
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;

    const existingRoom = await Room.findOne({ name });
    if (existingRoom) {
      return res.status(400).json({ message: 'Room name already exists' });
    }

    const room = await Room.create({
      name,
      description,
      isPrivate: isPrivate || false,
      creator: req.user._id,
      members: [req.user._id],
    });

    await room.populate('creator', 'username');
    await room.populate('members', 'username isOnline');

    res.status(201).json(room);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/rooms/:id/messages
// @desc    Get messages for a room
// @access  Private
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const { limit = 50, before } = req.query;

    const query = { room: req.params.id };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Return in chronological order
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
