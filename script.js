document.addEventListener('DOMContentLoaded', () => {
    // 1. إعدادات اللغة التلقائية
    const userLang = navigator.language || navigator.userLanguage;
    if (userLang.startsWith('tr')) {
        document.getElementById('welcomeText').innerText = "Merhaba, bugün evinizdeki sorun nedir?";
        document.getElementById('problemText').placeholder = "Sorununuzu buraya yazın...";
        document.documentElement.dir = "ltr";
        document.documentElement.lang = "tr";
    } else if (!userLang.startsWith('ar')) {
        document.getElementById('welcomeText').innerText = "Welcome, what is the problem in your home today?";
        document.getElementById('problemText').placeholder = "Type your problem here...";
        document.documentElement.dir = "ltr";
        document.documentElement.lang = "en";
    }

    // 2. تشغيل Firebase
    const checkFirebase = setInterval(() => {
        if (window.firebaseAuth && window.firebaseFunctions) {
            clearInterval(checkFirebase);
            initApp();
        }
    }, 100);
});

let currentUser = null;
let currentChatId = null;

function initApp() {
    const { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, getDoc, orderBy } = window.firebaseFunctions;
    const auth = window.firebaseAuth;
    const db = window.firebaseDb;
    const authError = document.getElementById('authError');

    const showError = (msg) => { authError.textContent = msg; authError.style.display = 'block'; };

    // مراقبة الدخول
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            document.getElementById('sidebar').style.display = 'flex';
            document.getElementById('userEmail').textContent = user.email;
            
            await loadChatHistory(user.uid);
            createNewChat();
        } else {
            currentUser = null;
            document.getElementById('authScreen').style.display = 'flex';
            document.getElementById('mainContent').style.display = 'none';
            document.getElementById('sidebar').style.display = 'none';
        }
    });

    // أزرار الدخول
    document.getElementById('googleSignInBtn').addEventListener('click', () => {
        signInWithPopup(auth, new GoogleAuthProvider()).catch(err => showError(err.message));
    });
    document.getElementById('emailSignInBtn').addEventListener('click', () => {
        signInWithEmailAndPassword(auth, document.getElementById('authEmail').value, document.getElementById('authPassword').value).catch(err => showError(err.message));
    });
    document.getElementById('emailSignUpBtn').addEventListener('click', () => {
        createUserWithEmailAndPassword(auth, document.getElementById('authEmail').value, document.getElementById('authPassword').value).catch(err => showError(err.message));
    });
    document.getElementById('forgotPasswordBtn').addEventListener('click', () => {
        const email = document.getElementById('authEmail').value;
        if (!email) return showError('اكتب الإيميل الأول.');
        sendPasswordResetEmail(auth, email).then(() => alert('تم إرسال رابط إعادة التعيين.')).catch(err => showError(err.message));
    });
    document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));
    
    // أزرار المحادثات
    document.getElementById('newChatBtn').addEventListener('click', createNewChat);

    // إرسال الرسالة
    document.getElementById('btnDiagnose').addEventListener('click', async () => {
        const input = document.getElementById('problemText');
        const text = input.value.trim();
        if (!text || !currentUser) return;

        input.value = '';
        document.getElementById('welcomeLogo').style.display = 'none';
        appendMessageToUI('user', text);
        
        // حفظ رسالة المستخدم
        await addDoc(collection(db, `user_chats/${currentChatId}/messages`), {
            role: "user", content: text, timestamp: new Date()
        });

        // تسمية تلقائية للمحادثة لو دي أول رسالة
        const chatDoc = await getDoc(doc(db, "user_chats", currentChatId));
        if (chatDoc.data().title === "محادثة جديدة") {
            const newTitle = text.split(" ").slice(0, 4).join(" ") + "...";
            await updateDoc(doc(db, "user_chats", currentChatId), { title: newTitle });
            await loadChatHistory(currentUser.uid);
        }

        // رد البوت
        appendMessageToUI('assistant', "جاري التفكير...");
        const reply = await askGroqAI(text);
        document.querySelector('.chat-container').lastElementChild.innerText = reply;

        // حفظ رد البوت
        await addDoc(collection(db, `user_chats/${currentChatId}/messages`), {
            role: "assistant", content: reply, timestamp: new Date()
        });
    });
}

