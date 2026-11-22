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

async function askGroqAI(userInput, imageBase64 = null) {
    try {
        var payload = { message: userInput };
        if (imageBase64) { payload.image = imageBase64; }

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
var btnDiagnose = document.getElementById("btnDiagnose");
var problemText = document.getElementById("problemText");
var attachBtn = document.getElementById("attachBtn");
var attachmentMenu = document.getElementById("attachmentMenu");
var previewContainer = document.getElementById("previewContainer");
var imageLightbox = document.getElementById("imageLightbox");
var lightboxImg = document.getElementById("lightboxImg");
var sidebarBtnTop = document.getElementById("sidebarBtnTop");
var scrollToBottomBtn = document.getElementById("scrollToBottomBtn");
var headerChatTitle = document.getElementById("headerChatTitle");

var searchBtnTop = document.getElementById("searchBtnTop");
var newChatBtnTop = document.getElementById("newChatBtnTop");
var renameModal = document.getElementById("renameModal");
var renameInput = document.getElementById("renameInput");
var searchModal = document.getElementById("searchModal");
var searchInputModal = document.getElementById("searchInputModal");
var searchResultMsg = document.getElementById("searchResultMsg");
var searchBanner = document.getElementById("searchBanner");
var searchBannerText = document.getElementById("searchBannerText");
var deleteModal = document.getElementById("deleteModal");
var deleteChatName = document.getElementById("deleteChatName");

var isChatStarted = false;
var currentChatIndex = -1;
var chatToDeleteIndex = -1;
var chatToRenameIndex = -1;
var attachedFiles = []; 
var currentUserUID = null;
var userChats = []; 


var mobileMQ = window.matchMedia("(max-width: 768px)");

function syncLayoutState() {
    document.body.classList.toggle("sidebar-closed", sidebar.classList.contains("collapsed"));
    document.body.classList.toggle("chat-started", isChatStarted);
}

function setSidebarCollapsed(collapsed) {
    sidebar.classList.toggle("collapsed", collapsed);
    syncLayoutState();
}

function setChatStarted(started) {
    isChatStarted = started;
    welcomeLogo.classList.toggle("started", started);
    syncLayoutState();
}


if (mobileMQ.matches) { sidebar.classList.add("collapsed"); }
syncLayoutState();

document.addEventListener("DOMContentLoaded", function() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserUID = user.uid;
            document.getElementById("sidebarUserName").textContent = user.displayName || "مستخدم";
            if (user.photoURL) document.getElementById("userAvatar").src = user.photoURL;
            loadHistory();
        } else {
            window.location.href = "auth.html";
        }
    });
});

toggleSidebar.addEventListener("click", function() {
    setSidebarCollapsed(!sidebar.classList.contains("collapsed"));
});
sidebarBtnTop.addEventListener("click", function() {
    setSidebarCollapsed(false);
});

window.logout = function() {
    signOut(auth).then(() => {
        localStorage.removeItem("userName");
        localStorage.removeItem("userAvatar");
        window.location.href = "auth.html";
    });
}


function openSearchModal() {
    if (mobileMQ.matches) { setSidebarCollapsed(true); }
    searchResultMsg.textContent = "";
    searchModal.style.display = "flex";
    searchInputModal.focus();
}
searchBtn.addEventListener("click", openSearchModal);
searchBtnTop.addEventListener("click", openSearchModal);

function clearSearch() {
    chatContainer.querySelectorAll(".message").forEach(function(msg) {
        msg.classList.remove("search-hit", "search-hidden");
    });
    searchBanner.classList.add("hidden");
}
window.clearSearch = clearSearch;

window.executeSearch = function() {
    var term = searchInputModal.value.trim();
    if (!term) { searchResultMsg.textContent = "اكتب كلمة للبحث"; return; }

    var messages = chatContainer.querySelectorAll(".message");
    if (messages.length === 0) { searchResultMsg.textContent = "ابدأ محادثة الأول وبعدين ابحث فيها"; return; }

    var lowered = term.toLowerCase();
    var hits = [];
    messages.forEach(function(msg) {
        if (msg.textContent.toLowerCase().includes(lowered)) {
            msg.classList.remove("search-hidden");
            msg.classList.add("search-hit");
            hits.push(msg);
        } else {
            msg.classList.remove("search-hit");
            msg.classList.add("search-hidden");
        }
    });

    if (hits.length === 0) {
        clearSearch();
        searchResultMsg.textContent = "مفيش نتايج للكلمة دي";
        return;
    }

    searchBannerText.textContent = "نتائج البحث عن «" + term + "»: " + hits.length;
    searchBanner.classList.remove("hidden");
    closeSearchModal();
    hits[0].scrollIntoView({ block: "center" });
}

