const socket = io();
let myId, roomCode, selectedVote;
let globalPlayers = []; 
let countdownInterval;

// --- DOM HELPERS ---
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function updateStatus(text) { 
    document.getElementById('status-bar').innerText = text; 
}

// --- JOIN ---
function joinGame() {
    const name = document.getElementById('username').value;
    roomCode = document.getElementById('room-code').value;
    if(!name || !roomCode) return alert("Codename and Mission Code required.");
    
    socket.emit('joinRoom', { roomCode, name });
    updateStatus(`Code: ${roomCode}`);
    showScreen('screen-lobby');
}

socket.on('updateLobby', (players) => {
    globalPlayers = players; 
    const list = document.getElementById('lobby-list');
    list.innerHTML = players.map(p => `
        <div class="list-item">
            <div class="avatar">${p.name.substring(0,2).toUpperCase()}</div>
            <span style="font-weight:500">${p.name}</span>
        </div>
    `).join('');
});

socket.on('youJoined', ({ isHost }) => {
    if(isHost) document.getElementById('host-controls').classList.remove('hidden');
});

// --- GAME ---
function startGame() { 
    socket.emit('startGame', roomCode); 
}

socket.on('gameStarted', ({ players }) => {
    globalPlayers = players;
    showScreen('screen-game');
    const me = players.find(p => p.id === socket.id);
    document.getElementById('my-word').innerText = me.word;
    document.getElementById('game-chat').innerHTML = ''; 
});

socket.on('nextTurn', ({ playerId, round }) => {
    const isMe = playerId === socket.id;
    updateStatus(`Round ${round}`);
    
    if(isMe) {
        document.getElementById('input-area').classList.remove('hidden');
        document.getElementById('wait-msg').classList.add('hidden');
        document.getElementById('desc-input').focus();
    } else {
        document.getElementById('input-area').classList.add('hidden');
        document.getElementById('wait-msg').classList.remove('hidden');
    }

    // --- RESET TIMER ANIMATION ---
    const bar = document.getElementById('timer-bar');
    
    // Simple trick to restart CSS animation
    bar.style.transition = 'none';
    bar.style.width = '100%';
    
    // Force browser reflow
    void bar.offsetWidth; 

    // Start draining
    bar.style.transition = 'width 30s linear';
    bar.style.width = '0%';
});

function sendDesc() {
    const input = document.getElementById('desc-input');
    const txt = input.value.trim();

    if (!txt) return;

    const wordCount = txt.split(/\s+/).length;
    if (wordCount > 2) {
        alert("System limitation: Description must be 1 or 2 words only!");
        return; 
    }

    socket.emit('sendDescription', { roomCode, text: txt });
    input.value = '';
}

socket.on('newChatMessage', ({ name, text }) => {
    const chat = document.getElementById('game-chat');
    chat.innerHTML += `
        <div class="chat-bubble">
            <div class="chat-meta">${name}</div>
            <div>${text}</div>
        </div>
    `;
    chat.scrollTop = chat.scrollHeight;
});

// --- VOTING ---
socket.on('startVoting', () => {
    showScreen('screen-vote');
    const list = document.getElementById('vote-list');
    list.innerHTML = globalPlayers.map(p => `
        <div class="list-item clickable" onclick="selectVote('${p.id}', this)">
            <div class="avatar">${p.name.substring(0,2).toUpperCase()}</div>
            <span style="font-weight:500">${p.name}</span>
        </div>
    `).join('');
});

function selectVote(id, el) {
    // Save the ID of the person we want to kill
    selectedVote = id;
    
    // Visual: Remove 'selected' class from all other items
    document.querySelectorAll('.list-item').forEach(e => e.classList.remove('selected'));
    
    // Visual: Add 'selected' class to the clicked item
    el.classList.add('selected');
}

function submitVote() {
    if(!selectedVote) return;
    socket.emit('submitVote', { roomCode, targetId: selectedVote });
    document.getElementById('screen-vote').innerHTML = "<h2 style='text-align:center; color:var(--text-dim); margin-top:50px;'>Target Locked.<br>Waiting for consensus...</h2>";
}

// --- RESULT ---
socket.on('gameOver', (data) => {
    showScreen('screen-result');
    const title = document.getElementById('winner-title');
    const desc = document.getElementById('winner-desc');
    const icon = document.getElementById('winner-icon');
    
    // Check for TIE first
    if (data.resultType === 'tie') {
        title.innerText = "Impostor Wins (Tie Vote)";
        title.style.color = "var(--danger)";
        desc.innerText = `The group couldn't agree. The Impostor (${data.impostorName}) escaped!`;
        icon.innerText = "🤝";
    } 
    // Normal Win Conditions
    else if (data.wasImpostor) {
        title.innerText = "Civilians Win!";
        title.style.color = "var(--primary)";
        desc.innerText = `You caught the Impostor (${data.impostorName})!`;
        icon.innerText = "🛡️";
    } else {
        title.innerText = "Impostor Wins!";
        title.style.color = "var(--danger)";
        desc.innerText = `You voted out ${data.eliminatedName} (Civilian). The Impostor was ${data.impostorName}.`;
        icon.innerText = "🔪";
    }

    document.getElementById('res-imp-word').innerText = data.impWord;
    document.getElementById('res-civ-word').innerText = data.civWord;
});

// Explicitly attach to window to ensure HTML can see it
window.restartGame = function() {
    console.log("Replay button clicked!"); // Debug log
    
    // Safety check: make sure roomCode exists
    if (!roomCode) {
        console.error("No room code found");
        alert("Error: Room code lost. Reloading...");
        location.reload();
        return;
    }

    // Visual feedback (optional)
    const btn = document.querySelector('#screen-result button');
    if(btn) btn.innerText = "Restarting...";

    // Emit event to server
    socket.emit('restartGame', roomCode);
};

socket.on('resetLobby', () => {
    // 1. Stop the countdown if it's running
    if (countdownInterval) clearInterval(countdownInterval);
    
    // 2. Hide the countdown text
    const waitMsg = document.getElementById('wait-msg');
    waitMsg.classList.add('hidden');
    waitMsg.innerHTML = ''; 
    
    // 3. CRITICAL: Reset Vote Variables
    selectedVote = null; 
    
    // 4. Clear the Vote List Visuals (Just to be safe)
    document.getElementById('vote-list').innerHTML = '';
    
    // 5. Reset the "Game Result" screen (Hide it)
    document.getElementById('screen-result').classList.add('hidden');

    // 6. Show Lobby
    showScreen('screen-lobby');
});

function leaveRoom() {
    socket.emit('leaveRoom');
    location.reload();
}

window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
        document.getElementById('room-code').value = roomParam;
    }
};

socket.on('votingCountdown', (seconds) => {
    const waitMsg = document.getElementById('wait-msg');
    waitMsg.classList.remove('hidden');
    document.getElementById('input-area').classList.add('hidden');

    let count = seconds;
    waitMsg.innerHTML = `Voting begins in <b>${count}</b>...`;

    // Clear any existing timer just in case
    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        count--;
        if (count <= 0) {
            clearInterval(countdownInterval); 
        } else {
            waitMsg.innerHTML = `Voting begins in <b>${count}</b>...`;
        }
    }, 1000);
});