async function createNewChat() {
    if (!currentUser) return;
    const db = window.firebaseDb;
    const docRef = await window.firebaseFunctions.addDoc(window.firebaseFunctions.collection(db, "user_chats"), {
        userId: currentUser.uid, title: "محادثة جديدة", createdAt: new Date(), isPinned: false
    });
    currentChatId = docRef.id;
    document.getElementById('chatContainer').innerHTML = '';
    document.getElementById('welcomeLogo').style.display = 'block';
    await loadChatHistory(currentUser.uid);
}

async function loadChatHistory(uid) {
    const db = window.firebaseDb;
    const list = document.getElementById('chatHistoryList');
    list.innerHTML = '';

    const q = window.firebaseFunctions.query(window.firebaseFunctions.collection(db, "user_chats"), window.firebaseFunctions.where("userId", "==", uid));
    const querySnapshot = await window.firebaseFunctions.getDocs(q);
    
    let chats = [];
    querySnapshot.forEach((doc) => chats.push({ id: doc.id, ...doc.data() }));
    chats.sort((a, b) => (b.isPinned === true) - (a.isPinned === true) || b.createdAt.toMillis() - a.createdAt.toMillis());

    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = 'chat-history-item';
        div.innerHTML = `
            <span class="chat-title">${chat.isPinned ? '📌 ' : ''}${chat.title}</span>
            <div class="chat-options">
                <button class="options-btn">⋮</button>
                <div class="dropdown-menu hidden">
                    <button onclick="renameChat('${chat.id}', '${chat.title}')">إعادة تسمية</button>
                    <button onclick="togglePinChat('${chat.id}', ${chat.isPinned})">${chat.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}</button>
                    <button onclick="deleteChat('${chat.id}')" style="color: #ff6b6b;">حذف</button>
                </div>
            </div>
        `;
        div.querySelector('.chat-title').addEventListener('click', () => openChat(chat.id));
        const optionsBtn = div.querySelector('.options-btn');
        const dropdown = div.querySelector('.dropdown-menu');
        optionsBtn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('hidden'); });
        list.appendChild(div);
    });
}

// دوال القائمة المنسدلة
window.renameChat = async (chatId, oldTitle) => {
    const newTitle = prompt("اسم المحادثة الجديد:", oldTitle);
    if (newTitle) {
        await window.firebaseFunctions.updateDoc(window.firebaseFunctions.doc(window.firebaseDb, "user_chats", chatId), { title: newTitle });
        await loadChatHistory(currentUser.uid);
    }
};
window.togglePinChat = async (chatId, isPinned) => {
    await window.firebaseFunctions.updateDoc(window.firebaseFunctions.doc(window.firebaseDb, "user_chats", chatId), { isPinned: !isPinned });
    await loadChatHistory(currentUser.uid);
};
window.deleteChat = async (chatId) => {
    if(confirm("متأكد إنك عايز تمسح المحادثة دي؟")) {
        await window.firebaseFunctions.deleteDoc(window.firebaseFunctions.doc(window.firebaseDb, "user_chats", chatId));
        createNewChat();
    }
};

async function openChat(chatId) {
    currentChatId = chatId;
    const container = document.getElementById('chatContainer');
    container.innerHTML = '';
    document.getElementById('welcomeLogo').style.display = 'none';

    const q = window.firebaseFunctions.query(window.firebaseFunctions.collection(window.firebaseDb, `user_chats/${chatId}/messages`), window.firebaseFunctions.orderBy("timestamp", "asc"));
    const snap = await window.firebaseFunctions.getDocs(q);
    snap.forEach(doc => appendMessageToUI(doc.data().role, doc.data().content));
}

function appendMessageToUI(role, text) {
    const container = document.getElementById('chatContainer');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    msgDiv.innerText = text;
    // خلي بالك: تأكد إن كلاسات .message .user .assistant موجودة في style.css بتاعك
    // لو مش موجودة، ممكن تحط ستايل inline هنا مؤقتاً
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}