window.closeSearchModal = function() {
    searchModal.style.display = "none";
    searchInputModal.value = "";
    searchResultMsg.textContent = "";
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
        }
        
        previewContainer.appendChild(previewDiv);
    }
    
    event.target.value = '';
}

document.getElementById('cameraInput').addEventListener('change', handleFileSelect);
document.getElementById('imageInput').addEventListener('change', handleFileSelect);

window.removeFile = function(fileId) {
    var previewDiv = document.getElementById(fileId);
    if (previewDiv) {
        previewDiv.remove();
    }
    attachedFiles = attachedFiles.filter(function(item) { return item.id !== fileId; });
}

window.openLightbox = function(imgSrc) {
    lightboxImg.src = imgSrc;
    imageLightbox.classList.add("active");
}

window.closeLightbox = function(e) {
    if(e) e.stopPropagation();
    imageLightbox.classList.remove("active");
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
            <button class="opt-btn" onclick="openRenameModal(event, '${chat.id}')">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="#888" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                إعادة تسمية
            </button>
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
        content.onclick = function() { window.openChat(chat); };

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
    clearSearch();
    chatContainer.innerHTML = chat.content;
    var aiMsgs = chatContainer.querySelectorAll('.ai-msg');
    aiMsgs.forEach(msg => {
        if(!msg.querySelector('p') && msg.textContent.length > 0) {
            msg.innerHTML = marked.parse(msg.textContent);
        }
    });

    setChatStarted(true);
    currentChatIndex = chat.id;
    headerChatTitle.textContent = chat.title;

    if (mobileMQ.matches) {
        setSidebarCollapsed(true);
    }
}

window.openRenameModal = function(e, chatId) {
    e.stopPropagation();
    chatToRenameIndex = chatId;
    var chat = userChats.find(c => c.id === chatId);
    if (chat) renameInput.value = chat.title;
    renameModal.style.display = "flex";
    renameInput.focus();
    renameInput.select();
    document.querySelectorAll(".options-menu").forEach(m => m.classList.remove("active"));
}

window.submitRename = async function() {
    var newTitle = renameInput.value.trim();
    if (newTitle !== "") {
        try {
            await setDoc(doc(db, "users", currentUserUID, "chats", chatToRenameIndex), { title: newTitle }, { merge: true });
            loadHistory();
            if (currentChatIndex === chatToRenameIndex) {
                headerChatTitle.textContent = newTitle;
            }
        } catch (error) { console.error(error); }
    }
    closeRenameModal();
}

window.closeRenameModal = function() {
    renameModal.style.display = "none";
    renameInput.value = "";
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
    var chat = userChats.find(c => c.id === chatId);
    deleteChatName.textContent = chat ? chat.title : "";
    deleteModal.style.display = "flex";
    document.querySelectorAll(".options-menu").forEach(m => m.classList.remove("active"));
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
        startNewChat();
    }
}

