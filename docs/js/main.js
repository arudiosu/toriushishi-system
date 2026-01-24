/* =======================================================
共通変数・DOM取得
======================================================= */
const homeScheduleContainer = document.getElementById("home-schedule");
const eventActiveScheduleContainer = document.getElementById("event-active-schedule");
const eventPastScheduleContainer = document.getElementById("event-past-schedule");
let scheduleContainer = [];
let eventMap = {}; 

// ★ ここにあなたのデプロイURLを入れる
const GAS_URL = "https://script.google.com/macros/s/AKfycbyzeUMTM_AK_8v00OUNz_BivDg-tL8GBhQclvMkUjLO5v60Xy4MlfyNjBev1xMT4gEj/exec";
const userId = localStorage.getItem("userId");
const role = localStorage.getItem("role");

/* =======================================================
共通 API 呼び出し関数 (CORS回避 & 共通化)
======================================================= */
async function callGasApi(payload) {
    // headers を完全に削除、または指定しないのがコツです
    const response = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify(payload) 
    });

    // 実は GAS + fetch はレスポンスを直接 json() で取れない場合が多いです
    // 一旦以下の構成で試してください
    return await response.json(); 
}

/* =======================================================
初期処理
======================================================= */
document.addEventListener("DOMContentLoaded", () => {
    initLoadingScreen();
    roleCheck();
    scheduleContainer = [homeScheduleContainer, eventActiveScheduleContainer, eventPastScheduleContainer];
    showSkeleton(scheduleContainer);
    loadHomeEvents();
    loadEventEvents();
    initBottomNav();
    initEventDelegation();
    initChatBot();
});

/* =======================================================
ローディング画面
======================================================= */
function initLoadingScreen() {
    const loadingStart = Date.now();
    window.addEventListener('load', function(){
        const elapsed = Date.now() - loadingStart;
        const minTime = 3000;
        if (elapsed < minTime) setTimeout(hideLoading, minTime - elapsed);
        else hideLoading();
    });
}
function hideLoading() {
    const loading = document.getElementById('loading');
    if(!loading) return;
    loading.style.opacity = 0;
    setTimeout(() => {
        loading.style.display = 'none';
        const main = document.getElementById('main-content');
        if(main) main.style.display = 'block';
    }, 500);
}

/* =======================================================
ボトムナビ & 役割チェック & スケルトン
======================================================= */
function initBottomNav() {
    document.querySelectorAll(".bottom-nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.tab;
            document.querySelectorAll(".bottom-nav-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            document.getElementById(target).classList.add("active");
        });
    });
}

