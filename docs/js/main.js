
/* =======================================================
共通変数・DOM取得
======================================================= */
const homeScheduleContainer = document.getElementById("home-schedule");
const eventActiveScheduleContainer = document.getElementById("event-active-schedule");
const eventPastScheduleContainer = document.getElementById("event-past-schedule");
let scheduleContainer = [];
let eventMap = {}; // eventId → eventData

// GAS Web App URL (ここにあなたのデプロイURLを入れる)
const GAS_URL = "https://script.google.com/macros/s/デプロイURL/exec";

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
    loading.style.opacity = 0;
    setTimeout(() => {
        loading.style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    }, 500);
}

/* =======================================================
ボトムナビ
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

/* =======================================================
ユーザー役割チェック
======================================================= */
function roleCheck() {
    const cleanRole = String(role).replace(/['"]/g, "");
    if (cleanRole === "user") {
        const addBtn = document.querySelector('button[data-tab="addEvent"]');
        if (addBtn) addBtn.style.display = "none";
    }
}

/* =======================================================
スケルトン表示
======================================================= */
function showSkeleton(containers) {
    containers.forEach(container => {
        container.innerHTML = "";
        for (let i = 0; i < 8; i++) {
            const sk = document.createElement("div");
            sk.className = "skeleton skeleton-card";
            container.appendChild(sk);
        }
    });
}

/* =======================================================
イベント取得・描画 (fetch版)
======================================================= */
async function loadHomeEvents() {
    try {
        const res = await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "getEventsWithStats", userId })
        });
        const events = await res.json();
        homeScheduleContainer.innerHTML = "";
        renderScheduleHome(events);
    } catch(e) { console.error(e); }
}

async function loadEventEvents() {
    try {
        const res = await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "getEventsWithStats", userId })
        });
        const events = await res.json();
        eventActiveScheduleContainer.innerHTML = "";
        eventPastScheduleContainer.innerHTML = "";
        renderScheduleEvent(events);
    } catch(e) { console.error(e); }
}

/* =======================================================
render関数はそのまま
======================================================= */
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

        if (event.target.closest(".reload-btn")) {
            const tab = event.target.closest(".tab-content");
            const tabId = tab?.id;
            switch (tabId) {
                case "home":
                    showSkeleton([homeScheduleContainer]);
                    await loadHomeEvents();
                    break;
                case "event":
                    showSkeleton([eventActiveScheduleContainer, eventPastScheduleContainer]);
                    await loadEventEvents();
                    break;
            }
            return;
        }

        // 詳細ボタン
        const detailBtn = event.target.closest(".detail");
        if (detailBtn) {
            const eventId = Number(detailBtn.dataset.eventId);
            const eventData = eventMap[eventId];
            const card = document.querySelector(".event-detail-card");
            card.classList.add("active");
            card.dataset.eventId = eventId;
            await fillDetailCard(eventData, userId, card);
            return;
        }

        // 折りたたみトグル
        const toggleBtn = event.target.closest(".toggle-response-btn, .toggle-performances-btn");
        if (toggleBtn) {
            const ul = toggleBtn.nextElementSibling;
            if(!ul) return;
            const isOpen = ul.style.display === "block" || ul.style.display === "";
            ul.style.display = isOpen ? "none" : "block";
            toggleBtn.classList.toggle('open', !isOpen);
            return;
        }

        // 回答反映
        const responseBtn = event.target.closest(".response-btn");
        if (responseBtn) {
            const card = responseBtn.closest(".event-detail-card");
            const dateText = card.querySelector(".event-detail-card-date")?.textContent || "";
            const eventDate = new Date(dateText.replace(/\//g, "-")); 
            eventDate.setHours(0, 0, 0, 0);
            const today = new Date(); today.setHours(0,0,0,0);

            if (eventDate < today) { alert("過去のイベントは回答できません。"); return; }

            const eventId = Number(card.dataset.eventId);
            const answer  = responseBtn.classList.contains("yes") ? "参加" : "不参加";
            await updateResponse(eventId, answer, card, userId);
            return;
        }
    });
}

/* =======================================================
回答更新 + フロント反映 (fetch版)
======================================================= */
async function updateResponse(eventId, answer, card, userId) {
    if (!card) return;
    const overlay = card.querySelector(".loading-overlay"); if (!overlay) return;
    overlay.style.display = "flex";

    const yesBtn = card.querySelector(".response-btn.yes");
    const noBtn  = card.querySelector(".response-btn.no");
    yesBtn.classList.toggle("selected", answer === "参加");
    noBtn.classList.toggle("selected", answer === "不参加");

    try {
        const res = await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "updateEventResponse", eventId, userId, status: answer })
        });
        const result = await res.json();

        const yesList = card.querySelector("ul.response-list.yes");
        const noList  = card.querySelector("ul.response-list.no");
        const naList  = card.querySelector("ul.response-list.na");

        const toggleYesBtn = card.querySelector(".toggle-response-btn.yes");
        const toggleNoBtn  = card.querySelector(".toggle-response-btn.no");
        const toggleNaBtn  = card.querySelector(".toggle-response-btn.na");

        fillResponseList(yesList, result.yes);
        fillResponseList(noList, result.no);
        fillResponseList(naList, result.na);

        if (toggleYesBtn) toggleYesBtn.textContent = `参加者 ${result.yes.length}人`;
        if (toggleNoBtn)  toggleNoBtn.textContent  = `不参加者 ${result.no.length}人`;
        if (toggleNaBtn)  toggleNaBtn.textContent  = `未回答者 ${result.na.length}人`;

    } catch(e) { console.error(e); }
    overlay.style.display = "none";
}

