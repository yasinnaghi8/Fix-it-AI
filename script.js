import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDLxCa6EcOu_jCoB4f0wyq-gFSiudehgPM",
    authDomain: "fixit-ai-naghi.firebaseapp.com",
    projectId: "fixit-ai-naghi",
    storageBucket: "fixit-ai-naghi.firebasestorage.app",
    messagingSenderId: "581173241560",
    appId: "1:581173241560:web:c9a2983be8245e323799ad",
    measurementId: "G-7ZRKL2RQ6F"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// دالة الاتصال بالذكاء الاصطناعي (كانت في groq-ai.js)
async function askGroqAI(userInput, imageBase64 = null) {
    try {
        var payload = { message: userInput };
        if (imageBase64) {
            payload.image = imageBase64;
        }

        var res = await fetch("/ask", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        var textData = await res.text();
        
        try {
            var data = JSON.parse(textData);
            if (data.choices && data.choices.length > 0) {
                return data.choices[0].message.content;
            } else {
                return "مشكلة في السيرفر: " + JSON.stringify(data);
            }
        } catch (e) {
            return "السيرفر رجع خطأ: " + textData.substring(0, 100);
        }
        
    } catch (err) {
        return "مشكلة في الاتصال: " + err.message;
    }
}

var chatContainer = document.getElementById("chatContainer");
var welcomeLogo = document.getElementById("welcomeLogo");
var sidebar = document.getElementById("sidebar");
var toggleSidebar = document.getElementById("toggleSidebar");
var searchBtn = document.getElementById("searchBtn");
var newChatBtn = document.getElementById("newChatBtn");
var searchContainer = document.getElementById("searchContainer");
var searchInput = document.getElementById("searchInput");
var btnDiagnose = document.getElementById("btnDiagnose");
var problemText = document.getElementById("problemText");
var attachBtn = document.getElementById("attachBtn");
var attachmentMenu = document.getElementById("attachmentMenu");
var previewContainer = document.getElementById("previewContainer");

var isChatStarted = false;
var currentChatIndex = -1;
var chatToDeleteIndex = -1;
var openBtn = null;
var attachedFiles = []; 
var currentUserUID = null;
var userChats = []; 

document.addEventListener("DOMContentLoaded", function() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserUID = user.uid;
            document.getElementById("sidebarUserName").textContent = user.displayName || "مستخدم";
            if (user.photoURL) document.getElementById("userAvatar").src = user.photoURL;
            
            openBtn = document.createElement("button");
            openBtn.id = "openSidebarBtn";
            openBtn.className = "icon-btn";
            openBtn.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`;
            openBtn.style.position = "absolute";
            openBtn.style.top = "15px";
            openBtn.style.right = "15px";
            openBtn.style.zIndex = "500";
            openBtn.style.display = "none"; 
            document.body.appendChild(openBtn);
            
            openBtn.onclick = function() { 
                sidebar.classList.remove("collapsed"); 
                openBtn.style.display = "none"; 
            };

            if (window.innerWidth < 768) {
                sidebar.classList.add("collapsed");
                openBtn.style.display = "flex";
            }

            loadHistory();
        } else {
            window.location.href = "auth.html";
        }
    });
});

function toggleSidebarFunc() {
    sidebar.classList.toggle("collapsed");
    if (sidebar.classList.contains("collapsed")) {
        if (openBtn) openBtn.style.display = "flex";
    } else {
        if (openBtn) openBtn.style.display = "none";
    }
}

toggleSidebar.addEventListener("click", toggleSidebarFunc);

window.logout = function() {
    signOut(auth).then(() => {
        localStorage.removeItem("userName");
        localStorage.removeItem("userAvatar");
        window.location.href = "auth.html";
    });
}

attachBtn.addEventListener("click", function(e) {
    e.stopPropagation();
    attachmentMenu.classList.toggle("active");
});

document.addEventListener("click", function(e) {
    if (!attachBtn.contains(e.target) && !attachmentMenu.contains(e.target)) {
        attachmentMenu.classList.remove("active");
    }
});

window.triggerInput = function(type) {
    attachmentMenu.classList.remove("active");
    if (type === 'camera') document.getElementById('cameraInput').click();
    if (type === 'image') document.getElementById('imageInput').click();
    if (type === 'file') document.getElementById('fileInput').click();
}

function handleFileSelect(event) {
    var files = event.target.files;
    if (!files || files.length === 0) return;

    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var fileId = 'file-' + Date.now() + '-' + i;
        
        attachedFiles.push({ id: fileId, file: file });

        var previewDiv = document.createElement("div");
        previewDiv.className = "preview-item";
        previewDiv.id = fileId;

        if (file.type.startsWith("image/")) {
            var reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById(fileId).innerHTML = `<img src="${e.target.result}">
                <div class="loading-circle" id="loader-${fileId}" style="display: block;"></div>
                <button class="cancel-btn" onclick="removeFile('${fileId}')">×</button>`;
                
                setTimeout(() => {
                    var loader = document.getElementById("loader-" + fileId);
                    if(loader) loader.style.display = "none";
                }, 1500);
            };
            reader.readAsDataURL(file);
        } else {
            var contentHTML = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <div class="loading-circle" id="loader-${fileId}" style="display: block;"></div>
            <button class="cancel-btn" onclick="removeFile('${fileId}')">×</button>`;
            previewDiv.innerHTML = contentHTML;
            
            setTimeout(() => {
                var loader = document.getElementById("loader-" + fileId);
                if(loader) loader.style.display = "none";
            }, 1500);
        }
        
        previewContainer.appendChild(previewDiv);
    }
    
    event.target.value = '';
}