function roleCheck() {
    if(!role) return;
    const cleanRole = String(role).replace(/['"]/g, "");
    if (cleanRole === "user") {
        const addBtn = document.querySelector('button[data-tab="addEvent"]');
        if (addBtn) addBtn.style.display = "none";
    }
}

function showSkeleton(containers) {
    containers.forEach(container => {
        if(!container) return;
        container.innerHTML = "";
        for (let i = 0; i < 8; i++) {
            const sk = document.createElement("div");
            sk.className = "skeleton skeleton-card";
            container.appendChild(sk);
        }
    });
}

/* =======================================================
イベント取得・描画
======================================================= */
async function loadHomeEvents() {
    const res = await callGasApi({ action: "getEventsWithStats", userId });

    try {
        const res = await callGasApi({ action: "getEventsWithStats", userId });
        
        // res.success が true かつ、res.events が存在するかチェック
        if (res && res.success && Array.isArray(res.events)) {
            homeScheduleContainer.innerHTML = "";
            renderScheduleHome(res.events); // 配列部分だけを渡す
        } else {
            console.error("データ取得に失敗しました:", res.msg);
        }
    } catch(e) { 
        console.error("Homeロード失敗:", e); 
    }
}

async function loadEventEvents() {
    try {
        const res = await callGasApi({ action: "getEventsWithStats", userId });
        
        if (res && res.success && Array.isArray(res.events)) {
            eventActiveScheduleContainer.innerHTML = "";
            eventPastScheduleContainer.innerHTML = "";
            renderScheduleEvent(res.events); // 配列部分だけを渡す
        } else {
            console.error("データ取得に失敗しました:", res.msg);
        }
    } catch(e) { 
        console.error("Eventロード失敗:", e); 
    }
}

function renderScheduleHome(events) {
    if (!events) return;
    const fragment = document.createDocumentFragment();
    const today = new Date(); today.setHours(0,0,0,0);

    events.forEach(ev => {
        const eventDate = new Date(ev.date); eventDate.setHours(0,0,0,0);
        if (eventDate >= today) {
            const className = ev.type === "festival" ? "event-festival" : "event-regular";
            const card = document.createElement("div");
            card.className = className; card.dataset.eventId = ev.eventId;
            card.innerHTML = `
                <div class="event-date">${ev.date}</div>
                <div class="event-title">${ev.title}</div>
                <div class="answer">${ev.myStatus}</div>
                <div class="responses-list">参加:${ev.yes} 不参加:${ev.no}</div>
            `;
            const btn = document.createElement("button");
            btn.className = "detail"; btn.textContent = "詳細"; btn.dataset.eventId = ev.eventId;
            card.appendChild(btn);
            fragment.appendChild(card);
        }
    });
    homeScheduleContainer.appendChild(fragment);
}

function renderScheduleEvent(events) {
    if (!events || !Array.isArray(events)) return;
    eventMap = {};
    const activeFragment = document.createDocumentFragment();
    const pastFragment = document.createDocumentFragment();
    const today = new Date(); today.setHours(0,0,0,0);

    events.forEach(ev => {
        if (!ev || !ev.eventId) return;
        eventMap[ev.eventId] = ev;
        const className = ev.type === "festival" ? "event-festival" : "event-regular";
        const card = document.createElement("div");
        card.className = className; card.dataset.eventId = ev.eventId;
        card.innerHTML = `
            <div class="event-date">${ev.date}</div>
            <div class="event-title">${ev.title}</div>
            <div class="answer">${ev.myStatus}</div>
            <div class="responses-list">参加:${ev.yes} 不参加:${ev.no}</div>
        `;
        const btn = document.createElement("button");
        btn.className = "detail"; btn.textContent = "詳細"; btn.dataset.eventId = ev.eventId;
        card.appendChild(btn);

        const eventDate = new Date(ev.date); eventDate.setHours(0,0,0,0);
        if (eventDate >= today) activeFragment.appendChild(card);
        else pastFragment.appendChild(card);
    });
    eventActiveScheduleContainer.appendChild(activeFragment);
    eventPastScheduleContainer.appendChild(pastFragment);
}

/* =======================================================
イベント委譲
======================================================= */
function initEventDelegation() {
    document.body.addEventListener("click", async (event) => {
        // リロード
        if (event.target.closest(".reload-btn")) {
            const tabId = event.target.closest(".tab-content")?.id;
            if (tabId === "home") {
                showSkeleton([homeScheduleContainer]);
                await loadHomeEvents();
            } else if (tabId === "event") {
                showSkeleton([eventActiveScheduleContainer, eventPastScheduleContainer]);
                await loadEventEvents();
            }
            return;
        }

        // 詳細ボタン
        const detailBtn = event.target.closest(".detail");
        if (detailBtn) {
            const eventId = Number(detailBtn.dataset.eventId);
            const eventData = eventMap[eventId];
            const card = document.getElementById("eventDetailCard"); // IDで指定
            if(card) {
                card.classList.add("active");
                card.dataset.eventId = eventId;
                await fillDetailCard(eventData, userId, card);
            }
            return;
        }

        // 折りたたみ
        const toggleBtn = event.target.closest(".toggle-response-btn, .toggle-performances-btn");
        if (toggleBtn) {
            const ul = toggleBtn.nextElementSibling;
            if(!ul) return;
            const isOpen = ul.style.display === "block";
            ul.style.display = isOpen ? "none" : "block";
            toggleBtn.classList.toggle('open', !isOpen);
            return;
        }

        // 回答
        const responseBtn = event.target.closest(".response-btn");
        if (responseBtn) {
            const card = responseBtn.closest(".event-detail-card");
            const dateText = card.querySelector(".event-detail-card-date")?.textContent || "";
            const eventDate = new Date(dateText.replace(/\//g, "-")).setHours(0,0,0,0);
            const today = new Date().setHours(0,0,0,0);
            if (eventDate < today) { alert("過去のイベントは回答できません。"); return; }

            const eventId = Number(card.dataset.eventId);
            const answer = responseBtn.classList.contains("yes") ? "参加" : "不参加";
            await updateResponse(eventId, answer, card, userId);
            return;
        }

        // 詳細閉じる
        if (event.target.closest(".close-event-detail-card-btn")) {
            document.getElementById("eventDetailCard")?.classList.remove("active");
        }
    });
}

/* =======================================================
API 連携ロジック (回答更新 & 詳細表示)
======================================================= */
async function updateResponse(eventId, answer, card, userId) {
    const overlay = card.querySelector(".loading-overlay");
    if (overlay) overlay.style.display = "flex";
    try {
        const result = await callGasApi({ action: "updateEventResponse", eventId, userId, answer });
        
        card.querySelector(".response-btn.yes").classList.toggle("selected", answer === "参加");
        card.querySelector(".response-btn.no").classList.toggle("selected", answer === "不参加");
        
        fillResponseList(card.querySelector("ul.response-list.yes"), result.yes);
        fillResponseList(card.querySelector("ul.response-list.no"), result.no);
        fillResponseList(card.querySelector("ul.response-list.na"), result.na);

        card.querySelector(".toggle-response-btn.yes").textContent = `参加者 ${result.yes.length}人`;
        card.querySelector(".toggle-response-btn.no").textContent  = `不参加者 ${result.no.length}人`;
        card.querySelector(".toggle-response-btn.na").textContent  = `未回答者 ${result.na.length}人`;
    } catch(e) { console.error(e); }
    if (overlay) overlay.style.display = "none";
}

async function fillDetailCard(eventData, userId, card) {
    const overlay = card.querySelector(".loading-overlay");
    if (overlay) overlay.style.display = "flex";

    card.querySelector(".event-detail-card-title").textContent = eventData.title || "";
    card.querySelector(".event-detail-card-date").textContent = eventData.date || "";
    card.querySelector(".event-detail-card-time-text").textContent = eventData.time || "";

    try {
        const result = await callGasApi({ action: "getEventDetailWithUserData", eventId: Number(eventData.eventId), userId });
        const myAnswer = result.personal[String(eventData.eventId)] || "";

        card.querySelector(".response-btn.yes").classList.toggle("selected", myAnswer === "参加");
        card.querySelector(".response-btn.no").classList.toggle("selected", myAnswer === "不参加");

        fillResponseList(card.querySelector("ul.response-list.yes"), result.yes);
        fillResponseList(card.querySelector("ul.response-list.no"), result.no);
        fillResponseList(card.querySelector("ul.response-list.na"), result.na);

        card.querySelector(".toggle-response-btn.yes").textContent = `参加者 ${result.yes.length}人`;
        card.querySelector(".toggle-response-btn.no").textContent  = `不参加者 ${result.no.length}人`;
        card.querySelector(".toggle-response-btn.na").textContent  = `未回答者 ${result.na.length}人`;
        
        // リストは初期状態で閉じる
        card.querySelectorAll(".response-list").forEach(ul => ul.style.display = "none");
    } catch(e) { console.error(e); }
    if (overlay) overlay.style.display = "none";
}

function fillResponseList(ulElement, names) {
    if (!ulElement) return;
    ulElement.innerHTML = (names || []).map(name => `<li><span class="name">${name}</span></li>`).join('');
}

/* =======================================================
チャットボット
======================================================= */
function initChatBot() {
    const input = document.getElementById("chat-input");
    const sendBtn = document.getElementById("chat-send-btn");
    const area = document.getElementById("ai-chat-area");
    if(!input || !sendBtn) return;

    sendBtn.addEventListener("click", sendChat);
    input.addEventListener("keypress", (e) => { if(e.key === "Enter") sendChat(); });

    async function sendChat() {
        const text = input.value.trim();
        if(!text) return;
        appendChatMessage(text, "user");
        input.value = "";

        const typingWrapper = createTypingIndicator();
        area.appendChild(typingWrapper);
        area.scrollTop = area.scrollHeight;

        try {
            const data = await callGasApi({ action: "chatAI", text: text });
            typingWrapper.remove();
            appendChatMessage(data.reply || data, "ai");
        } catch(e) {
            typingWrapper.remove();
            appendChatMessage("エラーが発生しました。", "ai");
        }
    }

    function createTypingIndicator() {
        const wrapper = document.createElement("div");
        wrapper.className = "chat-ai-wrapper";
        wrapper.innerHTML = `<img class="icon-img" src="images/鳥生獅子連_ししまる.PNG"><div class="chat-msg chat-ai">入力中...</div>`;
        return wrapper;
    }

    function appendChatMessage(text, sender) {
        const msgDiv = document.createElement("div");
        if(sender === "ai") {
            msgDiv.className = "chat-ai-wrapper";
            msgDiv.innerHTML = `<img class="icon-img" src="images/鳥生獅子連_ししまる.PNG"><div class="chat-msg chat-ai">${text}</div>`;
        } else {
            msgDiv.className = "chat-msg chat-user";
            msgDiv.textContent = text;
        }
        area.appendChild(msgDiv);
        area.scrollTop = area.scrollHeight;
    }
}