/* =======================================================
詳細カードにデータを埋める (fetch版)
======================================================= */
async function fillDetailCard(eventData, userId, card) {
    if (!card) return;
    const overlay = card.querySelector(".loading-overlay");
    if (!overlay) return;
    overlay.style.display = "flex";

    const yesBtn = card.querySelector(".response-btn.yes");
    const noBtn  = card.querySelector(".response-btn.no");
    const yesList = card.querySelector("ul.response-list.yes");
    const noList  = card.querySelector("ul.response-list.no");
    const naList  = card.querySelector("ul.response-list.na");

    const toggleYesBtn = card.querySelector(".toggle-response-btn.yes");
    const toggleNoBtn  = card.querySelector(".toggle-response-btn.no");
    const toggleNaBtn  = card.querySelector(".toggle-response-btn.na");

    card.querySelector(".event-detail-card-title").textContent = eventData.title || "";
    card.querySelector(".event-detail-card-date").textContent = eventData.date || "";
    card.querySelector(".event-detail-card-time-text").textContent = eventData.time || "";

    [yesBtn,noBtn].forEach(btn => btn.classList.remove("selected"));
    [yesList,noList,naList].forEach(ul => ul.innerHTML = "");

    const eventId = Number(eventData.eventId);

    try {
        const res = await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "getEventDetailWithUserData", eventId, userId })
        });
        const result = await res.json();
        const myAnswer = result.personal[String(eventId)] || "";

        yesBtn.classList.toggle("selected", myAnswer === "参加");
        noBtn.classList.toggle("selected", myAnswer === "不参加");

        fillResponseList(yesList, result.yes);
        fillResponseList(noList, result.no);
        fillResponseList(naList, result.na);

        if (toggleYesBtn) toggleYesBtn.textContent = `参加者 ${result.yes.length}人`;
        if (toggleNoBtn)  toggleNoBtn.textContent  = `不参加者 ${result.no.length}人`;
        if (toggleNaBtn)  toggleNaBtn.textContent  = `未回答者 ${result.na.length}人`;

        [yesList,noList,naList].forEach(ul => ul.style.display="none");

    } catch(e) { console.error(e); }
    overlay.style.display = "none";
}

/* =======================================================
折りたたみリスト作成（右に人数）
======================================================= */
function fillResponseList(ulElement, names) {
    if (!ulElement) return;
    ulElement.innerHTML = names.map(name => `<li><span class="name">${name}</span></li>`).join('');
}

/* =======================================================
チャットボット(fetch版)
======================================================= */
function initChatBot() {
    const input = document.getElementById("chat-input");
    const sendBtn = document.getElementById("chat-send-btn");
    const area = document.getElementById("ai-chat-area");

    sendBtn.addEventListener("click", sendChat);
    input.addEventListener("keypress", (e) => { if(e.key==="Enter") sendChat(); });

    async function sendChat() {
        const text = input.value.trim();
        if(!text) return;
        appendChatMessage(text,"user");
        input.value = "";

        // 入力中表示
        const typingWrapper = document.createElement("div");
        typingWrapper.className = "chat-ai-wrapper";
        const img = document.createElement("img"); img.className="icon-img";
        img.src = "https://lh3.googleusercontent.com/d/1h3_0KsLsApqqdR6fdf3S4DcoMP0Dfz00";
        const typingBubble = document.createElement("div");
        typingBubble.className = "chat-msg chat-ai typing";
        typingBubble.textContent = "入力中";
        typingWrapper.appendChild(img); typingWrapper.appendChild(typingBubble);
        area.appendChild(typingWrapper);
        area.scrollTop = area.scrollHeight;

        let dotCount = 0;
        const typingInterval = setInterval(()=>{ dotCount=(dotCount+1)%4; typingBubble.textContent="入力中"+'.'.repeat(dotCount); area.scrollTop=area.scrollHeight; },400);

        try {
            const res = await fetch(GAS_URL, {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body: JSON.stringify({action:"chatAI", message:text})
            });
            const data = await res.json();
            clearInterval(typingInterval); typingWrapper.remove();
            appendChatMessage(data.reply,"ai");
        } catch(e) {
            clearInterval(typingInterval); typingWrapper.remove();
            appendChatMessage("エラーが発生しました。","ai");
        }
    }

    function appendChatMessage(text,sender){
        const area=document.getElementById("ai-chat-area");
        if(sender==="ai"){
            const wrapper=document.createElement("div");
            wrapper.className="chat-ai-wrapper";
            const img=document.createElement("img");
            img.className="icon-img";
            img.src="https://lh3.googleusercontent.com/d/1h3_0KsLsApqqdR6fdf3S4DcoMP0Dfz00";
            const bubble=document.createElement("div");
            bubble.className="chat-msg chat-ai";
            bubble.textContent=text;
            wrapper.appendChild(img); wrapper.appendChild(bubble); area.appendChild(wrapper);
        }else{
            const bubble=document.createElement("div");
            bubble.className="chat-msg chat-user";
            bubble.textContent=text;
            area.appendChild(bubble);
        }
        area.scrollTop=area.scrollHeight;
    }
}

