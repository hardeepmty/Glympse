const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // tighten this in production
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.static('public')); // serve frontend from /public folder

// Serve index.html at the root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// In-memory store of users: { socketId: { lat, lng, username, roomId } }
const users = {};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // client joins a "trip" room
  socket.on('joinRoom', ({ roomId, username }) => {
    socket.join(roomId);
    users[socket.id] = {
      lat: null,
      lng: null,
      username: username || `User-${socket.id.slice(0, 4)}`,
      roomId
    };

    // send existing users in room to the new client
    const existingUsers = Object.entries(users)
      .filter(([id, u]) => u.roomId === roomId && u.lat !== null && u.lng !== null)
      .map(([id, u]) => ({
        socketId: id,
        lat: u.lat,
        lng: u.lng,
        username: u.username
      }));

    socket.emit('existingUsers', existingUsers);
    console.log(`${users[socket.id].username} joined room ${roomId}`);
  });

  // client sends location updates
  socket.on('updateLocation', ({ lat, lng }) => {
    const user = users[socket.id];
    if (!user) return;

    user.lat = lat;
    user.lng = lng;

    const payload = {
      socketId: socket.id,
      lat,
      lng,
      username: user.username
    };

    // broadcast to everyone in the same room (including sender if you want)
    io.to(user.roomId).emit('locationUpdate', payload);
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      console.log('Client disconnected:', socket.id);
      // notify others in room to remove this marker
      io.to(user.roomId).emit('userDisconnected', { socketId: socket.id });
      delete users[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: '*', // tighten this in production
//     methods: ['GET', 'POST']
//   }
// });

// app.use(cors());
// app.use(express.static('public')); // serve frontend from /public folder

// // Serve index.html at the root route
// app.get('/', (req, res) => {
//   res.sendFile(__dirname + '/public/index.html');
// });

// // In-memory store of users: { socketId: { lat, lng, username, roomId } }
// const users = {};

// // Hardcoded locations for testing
// const hardcodedLocations = {
//   'Raj': { lat: 17.3850, lng: 78.4867 }, // Hyderabad
//   'Veer': { lat: 12.9716, lng: 77.5946 } // Bangalore
// };

// io.on('connection', (socket) => {
//   console.log('Client connected:', socket.id);

//   // client joins a "trip" room
//   socket.on('joinRoom', ({ roomId, username }) => {
//     socket.join(roomId);
//     users[socket.id] = {
//       lat: null,
//       lng: null,
//       username: username || `User-${socket.id.slice(0, 4)}`,
//       roomId
//     };

//     // send existing users in room to the new client
//     const existingUsers = Object.entries(users)
//       .filter(([id, u]) => u.roomId === roomId && u.lat !== null && u.lng !== null)
//       .map(([id, u]) => ({
//         socketId: id,
//         lat: u.lat,
//         lng: u.lng,
//         username: u.username
//       }));

//     socket.emit('existingUsers', existingUsers);
//     console.log(`${users[socket.id].username} joined room ${roomId}`);
//   });

//   // client sends location updates
//   socket.on('updateLocation', ({ lat, lng }) => {
//     const user = users[socket.id];
//     if (!user) return;

//     // Use hardcoded location if username matches
//     if (user.username === 'Raj') {
//       user.lat = hardcodedLocations.Raj.lat;
//       user.lng = hardcodedLocations.Raj.lng;
//     } else if (user.username === 'Veers') {
//       user.lat = hardcodedLocations.Veer.lat;
//       user.lng = hardcodedLocations.Veer.lng;
//     } else {
//       // For other users, use the received location
//       user.lat = lat;
//       user.lng = lng;
//     }

//     const payload = {
//       socketId: socket.id,
//       lat: user.lat,
//       lng: user.lng,
//       username: user.username
//     };

//     // broadcast to everyone in the same room (including sender if you want)
//     io.to(user.roomId).emit('locationUpdate', payload);
//   });

//   socket.on('disconnect', () => {
//     const user = users[socket.id];
//     if (user) {
//       console.log('Client disconnected:', socket.id);
//       // notify others in room to remove this marker
//       io.to(user.roomId).emit('userDisconnected', { socketId: socket.id });
//       delete users[socket.id];
//     }
//   });
// });

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//   console.log(`Server listening on http://localhost:${PORT}`);
// });

