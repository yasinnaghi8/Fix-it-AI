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

var isChatStarted = false;
var currentChatIndex = -1; // عشان نعرف إحنا بنكتب في أنهي محادثة

// 1. تشغيل أول ما الصفحة تفتح
document.addEventListener("DOMContentLoaded", function() {
    var savedName = localStorage.getItem("userName");
    var nameSpan = document.getElementById("sidebarUserName");
    var avatarImg = document.getElementById("userAvatar");

    if (!savedName) {
        window.location.href = "auth.html"; // لو مفيش تسجيل دخول
        return;
    }
    
    if (nameSpan) nameSpan.textContent = savedName;
    if (avatarImg) avatarImg.src = "https://ui-avatars.com/api/?name=" + savedName + "&background=00b894&color=fff";
    
    loadHistory(); // تحميل المحادثات القديمة
});

// 2. تسجيل الخروج
function logout() {
    localStorage.removeItem("userName");
    window.location.href = "auth.html";
}

// 3. دوال حفظ وعرض المحادثات
function loadHistory() {
    var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    var historyContainer = document.getElementById("chatHistory");
    historyContainer.innerHTML = "";
    
    history.forEach(function(chat, index) {
        var div = document.createElement("div");
        div.style.cssText = "background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; cursor: pointer; font-size: 13px; border: 1px solid var(--glass-border); transition: 0.3s;";
        
        // عرض التاريخ فوق العنوان
        div.innerHTML = `
            <div style="color: #00b894; font-size: 10px; margin-bottom: 4px;">${chat.date}</div>
            <div style="color: white; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${chat.title}</div>
        `;
        
        div.onclick = function() { openChat(index); };
        historyContainer.appendChild(div);
    });
}

function openChat(index) {
    var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    var chat = history[index];
    chatContainer.innerHTML = chat.content;
    welcomeLogo.classList.add("started");
    isChatStarted = true;
    currentChatIndex = index;
    
    // على الموبايل نقفل السايدبار بعد ما نختار محادثة
    if (window.innerWidth < 768) {
        sidebar.classList.add("collapsed");
    }
}

// 4. أزرار التحكم الأساسية
toggleSidebar.addEventListener("click", function() { sidebar.classList.toggle("collapsed"); });
searchBtn.addEventListener("click", function() { searchContainer.classList.toggle("hidden"); if (!searchContainer.classList.contains("hidden")) { searchInput.focus(); } });

newChatBtn.addEventListener("click", function() {
    chatContainer.innerHTML = ""; 
    welcomeLogo.classList.remove("started"); 
    isChatStarted = false;
    currentChatIndex = -1; // محادثة جديدة
    sidebar.classList.remove("collapsed"); 
    searchContainer.classList.add("hidden");
    searchInput.value = ""; 
    problemText.value = ""; 
    problemText.style.height = "auto";
});

searchInput.addEventListener("input", function(e) {
    var term = e.target.value.toLowerCase();
    var messages = chatContainer.querySelectorAll(".message");
    messages.forEach(function(msg) { if (msg.textContent.toLowerCase().includes(term)) { msg.style.display = "block"; } else { msg.style.display = "none"; } });
});

// 5. دوال إضافة الرسائل
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

// 6. إرسال الرسالة (مع الحفظ)
btnDiagnose.addEventListener("click", async function() {
    var userText = problemText.value.trim();
    if (!userText) return;

    addMessage(userText, "user"); 
    problemText.value = ""; 
    problemText.style.height = "auto";
    var aiMsgDiv = addMessage("", "ai");
    
    // لو دي محادثة جديدة، بنسجلها في القائمة
    if (currentChatIndex === -1) {
        var title = userText.substring(0, 25) + (userText.length > 25 ? "..." : "");
        var dateStr = new Date().toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        
        var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
        history.unshift({ title: title, date: dateStr, content: "" });
        localStorage.setItem("chatHistory", JSON.stringify(history));
        currentChatIndex = 0; // أول عنصر في القائمة
        loadHistory(); // تحديث القائمة الجانبية
    }

    var aiAnswer = await askGroqAI(userText);
    if (!aiAnswer) { aiAnswer = "حدث خطأ، تأكد من الاتصال."; }
    
    await typeWriter(aiMsgDiv, aiAnswer, 15);
    
    // بعد ما الذكاء الاصطناعي يرد، بنحفظ المحتوى بالكامل
    var history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    if(history[currentChatIndex]) {
        history[currentChatIndex].content = chatContainer.innerHTML;
        localStorage.setItem("chatHistory", JSON.stringify(history));
    }
});

problemText.addEventListener("input", function() { this.style.height = "auto"; this.style.height = (this.scrollHeight) + "px"; });
problemText.addEventListener("keydown", function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); btnDiagnose.click(); } });