const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');

// Track online users: socketId -> { userId, username }
const onlineUsers = new Map();

const setupSocket = (io) => {
  // Authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`🟢 ${user.username} connected (${socket.id})`);

    // Mark user online
    onlineUsers.set(socket.id, {
      userId: user._id.toString(),
      username: user.username,
    });

    await User.findByIdAndUpdate(user._id, { isOnline: true });

    // Broadcast online users list
    io.emit('users:online', Array.from(onlineUsers.values()));

    // --- Room Events ---

    // Join a room
    socket.on('room:join', async (roomId) => {
      try {
        const room = await Room.findById(roomId);
        if (!room) return socket.emit('error', { message: 'Room not found' });

        // Add user to room members if not already
        if (!room.members.includes(user._id)) {
          room.members.push(user._id);
          await room.save();
        }

        socket.join(roomId);
        console.log(`📌 ${user.username} joined room: ${room.name}`);

        // Notify room
        const systemMsg = await Message.create({
          content: `${user.username} joined the room`,
          sender: user._id,
          room: roomId,
          type: 'system',
        });

        await systemMsg.populate('sender', 'username avatar');
        io.to(roomId).emit('message:new', systemMsg);

        // Send updated room info
        const updatedRoom = await Room.findById(roomId)
          .populate('members', 'username isOnline');
        io.to(roomId).emit('room:updated', updatedRoom);
      } catch (error) {
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Leave a room
    socket.on('room:leave', async (roomId) => {
      try {
        socket.leave(roomId);
        console.log(`📤 ${user.username} left room: ${roomId}`);

        const systemMsg = await Message.create({
          content: `${user.username} left the room`,
          sender: user._id,
          room: roomId,
          type: 'system',
        });

        await systemMsg.populate('sender', 'username avatar');
        io.to(roomId).emit('message:new', systemMsg);
      } catch (error) {
        socket.emit('error', { message: 'Failed to leave room' });
      }
    });

    // --- Message Events ---

    // Send a message
    socket.on('message:send', async ({ roomId, content }) => {
      try {
        if (!content || !content.trim()) return;

        const message = await Message.create({
          content: content.trim(),
          sender: user._id,
          room: roomId,
          type: 'text',
        });

        await message.populate('sender', 'username avatar');

        // Broadcast to everyone in the room
        io.to(roomId).emit('message:new', message);
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing:start', ({ roomId }) => {
      socket.to(roomId).emit('typing:update', {
        userId: user._id,
        username: user.username,
        isTyping: true,
      });
    });

    socket.on('typing:stop', ({ roomId }) => {
      socket.to(roomId).emit('typing:update', {
        userId: user._id,
        username: user.username,
        isTyping: false,
      });
    });

    // --- Disconnect ---
    socket.on('disconnect', async () => {
      console.log(`🔴 ${user.username} disconnected`);
      onlineUsers.delete(socket.id);
      await User.findByIdAndUpdate(user._id, {
        isOnline: false,
        lastSeen: new Date(),
      });
      io.emit('users:online', Array.from(onlineUsers.values()));
    });
  });
};

module.exports = setupSocket;
