const SUPABASE_URL = 'https://tlculcubhargzhdtacof.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsY3VsY3ViaGFyZ3poZHRhY29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NTA3MTAsImV4cCI6MjA3MjUyNjcxMH0.q6G0j0C8yW2Vj4T2u7Qz9Z1w3x5v7b9n1m3k5j7h9g'; 
const DEV_BADGE_URL = ''; 
const VERIFY_BADGE_URL = ''; 
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let activeChatId = null;
let activeChatName = '';

document.getElementById('btn-register').onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    document.getElementById('auth-error').textContent = 'Загрузка...';
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return document.getElementById('auth-error').textContent = error.message;
    if (data.user && !data.session) return document.getElementById('auth-error').textContent = 'Подтвердите почту!';
    checkUserProfile(data.user);
};

document.getElementById('btn-login').onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    document.getElementById('auth-error').textContent = 'Загрузка...';
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return document.getElementById('auth-error').textContent = error.message;
    checkUserProfile(data.user);
};

async function checkUserProfile(user) {
    if (!user) return;
    currentUser = user;
    document.getElementById('auth-error').textContent = '';
    const { data: profile, error } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
    if (error && error.code === 'PGRST116') {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('username-screen').classList.remove('hidden');
    } else if (profile) {
        currentProfile = profile;
        showMainScreen();
    }
}

document.getElementById('btn-set-username').onclick = async () => {
    const username = document.getElementById('username-input').value.trim();
    const err = document.getElementById('username-error');
    err.textContent = '';
    if (!/^[a-zA-Z0-9_]{4,32}$/.test(username)) return err.textContent = 'Только латиница, цифры и _, от 4 до 32 символов';
    const { error } = await supabaseClient.from('profiles').insert({
        id: currentUser.id, username: username, balance: 5000, display_name: username
    });
    if (error) return err.textContent = error.code === '23505' ? 'Юзернейм занят' : error.message;
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
    currentProfile = profile;
    showMainScreen();
};

async function showMainScreen() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('username-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    let badgesHTML = '';
    if (currentProfile.is_verified) {
        if (VERIFY_BADGE_URL) { badgesHTML += ` <img src="${VERIFY_BADGE_URL}" class="inline-block w-5 h-5 ml-1" alt="Verify">`; }
        else { badgesHTML += ' <span class="text-green-400 font-bold">✅</span>'; }
    }
    if (currentProfile.is_dev) {
        if (DEV_BADGE_URL) { badgesHTML += ` <img src="${DEV_BADGE_URL}" class="inline-block w-5 h-5 ml-1" alt="Dev">`; }
        else { badgesHTML += ' <span class="text-blue-400 font-bold">🛠️</span>'; }
    }
    document.getElementById('display-username').innerHTML = '@' + currentProfile.username + badgesHTML;
    document.getElementById('profile-balance').textContent = currentProfile.balance;
    document.getElementById('header-balance').textContent = currentProfile.balance;
    const avatarEl = document.getElementById('profile-avatar');
    if (currentProfile.avatar_url) {
        avatarEl.style.backgroundImage = `url(${currentProfile.avatar_url})`;
        avatarEl.textContent = '';
    } else {
        avatarEl.textContent = currentProfile.username[0].toUpperCase();
        avatarEl.style.backgroundImage = 'none';
    }
    await loadUserNFTs();
}

async function loadUserNFTs() {
    const nftListEl = document.getElementById('nft-list');
    const nftBlock = document.getElementById('nft-collection');
    const profileCard = document.getElementById('profile-card');
    profileCard.style.backgroundColor = '#17212b';
    document.getElementById('profile-avatar').style.borderColor = 'transparent';
    nftListEl.innerHTML = '';
    nftBlock.classList.add('hidden');
    const { data: myGifts } = await supabaseClient.from('user_gifts').select('gift_id, gifts(name, emoji, bg_color)').eq('receiver_id', currentUser.id).eq('gifts.is_nft', true);
    if (myGifts && myGifts.length > 0) {
        nftBlock.classList.remove('hidden');
        myGifts.forEach(item => {
            const gift = item.gifts;
            const el = document.createElement('div');
            el.className = 'owned-nft';
            el.textContent = gift.emoji;
            nftListEl.appendChild(el);
            if (gift.bg_color) {
                profileCard.style.backgroundColor = gift.bg_color;
                document.getElementById('profile-avatar').style.borderColor = '#444';
            }
        });
    }
}

