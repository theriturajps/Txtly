const Room = require('./models/Room');
const User = require('./models/User');
const TextHistory = require('./models/TextHistory');

module.exports = (io) => {
  // Track rooms and connections
  const roomClients = {};

  // Initialize room client counter if not exists
  const initRoomCounter = (roomName) => {
    if (!roomClients[roomName]) {
      roomClients[roomName] = 0;
    }
  };

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    let currentRoom = null;

    // Join a room
    socket.on('join-room', async (roomName) => {
      // Leave previous room if any
      if (currentRoom) {
        socket.leave(currentRoom);
        roomClients[currentRoom]--;
        io.to(currentRoom).emit('client-count', roomClients[currentRoom]);
      }

      // Sanitize room name (remove special characters, limit length)
      const sanitizedRoom = roomName.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 50);
      currentRoom = sanitizedRoom || 'default';
      
      // Join new room
      socket.join(currentRoom);
      initRoomCounter(currentRoom);
      roomClients[currentRoom]++;
      
      console.log(`Client ${socket.id} joined room: ${currentRoom}`);

      // Check if room is claimed
      try {
        let room = await Room.findOne({ name: currentRoom });
        let isAuthenticated = false;
        let lastText = '';
        
        // If user is authenticated, check if they can access this room
        if (socket.request.session.userId) {
          const user = await User.findById(socket.request.session.userId);
          isAuthenticated = user ? true : false;
        }

        // If room exists but not claimed, or user is authenticated
        if (!room) {
          // Room doesn't exist yet in DB
          socket.emit('room-status', { 
            claimed: false, 
            canAccess: true,
            lastText: '' 
          });
        } else {
          // Room exists
          const canAccess = !room.claimedBy || (isAuthenticated && room.claimedBy.equals(socket.request.session.userId));
          
          if (canAccess) {
            // Get last text if available
            const latestHistory = await TextHistory.findOne({ 
              room: room._id 
            }).sort({ createdAt: -1 });
            
            lastText = latestHistory ? latestHistory.text : '';
          }
          
          socket.emit('room-status', { 
            claimed: !!room.claimedBy,
            canAccess: canAccess,
            lastText: lastText
          });
        }

        // Update client count for all clients in the room
        io.to(currentRoom).emit('client-count', roomClients[currentRoom]);
      } catch (err) {
        console.error('Error checking room status:', err);
      }
    });

    // Handle text updates
    socket.on('text-update', async (text) => {
      if (!currentRoom) return;
      
      try {
        // Broadcast text to all clients in the room except sender
        socket.to(currentRoom).emit('text-update', text);
        
        // Save text history if room is claimed and user is authenticated
        const room = await Room.findOne({ name: currentRoom });
        if (room && room.claimedBy && socket.request.session.userId) {
          // Check if user owns this room
          if (room.claimedBy.toString() === socket.request.session.userId) {
            // Save to history (debounced - only save after no updates for 2 seconds)
            clearTimeout(socket.saveTimeout);
            socket.saveTimeout = setTimeout(async () => {
              try {
                await TextHistory.create({
                  room: room._id,
                  user: socket.request.session.userId,
                  text: text
                });
                console.log('Text saved to history');
              } catch (err) {
                console.error('Error saving text history:', err);
              }
            }, 2000);
          }
        }
      } catch (err) {
        console.error('Error processing text update:', err);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      if (currentRoom && roomClients[currentRoom]) {
        roomClients[currentRoom]--;
        io.to(currentRoom).emit('client-count', roomClients[currentRoom]);
      }
    });
  });
};