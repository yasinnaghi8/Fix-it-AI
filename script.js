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
    const { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, collection, addDoc, query, getDocs, doc, updateDoc, getDoc, orderBy } = window.firebaseFunctions;
    const auth = window.firebaseAuth;
    const db = window.firebaseDb;
    const authError = document.getElementById('authError');

    const showError = (msg) => { 
        if(authError) { authError.textContent = msg; authError.style.display = 'block'; } 
    };

    onAuthStateChanged(auth, async (user) => {
        const authScreen = document.getElementById('authScreen');
        const appContent = document.getElementById('appContent');
        const userInfo = document.getElementById('userInfo');

        if (user) {
            currentUser = user;
            if (authScreen) authScreen.style.setProperty('display', 'none', 'important');
            if (appContent) appContent.style.display = 'block';
            if (userInfo) userInfo.classList.remove('hidden');
            
            // تحديث الصورة والاسم
            const avatarImg = document.getElementById('userAvatar');
            const nameDisplay = document.getElementById('userNameDisplay');
            if (avatarImg && user.photoURL) avatarImg.src = user.photoURL;
            if (nameDisplay) nameDisplay.textContent = user.displayName || user.email.split('@')[0];
            
            await loadChatHistory(user.uid);
            
            // لو مفيش محادثة مفتوحة، نبدأ واحدة جديدة أوتوماتيك
            if (!currentChatId) {
                await createNewChat();
            }
        } else {
            currentUser = null;
            currentChatId = null;
            if (authScreen) authScreen.style.setProperty('display', 'flex', 'important');
            if (appContent) appContent.style.display = 'none';
            if (userInfo) userInfo.classList.add('hidden');
        }
    });

    // أزرار الدخول
    document.getElementById('googleSignInBtn')?.addEventListener('click', () => {
        signInWithPopup(auth, new GoogleAuthProvider()).catch(err => showError(err.message));
    });
    document.getElementById('emailSignInBtn')?.addEventListener('click', () => {
        signInWithEmailAndPassword(auth, document.getElementById('authEmail').value, document.getElementById('authPassword').value).catch(err => showError(err.message));
    });
    document.getElementById('emailSignUpBtn')?.addEventListener('click', () => {
        createUserWithEmailAndPassword(auth, document.getElementById('authEmail').value, document.getElementById('authPassword').value).catch(err => showError(err.message));
    });
    document.getElementById('forgotPasswordBtn')?.addEventListener('click', () => {
        const email = document.getElementById('authEmail').value;
        if (!email) return showError('اكتب الإيميل الأول.');
        sendPasswordResetEmail(auth, email).then(() => alert('تم إرسال رابط إعادة التعيين.')).catch(err => showError(err.message));
    });
    document.getElementById('logoutBtn')?.addEventListener('click', () => signOut(auth));

    // زرار فتح وقفل الشريط الجانبي
    document.getElementById('toggleSidebar')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });

    // زرار محادثة جديدة
    document.getElementById('newChatBtn')?.addEventListener('click', createNewChat);

    // إرسال الرسالة
    document.getElementById('btnDiagnose')?.addEventListener('click', async () => {
        const input = document.getElementById('problemText');
        const text = input.value.trim();
        if (!text || !currentUser) return;

        input.value = '';
        document.getElementById('welcomeLogo').style.display = 'none';
        document.getElementById('chatHeader').style.display = 'block';
        
        appendMessageToUI('user', text);
        
        await addDoc(collection(db, `user_chats/${currentChatId}/messages`), {
            role: "user", content: text, timestamp: new Date()
        });

        // التسمية التلقائية للمحادثة
        const chatDoc = await getDoc(doc(db, "user_chats", currentChatId));
        if (chatDoc.exists() && chatDoc.data().title === "محادثة جديدة") {
            const newTitle = text.split(" ").slice(0, 4).join(" ") + "...";
            await updateDoc(doc(db, "user_chats", currentChatId), { title: newTitle });
            document.getElementById('chatHeader').innerText = newTitle; // تحديث العنوان فوق
            await loadChatHistory(currentUser.uid);
        }

        appendMessageToUI('assistant', "جاري التفكير...");
        const reply = await askGroqAI(text);
        const chatContainer = document.getElementById('chatContainer');
        if(chatContainer && chatContainer.lastElementChild) {
            chatContainer.lastElementChild.innerText = reply;
        }

        await addDoc(collection(db, `user_chats/${currentChatId}/messages`), {
            role: "assistant", content: reply, timestamp: new Date()
        });
    });
}

// إنشاء محادثة جديدة (بس واحدة صح)
async function createNewChat() {
    if (!currentUser) return;
    const db = window.firebaseDb;
    
    // بنعمل المحادثة
    const docRef = await window.firebaseFunctions.addDoc(window.firebaseFunctions.collection(db, "user_chats"), {
        userId: currentUser.uid, title: "محادثة جديدة", createdAt: new Date()
    });
    
    currentChatId = docRef.id;
    document.getElementById('chatContainer').innerHTML = '';
    document.getElementById('welcomeLogo').style.display = 'block';
    document.getElementById('chatHeader').style.display = 'none';
    
    await loadChatHistory(currentUser.uid);
}

// تحميل المحادثات في الشريط الجانبي
async function loadChatHistory(uid) {
    const db = window.firebaseDb;
    const list = document.getElementById('chatHistoryList');
    if(!list) return;
    list.innerHTML = '';

    const q = window.firebaseFunctions.query(window.firebaseFunctions.collection(db, "user_chats"));
    const querySnapshot = await window.firebaseFunctions.getDocs(q);
    
    let chats = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if(data.userId === uid) chats.push({ id: doc.id, ...data });
    });
    
    chats.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = 'chat-history-item';
        div.innerHTML = `<span class="chat-title">${chat.title}</span>`;
        div.querySelector('.chat-title').addEventListener('click', () => openChat(chat.id, chat.title));
        list.appendChild(div);
    });
}

// فتح محادثة قديمة
async function openChat(chatId, title) {
    currentChatId = chatId;
    const container = document.getElementById('chatContainer');
    if(!container) return;
    container.innerHTML = '';
    
    document.getElementById('welcomeLogo').style.display = 'none';
    document.getElementById('chatHeader').style.display = 'block';
    document.getElementById('chatHeader').innerText = title;

    const q = window.firebaseFunctions.query(window.firebaseFunctions.collection(window.firebaseDb, `user_chats/${chatId}/messages`), window.firebaseFunctions.orderBy("timestamp", "asc"));
    const snap = await window.firebaseFunctions.getDocs(q);
    snap.forEach(doc => appendMessageToUI(doc.data().role, doc.data().content));
}

// إضافة رسالة للشات
function appendMessageToUI(role, text) {
    const container = document.getElementById('chatContainer');
    if(!container) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    msgDiv.innerText = text;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}