// --- DOM Elements ---
const chatDisplay = document.getElementById('chat-display');
const messageInput = document.getElementById('text');
const sendBtn = document.getElementById('send-btn');
const memberList = document.getElementById('member-list');
const displayRoomId = document.getElementById('display-room-id');

const replyPreview = document.getElementById('reply-preview');
const replyTextEl = document.getElementById('reply-text');
const cancelReplyBtn = document.getElementById('cancel-reply');

const darkModeBtn = document.getElementById('darkModeBtn');
const themeBtn = document.getElementById('themeBtn');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const exitChatBtn = document.getElementById('exitChatBtn');

let replyingToText = null;

// --- 1. EMOJI PICKER LOGIC (FIXED) ---
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');

const emojis = ["😀","😂","🤣","😊","😍","😎","🤔","🤫","🤯","💀","👽","🤖","👾","👍","👎","👏","🤝","🔥","✨","⭐","🌟","💥","💯","👀","❤","💔","🚨","🚀","💻","📡"];

emojis.forEach(emoji => {
    const span = document.createElement('span');
    span.innerText = emoji;
    span.onclick = () => {
        messageInput.value += emoji;
        messageInput.focus();
        // REMOVED the hidden toggle here so you can pick multiple emojis
    };
    emojiPicker.appendChild(span);
});

// Toggle menu on button click
emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle('hidden');
});

// Hide menu if clicking anywhere else on the page
document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
        emojiPicker.classList.add('hidden');
    }
});


// --- 2. BACKEND / SOCKET.IO INTEGRATION ---
const socket = io();

const chatParamsStr = sessionStorage.getItem('chatParams');
if (!chatParamsStr) {
    window.location.href = "/room"; 
}

const params = JSON.parse(chatParamsStr);
const myUsername = params.name;

if (params.action === 'create') {
    socket.emit("create room", { username: params.name, capacity: params.capacity });
} else if (params.action === 'join') {
    socket.emit("join room", { username: params.name, roomId: params.room });
}

socket.on("room created", (roomId) => {
    displayRoomId.textContent = roomId;
    params.action = 'join'; 
    params.room = roomId;
    sessionStorage.setItem('chatParams', JSON.stringify(params));
});

socket.on("room joined", (roomId) => {
    displayRoomId.textContent = roomId;
});

socket.on("invalid room", (msg) => {
    alert("SYSTEM ERROR: " + msg);
    window.location.href = "/room";
});

// Replace the old "room update" listener with this:
socket.on("room update", (users) => {
    memberList.innerHTML = ""; // Clear current list
    
    // Check if the server sent an array of names
    if (Array.isArray(users)) {
        users.forEach(username => {
            const memDiv = document.createElement('div');
            memDiv.classList.add('member');
            memDiv.innerText = `👤 ${username}`;
            memberList.appendChild(memDiv);
        });
    } else {
        // Fallback just in case your backend still sends a number temporarily
        memberList.innerHTML = `<div class="member" style="text-align:center;">👥 Online Users: ${users}</div>`;
    }
});

socket.on("chat message", (data) => {
    if (data.system) {
        const sysDiv = document.createElement('div');
        sysDiv.style.color = data.color || '#333';
        sysDiv.style.textAlign = 'center';
        sysDiv.style.margin = '10px 0';
        sysDiv.style.fontSize = '0.9rem';
        sysDiv.style.fontWeight = 'bold';
        sysDiv.innerText = `> ${data.text}`;
        chatDisplay.appendChild(sysDiv);
    } else {
        const isOwn = data.user === myUsername;
        const wrapperDiv = document.createElement('div');
        wrapperDiv.classList.add('message-wrapper');
        if (isOwn) wrapperDiv.classList.add('self');

        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message');
        
        if (!isOwn && data.color) {
            msgDiv.style.borderLeft = `4px solid ${data.color}`;
        }

        if (!isOwn) {
            const userSpan = document.createElement('div');
            userSpan.style.fontSize = '0.75rem';
            userSpan.style.color = data.color || '#333';
            userSpan.style.marginBottom = '4px';
            userSpan.style.fontWeight = 'bold';
            userSpan.innerText = data.user;
            msgDiv.appendChild(userSpan);
        }

        if (data.replyTo) {
            const quoteSpan = document.createElement('span');
            quoteSpan.classList.add('quoted-text');
            quoteSpan.innerText = data.replyTo;
            msgDiv.appendChild(quoteSpan);
        }

        const textNode = document.createTextNode(data.text);
        msgDiv.appendChild(textNode);
        
        // --- NEW: Add the Hover Reply Button ---
        const replyBtn = document.createElement('div');
        replyBtn.classList.add('reply-btn');
        replyBtn.innerText = '↩️'; // The arrow icon
        replyBtn.title = "Reply to message";
        replyBtn.onclick = () => {
            // Extract pure text, ignoring quoted HTML
            let actualText = Array.from(msgDiv.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent)
                .join('').trim();
            if(actualText) initiateReply(actualText);
        };

        // Append the message and the button side-by-side
        wrapperDiv.appendChild(msgDiv);
        wrapperDiv.appendChild(replyBtn);
        
        chatDisplay.appendChild(wrapperDiv);
    }
    
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
});