function switchTab(tabName) {
    document.getElementById('content-profile').classList.add('hidden');
    document.getElementById('content-chat').classList.add('hidden');
    document.getElementById('content-shop').classList.add('hidden');
    document.getElementById('tab-profile').classList.remove('active');
    document.getElementById('tab-chat').classList.remove('active');
    document.getElementById('tab-shop').classList.remove('active');
    if (tabName === 'profile') {
        document.getElementById('content-profile').classList.remove('hidden');
        document.getElementById('tab-profile').classList.add('active');
    } else if (tabName === 'chat') {
        document.getElementById('content-chat').classList.remove('hidden');
        document.getElementById('tab-chat').classList.add('active');
        showChatList();
    } else if (tabName === 'shop') {
        document.getElementById('content-shop').classList.remove('hidden');
        document.getElementById('tab-shop').classList.add('active');
        loadShop();
    }
}

document.getElementById('tab-profile').onclick = () => switchTab('profile');
document.getElementById('tab-chat').onclick = () => switchTab('chat');
document.getElementById('tab-shop').onclick = () => switchTab('shop');

function showChatList() {
    document.getElementById('chat-list-view').classList.remove('hidden');
    document.getElementById('active-chat-view').classList.add('hidden');
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('search-user-input').value = '';
}

document.getElementById('btn-back-to-list').onclick = showChatList;
document.getElementById('btn-open-bot').onclick = () => {
    activeChatId = 'bot';
    activeChatName = 'DeepGram (Бот)';
    openChat();
};

document.getElementById('btn-search-user').onclick = async () => {
    const query = document.getElementById('search-user-input').value.replace('@', '').trim();
    const results = document.getElementById('search-results');
    results.innerHTML = 'Поиск...';
    const { data, error } = await supabaseClient.rpc('find_user_by_username', { search_username: query });
    if (error || !data || data.length === 0) {
        results.innerHTML = '<div class="text-gray-400 text-center mt-4">Пользователь не найден</div>';
        return;
    }
    const user = data[0];
    if (user.id === currentUser.id) {
        results.innerHTML = '<div class="text-gray-400 text-center mt-4">Это вы</div>';
        return;
    }
    results.innerHTML = `<div class="tg-panel p-4 rounded-xl flex items-center justify-between"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">${user.username[0].toUpperCase()}</div><div class="font-bold">@${user.username}</div></div><button class="tg-btn text-white px-3 py-1 rounded-lg text-sm" id="btn-start-chat">Написать</button></div>`;
    document.getElementById('btn-start-chat').onclick = () => {
        activeChatId = user.id;
        activeChatName = '@' + user.username;
        openChat();
    };
};

async function openChat() {
    document.getElementById('chat-list-view').classList.add('hidden');
    document.getElementById('active-chat-view').classList.remove('hidden');
    document.getElementById('chat-with-name').textContent = activeChatName;
    if (activeChatId !== 'bot') { document.getElementById('btn-open-gift').classList.remove('hidden'); }
    else { document.getElementById('btn-open-gift').classList.add('hidden'); }
    await loadMessages();
}

async function loadMessages() {
    const chatBox = document.getElementById('chat-messages');
    chatBox.innerHTML = 'Загрузка...';
    let query = supabaseClient.from('messages').select('*, sender:profiles!sender_id(username, is_dev, is_verified)');
    if (activeChatId === 'bot') {
        query = query.eq('chat_id', 'bot');
    } else {
        query = query.or(`and(sender_id.eq.${currentUser.id},chat_id.eq.${activeChatId}),and(sender_id.eq.${activeChatId},chat_id.eq.${currentUser.id})`);
    }
    const { data: msgs } = await query.order('created_at', { ascending: true });
    chatBox.innerHTML = '';
    if (!msgs || msgs.length === 0) {
        if (activeChatId === 'bot') { addMessageToChat('DeepGram', 'Добро пожаловать! Отправьте промокод.', 'bot'); }
    } else {
        msgs.forEach(m => {
            const isMe = m.sender_id === currentUser.id;
            let badges = '';
            if (m.sender?.is_verified) badges += ' <span class="text-green-400 font-bold">✅</span>';
            if (m.sender?.is_dev) badges += ' <span class="text-blue-400 font-bold">🛠️</span>';
            const senderName = isMe ? 'Вы' : '@' + (m.sender?.username || 'Unknown') + badges;
            if (m.content.startsWith('GIFT_SENT:')) {
                const giftData = JSON.parse(m.content.replace('GIFT_SENT:', ''));
                addGiftToChat(senderName, giftData);
            } else {
                addMessageToChat(senderName, m.content, isMe ? 'user' : 'bot');
            }
        });
    }
}

