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
        ["Blueberry", "Blackberry"], ["Peach", "Apricot"], ["Cucumber", "Zucchini"],
        ["Spinach", "Kale"], ["Tuna", "Salmon"], ["Shrimp", "Lobster"],
        ["Sausage", "Hot Dog"], ["Muffin", "Cupcake"], ["Honey", "Jam"],
        ["Mayonnaise", "Ranch"], ["Cheddar", "Mozzarella"], ["Smoothie", "Milkshake"],

        // --- HOUSEHOLD & OBJECTS ---
        ["Pen", "Pencil"], ["Fork", "Spoon"], ["Cup", "Mug"],
        ["Chair", "Stool"], ["Sofa", "Bench"], ["Bed", "Hammock"],
        ["Door", "Gate"], ["Window", "Mirror"], ["Glasses", "Sunglasses"],
        ["Watch", "Clock"], ["Ring", "Bracelet"], ["Shoe", "Boot"],
        ["Hat", "Cap"], ["Pants", "Shorts"], ["Shirt", "T-shirt"],
        ["Shampoo", "Conditioner"], ["Soap", "Body Wash"], ["Toothbrush", "Toothpaste"],
        ["Towel", "Bathrobe"], ["Pillow", "Cushion"], ["Blanket", "Quilt"],
        ["Carpet", "Rug"], ["Broom", "Mop"], ["Vacuum", "Duster"],
        ["Fridge", "Freezer"], ["Oven", "Microwave"], ["Scarf", "Tie"],
        ["Belt", "Suspenders"], ["Wallet", "Purse"], ["Backpack", "Suitcase"],
        ["Umbrella", "Raincoat"], ["Key", "Lock"], ["Scissors", "Knife"],
        ["Glue", "Tape"], ["Paper", "Canvas"], ["Camera", "Tripod"],

        // --- NATURE & ANIMALS ---
        ["Cat", "Dog"], ["Lion", "Tiger"], ["Leopard", "Cheetah"],
        ["Wolf", "Fox"], ["Crocodile", "Alligator"], ["Turtle", "Tortoise"],
        ["Bee", "Wasp"], ["Butterfly", "Moth"], ["Eagle", "Falcon"],
        ["Penguin", "Ostrich"], ["Dolphin", "Shark"], ["Whale", "Shark"],
        ["Frog", "Toad"], ["Rabbit", "Hare"], ["Horse", "Donkey"],
        ["Sheep", "Goat"], ["Monkey", "Gorilla"], ["Snake", "Worm"],
        ["Spider", "Scorpion"], ["Ant", "Termite"], ["Duck", "Goose"],
        ["Thunder", "Lightning"], ["Fog", "Mist"], ["Rain", "Hail"],
        ["Crow", "Raven"], ["Owl", "Hawk"], ["Rat", "Mouse"],
        ["Deer", "Moose"], ["Rhino", "Hippo"], ["Jellyfish", "Squid"],
        ["Rose", "Tulip"], ["Cactus", "Palm Tree"], ["Grass", "Moss"],
        ["Volcano", "Mountain"], ["Cave", "Tunnel"], ["Forest", "Jungle"],

        // --- PLACES & JOBS ---
        ["City", "Village"], ["Hotel", "Motel"], ["Library", "Bookstore"],
        ["School", "University"], ["Museum", "Gallery"], ["Cinema", "Theater"],
        ["Hospital", "Clinic"], ["Prison", "Jail"], ["Bridge", "Tunnel"],
        ["Castle", "Palace"], ["Bakery", "Cafe"], ["Bar", "Pub"],
        ["Stadium", "Arena"], ["Zoo", "Aquarium"], ["Airport", "Station"],
        ["Farm", "Ranch"], ["Dentist", "Surgeon"], ["Soldier", "Spy"],
        ["Writer", "Journalist"], ["Actor", "Director"], ["Scientist", "Engineer"],
        ["Pilot", "Captain"], ["Chef", "Waiter"], ["Artist", "Designer"],
        ["Judge", "Lawyer"], ["Police", "Security Guard"], ["King", "President"],

        // --- TECHNOLOGY & TRANSPORT ---
        ["iPhone", "Samsung"], ["Laptop", "Tablet"], ["Keyboard", "Mouse"],
        ["Facebook", "Instagram"], ["Twitter", "TikTok"], ["Spotify", "Apple Music"],
        ["Netflix", "YouTube"], ["PlayStation", "Xbox"], ["Windows", "MacOS"],
        ["Car", "Bus"], ["Motorcycle", "Bicycle"], ["Train", "Subway"],
        ["Helicopter", "Airplane"], ["Boat", "Ship"], ["Taxi", "Uber"],
        ["Drone", "Robot"], ["Battery", "Charger"], ["Wifi", "Bluetooth"],
        ["Email", "Letter"], ["Screen", "Monitor"], ["Wheel", "Tire"],

        // --- CHARACTERS & ABSTRACT ---
        ["Superman", "Batman"], ["Spiderman", "Iron Man"], ["Harry Potter", "Frodo"],
        ["Vampire", "Werewolf"], ["Ghost", "Zombie"], ["Angel", "Demon"],
        ["Santa", "Elf"], ["Pirate", "Ninja"], ["Prince", "Princess"],
        ["Love", "Like"], ["Happy", "Excited"], ["Sad", "Depressed"],
        ["Running", "Walking"], ["Swimming", "Diving"], ["Soccer", "Rugby"],
        ["Tennis", "Badminton"], ["Basketball", "Volleyball"], ["Skiing", "Snowboarding"],
        ["Painting", "Drawing"], ["Singing", "Humming"], ["Guitar", "Violin"],
        ["Piano", "Keyboard"], ["Rock", "Pop"], ["Comedy", "Drama"],
        ["Horor", "Thriller"], ["Math", "Science"], ["History", "Geography"],
        ["Gold", "Silver"], ["Diamond", "Pearl"], ["Red", "Pink"],
        ["Sun", "Moon"], ["Star", "Planet"], ["Ocean", "Sea"],
        ["River", "Lake"], ["Pool", "Pond"], ["Desert", "Beach"],
        ["Fire", "Smoke"], ["Ice", "Water"], ["Light", "Shadow"],
        ["Dream", "Nightmare"], ["Past", "Future"], ["Truth", "Lie"],
        ["War", "Peace"], ["Life", "Death"], ["Rich", "Poor"],
        ["Hot", "Cold"], ["Fast", "Slow"], ["Big", "Small"]
    ],
    'id': [
        // --- MAKANAN & MINUMAN ---
        ["Apel", "Pir"], ["Pisang", "Pisang Raja"], ["Stroberi", "Rasberi"],
        ["Kopi", "Teh"], ["Latte", "Cappuccino"], ["Pepsi", "Coca-Cola"],
        ["Pizza", "Burger"], ["Taco", "Burrito"], ["Sushi", "Sashimi"],
        ["Panekuk", "Wafel"], ["Kukis", "Biskuit"], ["Donat", "Bagel"],
        ["Sup", "Soto"], ["Mentega", "Margarin"], ["Saus Tomat", "Mustard"],
        ["Garam", "Merica"], ["Nasi", "Mie"], ["Roti", "Roti Bakar"],
        ["Cokelat", "Vanila"], ["Es Krim", "Yogurt"], ["Lemon", "Jeruk Nipis"],
        ["Bawang Merah", "Bawang Putih"], ["Kentang", "Ubi"], ["Ayam", "Kalkun"],
        ["Steak", "Iga Bakar"], ["Bir", "Anggur"], ["Wiski", "Vodka"],
        ["Blueberry", "Anggur"], ["Persik", "Aprikot"], ["Timun", "Terong"],
        ["Bayam", "Kangkung"], ["Tuna", "Salmon"], ["Udang", "Lobster"],
        ["Sosis", "Nugget"], ["Muffin", "Bolu Kukus"], ["Madu", "Selai"],
        ["Mayones", "Saus Sambal"], ["Keju", "Cokelat"], ["Jus", "Es Buah"],
        ["Nasi Goreng", "Mie Goreng"], ["Sate", "Gulai"], ["Bakso", "Mie Ayam"],
        ["Kerupuk", "Keripik"], ["Tahu", "Tempe"], ["Rendang", "Opor"],

        // --- RUMAH & BENDA ---
        ["Pulpen", "Pensil"], ["Garpu", "Sendok"], ["Cangkir", "Gelas"],
        ["Kursi", "Bangku"], ["Sofa", "Kursi Santai"], ["Kasur", "Tikar"],
        ["Pintu", "Gerbang"], ["Jendela", "Cermin"], ["Kacamata", "Kacamata Hitam"],
        ["Jam Tangan", "Jam Dinding"], ["Cincin", "Gelang"], ["Sepatu", "Sandal"],
        ["Topi", "Peci"], ["Celana Panjang", "Celana Pendek"], ["Kemeja", "Kaos"],
        ["Sampo", "Sabun"], ["Sikat Gigi", "Odol"], ["Handuk", "Tisu"],
        ["Bantal", "Guling"], ["Selimut", "Sarung"], ["Karpet", "Keset"],
        ["Sapu", "Pel"], ["Kulkas", "Freezer"], ["Kompor", "Oven"],
        ["Syal", "Dasi"], ["Ikat Pinggang", "Tali Sepatu"], ["Dompet", "Tas"],
        ["Ransel", "Koper"], ["Payung", "Jas Hujan"], ["Kunci", "Gembok"],
        ["Gunting", "Pisau"], ["Lem", "Selotip"], ["Kertas", "Kanvas"],
        ["Kamera", "CCTV"], ["Kipas Angin", "AC"], ["Lampu", "Lilin"],

        // --- ALAM & HEWAN ---
        ["Kucing", "Anjing"], ["Singa", "Harimau"], ["Macan Tutul", "Cheetah"],
        ["Serigala", "Rubah"], ["Buaya", "Aligator"], ["Kura-kura", "Penyu"],
        ["Lebah", "Tawon"], ["Kupu-kupu", "Ngengat"], ["Elang", "Rajawali"],
        ["Penguin", "Burung Unta"], ["Lumba-lumba", "Hiu"], ["Paus", "Hiu"],
        ["Katak", "Kodok"], ["Kelinci", "Marmut"], ["Kuda", "Keledai"],
        ["Domba", "Kambing"], ["Monyet", "Gorila"], ["Ular", "Cacing"],
        ["Laba-laba", "Kalajengking"], ["Semut", "Rayap"], ["Bebek", "Angsa"],
        ["Guntur", "Kilat"], ["Kabut", "Awan"], ["Hujan", "Gerimis"],
        ["Gagak", "Merpati"], ["Burung Hantu", "Elang"], ["Tikus", "Hamster"],
        ["Rusa", "Kancil"], ["Badak", "Kuda Nil"], ["Ubur-ubur", "Cumi-cumi"],
        ["Mawar", "Melati"], ["Kaktus", "Bambu"], ["Rumput", "Lumut"],
        ["Gunung", "Bukit"], ["Goa", "Terowongan"], ["Hutan", "Sawah"],

        // --- TEMPAT & PEKERJAAN ---
        ["Kota", "Desa"], ["Hotel", "Kost"], ["Perpustakaan", "Toko Buku"],
        ["Sekolah", "Kampus"], ["Museum", "Galeri"], ["Bioskop", "Teater"],
        ["Rumah Sakit", "Puskesmas"], ["Penjara", "Kantor Polisi"], ["Jembatan", "Tol"],
        ["Istana", "Keraton"], ["Toko Roti", "Warung"], ["Bar", "Kafe"],
        ["Stadion", "Lapangan"], ["Kebun Binatang", "Taman"], ["Bandara", "Pelabuhan"],
        ["Peternakan", "Perkebunan"], ["Dokter Gigi", "Dokter"], ["Tentara", "Polisi"],
        ["Penulis", "Wartawan"], ["Aktor", "Sutradara"], ["Ilmuwan", "Insinyur"],
        ["Pilot", "Masinis"], ["Koki", "Pelayan"], ["Seniman", "Arsitek"],
        ["Hakim", "Pengacara"], ["Satpam", "Hansip"], ["Raja", "Presiden"],

        // --- TEKNOLOGI & TRANSPORT ---
        ["iPhone", "Samsung"], ["Laptop", "Tablet"], ["Keyboard", "Mouse"],
        ["Facebook", "Instagram"], ["Twitter", "TikTok"], ["Spotify", "YouTube"],
        ["Netflix", "Bioskop"], ["PlayStation", "Nintendo"], ["Windows", "MacOS"],
        ["Mobil", "Bus"], ["Motor", "Sepeda"], ["Kereta", "MRT"],
        ["Helikopter", "Pesawat"], ["Perahu", "Kapal"], ["Taksi", "Ojek"],
        ["Drone", "Robot"], ["Baterai", "Charger"], ["Wifi", "Kuota"],
        ["Email", "Surat"], ["Layar", "Proyektor"], ["Roda", "Ban"],

        // --- KARAKTER & ABSTRAK ---
        ["Superman", "Batman"], ["Spiderman", "Iron Man"], ["Harry Potter", "Frodo"],
        ["Vampir", "Genderuwo"], ["Hantu", "Pocong"], ["Malaikat", "Iblis"],
        ["Sinterklas", "Kurcaci"], ["Bajak Laut", "Ninja"], ["Pangeran", "Putri"],
        ["Cinta", "Sayang"], ["Senang", "Gembira"], ["Sedih", "Kecewa"],
        ["Lari", "Jalan"], ["Renang", "Menyelam"], ["Sepak Bola", "Futsal"],
        ["Tenis", "Bulu Tangkis"], ["Basket", "Voli"], ["Silat", "Karate"],
        ["Melukis", "Menggambar"], ["Bernyanyi", "Karaoke"], ["Gitar", "Ukulele"],
        ["Piano", "Keyboard"], ["Rock", "Dangdut"], ["Komedi", "Horor"],
        ["Matematika", "Fisika"], ["Sejarah", "Geografi"],
        ["Emas", "Perak"], ["Berlian", "Mutiara"], ["Merah", "Biru"],
        ["Matahari", "Bulan"], ["Bintang", "Planet"], ["Samudra", "Laut"],
        ["Sungai", "Danau"], ["Kolam", "Empang"], ["Gurun", "Pantai"],
        ["Api", "Asap"], ["Es", "Air"], ["Cahaya", "Bayangan"],
        ["Mimpi", "Khayalan"], ["Masa Lalu", "Masa Depan"], ["Jujur", "Bohong"],
        ["Perang", "Damai"], ["Hidup", "Mati"], ["Kaya", "Miskin"],
        ["Panas", "Dingin"], ["Cepat", "Lambat"], ["Besar", "Kecil"]
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