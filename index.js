import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Serve static files
app.use(express.static(join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public/index.html'));
});

app.get('/room', (req, res) => {
  res.sendFile(join(__dirname, 'public/room.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(join(__dirname, 'public/chat.html'));
});

// Random color generator
function getRandomColor() {
  const colors = [
    "#e74c3c", "#3498db", "#2ecc71",
    "#9b59b6", "#f39c12", "#1abc9c",
    "#e67e22", "#e84393", "#16a085"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Stores valid room IDs
const activeRooms = new Set(); 
// Stores timeouts for room deletion
const roomTimeouts = new Map(); 

io.on('connection', (socket) => {

  // Create Room
  socket.on('create room', (username) => {
    const roomId = uuidv4().slice(0, 6);
    
    activeRooms.add(roomId);

    socket.join(roomId);
    socket.username = username;
    socket.roomId = roomId;
    socket.color = getRandomColor();

    socket.emit('room created', roomId);

    io.to(roomId).emit('chat message', {
      user: "System",
      text: `${username} created the room`,
      color: "#aaa",
      system: true
    });
  });

  // Join Room
  socket.on('join room', ({ username, roomId }) => {
    if (!activeRooms.has(roomId)) {
      socket.emit('invalid room'); 
      return;
    }

    // NEW: If the room was scheduled for deletion (e.g., during a refresh), cancel it!
    if (roomTimeouts.has(roomId)) {
      clearTimeout(roomTimeouts.get(roomId));
      roomTimeouts.delete(roomId);
    }

    socket.join(roomId);
    socket.username = username;
    socket.roomId = roomId;
    socket.color = getRandomColor();
    
    socket.emit('room joined', roomId); 

    io.to(roomId).emit('chat message', {
      user: "System",
      text: `${username} - joined the room`,
      color: "#aaa",
      system: true
    });
  });

  // Chat Message
  socket.on('chat message', (data) => {
    if (!socket.roomId) return;

    io.to(socket.roomId).emit('chat message', {
      user: socket.username,
      text: data.text,
      color: socket.color,
      system: false
    });
  });

  socket.on('disconnect', () => {
    if (socket.roomId && socket.username) {
      io.to(socket.roomId).emit('chat message', {
        user: "System",
        text: `${socket.username} - left the room`,
        color: "#aaa",
        system: true
      });

      const room = io.sockets.adapter.rooms.get(socket.roomId);
      
      // NEW: Instead of immediate deletion, wait 10 seconds
      if (!room || room.size === 0) {
        const timeout = setTimeout(() => {
          activeRooms.delete(socket.roomId);
          roomTimeouts.delete(socket.roomId);
          console.log(`Room ${socket.roomId} auto-deleted (empty for 10s)`);
        }, 5000); // 10000 ms = 10 seconds grace period
        
        // Save the timeout so we can cancel it if they reconnect
        roomTimeouts.set(socket.roomId, timeout);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});