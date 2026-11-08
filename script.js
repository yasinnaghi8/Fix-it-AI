document.addEventListener('DOMContentLoaded', () => {
    // 1. تغيير اللغة التلقائي
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

    // 2. إعدادات فايربيز
    const checkFirebase = setInterval(() => {
        if (window.firebaseAuth && window.firebaseFunctions) {
            clearInterval(checkFirebase);
            initApp();
        }
    }, 100);
});

let currentUser = null;
let currentChatId = null;
let isNewUser = false; // عشان نمنع التكرار

function initApp() {
    const { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, collection, addDoc, query, getDocs, doc, updateDoc, getDoc, orderBy } = window.firebaseFunctions;
    const auth = window.firebaseAuth;
    const db = window.firebaseDb;
    const authError = document.getElementById('authError');

    const showError = (msg) => { 
        if(authError) { authError.textContent = msg; authError.style.display = 'block'; } 
        else { alert(msg); }
    };

    // 3. مراقبة حالة الدخول وتحديث الواجهة
    onAuthStateChanged(auth, async (user) => {
        const authScreen = document.getElementById('authScreen');
        const appContent = document.getElementById('appContent');

        if (user) {
            currentUser = user;
            if (authScreen) authScreen.style.setProperty('display', 'none', 'important');
            if (appContent) appContent.style.display = 'block';
            
            // تحديث بيانات المستخدم (الاسم والصورة)
            const avatarImg = document.getElementById('userAvatar');
            const nameDisplay = document.getElementById('userNameDisplay');
            if (avatarImg && user.photoURL) avatarImg.src = user.photoURL;
            if (nameDisplay) nameDisplay.textContent = user.displayName || user.email.split('@')[0];
            
            // تحميل المحادثات
            await loadChatHistory(user.uid);
            
            // لو مفيش محادثة شغالة، نبدأ واحدة جديدة (بس مش كل مرة)
            if (!currentChatId) {
                await createNewChat();
            }
        } else {
            currentUser = null;
            if (authScreen) authScreen.style.setProperty('display', 'flex', 'important');
            if (appContent) appContent.style.display = 'none';
        }
    });

    // 4. أزرار الدخول
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

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        currentChatId = null; // نصفّر المحادثة عشان لما يدخل تاني
        signOut(auth);
    });

    // 5. زرار إغلاق وفتح الشريط الجانبي (للموبايل)
    document.getElementById('toggleSidebar')?.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.toggle('collapsed');
    });

    // 6. زرار البحث
    document.getElementById('searchBtn')?.addEventListener('click', () => {
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer) searchContainer.classList.toggle('hidden');
    });

    // 7. زرار محادثة جديدة
    document.getElementById('newChatBtn')?.addEventListener('click', createNewChat);

    // 8. إرسال الرسالة
    document.getElementById('btnDiagnose')?.addEventListener('click', async () => {
        const input = document.getElementById('problemText');
        const text = input.value.trim();
        if (!text || !currentUser) return;

        input.value = '';
        const welcomeLogo = document.getElementById('welcomeLogo');
        if(welcomeLogo) welcomeLogo.style.display = 'none';
        
        appendMessageToUI('user', text);
        
        // حفظ الرسالة
        await addDoc(collection(db, `user_chats/${currentChatId}/messages`), {
            role: "user", content: text, timestamp: new Date()
        });

        // تسمية المحادثة لو جديدة
        const chatDoc = await getDoc(doc(db, "user_chats", currentChatId));
        if (chatDoc.exists() && chatDoc.data().title === "محادثة جديدة") {
            const newTitle = text.split(" ").slice(0, 4).join(" ") + "...";
            await updateDoc(doc(db, "user_chats", currentChatId), { title: newTitle });
            await loadChatHistory(currentUser.uid);
        }

        // الرد
        appendMessageToUI('assistant', "جاري التفكير...");
        const reply = await askGroqAI(text);
        const chatContainer = document.getElementById('chatContainer');
        if(chatContainer && chatContainer.lastElementChild) {
            chatContainer.lastElementChild.innerText = reply;
        }

        // حفظ الرد
        await addDoc(collection(db, `user_chats/${currentChatId}/messages`), {
            role: "assistant", content: reply, timestamp: new Date()
        });
    });
}

// 9. دالة إنشاء محادثة جديدة
async function createNewChat() {
    if (!currentUser) return;
    const db = window.firebaseDb;
    
    // بنعمل محادثة جديدة ونشيل الـ ID
    const docRef = await window.firebaseFunctions.addDoc(window.firebaseFunctions.collection(db, "user_chats"), {
        userId: currentUser.uid, 
        title: "محادثة جديدة", 
        createdAt: new Date(), 
        isPinned: false
    });
    
    currentChatId = docRef.id;
    
    // تفريغ الشات
    const chatContainer = document.getElementById('chatContainer');
    if(chatContainer) chatContainer.innerHTML = '';
    
    // إظهار الترحيب
    const welcomeLogo = document.getElementById('welcomeLogo');
    if(welcomeLogo) welcomeLogo.style.display = 'block';
    
    await loadChatHistory(currentUser.uid);
}

// 10. دالة تحميل المحادثات
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
    
    // ترتيب حسب الأحدث
    chats.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = 'chat-history-item';
        div.innerHTML = `<span class="chat-title">${chat.title}</span>`;
        div.querySelector('.chat-title').addEventListener('click', () => openChat(chat.id));
        list.appendChild(div);
    });
}

// 11. فتح محادثة قديمة
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

// 12. دالة إضافة الرسالة للشاشة
function appendMessageToUI(role, text) {
    const container = document.getElementById('chatContainer');
    if(!container) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    msgDiv.innerText = text;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}