const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));

let rooms = {};
// Expanded Word List
const WORDS = [
    ["Apple", "Pear"], ["Coffee", "Tea"], ["Sun", "Moon"], ["Cat", "Dog"],
    ["Ocean", "Pool"], ["Superman", "Batman"], ["Pizza", "Burger"],
    ["Doctor", "Nurse"], ["Gold", "Silver"], ["Chair", "Stool"],
    ["Rain", "Snow"], ["Facebook", "Instagram"], ["Guitar", "Violin"],
    ["McDonalds", "KFC"], ["Ferrari", "Lamborghini"], ["iPhone", "Samsung"]
];

io.on('connection', (socket) => {
    socket.on('joinRoom', ({ roomCode, name }) => {
        socket.join(roomCode);
        if (!rooms[roomCode]) {
            rooms[roomCode] = { players: [], state: 'lobby', turnIndex: 0, round: 1, votes: {} };
        }
        const room = rooms[roomCode];
        const player = { id: socket.id, name, role: null, word: null, isHost: room.players.length === 0 };
        room.players.push(player);
        io.to(roomCode).emit('updateLobby', room.players);
        socket.emit('youJoined', { isHost: player.isHost });
    });

    socket.on('startGame', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return;
        const pair = WORDS[Math.floor(Math.random() * WORDS.length)];
        const flip = Math.random() < 0.5;
        room.civWord = flip ? pair[0] : pair[1];
        room.impWord = flip ? pair[1] : pair[0];
        room.impostorId = null;

        // Shuffle & Assign
        room.players.sort(() => Math.random() - 0.5);
        const impIndex = Math.floor(Math.random() * room.players.length);
        room.players.forEach((p, i) => {
            p.role = (i === impIndex) ? "Mr. White" : "Civilian";
            p.word = (i === impIndex) ? room.impWord : room.civWord;
            if (i === impIndex) room.impostorId = p.id;
        });

        room.state = 'game';
        room.turnIndex = 0;
        room.round = 1;
        io.to(roomCode).emit('gameStarted', { players: room.players });
        io.to(roomCode).emit('nextTurn', { playerId: room.players[0].id, round: 1 });
    });

    socket.on('sendDescription', ({ roomCode, text }) => {
        const room = rooms[roomCode];
        if (!room) return;
        const player = room.players[room.turnIndex];
        io.to(roomCode).emit('newChatMessage', { name: player.name, text, round: room.round, isImp: false }); // Don't reveal role in chat!
        
        room.turnIndex++;
        if (room.turnIndex >= room.players.length) {
            room.turnIndex = 0;
            room.round++;
        }
        
        if (room.round > 2) {
            room.state = 'voting';
            io.to(roomCode).emit('startVoting');
        } else {
            io.to(roomCode).emit('nextTurn', { playerId: room.players[room.turnIndex].id, round: room.round });
        }
    });

    socket.on('submitVote', ({ roomCode, targetId }) => {
        const room = rooms[roomCode];
        if (!room) return;
        room.votes[socket.id] = targetId;
        if (Object.keys(room.votes).length === room.players.length) {
            // Tally Votes
            const counts = {};
            room.players.forEach(p => counts[p.id] = 0);
            Object.values(room.votes).forEach(t => counts[t] = (counts[t]||0) + 1);
            
            let max = -1, eliminatedId = null;
            for (const [pid, c] of Object.entries(counts)) {
                if (c > max) { max = c; eliminatedId = pid; }
            }

            const imp = room.players.find(p => p.id === room.impostorId);
            const elim = room.players.find(p => p.id === eliminatedId);
            
            io.to(roomCode).emit('gameOver', {
                impostorName: imp.name,
                civWord: room.civWord,
                impWord: room.impWord,
                eliminatedName: elim ? elim.name : "No one",
                wasImpostor: eliminatedId === room.impostorId
            });
        }
    });

    socket.on('restartGame', (roomCode) => {
        const room = rooms[roomCode];
        if(room) {
            room.state = 'lobby';
            room.votes = {};
            io.to(roomCode).emit('resetLobby');
        }
    });
});

server.listen(3000, () => console.log('Server running on port 3000'));