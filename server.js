const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));

let rooms = {};
let turnTimers = {};
let votingTimers = {};

// --- WORD DICTIONARIES ---
const WORD_PACKS = {
    'en': [
        ["Apple", "Pear"], ["Banana", "Plantain"], ["Strawberry", "Raspberry"],
        ["Coffee", "Tea"], ["Latte", "Cappuccino"], ["Pepsi", "Coke"],
        ["Pizza", "Burger"], ["Taco", "Burrito"], ["Sushi", "Sashimi"],
        ["Pancake", "Waffle"], ["Cookie", "Biscuit"], ["Donut", "Bagel"],
        ["Soup", "Stew"], ["Butter", "Margarine"], ["Ketchup", "Mustard"],
        ["Salt", "Pepper"], ["Rice", "Noodles"], ["Bread", "Toast"],
        ["Chocolate", "Vanilla"], ["Ice Cream", "Yogurt"], ["Lemon", "Lime"],
        ["Onion", "Garlic"], ["Potato", "Sweet Potato"], ["Chicken", "Turkey"],
        ["Steak", "Pork Chop"], ["Beer", "Wine"], ["Whiskey", "Vodka"],
        ["Cat", "Dog"], ["Lion", "Tiger"], ["Leopard", "Cheetah"],
        ["Wolf", "Fox"], ["Crocodile", "Alligator"], ["Turtle", "Tortoise"],
        ["Bee", "Wasp"], ["Butterfly", "Moth"], ["Eagle", "Falcon"],
        ["Penguin", "Ostrich"], ["Dolphin", "Shark"], ["Whale", "Shark"],
        ["Frog", "Toad"], ["Rabbit", "Hare"], ["Horse", "Donkey"],
        ["Sheep", "Goat"], ["Monkey", "Gorilla"], ["Snake", "Worm"],
        ["Spider", "Scorpion"], ["Ant", "Termite"], ["Duck", "Goose"],
        ["Sun", "Moon"], ["Star", "Planet"], ["Ocean", "Sea"],
        ["River", "Lake"], ["Pool", "Pond"], ["Forest", "Jungle"],
        ["Desert", "Beach"], ["Mountain", "Hill"], ["Rain", "Snow"],
        ["Hurricane", "Tornado"], ["Earthquake", "Tsunami"], ["City", "Village"],
        ["Hotel", "Motel"], ["Library", "Bookstore"], ["School", "University"],
        ["Museum", "Gallery"], ["Cinema", "Theater"], ["Hospital", "Clinic"],
        ["Prison", "Jail"], ["Bridge", "Tunnel"], ["Castle", "Palace"],
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
        ["Superman", "Batman"], ["Spiderman", "Iron Man"], ["Harry Potter", "Frodo"],
        ["Vampire", "Werewolf"], ["Ghost", "Zombie"], ["Angel", "Demon"],
        ["Santa", "Elf"], ["Pirate", "Ninja"], ["King", "Prince"],
        ["Queen", "Princess"], ["Doctor", "Nurse"], ["Teacher", "Professor"],
        ["Police", "Detective"], ["Lawyer", "Judge"], ["Pilot", "Captain"],
        ["Chef", "Waiter"], ["Artist", "Designer"], ["Singer", "Dancer"],
        ["Love", "Like"], ["Happy", "Excited"], ["Sad", "Depressed"],
        ["Running", "Walking"], ["Swimming", "Diving"], ["Soccer", "Rugby"],
        ["Tennis", "Badminton"], ["Basketball", "Volleyball"], ["Skiing", "Snowboarding"],
        ["Painting", "Drawing"], ["Singing", "Humming"], ["Guitar", "Violin"],
        ["Piano", "Keyboard"], ["Rock", "Pop"], ["Comedy", "Drama"],
        ["Horror", "Thriller"], ["Math", "Science"], ["History", "Geography"],
        ["Gold", "Silver"], ["Diamond", "Pearl"], ["Red", "Pink"]
    ],
    'id': [
        ["Apel", "Pir"], ["Pisang", "Pisang Raja"], ["Stroberi", "Rasberi"],
        ["Kopi", "Teh"], ["Latte", "Cappuccino"], ["Pepsi", "Coca-Cola"],
        ["Pizza", "Burger"], ["Taco", "Burrito"], ["Sushi", "Sashimi"],
        ["Panekuk", "Wafel"], ["Kukis", "Biskuit"], ["Donat", "Bagel"],
        ["Sup", "Soto"], ["Mentega", "Margarin"], ["Saus Tomat", "Mustard"],
        ["Garam", "Merica"], ["Nasi", "Mie"], ["Roti", "Roti Bakar"],
        ["Cokelat", "Vanila"], ["Es Krim", "Yogurt"], ["Lemon", "Jeruk Nipis"],
        ["Bawang Merah", "Bawang Putih"], ["Kentang", "Ubi"], ["Ayam", "Kalkun"],
        ["Steak", "Iga Bakar"], ["Bir", "Anggur"], ["Wiski", "Vodka"],
        ["Kucing", "Anjing"], ["Singa", "Harimau"], ["Macan Tutul", "Cheetah"],
        ["Serigala", "Rubah"], ["Buaya", "Aligator"], ["Kura-kura", "Penyu"],
        ["Lebah", "Tawon"], ["Kupu-kupu", "Ngengat"], ["Elang", "Rajawali"],
        ["Penguin", "Burung Unta"], ["Lumba-lumba", "Hiu"], ["Paus", "Hiu"],
        ["Katak", "Kodok"], ["Kelinci", "Terwelu"], ["Kuda", "Keledai"],
        ["Domba", "Kambing"], ["Monyet", "Gorila"], ["Ular", "Cacing"],
        ["Laba-laba", "Kalajengking"], ["Semut", "Rayap"], ["Bebek", "Angsa"],
        ["Matahari", "Bulan"], ["Bintang", "Planet"], ["Samudra", "Laut"],
        ["Sungai", "Danau"], ["Kolam", "Empang"], ["Hutan", "Rimba"],
        ["Gurun", "Pantai"], ["Gunung", "Bukit"], ["Hujan", "Salju"],
        ["Badai", "Puting Beliung"], ["Gempa Bumi", "Tsunami"], ["Kota", "Desa"],
        ["Hotel", "Losmen"], ["Perpustakaan", "Toko Buku"], ["Sekolah", "Kampus"],
        ["Museum", "Galeri"], ["Bioskop", "Teater"], ["Rumah Sakit", "Klinik"],
        ["Penjara", "Sel Tahanan"], ["Jembatan", "Terowongan"], ["Kastil", "Istana"],
        ["iPhone", "Samsung"], ["Laptop", "Tablet"], ["Keyboard", "Mouse"],
        ["Facebook", "Instagram"], ["Twitter", "TikTok"], ["Spotify", "Apple Music"],
        ["Netflix", "YouTube"], ["PlayStation", "Xbox"], ["Windows", "MacOS"],
        ["Mobil", "Bus"], ["Motor", "Sepeda"], ["Kereta", "MRT"],
        ["Helikopter", "Pesawat"], ["Perahu", "Kapal"], ["Taksi", "Grab"],
        ["Pulpen", "Pensil"], ["Garpu", "Sendok"], ["Cangkir", "Gelas"],
        ["Kursi", "Bangku"], ["Sofa", "Bangku Taman"], ["Kasur", "Ayunan"],
        ["Pintu", "Gerbang"], ["Jendela", "Cermin"], ["Kacamata", "Kacamata Hitam"],
        ["Jam Tangan", "Jam Dinding"], ["Cincin", "Gelang"], ["Sepatu", "Sepatu Bot"],
        ["Topi", "Peci"], ["Celana Panjang", "Celana Pendek"], ["Kemeja", "Kaos"],
        ["Superman", "Batman"], ["Spiderman", "Iron Man"], ["Harry Potter", "Frodo"],
        ["Vampir", "Manusia Serigala"], ["Hantu", "Zombie"], ["Malaikat", "Iblis"],
        ["Sinterklas", "Peri"], ["Bajak Laut", "Ninja"], ["Raja", "Pangeran"],
        ["Ratu", "Putri"], ["Dokter", "Perawat"], ["Guru", "Dosen"],
        ["Polisi", "Detektif"], ["Pengacara", "Hakim"], ["Pilot", "Kapten"],
        ["Koki", "Pelayan"], ["Seniman", "Desainer"], ["Penyanyi", "Penari"],
        ["Cinta", "Suka"], ["Senang", "Semangat"], ["Sedih", "Depresi"],
        ["Lari", "Jalan"], ["Renang", "Menyelam"], ["Sepak Bola", "Rugbi"],
        ["Tenis", "Bulu Tangkis"], ["Basket", "Voli"], ["Ski", "Snowboard"],
        ["Melukis", "Menggambar"], ["Bernyanyi", "Bersenandung"], ["Gitar", "Biola"],
        ["Piano", "Keyboard"], ["Rock", "Pop"], ["Komedi", "Drama"],
        ["Horor", "Thriller"], ["Matematika", "Sains"], ["Sejarah", "Geografi"],
        ["Emas", "Perak"], ["Berlian", "Mutiara"], ["Merah", "Merah Muda"]
    ]
};
const DEFAULT_LANG = 'en';

