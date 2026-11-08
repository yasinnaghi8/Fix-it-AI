// التعديل الجديد: كود قراءة اسم المستخدم وتسجيل الخروج
document.addEventListener("DOMContentLoaded", function() {
    var savedName = localStorage.getItem("userName");
    var nameSpan = document.getElementById("sidebarUserName");
    var avatarImg = document.getElementById("userAvatar");
    
    if (!savedName) {
        window.location.href = "auth.html"; // لو مفيش تسجيل دخول يروح للصفحة
        return;
    }
    if (nameSpan) nameSpan.textContent = savedName;
    if (avatarImg) avatarImg.src = "https://ui-avatars.com/api/?name=" + savedName + "&background=00b894&color=fff";
});

function logout() {
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    window.location.href = "auth.html";
}

// الكود الأصلي بتاعك من هنا زي ما هو بالظبط
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

toggleSidebar.addEventListener("click", function() { sidebar.classList.toggle("collapsed"); });
searchBtn.addEventListener("click", function() { searchContainer.classList.toggle("hidden"); if (!searchContainer.classList.contains("hidden")) { searchInput.focus(); } });
newChatBtn.addEventListener("click", function() {
    chatContainer.innerHTML = ""; welcomeLogo.classList.remove("started"); isChatStarted = false;
    sidebar.classList.remove("collapsed"); searchContainer.classList.add("hidden");
    searchInput.value = ""; problemText.value = ""; problemText.style.height = "auto";
});
searchInput.addEventListener("input", function(e) {
    var term = e.target.value.toLowerCase();
    var messages = chatContainer.querySelectorAll(".message");
    messages.forEach(function(msg) { if (msg.textContent.toLowerCase().includes(term)) { msg.style.display = "block"; } else { msg.style.display = "none"; } });
});
function addMessage(text, type) {
    if (!isChatStarted) { welcomeLogo.classList.add("started"); sidebar.classList.add("collapsed"); isChatStarted = true; }
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
btnDiagnose.addEventListener("click", async function() {
    var userText = problemText.value.trim();
    if (!userText) return;
    addMessage(userText, "user"); problemText.value = ""; problemText.style.height = "auto";
    var aiMsgDiv = addMessage("", "ai");
    var aiAnswer = await askGroqAI(userText);
    if (!aiAnswer) { aiAnswer = "حدث خطأ، تأكد من الاتصال."; }
    await typeWriter(aiMsgDiv, aiAnswer, 15);
});
problemText.addEventListener("input", function() { this.style.height = "auto"; this.style.height = (this.scrollHeight) + "px"; });
problemText.addEventListener("keydown", function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); btnDiagnose.click(); } });