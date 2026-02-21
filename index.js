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

// Serve static files
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// Socket.io
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('join', (username) => {
    socket.username = username;
    io.emit('chat message', {
      user: "System",
      text: `${username} joined the chat`
    });
  });

  socket.on('chat message', (data) => {
    io.emit('chat message', data);
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      io.emit('chat message', {
        user: "System",
        text: `${socket.username} left the chat`
      });
    }
    console.log('User disconnected');
  });
});

// ✅ Only this listen
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});