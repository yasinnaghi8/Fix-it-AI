var chatContainer = document.getElementById("chatContainer");
var welcomeLogo = document.getElementById("welcomeLogo");
var sidebar = document.getElementById("sidebar");
var toggleSidebar = document.getElementById("toggleSidebar");
var openSidebarBtn = document.getElementById("openSidebarBtn");
var searchBtn = document.getElementById("searchBtn");
var newChatBtn = document.getElementById("newChatBtn");
var searchContainer = document.getElementById("searchContainer");
var searchInput = document.getElementById("searchInput");
var btnDiagnose = document.getElementById("btnDiagnose");
var problemText = document.getElementById("problemText");

var isChatStarted = false;
var currentChatIndex = -1;
var chatToDeleteIndex = -1;

// 1. تشغيل أول ما الصفحة تفتح
document.addEventListener("DOMContentLoaded", function() {
    var savedName = localStorage.getItem("userName");
    var savedAvatar = localStorage.getItem("userAvatar");
    var nameSpan = document.getElementById("sidebarUserName");
    var avatarImg = document.getElementById("userAvatar");

    if (!savedName) { 
        window.location.href = "auth.html"; 
        return; 
    }
    
    if (nameSpan) nameSpan.textContent = savedName;
    if (avatarImg && savedAvatar) avatarImg.src = savedAvatar;
    
    if (window.innerWidth < 768) sidebar.classList.add("collapsed");

    loadHistory();
});

// 2. التحكم في السايدبار
toggleSidebar.addEventListener("click", function() { sidebar.classList.add("collapsed"); });
openSidebarBtn.addEventListener("click", function() { sidebar.classList.remove("collapsed"); });

// 3. تسجيل الخروج
function logout() {
    localStorage.removeItem("userName");
    localStorage.removeItem("userAvatar");
    window.location.href = "auth.html";
}

// ==========================================
// 4. دوال عرض المحادثات (المثبتة والعادية)
// ==========================================
function loadHistory() {
    var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    var pinnedContainer = document.getElementById("pinnedChatHistory");
    var regularContainer = document.getElementById("chatHistory");
    var pinnedSection = document.getElementById("pinnedChatsSection");
    
    // تنظيف القوائم قبل الرسم
    pinnedContainer.innerHTML = "";
    regularContainer.innerHTML = "";
    
    // فصل المحادثات
    var pinnedChats = history.filter(chat => chat.pinned);
    var regularChats = history.filter(chat => !chat.pinned);

    // إظهار أو إخفاء قسم المثبتين
    if (pinnedChats.length > 0) {
        pinnedSection.style.display = "flex";
    } else {
        pinnedSection.style.display = "none";
    }

    // دالة مساعدة لرسم المحادثة
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
        var pinIcon = chat.pinned ? '📌 ' : '';
        
        content.innerHTML = `
            <div class="chat-item-date">${chat.date}</div>
            <div class="chat-item-title">${pinIcon}${chat.title}</div>
        `;
        content.onclick = function() { openChat(originalIndex); };

        div.appendChild(optBtn);
        div.appendChild(content);
        div.appendChild(menu);
        return div;
    }

    // رسم المحادثات المثبتة
    pinnedChats.forEach(chat => {
        var idx = history.findIndex(c => c.date === chat.date && c.title === chat.title);
        pinnedContainer.appendChild(renderChatItem(chat, idx));
    });
    
    // رسم المحادثات العادية
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
    welcomeLogo.classList.add("started");
    isChatStarted = true;
    currentChatIndex = originalIndex;
    if (window.innerWidth < 768) sidebar.classList.add("collapsed");
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

// ==========================================
// 5. دوال الشات والرسائل
// ==========================================
function addMessage(text, type) {
    if (!isChatStarted) { 
        welcomeLogo.classList.add("started"); 
        sidebar.classList.add("collapsed"); 
        isChatStarted = true; 
    }
    var msgDiv = document.createElement("div");
    msgDiv.classList.add("message", type === "user" ? "user-msg" : "ai-msg");
    msgDiv.textContent = text;
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return msgDiv;
}

function typeWriter(element, text, speed = 10) {
    element.innerHTML = ""; element.classList.add("typing"); let i = 0;
    return new Promise(function(resolve) {
        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i); i++;
                var isBottom = chatContainer.scrollHeight - chatContainer.clientHeight <= chatContainer.scrollTop + 50;
                if (isBottom) { chatContainer.scrollTop = chatContainer.scrollHeight; }
                setTimeout(type, speed);
            } else { element.classList.remove("typing"); resolve(); }
        }
        type();
    });
}

// زرار الإرسال
btnDiagnose.addEventListener("click", async function() {
    var userText = problemText.value.trim();
    if (!userText) return;

    addMessage(userText, "user"); 
    problemText.value = ""; 
    problemText.style.height = "auto";
    var aiMsgDiv = addMessage("", "ai");
    
    // لو محادثة جديدة، نضيفها للـ LocalStorage
    if (currentChatIndex === -1) {
        var dateStr = new Date().toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
        history.unshift({ title: "جاري التلخيص...", date: dateStr, content: "", pinned: false });
        localStorage.setItem("chatHistory", JSON.stringify(history));
        currentChatIndex = 0; 
        loadHistory();
    }

    var aiAnswer = await askGroqAI(userText);
    if (!aiAnswer) { aiAnswer = "حدث خطأ، تأكد من الاتصال."; }
    
    await typeWriter(aiMsgDiv, aiAnswer, 15);
    
    var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    
    if(history[currentChatIndex]) {
        history[currentChatIndex].content = chatContainer.innerHTML;
        
        // جلب عنوان ذكي من الذكاء الاصطناعي
        if (history[currentChatIndex].title === "جاري التلخيص...") {
            var summaryPrompt = "لخص هذه المشكلة في 3 كلمات كحد أقصى لتكون عنوان للمحادثة، بدون أي زخرفة: " + userText;
            var shortTitle = await askGroqAI(summaryPrompt);
            history[currentChatIndex].title = shortTitle.replace(/["']/g, "").substring(0, 30);
        }
        
        localStorage.setItem("chatHistory", JSON.stringify(history));
        loadHistory();
    }
});

// زرار الإنتر والإدخال
problemText.addEventListener("input", function() { this.style.height = "auto"; this.style.height = (this.scrollHeight) + "px"; });
problemText.addEventListener("keydown", function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); btnDiagnose.click(); } });

// زرار محادثة جديدة
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
});

// البحث
searchBtn.addEventListener("click", function() { searchContainer.classList.toggle("hidden"); if (!searchContainer.classList.contains("hidden")) { searchInput.focus(); } });
searchInput.addEventListener("input", function(e) {
    var term = e.target.value.toLowerCase();
    var messages = chatContainer.querySelectorAll(".message");
    messages.forEach(function(msg) { if (msg.textContent.toLowerCase().includes(term)) { msg.style.display = "block"; } else { msg.style.display = "none"; } });
});

// منع القائمة من الاختفاء عند الدوس في أي مكان
document.addEventListener("click", function(e) {
    if (!e.target.closest('.options-btn') && !e.target.closest('.options-menu')) {
        document.querySelectorAll(".options-menu").forEach(m => m.classList.remove("active"));
    }
});