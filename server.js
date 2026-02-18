const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));

let rooms = {};
let turnTimers = {};

// Expanded Word List
const WORDS = [
    // --- FOOD & DRINK ---
    ["Apple", "Pear"], ["Banana", "Plantain"], ["Strawberry", "Raspberry"],
    ["Coffee", "Tea"], ["Latte", "Cappuccino"], ["Pepsi", "Coke"],
    ["Pizza", "Burger"], ["Taco", "Burrito"], ["Sushi", "Sashimi"],
    ["Pancake", "Waffle"], ["Cookie", "Biscuit"], ["Donut", "Bagel"],
    ["Soup", "Stew"], ["Butter", "Margarine"], ["Ketchup", "Mustard"],
    ["Salt", "Pepper"], ["Rice", "Noodles"], ["Bread", "Toast"],
    ["Chocolate", "Vanilla"], ["Ice Cream", "Yogurt"], ["Lemon", "Lime"],
    ["Onion", "Garlic"], ["Potato", "Sweet Potato"], ["Chicken", "Turkey"],
    ["Steak", "Pork Chop"], ["Beer", "Wine"], ["Whiskey", "Vodka"],

    // --- ANIMALS ---
    ["Cat", "Dog"], ["Lion", "Tiger"], ["Leopard", "Cheetah"],
    ["Wolf", "Fox"], ["Crocodile", "Alligator"], ["Turtle", "Tortoise"],
    ["Bee", "Wasp"], ["Butterfly", "Moth"], ["Eagle", "Falcon"],
    ["Penguin", "Ostrich"], ["Dolphin", "Shark"], ["Whale", "Shark"],
    ["Frog", "Toad"], ["Rabbit", "Hare"], ["Horse", "Donkey"],
    ["Sheep", "Goat"], ["Monkey", "Gorilla"], ["Snake", "Worm"],
    ["Spider", "Scorpion"], ["Ant", "Termite"], ["Duck", "Goose"],

    // --- PLACES & NATURE ---
    ["Sun", "Moon"], ["Star", "Planet"], ["Ocean", "Sea"],
    ["River", "Lake"], ["Pool", "Pond"], ["Forest", "Jungle"],
    ["Desert", "Beach"], ["Mountain", "Hill"], ["Rain", "Snow"],
    ["Hurricane", "Tornado"], ["Earthquake", "Tsunami"], ["City", "Village"],
    ["Hotel", "Motel"], ["Library", "Bookstore"], ["School", "University"],
    ["Museum", "Gallery"], ["Cinema", "Theater"], ["Hospital", "Clinic"],
    ["Prison", "Jail"], ["Bridge", "Tunnel"], ["Castle", "Palace"],

    // --- OBJECTS & TECH ---
    ["iPhone", "Samsung"], ["Laptop", "Tablet"], ["Keyboard", "Mouse"],
    ["Facebook", "Instagram"], ["Twitter", "TikTok"], ["Spotify", "Apple Music"],
    ["Netflix", "YouTube"], ["PlayStation", "Xbox"], ["Windows", "MacOS"],
    ["Car", "Bus"], ["Motorcycle", "Bicycle"], ["Train", "Subway"],
    ["Helicopter", "Airplane"], ["Boat", "Ship"], ["Taxi", "Uber"],
    ["Pen", "Pencil"], ["Fork", "Spoon"], ["Cup", "Mug"],
    ["Chair", "Stool"], ["Sofa", "Bench"], ["Bed", "Hammock"],
    ["Door", "Gate"], ["Window", "Mirror"], ["Glasses", "Sunglasses"],
    ["Watch", "Clock"], ["Ring", "Bracelet"], ["Shoe", "Boot"],
    ["Hat", "Cap"], ["Pants", "Shorts"], ["Shirt", "T-shirt"],

    // --- ROLES & CHARACTERS ---
    ["Superman", "Batman"], ["Spiderman", "Iron Man"], ["Harry Potter", "Frodo"],
    ["Vampire", "Werewolf"], ["Ghost", "Zombie"], ["Angel", "Demon"],
    ["Santa", "Elf"], ["Pirate", "Ninja"], ["King", "Prince"],
    ["Queen", "Princess"], ["Doctor", "Nurse"], ["Teacher", "Professor"],
    ["Police", "Detective"], ["Lawyer", "Judge"], ["Pilot", "Captain"],
    ["Chef", "Waiter"], ["Artist", "Designer"], ["Singer", "Dancer"],

    // --- ABSTRACT & ACTIVITIES ---
    ["Love", "Like"], ["Happy", "Excited"], ["Sad", "Depressed"],
    ["Running", "Walking"], ["Swimming", "Diving"], ["Soccer", "Rugby"],
    ["Tennis", "Badminton"], ["Basketball", "Volleyball"], ["Skiing", "Snowboarding"],
    ["Painting", "Drawing"], ["Singing", "Humming"], ["Guitar", "Violin"],
    ["Piano", "Keyboard"], ["Rock", "Pop"], ["Comedy", "Drama"],
    ["Horror", "Thriller"], ["Math", "Science"], ["History", "Geography"],
    ["Gold", "Silver"], ["Diamond", "Pearl"], ["Red", "Pink"]
];

