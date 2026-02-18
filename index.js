const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// Serve static files from the 'public' folder
app.use(express.static('public'));

// DATA
let rooms = {};
const WORDS = [
    ["Apple", "Pear"], ["Coffee", "Tea"], ["Sun", "Moon"], ["Cat", "Dog"],
    ["Ocean", "Pool"], ["Superman", "Batman"], ["Pizza", "Burger"],
    ["Doctor", "Nurse"], ["Gold", "Silver"], ["Chair", "Stool"],
    ["Rain", "Snow"], ["Facebook", "Instagram"], ["Guitar", "Violin"]
];

io.on('connection', (socket) => {
    
    // JOIN
    socket.on('joinRoom', ({ roomCode, name }) => {
        socket.join(roomCode);
        
        if (!rooms[roomCode]) {
            rooms[roomCode] = { 
                players: [], 
                state: 'lobby', 
                turnIndex: 0, 
                round: 1,
                votes: {},
                chatLog: []
            };
        }

        const room = rooms[roomCode];
        const player = { id: socket.id, name, role: null, word: null, isHost: room.players.length === 0 };
        room.players.push(player);

        io.to(roomCode).emit('updateLobby', room.players);
        socket.emit('youJoined', { isHost: player.isHost });
    });

    // START
    socket.on('startGame', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return;

        // Setup Words
        const pair = WORDS[Math.floor(Math.random() * WORDS.length)];
        const flip = Math.random() < 0.5;
        const civWord = flip ? pair[0] : pair[1];
        const impWord = flip ? pair[1] : pair[0];

        room.civWord = civWord;
        room.impWord = impWord;
        room.impostorId = null;

        // Shuffle Players
        room.players.sort(() => Math.random() - 0.5);

        // Assign Roles
        const impIndex = Math.floor(Math.random() * room.players.length);
        room.players.forEach((p, index) => {
            if (index === impIndex) {
                p.role = "Mr. White";
                p.word = impWord;
                room.impostorId = p.id;
            } else {
                p.role = "Civilian";
                p.word = civWord;
            }
        });

        room.state = 'game';
        room.turnIndex = 0;
        room.round = 1;
        room.chatLog = [];

        io.to(roomCode).emit('gameStarted', { players: room.players });
        io.to(roomCode).emit('nextTurn', { 
            playerId: room.players[0].id, 
            round: 1 
        });
    });

    // CHAT / TURN
    socket.on('sendDescription', ({ roomCode, text }) => {
        const room = rooms[roomCode];
        if (!room) return;

        const player = room.players[room.turnIndex];
        
        const msg = { name: player.name, text: text, round: room.round };
        io.to(roomCode).emit('newChatMessage', msg);

        room.turnIndex++;

        // Round Logic
        if (room.turnIndex >= room.players.length) {
            room.turnIndex = 0;
            room.round++;
        }

        // End Game Logic (After 2 rounds)
        if (room.round > 2) {
            room.state = 'voting';
            io.to(roomCode).emit('startVoting');
        } else {
            io.to(roomCode).emit('nextTurn', { 
                playerId: room.players[room.turnIndex].id, 
                round: room.round 
            });
        }
    });

    // VOTE
    socket.on('submitVote', ({ roomCode, targetId }) => {
        const room = rooms[roomCode];
        if (!room) return;

        room.votes[socket.id] = targetId;

        // Check if all voted
        if (Object.keys(room.votes).length === room.players.length) {
            const voteCounts = {};
            room.players.forEach(p => voteCounts[p.id] = 0);
            
            Object.values(room.votes).forEach(target => {
                if (voteCounts[target] !== undefined) voteCounts[target]++;
            });

            // Calculate Loser
            let maxVotes = -1;
            let eliminatedId = null;
            for (const [pid, count] of Object.entries(voteCounts)) {
                if (count > maxVotes) {
                    maxVotes = count;
                    eliminatedId = pid;
                }
            }

            const impostor = room.players.find(p => p.id === room.impostorId);
            const eliminated = room.players.find(p => p.id === eliminatedId);
            const wasImpostor = (eliminatedId === room.impostorId);

            io.to(roomCode).emit('gameOver', {
                impostorName: impostor ? impostor.name : "Unknown",
                civWord: room.civWord,
                impWord: room.impWord,
                eliminatedName: eliminated ? eliminated.name : "Unknown",
                wasImpostor
            });
        }
    });

    // RESTART
    socket.on('restartGame', (roomCode) => {
        const room = rooms[roomCode];
        if(room) {
            room.state = 'lobby';
            room.votes = {};
            io.to(roomCode).emit('resetLobby');
        }
    });
});

// Start Server (Dynamic Port for Cloud Hosting)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});