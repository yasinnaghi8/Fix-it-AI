document.addEventListener('DOMContentLoaded', () => {
    const userLang = navigator.language || navigator.userLanguage;
    const welcomeText = document.getElementById('welcomeText');
    const inputBox = document.getElementById('problemText');
    
    if (welcomeText && inputBox) {
        if (userLang.startsWith('tr')) {
            welcomeText.innerText = "Merhaba, bugün evinizdeki sorun nedir?";
            inputBox.placeholder = "Sorununuzu buraya yazın...";
            document.documentElement.dir = "ltr";
        } else if (!userLang.startsWith('ar')) {
            welcomeText.innerText = "Welcome, what is the problem in your home today?";
            inputBox.placeholder = "Type your problem here...";
            document.documentElement.dir = "ltr";
        }
    }

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
    const { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, getDoc } = window.firebaseFunctions;
    const auth = window.firebaseAuth;
    const db = window.firebaseDb;
    const authError = document.getElementById('authError');

    const showError = (msg) => { 
        if(authError) {
            authError.textContent = msg; 
            authError.style.display = 'block'; 
        } else {
            alert(msg);
        }
    };

    onAuthStateChanged(auth, async (user) => {
        const authScreen = document.getElementById('authScreen');
        const mainContent = document.querySelector('.main-content');
        const sidebar = document.getElementById('sidebar');
        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');

        if (user) {
            currentUser = user;
            if (authScreen) authScreen.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';
            if (sidebar) sidebar.style.display = 'flex';
            if (userInfo) userInfo.classList.remove('hidden');
            if (userEmail) userEmail.textContent = user.email;
            
            await loadChatHistory(user.uid);
            createNewChat();
        } else {
            currentUser = null;
            if (authScreen) authScreen.style.display = 'flex';
            if (mainContent) mainContent.style.display = 'none';
            if (sidebar) sidebar.style.display = 'none';
            if (userInfo) userInfo.classList.add('hidden');
        }
    });

    // أزرار الدخول
    const googleBtn = document.getElementById('googleSignInBtn');
    if(googleBtn) googleBtn.addEventListener('click', () => {
        signInWithPopup(auth, new GoogleAuthProvider()).catch(err => showError(err.message));
    });

    const emailSignInBtn = document.getElementById('emailSignInBtn');
    if(emailSignInBtn) emailSignInBtn.addEventListener('click', () => {
        signInWithEmailAndPassword(auth, document.getElementById('authEmail').value, document.getElementById('authPassword').value).catch(err => showError(err.message));
    });

    const emailSignUpBtn = document.getElementById('emailSignUpBtn');
    if(emailSignUpBtn) emailSignUpBtn.addEventListener('click', () => {
        createUserWithEmailAndPassword(auth, document.getElementById('authEmail').value, document.getElementById('authPassword').value).catch(err => showError(err.message));
    });

    const forgotBtn = document.getElementById('forgotPasswordBtn');
    if(forgotBtn) forgotBtn.addEventListener('click', () => {
        const email = document.getElementById('authEmail').value;
        if (!email) return showError('اكتب الإيميل الأول.');
        sendPasswordResetEmail(auth, email).then(() => alert('تم إرسال رابط إعادة التعيين.')).catch(err => showError(err.message));
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));
    
    const newChatBtn = document.getElementById('newChatBtn');
    if(newChatBtn) newChatBtn.addEventListener('click', createNewChat);

    // إرسال الرسالة
    const diagnoseBtn = document.getElementById('btnDiagnose');
    if(diagnoseBtn) diagnoseBtn.addEventListener('click', async () => {
        const input = document.getElementById('problemText');
        const text = input.value.trim();
        if (!text || !currentUser) return;

        input.value = '';
        const welcomeLogo = document.getElementById('welcomeLogo');
        if(welcomeLogo) welcomeLogo.style.display = 'none';
        
        appendMessageToUI('user', text);
        
        // حفظ رسالة المستخدم
        await addDoc(collection(db, `user_chats/${currentChatId}/messages`), {
            role: "user", content: text, timestamp: new Date()
        });

        // التسمية التلقائية
        const chatDoc = await getDoc(doc(db, "user_chats", currentChatId));
        if (chatDoc.data() && chatDoc.data().title === "محادثة جديدة") {
            const newTitle = text.split(" ").slice(0, 4).join(" ") + "...";
            await updateDoc(doc(db, "user_chats", currentChatId), { title: newTitle });
            await loadChatHistory(currentUser.uid);
        }

        // رد البوت
        appendMessageToUI('assistant', "جاري التفكير...");
        const reply = await askGroqAI(text);
        const chatContainer = document.getElementById('chatContainer');
        if(chatContainer) chatContainer.lastElementChild.innerText = reply;

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
    const chatContainer = document.getElementById('chatContainer');
    if(chatContainer) chatContainer.innerHTML = '';
    
    const welcomeLogo = document.getElementById('welcomeLogo');
    if(welcomeLogo) welcomeLogo.style.display = 'block';
    
    await loadChatHistory(currentUser.uid);
}

async function loadChatHistory(uid) {
    const db = window.firebaseDb;
    const list = document.getElementById('chatHistoryList');
    if(!list) return;
    list.innerHTML = '';

    // هنبعت نجيب كل المحادثات ونفلترها في المتصفح لتجنب مشاكل القواعد
    const q = window.firebaseFunctions.query(window.firebaseFunctions.collection(db, "user_chats"));
    const querySnapshot = await window.firebaseFunctions.getDocs(q);
    
    let chats = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if(data.userId === uid) { // الفلترة هنا
            chats.push({ id: doc.id, ...data });
        }
    });
    
    chats.sort((a, b) => (b.isPinned === true) - (a.isPinned === true) || (b.createdAt ? b.createdAt.toMillis() : 0) - (a.createdAt ? a.createdAt.toMillis() : 0));

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
    if(!container) return;
    container.innerHTML = '';
    
    const welcomeLogo = document.getElementById('welcomeLogo');
    if(welcomeLogo) welcomeLogo.style.display = 'none';

    const q = window.firebaseFunctions.query(window.firebaseFunctions.collection(window.firebaseDb, `user_chats/${chatId}/messages`), window.firebaseFunctions.orderBy("timestamp", "asc"));
    const snap = await window.firebaseFunctions.getDocs(q);
    snap.forEach(doc => appendMessageToUI(doc.data().role, doc.data().content));
}

function appendMessageToUI(role, text) {
    const container = document.getElementById('chatContainer');
    if(!container) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    msgDiv.innerText = text;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}