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

// --- 1. EMOJI PICKER LOGIC ---
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');
const emojis = ["😀", "😂", "🥰", "😎", "🤩", "🤔", "🙄", "😴", "🥶", "🤯", "🤠", "🥳", "🤓", "🤡", "🤫", "🤬", "😡", "😠", "🥺", "🥱", "🤤", "😈", "👿", "💀", "💩", "👻", "👽", "👾", "🤖", "🎃"];

emojis.forEach(emoji => {
    const span = document.createElement('span');
    span.innerText = emoji;
    span.onclick = () => {
        messageInput.value += emoji;
        messageInput.focus();
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

socket.on("room update", (users) => {
    memberList.innerHTML = ""; // Clear current list
    
    // Check if the server sent an array of names
    if (Array.isArray(users)) {
        users.forEach(username => {
            const memDiv = document.createElement('div');
            memDiv.classList.add('member');
            // Member list icon explicitly added here
            memDiv.innerHTML = `<i class="ri-user-fill"></i> ${username}`;
            memberList.appendChild(memDiv);
        });
    } else {
        memberList.innerHTML = `<div class="member" style="text-align:center;">👥 Online Users: ${users}</div>`;
    }
});

socket.on("chat message", (data) => {
    // Highly visible pills for system messages
    if (data.system) {
        const sysDiv = document.createElement('div');
        sysDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
        sysDiv.style.color = '#ffffff';
        sysDiv.style.textAlign = 'center';
        sysDiv.style.margin = '10px auto';
        sysDiv.style.padding = '6px 16px';
        sysDiv.style.borderRadius = '20px';
        sysDiv.style.fontSize = '0.85rem';
        sysDiv.style.fontWeight = 'bold';
        sysDiv.style.width = 'fit-content';
        sysDiv.innerText = data.text;
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

        // Incoming message username display like WhatsApp
        if (!isOwn) {
            const userSpan = document.createElement('div');
            userSpan.style.fontSize = '0.85rem';
            userSpan.style.color = data.color || '#333';
            userSpan.style.marginBottom = '5px';
            userSpan.style.fontWeight = '800';
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

        // --- Hover Reply Button ---
        const replyBtn = document.createElement('div');
        replyBtn.classList.add('reply-btn');
        replyBtn.innerHTML = '<i class="ri-arrow-go-forward-line"></i>';
        replyBtn.title = "Reply to message";
        
        replyBtn.onclick = () => {
            let actualText = Array.from(msgDiv.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent)
                .join('').trim();
            if (actualText) initiateReply(actualText);
        };

        wrapperDiv.appendChild(msgDiv);
        wrapperDiv.appendChild(replyBtn);
        chatDisplay.appendChild(wrapperDiv);
    }
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
});


// --- 3. MESSAGE SENDING & REPLIES ---
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
    emojiPicker.classList.add('hidden');
}

sendBtn.addEventListener('click', sendMessage);

// Instant enter key send without newline
messageInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});


// --- 4. UNIVERSAL DRAG-TO-REPLY LOGIC ---
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
    if (diff > 0 && diff < 80) {
        swipedMsg.style.transform = `translateX(${diff}px)`;
    }
}

function endDrag(e) {
    if (!isDragging || !swipedMsg) return;
    isDragging = false;
    let endX = e.type.includes('mouse') ? e.pageX : e.changedTouches[0].screenX;
    let diff = endX - startX;
    
    swipedMsg.style.transition = 'transform 0.3s ease';
    swipedMsg.style.transform = `translateX(0px)`;
    
    if (diff > 50) {
        let actualText = Array.from(swipedMsg.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent)
            .join('').trim();
        if (actualText) initiateReply(actualText);
    }
    swipedMsg = null;
}

chatDisplay.addEventListener('mousedown', startDrag);
window.addEventListener('mousemove', drag);
window.addEventListener('mouseup', endDrag);

chatDisplay.addEventListener('touchstart', startDrag, { passive: true });
window.addEventListener('touchmove', drag, { passive: true });
window.addEventListener('touchend', endDrag);


// --- 5. MENU BOX OPTIONS LOGIC ---
darkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    darkModeBtn.innerText = document.body.classList.contains('dark-mode') 
        ? "Toggle Light Mode" 
        : "Toggle Dark Mode";
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
            copyCodeBtn.innerText = "Code Copied!";
            setTimeout(() => copyCodeBtn.innerHTML = originalHTML, 2000);
        });
    }
});

clearChatBtn.addEventListener('click', () => {
    chatDisplay.innerHTML = "";
});

exitChatBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to exit the chat?")) {
        sessionStorage.removeItem('chatParams');
        window.location.href = "/room";
    }
});

// --- 6. MOBILE RESPONSIVENESS LOGIC ---
const mobileMenuTrigger = document.getElementById('mobile-menu-trigger'); // Title is now trigger
const mobileExitBtn = document.getElementById('mobile-exit-btn');
const menuBox = document.querySelector('.menu-box');

if (mobileMenuTrigger) {
    mobileMenuTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        menuBox.classList.toggle('active');
    });
}

if (mobileExitBtn) {
    mobileExitBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to exit the chat?")) {
            sessionStorage.removeItem('chatParams');
            window.location.href = "/room";
        }
    });
}

// Close the mobile dropdown menu if the user clicks outside of it
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && !menuBox.contains(e.target) && e.target !== mobileMenuTrigger) {
        menuBox.classList.remove('active');
    }
});