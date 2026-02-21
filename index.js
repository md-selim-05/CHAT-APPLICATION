import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// 🎨 Random Color Generator
function getRandomColor() {
  const colors = [
    "#e74c3c", "#3498db", "#2ecc71",
    "#9b59b6", "#f39c12", "#1abc9c",
    "#e67e22", "#e84393", "#16a085"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// 💬 Socket Logic
io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('join', (username) => {
    socket.username = username;
    socket.color = getRandomColor();

    io.emit('chat message', {
      user: "System",
      text: `${username} joined the chat`,
      color: "#888",
      system: true
    });
  });

  socket.on('chat message', (data) => {
    if (!socket.username) return;

    io.emit('chat message', {
      user: socket.username,
      text: data.text,
      color: socket.color,
      system: false
    });
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      io.emit('chat message', {
        user: "System",
        text: `${socket.username} left the chat`,
        color: "#888",
        system: true
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});