io.on('connection', (socket) => {

    // JOIN ROOM
    socket.on('joinRoom', ({ roomCode, name }) => {
        socket.join(roomCode);
        socket.roomCode = roomCode; // IMPORTANT: Save room code to socket
        socket.username = name;     // IMPORTANT: Save name to socket

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

        // Prevent joining started games (optional)
        if (room.state !== 'lobby') {
            socket.emit('error', 'Game in progress');
            return;
        }

        const player = { id: socket.id, name, role: null, word: null, isHost: room.players.length === 0 };
        room.players.push(player);

        io.to(roomCode).emit('updateLobby', room.players);
        socket.emit('youJoined', { isHost: player.isHost });
    });

    // START GAME
    socket.on('startGame', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return;

        // Logic: Pick Words
        const pair = WORDS[Math.floor(Math.random() * WORDS.length)];
        const flip = Math.random() < 0.5;
        room.civWord = flip ? pair[0] : pair[1];
        room.impWord = flip ? pair[1] : pair[0];
        room.impostorId = null;

        // Logic: Shuffle & Assign
        room.players.sort(() => Math.random() - 0.5);

        // Ensure at least 3 players (Optional check)
        // if(room.players.length < 3) return; 

        const impIndex = Math.floor(Math.random() * room.players.length);
        room.players.forEach((p, index) => {
            if (index === impIndex) {
                p.role = "Mr. Impostor";
                p.word = room.impWord;
                room.impostorId = p.id;
            } else {
                p.role = "Civilian";
                p.word = room.civWord;
            }
        });

        room.state = 'game';
        room.turnIndex = 0;
        room.round = 1;

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

        if (text.trim().split(/\s+/).length > 2) {
            return;
        }

        const player = room.players[room.turnIndex];

        // Send Chat
        const msg = { name: player.name, text: text };
        io.to(roomCode).emit('newChatMessage', msg);

        // Advance Turn
        room.turnIndex++;

        // End of Round Logic
        if (room.turnIndex >= room.players.length) {
            room.turnIndex = 0;
            room.round++;
        }

        // End of Game Logic (After 2 rounds)
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

        // Check if everyone voted
        if (Object.keys(room.votes).length === room.players.length) {
            const voteCounts = {};
            room.players.forEach(p => voteCounts[p.id] = 0);

            Object.values(room.votes).forEach(target => {
                if (voteCounts[target] !== undefined) voteCounts[target]++;
            });

            // Find Loser
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
        if (room) {
            room.state = 'lobby';
            room.votes = {};
            io.to(roomCode).emit('resetLobby');
            // Re-send lobby data so clients refresh properly
            io.to(roomCode).emit('updateLobby', room.players);
        }
    });

    socket.on('leaveRoom', () => {
        handleDisconnect(socket);
    });

    // --- UPDATED: Handle Refresh/Disconnect ---
    socket.on('disconnect', () => {
        handleDisconnect(socket);
    });
});

function handleDisconnect(socket) {
    const roomCode = socket.roomCode;

    if (roomCode && rooms[roomCode]) {
        const room = rooms[roomCode];
        
        // Remove the player with THIS socket ID
        room.players = room.players.filter(p => p.id !== socket.id);

        if (room.players.length === 0) {
            // If room empty, delete it
            delete rooms[roomCode];
        } else {
            // If Host left, assign new host
            if (!room.players.some(p => p.isHost)) {
                room.players[0].isHost = true;
                // Notify the new host
                io.to(room.players[0].id).emit('youJoined', { isHost: true }); 
            }
            
            // Notify everyone else
            io.to(roomCode).emit('updateLobby', room.players);
        }
    }
}

function startTurnTimer(roomCode) {
    // 1. Clear any existing timer for this room
    if (turnTimers[roomCode]) clearTimeout(turnTimers[roomCode]);

    // 2. Set new 30-second timer
    turnTimers[roomCode] = setTimeout(() => {
        const room = rooms[roomCode];
        if (!room) return;

        // TIME IS UP! Force a message.
        const player = room.players[room.turnIndex];
        const forcedMsg = "[TIMEOUT 😴]";
        
        io.to(roomCode).emit('newChatMessage', { name: player.name, text: forcedMsg });

        // Advance turn automatically
        // (We copy the logic from 'sendDescription' essentially)
        room.turnIndex++;

        if (room.turnIndex >= room.players.length) {
            room.turnIndex = 0;
            room.round++;
        }

        if (room.round > 2) {
            room.state = 'voting';
            io.to(roomCode).emit('startVoting');
        } else {
            // Recursively start timer for next player
            startTurnTimer(roomCode); 
            io.to(roomCode).emit('nextTurn', { 
                playerId: room.players[room.turnIndex].id, 
                round: room.round 
            });
        }
    }, 30000); // 30 Seconds
}

server.listen(3000, () => {
    console.log('Server running on port 3000');
});