io.on('connection', (socket) => {

    // JOIN ROOM
    socket.on('joinRoom', ({ roomCode, name }) => {
        // Truncate name for safety
        const safeName = (name || "Agent").substring(0, 20);

        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.username = safeName;

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

        if (room.state !== 'lobby') {
            socket.emit('error', 'Game in progress');
            return;
        }

        const player = { id: socket.id, name: safeName, role: null, word: null, isHost: room.players.length === 0 };
        room.players.push(player);

        io.to(roomCode).emit('updateLobby', room.players);
        socket.emit('youJoined', { isHost: player.isHost });
    });

    // START GAME
    socket.on('startGame', ({ roomCode, lang }) => {
        const room = rooms[roomCode];
        if (!room) return;

        const selectedLang = lang || DEFAULT_LANG;
        const wordList = WORD_PACKS[selectedLang] || WORD_PACKS['en'];

        // FIXED: Use wordList.length instead of WORDS.length
        const pair = wordList[Math.floor(Math.random() * wordList.length)];
        const flip = Math.random() < 0.5;
        room.civWord = flip ? pair[0] : pair[1];
        room.impWord = flip ? pair[1] : pair[0];
        room.impostorId = null;

        room.players.sort(() => Math.random() - 0.5);

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

        startTurnTimer(roomCode);
    });

    // CHAT / TURN
    socket.on('sendDescription', ({ roomCode, text }) => {
        const room = rooms[roomCode];
        if (!room) return;

        let safeText = text.substring(0, 20);

        if (safeText.trim().split(/\s+/).length > 2) {
            return;
        }

        const player = room.players[room.turnIndex];

        const msg = { name: player.name, text: safeText };
        io.to(roomCode).emit('newChatMessage', msg);

        room.turnIndex++;

        if (room.turnIndex >= room.players.length) {
            room.turnIndex = 0;
            room.round++;
        }

        // End of Game Logic
        if (room.round > 2) {
            startVotingPhase(roomCode); 
        } else {
            io.to(roomCode).emit('nextTurn', {
                playerId: room.players[room.turnIndex].id,
                round: room.round
            });
            startTurnTimer(roomCode);
        }
    });

    // VOTE
    socket.on('submitVote', ({ roomCode, targetId }) => {
        const room = rooms[roomCode];
        if (!room) return;

        room.votes[socket.id] = targetId;

        const voteCount = Object.keys(room.votes).length;
        const playerCount = room.players.length;
        console.log(`[${roomCode}] Vote status: ${voteCount} / ${playerCount}`);

        if (voteCount >= playerCount) {
            const voteCounts = {};
            room.players.forEach(p => voteCounts[p.id] = 0);

            Object.values(room.votes).forEach(target => {
                if (voteCounts[target] !== undefined) {
                    voteCounts[target]++;
                }
            });

            let maxVotes = -1;
            let candidates = [];

            for (const [pid, count] of Object.entries(voteCounts)) {
                if (count > maxVotes) {
                    maxVotes = count;
                    candidates = [pid];
                } else if (count === maxVotes) {
                    candidates.push(pid);
                }
            }

            let eliminatedId = null;
            let resultType = "elimination";

            if (candidates.length > 1) {
                resultType = "tie";
            } else {
                eliminatedId = candidates[0];
            }

            const impostor = room.players.find(p => p.id === room.impostorId);
            const eliminated = room.players.find(p => p.id === eliminatedId);

            let civsWin = false;
            if (resultType === "tie") {
                civsWin = false;
            } else if (eliminatedId === room.impostorId) {
                civsWin = true;
            }

            io.to(roomCode).emit('gameOver', {
                impostorName: impostor ? impostor.name : "Unknown",
                civWord: room.civWord,
                impWord: room.impWord,
                eliminatedName: eliminated ? eliminated.name : "No one (Tie)",
                wasImpostor: civsWin,
                resultType: resultType
            });

            if (votingTimers[roomCode]) clearTimeout(votingTimers[roomCode]);
        }
    });

    // RESTART
    socket.on('restartGame', (roomCode) => {
        const room = rooms[roomCode];

        if (!room) {
            console.log(`[Server] Error: Room ${roomCode} not found (Might have been deleted).`);
            socket.emit('error', 'Room expired. Please reload.');
            return;
        }

        if (turnTimers[roomCode]) clearTimeout(turnTimers[roomCode]);
        if (votingTimers[roomCode]) clearTimeout(votingTimers[roomCode]);

        room.state = 'lobby';
        room.votes = {};
        room.turnIndex = 0;
        room.round = 1;

        room.players.forEach(p => {
            p.role = null;
            p.word = null;
        });

        // Use Smooth Reset (HTML Fix handles the crash now)
        // If you prefer full reload, comment these out and uncomment forceReload
        io.to(roomCode).emit('resetLobby');
        io.to(roomCode).emit('updateLobby', room.players);
        
        // io.to(roomCode).emit('forceReload'); // Disabled for smoother experience
    });

    socket.on('leaveRoom', () => {
        handleDisconnect(socket);
    });

    socket.on('disconnect', () => {
        handleDisconnect(socket);
    });
});