// --- 3. MESSAGE SENDING & REPLIES (FIXED ENTER KEY) ---
function initiateReply(text) {
    replyingToText = text;
    replyTextEl.innerText = text.length > 50 ? text.substring(0, 50) + '...' : text;
    replyPreview.classList.remove('hidden');
    messageInput.focus();
}

cancelReplyBtn.addEventListener('click', () => {
    replyingToText = null;
    replyPreview.classList.add('hidden');
});

function sendMessage() {
    const text = messageInput.value.trim();
    if (text === "") return; 

    socket.emit("chat message", { text: text, replyTo: replyingToText });
    
    messageInput.value = "";
    replyingToText = null;
    replyPreview.classList.add('hidden');
    emojiPicker.classList.add('hidden'); // Closes emojis when you send
}

sendBtn.addEventListener('click', sendMessage);

// FIXED: Using keydown and preventing default behavior to ensure Enter key fires instantly
messageInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault(); 
        sendMessage();
    }
});


// --- 4. UNIVERSAL DRAG-TO-REPLY LOGIC (FIXED) ---
let startX = 0;
let swipedMsg = null;
let isDragging = false;

function startDrag(e) {
    const msg = e.target.closest('.message'); 
    if (!msg) return;
    isDragging = true;
    startX = e.type.includes('mouse') ? e.pageX : e.changedTouches[0].screenX;
    swipedMsg = msg;
    msg.style.transition = 'none'; 
}

function drag(e) {
    if (!isDragging || !swipedMsg) return;
    let currentX = e.type.includes('mouse') ? e.pageX : e.changedTouches[0].screenX;
    let diff = currentX - startX;
    
    if (diff > 0 && diff < 80) { // Drag to the right max 80px
        swipedMsg.style.transform = `translateX(${diff}px)`;
    }
}

function endDrag(e) {
    if (!isDragging || !swipedMsg) return;
    isDragging = false;
    let endX = e.type.includes('mouse') ? e.pageX : e.changedTouches[0].screenX;
    let diff = endX - startX;

    // Snap back
    swipedMsg.style.transition = 'transform 0.3s ease';
    swipedMsg.style.transform = `translateX(0px)`;

    if (diff > 50) {
        // Extract plain text avoiding nested quote HTML
        let actualText = Array.from(swipedMsg.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent)
            .join('').trim();
        
        if(actualText) initiateReply(actualText);
    }
    swipedMsg = null;
}

// FIXED: Listen to mouse movement and un-click on the WHOLE window, not just the chatbox
chatDisplay.addEventListener('mousedown', startDrag);
window.addEventListener('mousemove', drag);
window.addEventListener('mouseup', endDrag); 

chatDisplay.addEventListener('touchstart', startDrag, {passive: true});
window.addEventListener('touchmove', drag, {passive: true});
window.addEventListener('touchend', endDrag);


// --- 5. MENU BOX OPTIONS LOGIC ---
darkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    darkModeBtn.innerText = document.body.classList.contains('dark-mode') 
        ? "☀️ Toggle Light Mode" 
        : "🌙 Toggle Dark Mode";
});

const themes = ['', 'theme-blue', 'theme-purple', 'theme-dark-gray'];
let currentThemeIndex = 0;

themeBtn.addEventListener('click', () => {
    if (themes[currentThemeIndex]) document.body.classList.remove(themes[currentThemeIndex]);
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    if (themes[currentThemeIndex]) document.body.classList.add(themes[currentThemeIndex]);
});

copyCodeBtn.addEventListener('click', () => {
    const currentCode = displayRoomId.textContent;
    if (currentCode !== "...") {
        navigator.clipboard.writeText(currentCode).then(() => {
            const originalHTML = copyCodeBtn.innerHTML;
            copyCodeBtn.innerText = "✅ Code Copied!";
            setTimeout(() => copyCodeBtn.innerHTML = originalHTML, 2000);
        });
    }
});

clearChatBtn.addEventListener('click', () => {
    chatDisplay.innerHTML = "";
});

exitChatBtn.addEventListener('click', () => {
    if(confirm("Are you sure you want to exit the chat?")) {
        sessionStorage.removeItem('chatParams');
        window.location.href = "/room"; 
    }
});