const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" }
});

const servers = {};

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    
    // Auto server balancing (max 30/server)
    let serverId = Object.keys(servers).find(id => 
        servers[id].players.length < 30
    ) || `server_${Date.now()}`;
    
    if(!servers[serverId]) servers[serverId] = { players: {} };
    
    socket.join(serverId);
    servers[serverId].players[socket.id] = { 
        username: socket.handshake.query.username || 'Player',
        position: { x: 0, y: 0, z: 0 }
    };
    
    // Broadcast
    io.to(serverId).emit('playerList', servers[serverId].players);
    io.to(serverId).emit('serverId', serverId);
    
    socket.on('playerMoved', (pos) => {
        servers[serverId].players[socket.id].position = pos;
        socket.to(serverId).emit('playerMoved', {
            id: socket.id,
            ...pos
        });
    });
    
    socket.on('chat', (msg) => {
        socket.to(serverId).emit('chat', {
            username: servers[serverId].players[socket.id].username,
            message: msg
        });
    });
    
    socket.on('disconnect', () => {
        delete servers[serverId].players[socket.id];
        io.to(serverId).emit('playerList', servers[serverId].players);
    });
});

server.listen(3000, () => {
    console.log('🚀 Server running on port 3000');
});