function addMessage(text, type, imageSrc = null) {
    if (!isChatStarted) { setChatStarted(true); }
    var msgDiv = document.createElement("div");
    msgDiv.classList.add("message", type === "user" ? "user-msg" : "ai-msg");
    
    if (imageSrc) {
        var img = document.createElement("img");
        img.src = imageSrc;
        img.style.maxWidth = "150px"; 
        img.style.borderRadius = "8px";
        img.style.marginBottom = "8px";
        img.style.display = "block";
        img.style.cursor = "pointer";
        img.onclick = function() { window.openLightbox(imageSrc); };
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
    element.innerHTML = ""; 
    element.classList.add("typing"); 
    let i = 0;
    let currentText = "";
    
    return new Promise(function(resolve) {
        function type() {
            if (i < text.length) {
                currentText += text.charAt(i); 
                i++;
                element.innerHTML = marked.parse(currentText);
                var isBottom = chatContainer.scrollHeight - chatContainer.clientHeight <= chatContainer.scrollTop + 50;
                if (isBottom) { chatContainer.scrollTop = chatContainer.scrollHeight; }
                setTimeout(type, speed);
            } else { 
                element.classList.remove("typing"); 
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

    clearSearch();
    addMessage(finalMessage, "user", imageDataUrl); 
    problemText.value = ""; 
    problemText.style.height = "auto";
    
    previewContainer.innerHTML = "";
    attachedFiles = [];

    var aiMsgDiv = addMessage("", "ai");
    
    var neonRing = document.createElement("div");
    neonRing.className = "loading-neon-ring active";
    aiMsgDiv.appendChild(neonRing);

    if (currentChatIndex === -1) {
        var dateStr = new Date().toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        var newChatId = Date.now().toString();
        var newChatData = { title: "محادثة جديدة", date: dateStr, content: "", pinned: false, timestamp: Date.now() };
        
        try {
            await setDoc(doc(db, "users", currentUserUID, "chats", newChatId), newChatData);
            currentChatIndex = newChatId;
            headerChatTitle.textContent = "محادثة جديدة";
            loadHistory();
        } catch (e) { console.error(e); }
    }

    var aiAnswer = await askGroqAI(finalMessage, imageDataUrl);
    
    if (!aiAnswer) { aiAnswer = "حدث خطأ، تأكد من الاتصال."; }
    
    await typeWriter(aiMsgDiv, aiAnswer, 10);
    
    neonRing.classList.remove("active");
    neonRing.remove();

    if(currentChatIndex !== -1) {
        var currentContent = chatContainer.innerHTML;
        var currentChat = userChats.find(c => c.id === currentChatIndex);
        var updateData = { content: currentContent };
        
        if (currentChat && currentChat.title === "محادثة جديدة") {
            var summaryPrompt = "لخص هذه المشكلة في 3 كلمات كحد أقصى لتكون عنوان للمحادثة، بدون أي زخرفة: " + (userText || "مرفقات");
            var shortTitle = await askGroqAI(summaryPrompt);
            updateData.title = shortTitle.replace(/["']/g, "").substring(0, 30);
            headerChatTitle.textContent = updateData.title;
        }
        
        try {
            await setDoc(doc(db, "users", currentUserUID, "chats", currentChatIndex), updateData, { merge: true });
            loadHistory();
        } catch (e) { console.error(e); }
    }
});

problemText.addEventListener("input", function() { this.style.height = "auto"; this.style.height = (this.scrollHeight) + "px"; });
problemText.addEventListener("keydown", function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); btnDiagnose.click(); } });

function startNewChat() {
    clearSearch();
    chatContainer.innerHTML = "";
    setChatStarted(false);
    currentChatIndex = -1;
    problemText.value = "";
    problemText.style.height = "auto";
    previewContainer.innerHTML = "";
    attachedFiles = [];
    headerChatTitle.textContent = "محادثة جديدة";
    if (mobileMQ.matches) { setSidebarCollapsed(true); }
}

newChatBtn.addEventListener("click", startNewChat);
newChatBtnTop.addEventListener("click", startNewChat);

chatContainer.addEventListener("scroll", function() {
    var isAtBottom = chatContainer.scrollHeight - chatContainer.clientHeight <= chatContainer.scrollTop + 50;
    if (isAtBottom) {
        scrollToBottomBtn.classList.add("hidden");
    } else {
        scrollToBottomBtn.classList.remove("hidden");
    }
});

scrollToBottomBtn.addEventListener("click", function() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
});

document.addEventListener("click", function(e) {
    if (!e.target.closest('.options-btn') && !e.target.closest('.options-menu')) {
        document.querySelectorAll(".options-menu").forEach(m => m.classList.remove("active"));
    }
});

window.editChatTitleFromHeader = function() {
    if (currentChatIndex !== -1) {
        var chat = userChats.find(c => c.id === currentChatIndex);
        if (chat) {
            chatToRenameIndex = currentChatIndex;
            renameInput.value = chat.title;
            renameModal.style.display = "flex";
            renameInput.focus();
            renameInput.select();
        }
    }
}


renameInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter") { e.preventDefault(); submitRename(); }
});
searchInputModal.addEventListener("keydown", function(e) {
    if (e.key === "Enter") { e.preventDefault(); executeSearch(); }
});
document.addEventListener("keydown", function(e) {
    if (e.key !== "Escape") return;
    closeRenameModal();
    closeSearchModal();
    closeModal();
    closeLightbox();
});
[[renameModal, closeRenameModal], [searchModal, closeSearchModal], [deleteModal, closeModal]].forEach(function(pair) {
    pair[0].addEventListener("click", function(e) { if (e.target === pair[0]) pair[1](); });
});