function handleDisconnect(socket) {
    const roomCode = socket.roomCode;
    if (roomCode && rooms[roomCode]) {
        const room = rooms[roomCode];
        room.players = room.players.filter(p => p.id !== socket.id);

        if (room.players.length === 0) {
            delete rooms[roomCode];
            if (turnTimers[roomCode]) clearTimeout(turnTimers[roomCode]);
            if (votingTimers[roomCode]) clearTimeout(votingTimers[roomCode]);
        } else {
            if (!room.players.some(p => p.isHost)) {
                room.players[0].isHost = true;
                io.to(room.players[0].id).emit('youJoined', { isHost: true });
            }
            io.to(roomCode).emit('updateLobby', room.players);
        }
    }
}

function startTurnTimer(roomCode) {
    if (turnTimers[roomCode]) clearTimeout(turnTimers[roomCode]);

    turnTimers[roomCode] = setTimeout(() => {
        const room = rooms[roomCode];
        if (!room) return;

        const player = room.players[room.turnIndex];
        const forcedMsg = "[TIMEOUT 😴]";

        io.to(roomCode).emit('newChatMessage', { name: player.name, text: forcedMsg });

        room.turnIndex++;

        if (room.turnIndex >= room.players.length) {
            room.turnIndex = 0;
            room.round++;
        }

        if (room.round > 2) {
            startVotingPhase(roomCode);
        } else {
            startTurnTimer(roomCode);
            io.to(roomCode).emit('nextTurn', {
                playerId: room.players[room.turnIndex].id,
                round: room.round
            });
        }
    }, 30000);
}

function startVotingPhase(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    io.to(roomCode).emit('votingCountdown', 5);

    if (turnTimers[roomCode]) clearTimeout(turnTimers[roomCode]);
    if (votingTimers[roomCode]) clearTimeout(votingTimers[roomCode]);

    setTimeout(() => {
        const r = rooms[roomCode];
        if (!r) return;

        r.state = 'voting';
        io.to(roomCode).emit('startVoting');

        votingTimers[roomCode] = setTimeout(() => {
            console.log(`[${roomCode}] Force ending voting phase due to timeout.`);
            io.to(roomCode).emit('gameOver', {
                impostorName: "Unknown",
                civWord: r.civWord,
                impWord: r.impWord,
                eliminatedName: "Time Limit Reached",
                wasImpostor: false,
                resultType: "tie"
            });
        }, 60000);

    }, 5000);
}

server.listen(3000, () => {
    console.log('Server running on port 3000');
});