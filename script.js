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

document.addEventListener("DOMContentLoaded", function() {
    var savedName = localStorage.getItem("userName");
    var savedAvatar = localStorage.getItem("userAvatar");
    var nameSpan = document.getElementById("sidebarUserName");
    var avatarImg = document.getElementById("userAvatar");

    if (!savedName) { window.location.href = "auth.html"; return; }
    
    if (nameSpan) nameSpan.textContent = savedName;
    if (avatarImg && savedAvatar) avatarImg.src = savedAvatar;
    
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

function logout() {
    localStorage.removeItem("userName");
    localStorage.removeItem("userAvatar");
    window.location.href = "auth.html";
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

function triggerInput(type) {
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

function removeFile(fileId) {
    var previewDiv = document.getElementById(fileId);
    if (previewDiv) {
        previewDiv.remove();
    }
    attachedFiles = attachedFiles.filter(function(item) { return item.id !== fileId; });
}

function loadHistory() {
    var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    var pinnedContainer = document.getElementById("pinnedChatHistory");
    var regularContainer = document.getElementById("chatHistory");
    var pinnedSection = document.getElementById("pinnedChatsSection");
    
    pinnedContainer.innerHTML = "";
    regularContainer.innerHTML = "";
    
    var pinnedChats = history.filter(chat => chat.pinned);
    var regularChats = history.filter(chat => !chat.pinned);

    if (pinnedChats.length > 0) {
        pinnedSection.style.display = "flex";
    } else {
        pinnedSection.style.display = "none";
    }

    function renderChatItem(chat, originalIndex) {
        var div = document.createElement("div");
        div.className = "chat-item-container";
        
        var optBtn = document.createElement("button");
        optBtn.className = "options-btn";
        optBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>`;
        optBtn.onclick = function(e) { e.stopPropagation(); toggleMenu(e, originalIndex); };

        var menu = document.createElement("div");
        menu.className = "options-menu";
        menu.id = "menu-" + originalIndex;
        menu.innerHTML = `
            <button class="opt-btn" onclick="pinChat(event, ${originalIndex})">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="#888" stroke-width="2" fill="none"><path d="M12 17v5M9 10.76V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4.76a2 2 0 0 0 .59 1.42l1.24 1.24A1 1 0 0 1 17 15H7a1 1 0 0 1-.83-1.58l1.24-1.24A2 2 0 0 0 9 10.76Z"/></svg>
                ${chat.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
            </button>
            <button class="opt-btn delete" onclick="askDelete(event, ${originalIndex})">
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
        content.onclick = function() { openChat(originalIndex); };

        div.appendChild(optBtn);
        div.appendChild(content);
        div.appendChild(menu);
        return div;
    }

    pinnedChats.forEach(chat => {
        var idx = history.findIndex(c => c.date === chat.date && c.title === chat.title);
        pinnedContainer.appendChild(renderChatItem(chat, idx));
    });
    
    regularChats.forEach(chat => {
        var idx = history.findIndex(c => c.date === chat.date && c.title === chat.title);
        regularContainer.appendChild(renderChatItem(chat, idx));
    });
}

function toggleMenu(e, index) {
    var allMenus = document.querySelectorAll(".options-menu");
    allMenus.forEach(m => { if(m.id !== "menu-"+index) m.classList.remove("active"); });
    document.getElementById("menu-"+index).classList.toggle("active");
}

function openChat(originalIndex) {
    var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    chatContainer.innerHTML = history[originalIndex].content;
    
    var aiMsgs = chatContainer.querySelectorAll('.ai-msg');
    aiMsgs.forEach(msg => {
        if(!msg.querySelector('p') && msg.textContent.length > 0) {
            msg.innerHTML = marked.parse(msg.textContent);
        }
    });

    welcomeLogo.classList.add("started");
    isChatStarted = true;
    currentChatIndex = originalIndex;
    
    if (window.innerWidth < 768) {
        sidebar.classList.add("collapsed");
        if (openBtn) openBtn.style.display = "flex";
    }
}

function pinChat(e, originalIndex) {
    e.stopPropagation();
    var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    history[originalIndex].pinned = !history[originalIndex].pinned;
    localStorage.setItem("chatHistory", JSON.stringify(history));
    loadHistory();
    document.querySelectorAll(".options-menu").forEach(m => m.classList.remove("active"));
}

function askDelete(e, originalIndex) {
    e.stopPropagation();
    chatToDeleteIndex = originalIndex;
    document.getElementById("deleteModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("deleteModal").style.display = "none";
}

function confirmDelete() {
    var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    history.splice(chatToDeleteIndex, 1);
    localStorage.setItem("chatHistory", JSON.stringify(history));
    closeModal();
    loadHistory();
    if (currentChatIndex === chatToDeleteIndex) {
        newChatBtn.click();
    }
}

function addMessage(text, type) {
    if (!isChatStarted) { 
        welcomeLogo.classList.add("started"); 
        sidebar.classList.add("collapsed"); 
        if(openBtn) openBtn.style.display = "flex";
        isChatStarted = true; 
    }
    var msgDiv = document.createElement("div");
    msgDiv.classList.add("message", type === "user" ? "user-msg" : "ai-msg");
    
    if(type === "ai") {
        msgDiv.innerHTML = marked.parse(text);
    } else {
        msgDiv.textContent = text;
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

    // إضافة نص بسيط يوضح إن فيه صورة لو المستخدم مش كاتب حاجة
    if (!finalMessage && imageDataUrl) {
        finalMessage = "شوف الصورة دي وقولي المشكلة إيه؟";
    }

    addMessage(finalMessage, "user"); 
    problemText.value = ""; 
    problemText.style.height = "auto";
    
    previewContainer.innerHTML = "";
    attachedFiles = [];

    var aiMsgDiv = addMessage("", "ai");
    
    if (currentChatIndex === -1) {
        var dateStr = new Date().toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
        history.unshift({ title: "جاري التلخيص...", date: dateStr, content: "", pinned: false });
        localStorage.setItem("chatHistory", JSON.stringify(history));
        currentChatIndex = 0; 
        loadHistory();
    }

    // بنبعت النص والصورة (لو موجودة) للسيرفر
    var aiAnswer = await askGroqAI(finalMessage, imageDataUrl);
    
    if (!aiAnswer) { aiAnswer = "حدث خطأ، تأكد من الاتصال."; }
    
    await typeWriter(aiMsgDiv, aiAnswer, 15);
    
    var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    
    if(history[currentChatIndex]) {
        history[currentChatIndex].content = chatContainer.innerHTML;
        
        if (history[currentChatIndex].title === "جاري التلخيص...") {
            var summaryPrompt = "لخص هذه المشكلة في 3 كلمات كحد أقصى لتكون عنوان للمحادثة، بدون أي زخرفة: " + (userText || "مرفقات");
            var shortTitle = await askGroqAI(summaryPrompt);
            history[currentChatIndex].title = shortTitle.replace(/["']/g, "").substring(0, 30);
        }
        
        localStorage.setItem("chatHistory", JSON.stringify(history));
        loadHistory();
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