document.getElementById('cameraInput').addEventListener('change', handleFileSelect);
document.getElementById('imageInput').addEventListener('change', handleFileSelect);
document.getElementById('fileInput').addEventListener('change', handleFileSelect);

window.removeFile = function(fileId) {
    var previewDiv = document.getElementById(fileId);
    if (previewDiv) {
        previewDiv.remove();
    }
    attachedFiles = attachedFiles.filter(function(item) { return item.id !== fileId; });
}

async function loadHistory() {
    try {
        const chatsRef = collection(db, "users", currentUserUID, "chats");
        const q = query(chatsRef, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        userChats = [];
        querySnapshot.forEach((doc) => {
            userChats.push({ id: doc.id, ...doc.data() });
        });
        
        renderHistory();
    } catch (error) {
        console.error("Error loading history: ", error);
    }
}

function renderHistory() {
    var pinnedContainer = document.getElementById("pinnedChatHistory");
    var regularContainer = document.getElementById("chatHistory");
    var pinnedSection = document.getElementById("pinnedChatsSection");
    
    pinnedContainer.innerHTML = "";
    regularContainer.innerHTML = "";
    
    var pinnedChats = userChats.filter(chat => chat.pinned);
    var regularChats = userChats.filter(chat => !chat.pinned);

    if (pinnedChats.length > 0) {
        pinnedSection.style.display = "flex";
    } else {
        pinnedSection.style.display = "none";
    }

    function renderChatItem(chat) {
        var div = document.createElement("div");
        div.className = "chat-item-container";
        
        var optBtn = document.createElement("button");
        optBtn.className = "options-btn";
        optBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>`;
        optBtn.onclick = function(e) { e.stopPropagation(); toggleMenu(e, chat.id); };

        var menu = document.createElement("div");
        menu.className = "options-menu";
        menu.id = "menu-" + chat.id;
        menu.innerHTML = `
            <button class="opt-btn" onclick="pinChat(event, '${chat.id}')">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="#888" stroke-width="2" fill="none"><path d="M12 17v5M9 10.76V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4.76a2 2 0 0 0 .59 1.42l1.24 1.24A1 1 0 0 1 17 15H7a1 1 0 0 1-.83-1.58l1.24-1.24A2 2 0 0 0 9 10.76Z"/></svg>
                ${chat.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
            </button>
            <button class="opt-btn delete" onclick="askDelete(event, '${chat.id}')">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ff4757" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                حذف
            </button>
        `;

        var content = document.createElement("div");
        content.className = "chat-item-content";
        
        content.innerHTML = `
            <div class="chat-item-date">${chat.date}</div>
            <div class="chat-item-title">${chat.title}</div>
        `;
        content.onclick = function() { openChat(chat); };

        div.appendChild(optBtn);
        div.appendChild(content);
        div.appendChild(menu);
        return div;
    }

    pinnedChats.forEach(chat => pinnedContainer.appendChild(renderChatItem(chat)));
    regularChats.forEach(chat => regularContainer.appendChild(renderChatItem(chat)));
}

function toggleMenu(e, chatId) {
    var allMenus = document.querySelectorAll(".options-menu");
    allMenus.forEach(m => { if(m.id !== "menu-"+chatId) m.classList.remove("active"); });
    document.getElementById("menu-"+chatId).classList.toggle("active");
}

window.openChat = function(chat) {
    chatContainer.innerHTML = chat.content;
    var aiMsgs = chatContainer.querySelectorAll('.ai-msg');
    aiMsgs.forEach(msg => {
        if(!msg.querySelector('p') && msg.textContent.length > 0) {
            msg.innerHTML = marked.parse(msg.textContent);
        }
    });

    welcomeLogo.classList.add("started");
    isChatStarted = true;
    currentChatIndex = chat.id;
    
    if (window.innerWidth < 768) {
        sidebar.classList.add("collapsed");
        if (openBtn) openBtn.style.display = "flex";
    }
}

window.pinChat = async function(e, chatId) {
    e.stopPropagation();
    var chat = userChats.find(c => c.id === chatId);
    if (chat) {
        try {
            await setDoc(doc(db, "users", currentUserUID, "chats", chatId), { pinned: !chat.pinned }, { merge: true });
            loadHistory();
        } catch (error) { console.error(error); }
    }
    document.querySelectorAll(".options-menu").forEach(m => m.classList.remove("active"));
}

window.askDelete = function(e, chatId) {
    e.stopPropagation();
    chatToDeleteIndex = chatId;
    document.getElementById("deleteModal").style.display = "flex";
}

window.closeModal = function() {
    document.getElementById("deleteModal").style.display = "none";
}

window.confirmDelete = async function() {
    if (chatToDeleteIndex) {
        try {
            await deleteDoc(doc(db, "users", currentUserUID, "chats", chatToDeleteIndex));
            loadHistory();
        } catch (error) { console.error(error); }
    }
    closeModal();
    if (currentChatIndex === chatToDeleteIndex) {
        newChatBtn.click();
    }
}

function addMessage(text, type, imageSrc = null) {
    if (!isChatStarted) { 
        welcomeLogo.classList.add("started"); 
        sidebar.classList.add("collapsed"); 
        if(openBtn) openBtn.style.display = "flex";
        isChatStarted = true; 
    }
    var msgDiv = document.createElement("div");
    msgDiv.classList.add("message", type === "user" ? "user-msg" : "ai-msg");
    
    if (imageSrc) {
        var img = document.createElement("img");
        img.src = imageSrc;
        img.style.maxWidth = "100%";
        img.style.borderRadius = "8px";
        img.style.marginBottom = "8px";
        img.style.display = "block";
        msgDiv.appendChild(img);
    }

    if (text) {
        var textDiv = document.createElement("div");
        if(type === "ai") {
            textDiv.innerHTML = marked.parse(text);
        } else {
            textDiv.textContent = text;
        }
        msgDiv.appendChild(textDiv);
    }

    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return msgDiv;
}

function typeWriter(element, text, speed = 10) {
    element.innerHTML = ""; element.classList.add("typing"); let i = 0;
    return new Promise(function(resolve) {
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i); i++;
                var isBottom = chatContainer.scrollHeight - chatContainer.clientHeight <= chatContainer.scrollTop + 50;
                if (isBottom) { chatContainer.scrollTop = chatContainer.scrollHeight; }
                setTimeout(type, speed);
            } else { 
                element.classList.remove("typing"); 
                element.innerHTML = marked.parse(text);
                resolve(); 
            }
        }
        type();
    });
}

btnDiagnose.addEventListener("click", async function() {
    var userText = problemText.value.trim();
    
    if (!userText && attachedFiles.length === 0) return;

    var finalMessage = userText;
    var imageDataUrl = null;

    if (attachedFiles.length > 0) {
        for (var i = 0; i < attachedFiles.length; i++) {
            if (attachedFiles[i].file.type.startsWith("image/")) {
                var file = attachedFiles[i].file;
                imageDataUrl = await new Promise((resolve) => {
                    var reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
                break;
            }
        }
    }

    if (!finalMessage && imageDataUrl) {
        finalMessage = "شوف الصورة دي وقولي المشكلة إيه؟";
    }

    addMessage(finalMessage, "user", imageDataUrl); 
    problemText.value = ""; 
    problemText.style.height = "auto";
    
    previewContainer.innerHTML = "";
    attachedFiles = [];

    var aiMsgDiv = addMessage("", "ai");
    
    if (currentChatIndex === -1) {
        var dateStr = new Date().toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        var newChatId = Date.now().toString();
        var newChatData = { title: "جاري التلخيص...", date: dateStr, content: "", pinned: false, timestamp: Date.now() };
        
        try {
            await setDoc(doc(db, "users", currentUserUID, "chats", newChatId), newChatData);
            currentChatIndex = newChatId;
            loadHistory();
        } catch (e) { console.error(e); }
    }

    var aiAnswer = await askGroqAI(finalMessage, imageDataUrl);
    
    if (!aiAnswer) { aiAnswer = "حدث خطأ، تأكد من الاتصال."; }
    
    await typeWriter(aiMsgDiv, aiAnswer, 10);
    
    if(currentChatIndex !== -1) {
        var currentContent = chatContainer.innerHTML;
        var currentChat = userChats.find(c => c.id === currentChatIndex);
        var updateData = { content: currentContent };
        
        if (currentChat && currentChat.title === "جاري التلخيص...") {
            var summaryPrompt = "لخص هذه المشكلة في 3 كلمات كحد أقصى لتكون عنوان للمحادثة، بدون أي زخرفة: " + (userText || "مرفقات");
            var shortTitle = await askGroqAI(summaryPrompt);
            updateData.title = shortTitle.replace(/["']/g, "").substring(0, 30);
        }
        
        try {
            await setDoc(doc(db, "users", currentUserUID, "chats", currentChatIndex), updateData, { merge: true });
            loadHistory();
        } catch (e) { console.error(e); }
    }
});

problemText.addEventListener("input", function() { this.style.height = "auto"; this.style.height = (this.scrollHeight) + "px"; });
problemText.addEventListener("keydown", function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); btnDiagnose.click(); } });

newChatBtn.addEventListener("click", function() {
    chatContainer.innerHTML = ""; 
    welcomeLogo.classList.remove("started"); 
    isChatStarted = false;
    currentChatIndex = -1;
    sidebar.classList.remove("collapsed"); 
    searchContainer.classList.add("hidden");
    searchInput.value = ""; 
    problemText.value = ""; 
    problemText.style.height = "auto";
    previewContainer.innerHTML = "";
    attachedFiles = [];
    
    if (openBtn) openBtn.style.display = "none";
});

searchBtn.addEventListener("click", function() { searchContainer.classList.toggle("hidden"); if (!searchContainer.classList.contains("hidden")) { searchInput.focus(); } });
searchInput.addEventListener("input", function(e) {
    var term = e.target.value.toLowerCase();
    var messages = chatContainer.querySelectorAll(".message");
    messages.forEach(function(msg) { if (msg.textContent.toLowerCase().includes(term)) { msg.style.display = "block"; } else { msg.style.display = "none"; } });
});

document.addEventListener("click", function(e) {
    if (!e.target.closest('.options-btn') && !e.target.closest('.options-menu')) {
        document.querySelectorAll(".options-menu").forEach(m => m.classList.remove("active"));
    }
});
