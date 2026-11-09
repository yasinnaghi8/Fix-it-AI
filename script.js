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

    if (!savedName) { window.location.href = "auth.html"; return; }
    
    if (nameSpan) nameSpan.textContent = savedName;
    if (avatarImg && savedAvatar) avatarImg.src = savedAvatar;
    
    // في الموبايل نقفل السايدبار أول ما نفتح
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

// 4. دوال المحادثات
function loadHistory() {
    var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    var historyContainer = document.getElementById("chatHistory");
    historyContainer.innerHTML = "";
    
    // ترتيب المحادثات: المثبتة (Pin) فوق
    history.sort((a, b) => b.pinned - a.pinned);

    history.forEach(function(chat, index) {
        var div = document.createElement("div");
        div.className = "chat-item-container";
        
        // زرار الخيارات (3 نقط)
        var optBtn = document.createElement("button");
        optBtn.className = "options-btn";
        optBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>`;
        optBtn.onclick = function(e) { e.stopPropagation(); toggleMenu(e, index); };

        // منيو الخيارات
        var menu = document.createElement("div");
        menu.className = "options-menu";
        menu.id = "menu-" + index;
        menu.innerHTML = `
            <button class="opt-btn" onclick="pinChat(event, ${index})">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="#888" stroke-width="2" fill="none"><path d="M12 17v5M9 10.76V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4.76a2 2 0 0 0 .59 1.42l1.24 1.24A1 1 0 0 1 17 15H7a1 1 0 0 1-.83-1.58l1.24-1.24A2 2 0 0 0 9 10.76Z"/></svg>
                ${chat.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
            </button>
            <button class="opt-btn delete" onclick="askDelete(event, ${index})">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ff4757" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                حذف
            </button>
        `;

        // محتوى المحادثة
        var content = document.createElement("div");
        content.className = "chat-item-content";
        content.innerHTML = `
            <div class="chat-item-date">${chat.date}</div>
            <div class="chat-item-title">${chat.pinned ? '📌 ' : ''}${chat.title}</div>
        `;
        content.onclick = function() { openChat(index); };

        div.appendChild(optBtn);
        div.appendChild(content);
        div.appendChild(menu);
        historyContainer.appendChild(div);
    });
}

function toggleMenu(e, index) {
    var allMenus = document.querySelectorAll(".options-menu");
    allMenus.forEach(m => { if(m.id !== "menu-"+index) m.classList.remove("active"); });
    document.getElementById("menu-"+index).classList.toggle("active");
}

function openChat(index) {
    var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    history.sort((a, b) => b.pinned - a.pinned);
    chatContainer.innerHTML = history[index].content;
    welcomeLogo.classList.add("started");
    isChatStarted = true;
    currentChatIndex = index;
    if (window.innerWidth < 768) sidebar.classList.add("collapsed");
}

function pinChat(e, index) {
    e.stopPropagation();
    var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    history.sort((a, b) => b.pinned - a.pinned);
    history[index].pinned = !history[index].pinned;
    localStorage.setItem("chatHistory", JSON.stringify(history));
    loadHistory();
}

function askDelete(e, index) {
    e.stopPropagation();
    chatToDeleteIndex = index;
    document.getElementById("deleteModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("deleteModal").style.display = "none";
}

function confirmDelete() {
    var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    history.sort((a, b) => b.pinned - a.pinned);
    history.splice(chatToDeleteIndex, 1);
    localStorage.setItem("chatHistory", JSON.stringify(history));
    closeModal();
    loadHistory();
    if (currentChatIndex === chatToDeleteIndex) {
        newChatBtn.click();
    }
}

// 5. إرسال الرسالة + جلب عنوان ذكي
btnDiagnose.addEventListener("click", async function() {
    var userText = problemText.value.trim();
    if (!userText) return;

    addMessage(userText, "user"); 
    problemText.value = ""; 
    problemText.style.height = "auto";
    var aiMsgDiv = addMessage("", "ai");
    
    if (currentChatIndex === -1) {
        var dateStr = new Date().toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
        // عنوان مؤقت لحد ما الذكاء الاصطناعي يرد
        history.unshift({ title: "جاري التلخيص...", date: dateStr, content: "", pinned: false });
        localStorage.setItem("chatHistory", JSON.stringify(history));
        currentChatIndex = 0; 
        loadHistory();
    }

    var aiAnswer = await askGroqAI(userText);
    if (!aiAnswer) { aiAnswer = "حدث خطأ، تأكد من الاتصال."; }
    
    await typeWriter(aiMsgDiv, aiAnswer, 15);
    
    var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    history.sort((a, b) => b.pinned - a.pinned);
    
    if(history[currentChatIndex]) {
        history[currentChatIndex].content = chatContainer.innerHTML;
        
        // لو العنوان لسه "جاري التلخيص"، نطلب من الذكاء الاصطناعي يلخص
        if (history[currentChatIndex].title === "جاري التلخيص...") {
            var summaryPrompt = "لخص هذه المشكلة في 3 كلمات كحد أقصى لتكون عنوان للمحادثة، بدون أي زخرفة: " + userText;
            var shortTitle = await askGroqAI(summaryPrompt);
            // تنظيف النص من أي علامات تنصيص
            history[currentChatIndex].title = shortTitle.replace(/["']/g, "").substring(0, 30);
        }
        
        localStorage.setItem("chatHistory", JSON.stringify(history));
        loadHistory();
    }
});

// منع القائمة من الاختفاء عند الدوس في أي مكان
document.addEventListener("click", function(e) {
    if (!e.target.closest('.options-btn') && !e.target.closest('.options-menu')) {
        document.querySelectorAll(".options-menu").forEach(m => m.classList.remove("active"));
    }
});