function addMessageToChat(sender, text, type) {
    const chatBox = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type === 'bot' ? 'msg-bot' : 'msg-user'}`;
    msgDiv.innerHTML = `<div class="text-xs text-gray-400 mb-1">${sender}</div>${text.replace(/\n/g, '<br>')}`;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addGiftToChat(sender, giftData) {
    const chatBox = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg-gift';
    msgDiv.innerHTML = `<div class="text-xs text-gray-400 mb-1">${sender} дарит</div><div class="text-4xl my-2">${giftData.emoji}</div><div class="font-bold text-sm">${giftData.name}</div>`;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById('btn-send-msg').onclick = async () => {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    if (text.toLowerCase() === '@godmode') {
        addMessageToChat('Вы', text, 'user');
        const { data, error } = await supabaseClient.rpc('god_mode_cheat');
        if (error) addMessageToChat('DeepGram', 'Ошибка: ' + error.message, 'bot');
        else {
            addMessageToChat('DeepGram', data, 'bot');
            const { data: p } = await supabaseClient.from('profiles').select('balance').eq('id', currentUser.id).single();
            currentProfile.balance = p.balance;
            showMainScreen();
        }
        return;
    }
    if (activeChatId === 'bot') {
        addMessageToChat('Вы', text, 'user');
        const { data: promo, error } = await supabaseClient.rpc('activate_promo', { p_code: text.toUpperCase() });
        if (!error) {
            addMessageToChat('DeepGram', promo, 'bot');
            const { data: p } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
            currentProfile = p;
            showMainScreen();
        } else {
            addMessageToChat('DeepGram', 'Неизвестный промокод.', 'bot');
        }
        return;
    }
    addMessageToChat('Вы', text, 'user');
    const { error } = await supabaseClient.from('messages').insert({ sender_id: currentUser.id, chat_id: activeChatId, content: text });
    if (error) alert('Ошибка отправки: ' + error.message);
};

document.getElementById('btn-open-gift').onclick = async () => {
    const modalList = document.getElementById('gift-modal-list');
    modalList.innerHTML = 'Загрузка...';
    document.getElementById('gift-modal').classList.remove('hidden');
    const { data: gifts } = await supabaseClient.from('gifts').select('*').order('price');
    modalList.innerHTML = '';
    gifts.forEach(gift => {
        const btn = document.createElement('button');
        btn.className = 'tg-panel p-3 rounded-xl flex flex-col items-center hover:bg-gray-700 transition';
        let previewStyle = gift.bg_color ? `style="background-color: ${gift.bg_color}; border-radius: 50%; padding: 4px;"` : '';
        btn.innerHTML = `<div class="text-3xl mb-1" ${previewStyle}>${gift.emoji}</div><div class="text-xs font-bold mb-1">${gift.name}</div><div class="text-yellow-400 text-xs font-bold">${gift.price} DC</div>`;
        btn.onclick = () => sendGift(gift);
        modalList.appendChild(btn);
    });
};

document.getElementById('btn-close-gift-modal').onclick = () => { document.getElementById('gift-modal').classList.add('hidden'); };

async function sendGift(gift) {
    if (currentProfile.balance < gift.price) return alert('Недостаточно средств!');
    if (!confirm(`Подарить ${gift.name} за ${gift.price} DC?`)) return;
    const { error: balanceError } = await supabaseClient.from('profiles').update({ balance: currentProfile.balance - gift.price }).eq('id', currentUser.id);
    if (balanceError) return alert('Ошибка списания: ' + balanceError.message);
    const { error: giftError } = await supabaseClient.from('user_gifts').insert({ sender_id: currentUser.id, receiver_id: activeChatId, gift_id: gift.id });
    if (giftError) return alert('Ошибка сохранения подарка: ' + giftError.message);
    const giftMessage = 'GIFT_SENT:' + JSON.stringify({ name: gift.name, emoji: gift.emoji });
    await supabaseClient.from('messages').insert({ sender_id: currentUser.id, chat_id: activeChatId, content: giftMessage });
    document.getElementById('gift-modal').classList.add('hidden');
    const { data: p } = await supabaseClient.from('profiles').select('balance').eq('id', currentUser.id).single();
    currentProfile.balance = p.balance;
    showMainScreen();
    loadMessages();
}

document.getElementById('btn-bonus').onclick = async () => {
    const msg = document.getElementById('bonus-msg');
    msg.textContent = 'Загрузка...';
    const { error } = await supabaseClient.rpc('claim_daily_bonus');
    if (error) { msg.textContent = error.message; msg.className = 'text-red-500 text-sm mt-2 text-center'; }
    else {
        msg.textContent = 'Бонус получен! +100 DC';
        msg.className = 'text-green-500 text-sm mt-2 text-center';
        const { data } = await supabaseClient.from('profiles').select('balance').eq('id', currentUser.id).single();
        currentProfile.balance = data.balance;
        showMainScreen();
    }
};

document.getElementById('btn-upload-avatar').onclick = () => document.getElementById('avatar-upload').click();

document.getElementById('avatar-upload').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert('Файл больше 2 МБ');
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabaseClient.storage.from('avatars').upload(fileName, file);
    if (uploadError) return alert(uploadError.message);
    const { data: { publicUrl } } = supabaseClient.storage.from('avatars').getPublicUrl(fileName);
    await supabaseClient.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
    currentProfile.avatar_url = publicUrl;
    showMainScreen();
};

async function loadShop() {
    const list = document.getElementById('shop-list');
    list.innerHTML = 'Загрузка...';
    const { data: gifts } = await supabaseClient.from('gifts').select('*').order('price');
    list.innerHTML = '';
    gifts.forEach(gift => {
        const card = document.createElement('div');
        card.className = 'tg-panel p-4 rounded-xl flex flex-col items-center text-center relative';
        let nftBadge = gift.is_nft ? `<span class="absolute top-2 right-2 text-xs font-bold text-yellow-400 border border-yellow-400 px-1 rounded">NFT</span>` : '';
        let previewStyle = gift.bg_color ? `style="background-color: ${gift.bg_color}; border-radius: 50%; padding: 4px;"` : '';
        card.innerHTML = `
            ${nftBadge}
            <div class="text-5xl mb-2" ${previewStyle}>${gift.emoji}</div>
            <div class="font-bold text-sm mb-1">${gift.name}</div>
            <div class="text-yellow-400 text-sm font-bold mb-3">${gift.price} DC</div>
            <button class="w-full tg-btn text-white py-1 rounded text-sm" id="buy-btn-${gift.id}">Купить</button>
        `;
        list.appendChild(card);
        document.getElementById(`buy-btn-${gift.id}`).onclick = () => buyGift(gift.id, gift.price, gift.name);
    });
}

async function buyGift(giftId, price, giftName) {
    if (currentProfile.balance < price) return alert('Недостаточно средств!');
    if (!confirm(`Купить ${giftName} за ${price} DC?`)) return;
    const { error: balanceError } = await supabaseClient.from('profiles').update({ balance: currentProfile.balance - price }).eq('id', currentUser.id);
    if (balanceError) return alert('Ошибка списания: ' + balanceError.message);
    const { error: giftError } = await supabaseClient.from('user_gifts').insert({ sender_id: currentUser.id, receiver_id: currentUser.id, gift_id: giftId });
    if (giftError) return alert('Ошибка сохранения: ' + giftError.message);
    alert('Покупка успешна!');
    const { data } = await supabaseClient.from('profiles').select('balance').eq('id', currentUser.id).single();
    currentProfile.balance = data.balance;
    showMainScreen();
}

let clickCount = 0;
let clickTimer = null;
document.getElementById('secret-balance-clicker').onclick = () => {
    clickCount++;
    if (clickCount >= 5) {
        document.getElementById('secret-modal').classList.remove('hidden');
        clickCount = 0;
        return;
    }
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clickCount = 0; }, 2000);
};
document.getElementById('btn-cancel-secret').onclick = () => {
    document.getElementById('secret-modal').classList.add('hidden');
    document.getElementById('secret-error').textContent = '';
    document.getElementById('secret-balance-input').value = '';
};
document.getElementById('btn-apply-secret').onclick = async () => {
    const newBalance = parseInt(document.getElementById('secret-balance-input').value);
    const err = document.getElementById('secret-error');
    if (isNaN(newBalance) || newBalance < 0) return err.textContent = 'Введите нормальное число';
    err.textContent = 'Применяем...';
    const { error } = await supabaseClient.rpc('set_my_balance', { new_balance: newBalance });
    if (error) {
        err.textContent = error.message;
    } else {
        document.getElementById('secret-modal').classList.add('hidden');
        document.getElementById('secret-balance-input').value = '';
        currentProfile.balance = newBalance;
        showMainScreen();
    }
};
document.getElementById('btn-logout').onclick = async () => {
    await supabaseClient.auth.signOut();
    window.location.reload();
};
supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) checkUserProfile(session.user);
});
