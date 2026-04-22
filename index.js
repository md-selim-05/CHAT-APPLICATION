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

// Serves the entire 'public' folder as static assets
app.use(express.static(join(__dirname, 'public')));

// ---- CORRECTED ROUTES ----

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public/landing-page/landing.html')); //
});

app.get('/room', (req, res) => {
  res.sendFile(join(__dirname, 'public/room-page/room.html')); //
});

app.get('/chat', (req, res) => {
  res.sendFile(join(__dirname, 'public/chat-page/chat.html'));//
});

// --------------------------

function getRandomColor() {
  const colors = [
    "#e74c3c", "#3498db", "#2ecc71",
    "#9b59b6", "#f39c12", "#1abc9c",
    "#e67e22", "#e84393", "#16a085"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

const activeRooms = new Map(); 
const roomTimeouts = new Map(); 

io.on('connection', (socket) => {

  socket.on('create room', ({ username, capacity }) => {
    username = String(username || "User").substring(0, 8);
    const roomId = uuidv4().slice(0, 6);
    
    activeRooms.set(roomId, {
      capacity: parseInt(capacity) || 10,
      users: new Set([socket.id])
    });

    socket.join(roomId);
    socket.username = username;
    socket.roomId = roomId;
    socket.color = getRandomColor();

    socket.emit('room created', roomId);
    io.to(roomId).emit('room update', activeRooms.get(roomId).users.size);

    io.to(roomId).emit('chat message', {
      user: "System",
      text: `${username} created the room (Max Capacity: ${activeRooms.get(roomId).capacity})`,
      color: "#aaa",
      system: true
    });
  });

  socket.on('join room', ({ username, roomId }) => {
    // ENFORCE: Max 8 Characters for Username
    username = String(username || "User").substring(0, 8);
    const roomData = activeRooms.get(roomId);
    
    if (!roomData) {
      socket.emit('invalid room', 'Invalid Room ID or the room has expired.'); 
      return;
    }

    if (roomData.users.size >= roomData.capacity) {
      socket.emit('invalid room', 'This room has reached its maximum capacity.');
      return;
    }

    if (roomTimeouts.has(roomId)) {
      clearTimeout(roomTimeouts.get(roomId));
      roomTimeouts.delete(roomId);
    }

    roomData.users.add(socket.id);
    socket.join(roomId);
    socket.username = username;
    socket.roomId = roomId;
    socket.color = getRandomColor();
    
    socket.emit('room joined', roomId); 
    io.to(roomId).emit('room update', roomData.users.size);

    io.to(roomId).emit('chat message', {
      user: "System",
      text: `${username} - joined the room`,
      color: "#aaa",
      system: true
    });
  });

  socket.on('chat message', (data) => {
    if (!socket.roomId) return;

    const now = Date.now();
    if (!socket.msgTimestamps) socket.msgTimestamps = [];
    
    socket.msgTimestamps = socket.msgTimestamps.filter(t => now - t < 1000);
    
    if (socket.msgTimestamps.length >= 2) {
      socket.emit('chat message', {
        user: "System",
        text: "Slow down! Maximum 2 messages per second allowed.",
        color: "#e74c3c",
        system: true
      });
      return; 
    }
    
    socket.msgTimestamps.push(now);
    const safeText = String(data.text || "").substring(0, 150);

    io.to(socket.roomId).emit('chat message', {
      user: socket.username,
      text: safeText,
      replyTo: data.replyTo || null,
      color: socket.color,
      system: false
    });
  });

  socket.on('disconnect', () => {
    if (socket.roomId && socket.username) {
      const roomData = activeRooms.get(socket.roomId);
      
      if (roomData) {
        roomData.users.delete(socket.id);
        io.to(socket.roomId).emit('room update', roomData.users.size);
      }

      io.to(socket.roomId).emit('chat message', {
        user: "System",
        text: `${socket.username} - left the room`,
        color: "#aaa",
        system: true
      });

      const room = io.sockets.adapter.rooms.get(socket.roomId);
      
      if (!room || room.size === 0) {
        const timeout = setTimeout(() => {
          activeRooms.delete(socket.roomId);
          roomTimeouts.delete(socket.roomId);
          console.log(`Room ${socket.roomId} auto-deleted (empty for 5s)`); 
        }, 5000); 
        
        roomTimeouts.set(socket.roomId, timeout);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});