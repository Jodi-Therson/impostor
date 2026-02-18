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