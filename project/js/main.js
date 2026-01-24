<script>
/* =======================================================
共通変数・DOM取得
======================================================= */
const homeScheduleContainer = document.getElementById("home-schedule");
const eventActiveScheduleContainer = document.getElementById("event-active-schedule");
const eventPastScheduleContainer = document.getElementById("event-past-schedule");
let scheduleContainer = [];
let eventMap = {}; // eventId → eventData

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
イベント取得・描画
======================================================= */
function loadHomeEvents() {
    google.script.run.withSuccessHandler(events => {
        homeScheduleContainer.innerHTML = "";
        renderScheduleHome(events);
    }).getEventsWithStats(userId);
}
function loadEventEvents() {
    google.script.run.withSuccessHandler(events => {
        eventActiveScheduleContainer.innerHTML = "";
        eventPastScheduleContainer.innerHTML = "";
        renderScheduleEvent(events);
    }).getEventsWithStats(userId);
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
    document.body.addEventListener("click", (event) => {

        if (event.target.closest(".reload-btn")) {

                    const tab = event.target.closest(".tab-content");
                    const tabId = tab?.id;

                    switch (tabId) {
                        case "home":
                            showSkeleton([homeScheduleContainer]);
                            loadHomeEvents();
                            break;

                        case "event":
                            showSkeleton([eventActiveScheduleContainer, eventPastScheduleContainer]);
                            loadEventEvents();
                            break;

                        case "calendar":
                            break;

                        case "user":
                            break;
                    }
                    return;
                }


        // 詳細カード閉じる
        if (event.target.closest(".close-event-detail-card-btn")) {
            event.target.closest(".event-detail-card")?.classList.remove("active");
            return;
        }

        // 詳細ボタン
        const detailBtn = event.target.closest(".detail");
        if (detailBtn) {
            const eventId = Number(detailBtn.dataset.eventId);
            const eventData = eventMap[eventId];

            const card = document.querySelector(".event-detail-card");
            card.classList.add("active");

            // 🔹 ここでカードにイベントIDをセット
            card.dataset.eventId = eventId;

            fillDetailCard(eventData, userId, card);
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

        //回答反映
        const responseBtn = event.target.closest(".response-btn");
        if (responseBtn) {
            const card = responseBtn.closest(".event-detail-card");

            // ▼ 日付チェック追加 ▼
            const dateText = card.querySelector(".event-detail-card-date")?.textContent || "";
            const eventDate = new Date(dateText.replace(/\//g, "-")); // "2026/01/20" を Date化
            eventDate.setHours(0, 0, 0, 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (eventDate < today) {
                alert("過去のイベントは回答できません。");
                return; // 更新処理を止める
            }
            // ▲ ここまで ▲

            const eventId = Number(card.dataset.eventId);
            const answer  = responseBtn.classList.contains("yes") ? "参加" : "不参加";
            updateResponse(eventId, answer, card, userId);
            return;
        }

    });
}

/* =======================================================
回答更新 + フロント反映
======================================================= */
function updateResponse(eventId, answer, card, userId) {
    if (!card) return;

    const overlay = card.querySelector(".loading-overlay");
    if (!overlay) return;

    overlay.style.display = "flex"; // 読み込み開始

    const yesBtn = card.querySelector(".response-btn.yes");
    const noBtn  = card.querySelector(".response-btn.no");

    // 自分用ボタン選択
    yesBtn.classList.toggle("selected", answer === "参加");
    noBtn.classList.toggle("selected", answer === "不参加");

    // GAS に送信して結果を受け取る
    google.script.run.withSuccessHandler(result => {
        const yesList = card.querySelector("ul.response-list.yes");
        const noList  = card.querySelector("ul.response-list.no");
        const naList  = card.querySelector("ul.response-list.na");

        const toggleYesBtn = card.querySelector(".toggle-response-btn.yes");
        const toggleNoBtn  = card.querySelector(".toggle-response-btn.no");
        const toggleNaBtn  = card.querySelector(".toggle-response-btn.na");

        // リストを更新
        fillResponseList(yesList, result.yes);
        fillResponseList(noList, result.no);
        fillResponseList(naList, result.na);

        // トグルタイトル横の人数更新
        if (toggleYesBtn) toggleYesBtn.textContent = `参加者 ${result.yes.length}人`;
        if (toggleNoBtn)  toggleNoBtn.textContent  = `不参加者 ${result.no.length}人`;
        if (toggleNaBtn)  toggleNaBtn.textContent  = `未回答者 ${result.na.length}人`;

        overlay.style.display = "none"; // データ反映後に非表示
    }).updateEventResponse(eventId, userId, answer);
}


/* =======================================================
詳細カードにデータを埋める
======================================================= */
function fillDetailCard(eventData, userId) {
    const card = document.getElementById("eventDetailCard");
    if (!card) return;

    const overlay = card.querySelector(".loading-overlay");
    if (!overlay) return;

    overlay.style.display = "flex"; // 読み込み開始

    // 自分用ボタン
    const yesBtn = card.querySelector(".response-btn.yes");
    const noBtn  = card.querySelector(".response-btn.no");

    // リスト
    const yesList = card.querySelector("ul.response-list.yes");
    const noList  = card.querySelector("ul.response-list.no");
    const naList  = card.querySelector("ul.response-list.na");

    const toggleYesBtn = card.querySelector(".toggle-response-btn.yes");
    const toggleNoBtn  = card.querySelector(".toggle-response-btn.no");
    const toggleNaBtn  = card.querySelector(".toggle-response-btn.na");

    // タイトル・日時
    card.querySelector(".event-detail-card-title").textContent = eventData.title || "";
    card.querySelector(".event-detail-card-date").textContent = eventData.date || "";
    card.querySelector(".event-detail-card-time-text").textContent = eventData.time || "";

    // 初期化
    [yesBtn, noBtn].forEach(btn => btn.classList.remove("selected"));
    [yesList, noList, naList].forEach(ul => ul.innerHTML = "");

    const eventId = Number(eventData.eventId);

    // GASからデータ取得
    google.script.run.withSuccessHandler(result => {
        const myAnswer = result.personal[String(eventId)] || "";

        // 自分用ボタンの選択反映
        yesBtn.classList.toggle("selected", myAnswer === "参加");
        noBtn.classList.toggle("selected", myAnswer === "不参加");

        // リストに名前をセット
        fillResponseList(yesList, result.yes);
        fillResponseList(noList, result.no);
        fillResponseList(naList, result.na);

        // トグルタイトル横に人数表示
        if (toggleYesBtn) toggleYesBtn.textContent = `参加者 ${result.yes.length}人`;
        if (toggleNoBtn)  toggleNoBtn.textContent  = `不参加者 ${result.no.length}人`;
        if (toggleNaBtn)  toggleNaBtn.textContent  = `未回答者 ${result.na.length}人`;

        // リストは初期閉じ
        [yesList, noList, naList].forEach(ul => ul.style.display = "none");

        overlay.style.display = "none"; // データ反映後に非表示

    }).getEventDetailWithUserData(eventId, userId);
}


/* =======================================================
折りたたみリスト作成（右に人数）
======================================================= */
function fillResponseList(ulElement, names) {
    if (!ulElement) return;
    ulElement.innerHTML = names.map(name => `<li><span class="name">${name}</span></li>`).join('');
}


function initChatBot() {
    const input = document.getElementById("chat-input");
    const sendBtn = document.getElementById("chat-send-btn");
    const area = document.getElementById("ai-chat-area");

    sendBtn.addEventListener("click", sendChat);
    input.addEventListener("keypress", (e) => { if(e.key === "Enter") sendChat(); });


function sendChat() {
    const text = input.value.trim();
    if(!text) return;
    appendChatMessage(text, "user");
    input.value = "";

    // 「入力中...」用の wrapper を作成
    const typingWrapper = document.createElement("div");
    typingWrapper.className = "chat-ai-wrapper";

    // AIアイコン
    const img = document.createElement("img");
    img.className = "icon-img";
    img.src = "https://lh3.googleusercontent.com/d/1h3_0KsLsApqqdR6fdf3S4DcoMP0Dfz00";

    // バブル部分
    const typingBubble = document.createElement("div");
    typingBubble.className = "chat-msg chat-ai typing";
    typingBubble.textContent = "入力中";

    typingWrapper.appendChild(img);
    typingWrapper.appendChild(typingBubble);
    area.appendChild(typingWrapper);
    area.scrollTop = area.scrollHeight;

    // 点が増えるアニメーション
    let dotCount = 0;
    const typingInterval = setInterval(() => {
        dotCount = (dotCount + 1) % 4; // 0〜3
        typingBubble.textContent = "入力中" + ".".repeat(dotCount);
        area.scrollTop = area.scrollHeight;
    }, 400);

    // AI に送信
    google.script.run
        .withSuccessHandler(res => {
            clearInterval(typingInterval);       // アニメーション停止
            typingWrapper.remove();              // 「入力中」を削除
            appendChatMessage(res, "ai");        // AIメッセージ表示
        })
        .withFailureHandler(() => {
            clearInterval(typingInterval);
            typingWrapper.remove();
            appendChatMessage("エラーが発生しました。", "ai");
        })
        .chatAI(text);
}



    function appendChatMessage(text, sender) {
        const area = document.getElementById("ai-chat-area");

        // AI の場合は wrapper + 画像アイコン
        if (sender === "ai") {
            const wrapper = document.createElement("div");
            wrapper.className = "chat-ai-wrapper";

            const img = document.createElement("img");
            img.className = "icon-img";
            img.src = "https://lh3.googleusercontent.com/d/1h3_0KsLsApqqdR6fdf3S4DcoMP0Dfz00";

            const bubble = document.createElement("div");
            bubble.className = "chat-msg chat-ai";
            bubble.textContent = text;

            wrapper.appendChild(img);
            wrapper.appendChild(bubble);

            area.appendChild(wrapper);
        } 
        
        // ユーザーの通常メッセージ
        else {
            const bubble = document.createElement("div");
            bubble.className = "chat-msg chat-user";
            bubble.textContent = text;
            area.appendChild(bubble);
        }

        area.scrollTop = area.scrollHeight;
    }


}

</script>
