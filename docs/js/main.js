/* =======================================================
共通変数・DOM取得
======================================================= */
const homeScheduleContainer = document.getElementById("home-schedule");
const eventActiveScheduleContainer = document.getElementById("event-active-schedule");
const eventPastScheduleContainer = document.getElementById("event-past-schedule");
const loadingOverlay = document.getElementById("globalLoading");
let scheduleContainer = [];
let eventMap = {}; 
let practiceMap = {}; 


/* =======================================================
初期処理
======================================================= */
document.addEventListener("DOMContentLoaded", async () => {

    initLoadingScreen();

    // UI は先に使えるようにする
    initBottomNav();
    initEventDelegation();
    initChatBot();


    // スケルトン表示
    scheduleContainer = [
        homeScheduleContainer,
        eventActiveScheduleContainer,
        eventPastScheduleContainer
    ];
    showSkeleton(scheduleContainer);

    const ok = await checkSessionAndGetUserId();
    if (!ok) return;

    // ★ 先にイベント取得
    await getEvents();
    await getPractices();

    // ★ 取得したデータで描画
    loadHomeEvents();   
    loadEventEvents();   

    loadMembersUser();   
    if (userRole === "admin") loadMembersAdmin();

    initCalendar();

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
async function getEvents() {
    try {
        const res = await callGasApi({ action: "getEventsWithStats", userId });

        if (res && res.success && Array.isArray(res.events)) {
            events = res.events;
        } else {
            console.error("データ取得失敗:", res?.msg);
            events = [];
        }

    } catch (e) {
        console.error("イベント取得エラー:", e);
        events = [];
    }
}

async function getPractices() {
    try {
        const res = await callGasApi({ action: "getPracticeWithStats", userId });

        if (res && res.success && Array.isArray(res.practices)) {
            practices = res.practices;

            // practiceMap に格納（eventMap と同じ形式）
            practiceMap = {};
            practices.forEach(p => {
                practiceMap[p.practiceId] = p;
            });

        } else {
            console.error("データ取得失敗:", res?.msg);
            practices = [];
            practiceMap = {};
        }
    } catch (e) {
        console.error("practice取得エラー:", e);
        practices = [];
        practiceMap = {};
    }
}

function loadHomeEvents() {
    homeScheduleContainer.innerHTML = "";
    renderScheduleHome(events);
}

function loadEventEvents() {

    eventActiveScheduleContainer.innerHTML = "";
    eventPastScheduleContainer.innerHTML = "";

    renderScheduleEvent(events);
}

function renderScheduleHome(events) {
    if (!events) return;
    const fragment = document.createDocumentFragment();
    const today = new Date(); today.setHours(0,0,0,0);

    events.forEach(ev => {
        const eventDate = new Date(ev.date); eventDate.setHours(0,0,0,0);
        if (eventDate >= today) {
            eventMap[ev.eventId] = ev;
            const className = ev.type === "festival" ? "event-festival" : "event-regular";
            const card = document.createElement("div");
            card.className = className; card.dataset.eventId = ev.eventId;
            card.innerHTML = `
                <div class="event-date">${ev.date}</div>
                <div class="event-title">${ev.title}</div>
                <div class="answer">${ev.myStatus}</div>
                <div class="responses-list">参加:${ev.yes} 不参加:${ev.no}</div>
                <div class="deadline">期限:${ev.deadline}</div>
            `;
            fragment.appendChild(card);
        }
    });
    homeScheduleContainer.appendChild(fragment);
}

function renderScheduleEvent(events) {
    if (!events || !Array.isArray(events)) return;
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
        const target = event.target;
        // リロード
        if (target.closest(".reload-btn")) {
            location.reload();
            return;
        }

        // イベントカード全体タップ
        const eventCard = target.closest("[data-event-id]");
        if (eventCard && eventCard.closest("#home-schedule, #event-active-schedule, #event-past-schedule")) {
            const eventId = Number(eventCard.dataset.eventId);
            const eventData = eventMap[eventId];
            const card = document.getElementById("eventDetailCard");
            if (card) {
                card.classList.add("active");
                card.dataset.eventId = eventId;
                await fillDetailCard(eventData, userId, card);
            }
            return;
        }

        // 折りたたみ
        function toggleNextList(btn) {
            const ul = btn.nextElementSibling;
            if (!ul) return;
            const isOpen = ul.style.display === "block";
            ul.style.display = isOpen ? "none" : "block";
            btn.classList.toggle("open", !isOpen);
        }
        const toggleBtn = target.closest(
        ".toggle-response-btn, .toggle-performances-btn, .toggle-children-btn"
        );
        if (toggleBtn) {
            toggleNextList(toggleBtn);
            return;
        }

        // 回答
        const responseBtn = target.closest(".response-btn");
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

        // 詳細閉じる（data-targetを利用したケース形式）
        const closeTarget = target.closest(".close-card-btn");
        if (closeTarget) {
            // data-targetで閉じる対象を取得
            const targetType = closeTarget.dataset.target; // "event", "member" など

            switch (targetType) {
                case "event":
                    document.getElementById("eventDetailCard")?.classList.remove("active");
                    break;
                case "member":
                    document.getElementById("membersCardUser")?.classList.remove("active");
                    break;
                case "member-management":
                    document.getElementById("membersCardAdmin")?.classList.remove("active");
                    break;
                case "create":
                    document.getElementById("eventCreateCard")?.classList.remove("active");
                    break;
                default:
                    // data-target が無い場合や想定外
                    break;
            }
            return;
        }

        if(target.closest(".edit-event-btn")) {
            const detailCard = document.getElementById("eventDetailCard");
            const eventId = Number(detailCard.dataset.eventId);
            const eventData = eventMap[eventId];

            openEditForm(eventData);
        }
    });
}

/* =======================================================
    メンバー詳細カードを開く（あなたのHTML形式に対応）
======================================================= */
// タブクリック処理
document.querySelectorAll(".tab-item").forEach(tab => {
    tab.addEventListener("click", async () => {

        const targetTab = tab.dataset.target;
        const userCard = document.getElementById("membersCardUser");
        const adminCard = document.getElementById("membersCardAdmin");

        // 一般メンバー
        if (targetTab === "member") {
            userCard.classList.add("active");
            return;
        }

        // 管理者メンバー管理
        if (targetTab === "member-management") {
            if (userRole === "user") {
                alert("管理者のみアクセスできます。");
                return;
            }
            adminCard.classList.add("active");
            return;
        }

        // 新規作成カード
        if (targetTab === "event-management") {
            if (userRole === "user") {
                alert("管理者のみアクセスできます。");
                return;
            }
            openCreateForm();
            return;
        }
    });
});

// メンバー取得関数
async function loadMembersUser(force = false) {
    const card = document.getElementById("membersCardUser");
    const list = document.getElementById("memberListUser");
    const overlay = card.querySelector(".loading-overlay");

    overlay.style.display = "flex";

    const res = await callGasApi({ action: "getMembers", role: "user" });

    list.innerHTML = "";
    res.members
        .filter(m => m.status === "active")
        .forEach(m => list.appendChild(buildMemberItemUser(m)));

    overlay.style.display = "none";
}

async function loadMembersAdmin(force = false) {
    const card = document.getElementById("membersCardAdmin");
    const list = document.getElementById("memberListAdmin");
    const overlay = card.querySelector(".loading-overlay");

    overlay.style.display = "flex";

    try {
        const res = await callGasApi({ action: "getMembers", role: "admin" });

        list.innerHTML = "";

        const hold = res.members.filter(m => m.status === "hold");
        const active = res.members.filter(m => m.status === "active");

        if (hold.length) {
            list.appendChild(makeTitle("承認待ちメンバー"));
            hold.forEach(m =>
                list.appendChild(buildMemberItemAdmin(m, true))
            );
        }
        if (active.length) {
            list.appendChild(makeTitle("アクティブメンバー"));
            active.forEach(m =>
                list.appendChild(buildMemberItemAdmin(m, false))
            );
        }
    } finally {
        overlay.style.display = "none";
    }
}

function buildMemberItemUser(member) {
    const li = document.createElement("li");
    li.classList.add("member-item");

    // --- ここから追加（役職） ---
    if (member.position) {
        const posSpan = document.createElement("span");
        posSpan.classList.add("member-position");
        posSpan.textContent = member.position;
        li.appendChild(posSpan);
    }
    // --- ここまで追加 ---

    const nameSpan = document.createElement("span");
    nameSpan.classList.add("member-name");
    nameSpan.textContent = member.name;
    li.appendChild(nameSpan);

    appendChildren(li, member);

    return li;
}

function buildMemberItemAdmin(member, isHold) {
    const li = document.createElement("li");
    li.classList.add("member-item");
    if (isHold) li.classList.add("is-hold");

    // --- ここから追加（役職） ---
    if (member.position) {
        const posSpan = document.createElement("span");
        posSpan.classList.add("member-position");
        posSpan.textContent = member.position;
        li.appendChild(posSpan);
    }
    // --- ここまで追加 ---

    // 名前
    const nameSpan = document.createElement("span");
    nameSpan.classList.add("member-name");
    nameSpan.textContent = member.name;
    li.appendChild(nameSpan);

    appendChildren(li, member);

    // 管理ボタン
    const btn = document.createElement("button");
    btn.classList.add("member-action");

    if (isHold) {
        btn.textContent = "承認する";
        btn.addEventListener("click", () => approveMember(member.userId));
    } else {
        btn.textContent = "削除";
        btn.addEventListener("click", () => deleteMember(member.userId));
    }

    li.appendChild(btn);
    return li;
}

function appendChildren(li, member) {
    if (!member.children?.length) return;

    const details = document.createElement("details");
    details.classList.add("children-details");

    const summary = document.createElement("summary");
    summary.textContent = `子供`;
    details.appendChild(summary);

    const ul = document.createElement("ul");
    member.children.forEach(child => {
        const c = document.createElement("li");
        c.textContent = child.childName;
        ul.appendChild(c);
    });

    details.appendChild(ul);
    li.appendChild(details);
}

function makeTitle(text) {
    const p = document.createElement("p");
    p.textContent = text;
    p.classList.add("list-title");
    return p;
}

// ============================
// 承認処理
// ============================
async function approveMember(userId) {
    if (!confirm("このユーザーを承認しますか？")) return;

    const res = await callGasApi({
        action: "approveMember",
        userId
    });

    if (res.success) {
        alert("承認しました！");
        loadMembersAdmin();
    } else {
        alert("承認に失敗しました");
    }
}

// ============================
// 削除処理
// ============================
async function deleteMember(userId) {
    if (!confirm("本当に削除しますか？")) return;

    const res = await callGasApi({
        action: "deleteMember",
        userId
    });

    if (res.success) {
        alert("削除しました！");
        loadMembersAdmin();
    } else {
        alert("削除に失敗しました");
    }
}

// ============================
// 新規入力　初期化  編集
// ============================
function initEventCreateCard() {
    // タイトル・日付・時間を空に
    document.getElementById("eventTitle").value = "";
    document.getElementById("eventDate").value = "";
    document.getElementById("eventTime").value = "";
    document.getElementById("eventLocation").value = "";
    document.getElementById("eventComment").value = "";

    // 演目リストを空に
    const performanceList = document.querySelector(".performance-list");
    performanceList.innerHTML = "";

    // 折りたたみリストを空に
    document.querySelectorAll(".response-list").forEach(ul => ul.innerHTML = "");

    // loading-overlay を非表示
    const overlay = document.querySelector(".event-create-card .loading-overlay");
    if (overlay) overlay.style.display = "none";
}

function openCreateForm() {
    initEventCreateCard();  // ← 全て空にする

    const createCard = document.querySelector(".event-create-card");
    createCard.classList.add("active");
}


function openEditForm(eventData) {
    // 初期化
    initEventCreateCard();

    // 編集IDをセット（←追加）
    const editCard = document.querySelector(".event-create-card");
    editCard.dataset.eventId = eventData.eventId;

    // ラジオ
    document.querySelectorAll('input[name="eventType"]').forEach(radio => {
        radio.checked = (radio.value === eventData.type);
    });

    // テキスト
    document.getElementById("eventTitle").value = eventData.title || "";
    document.getElementById("eventDate").value = (eventData.date || "").replace(/\//g, "-");
    document.getElementById("eventTime").value = eventData.time || "";
    document.getElementById("eventLocation").value = eventData.location || "";
    document.getElementById("eventComment").value = eventData.comment || "";

    // 編集カードを表示
    editCard.classList.add("active");
}



/* =======================================================
イベント新規作成
======================================================= */
document.addEventListener("DOMContentLoaded", () => {
    const addBtn = document.getElementById("addPerformanceBtn");
    const performanceList = document.getElementById("performanceList");
    const saveBtn = document.querySelector(".save-event-btn");

    // 演目追加
    addBtn.addEventListener("click", () => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("performance-item");

        // 演目名
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.placeholder = "演目名";
        nameInput.classList.add("performance-name");
        wrapper.appendChild(nameInput);

        // 固定担当欄
        ["太鼓", "小太鼓", "獅子舞"].forEach(roleName => {
            const roleInput = document.createElement("input");
            roleInput.type = "text";
            roleInput.placeholder = roleName;
            roleInput.classList.add("performance-role");
            roleInput.dataset.role = roleName;
            wrapper.appendChild(roleInput);
        });

        performanceList.appendChild(wrapper);
    });

    // 保存ボタン

    saveBtn.addEventListener("click", async () => {
        if (!confirm("保存しますか？")) return;

        const type = document.querySelector('input[name="eventType"]:checked').value;
        const title = document.getElementById("eventTitle").value.trim();
        const date = document.getElementById("eventDate").value;
        const time = document.getElementById("eventTime").value;
        const location = document.getElementById("eventLocation").value.trim();
        const comment = document.getElementById("eventComment").value;

        if (!title) return alert("タイトルを入力してください");
        if (!date) return alert("日付を選択してください");
        if (!time) return alert("時間を選択してください");

        // ★ 編集 or 新規判定
        const createCard = document.querySelector(".event-create-card");
        const eventId = createCard.dataset.eventId ? Number(createCard.dataset.eventId) : null;

        // ★ eventId を含めて GAS に送る
        const eventData = {
            eventId,   // ← 編集ならIDあり / 新規なら null
            type,
            title,
            date,
            time,
            location,
            comment
        };

        try {
            loadingOverlay.style.display = "flex";

            // GAS 側で new / update を切り替えられる
            const res = await callGasApi({
                action: "saveEvent",
                event: eventData
            });

            if (!res.success) throw new Error(res.message || "イベント保存失敗");

            alert("保存しました");
            document.getElementById("eventCreateCard").classList.remove("active");

        } catch (err) {
            console.error(err);
            alert("保存中にエラーが発生しました");
        } finally {
            loadingOverlay.style.display = "none";
        }
    });
});



/* =======================================================
API 連携ロジック (回答更新 & 詳細表示)
======================================================= */
async function updateResponse(eventId, answer, card, userId) {
    if (loadingOverlay) loadingOverlay.style.display = "flex";
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
    if (loadingOverlay) loadingOverlay.style.display = "none";
}

async function fillDetailCard(eventData, userId, card) {
    if (loadingOverlay) loadingOverlay.style.display = "flex";

    const editBtn = card.querySelector(".edit-event-btn");

    // 管理者のみ編集ボタンを表示
    if (userRole === "admin") {
        editBtn.style.display = "block";
    } else {
        editBtn.style.display = "none";
    }

    try {
        // 基本情報
        card.querySelector(".event-detail-card-title").textContent = eventData.title || "";
        card.querySelector(".event-detail-card-date").textContent = eventData.date || "";
        card.querySelector(".event-detail-card-time-text").textContent = eventData.time || "";
        card.querySelector(".event-detail-card-location").textContent = eventData.location || "場所未設定";
        card.querySelector(".event-detail-card-comment").textContent = eventData.comment || "";

        // --- ここからは既存処理そのまま ---
        const result = await callGasApi({
            action: "getEventDetailWithUserData",
            eventId: Number(eventData.eventId),
            userId
        });

        const myAnswer = result.personal ? result.personal[String(eventData.eventId)] || "" : "";
        card.querySelector(".response-btn.yes").classList.toggle("selected", myAnswer === "参加");
        card.querySelector(".response-btn.no").classList.toggle("selected", myAnswer === "不参加");

        fillResponseList(card.querySelector("ul.response-list.yes"), result.yes);
        fillResponseList(card.querySelector("ul.response-list.no"), result.no);
        fillResponseList(card.querySelector("ul.response-list.na"), result.na);

        card.querySelector(".toggle-response-btn.yes").textContent = `参加者 ${result.yes.length}人`;
        card.querySelector(".toggle-response-btn.no").textContent  = `不参加者 ${result.no.length}人`;
        card.querySelector(".toggle-response-btn.na").textContent  = `未回答者 ${result.na.length}人`;

        const perfList = card.querySelector(".performance-list");
        perfList.innerHTML = "";

        if (Array.isArray(result.performances)) {
            result.performances.forEach(perf => {
                const li = document.createElement("li");
                li.classList.add("performance-item");

                const nameSpan = document.createElement("span");
                nameSpan.classList.add("performance-name");
                nameSpan.textContent = perf.name || "未設定";
                li.appendChild(nameSpan);

                if (perf.roles) {
                    const rolesText = Object.entries(perf.roles)
                        .map(([role, person]) => `${role}: ${person || "未設定"}`)
                        .join(" / ");
                    const rolesSpan = document.createElement("span");
                    rolesSpan.classList.add("performance-roles");
                    rolesSpan.textContent = " - " + rolesText;
                    li.appendChild(rolesSpan);
                }

                perfList.appendChild(li);
            });
        }

        card.querySelectorAll(".response-list").forEach(ul => ul.style.display = "none");

    } catch(e) {
        console.error(e);
    } finally {
        if (loadingOverlay) loadingOverlay.style.display = "none";
    }
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
    if(!input || !sendBtn || !area) return;

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

        // エラー（success:false）
        if (!data.success) {
            appendChatMessage(
                data.message || "AIサービスでエラーが発生しました。",
                "ai"
            );
            return;
        }

        // 成功
        appendChatMessage(data.reply, "ai");

    } catch (e) {
        typingWrapper.remove();
        appendChatMessage("通信エラーが発生しました。", "ai");
    }

    }

    function createTypingIndicator() {
        const wrapper = document.createElement("div");
        wrapper.className = "chat-ai-wrapper";

        const icon = `<img class="icon-img" src="images/鳥生獅子連_ししまる.PNG">`;

        const msg = document.createElement("div");
        msg.className = "chat-msg chat-ai";
        msg.textContent = "入力中";

        wrapper.innerHTML = icon;
        wrapper.appendChild(msg);

        let dotCount = 0;
        const intervalId = setInterval(() => {
            dotCount = (dotCount + 1) % 4;
            msg.textContent = "入力中" + ".".repeat(dotCount);
        }, 400);

        const originalRemove = wrapper.remove;
        wrapper.remove = function () {
            clearInterval(intervalId);
            originalRemove.call(this);
        };

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

function initCalendar() {
    const today = new Date();
    generateCalendar(today.getFullYear(), today.getMonth());
}

function generateCalendar(year, month) {
    function normalize(dateStr) {
        return dateStr.replace(/-/g, "/").split(" ")[0];
    }

    const cal = document.getElementById("calendarArea");
    cal.innerHTML = "";

    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

    let html = `
        <div class="cal-header">
            <button class="prev">＜</button>
            <span>${year}年${month+1}月</span>
            <button class="next">＞</button>
        </div>

        <div class="cal-grid">
    `;

    for (let w of weekdays) {
        html += `<div class="cal-weekday">${w}</div>`;
    }

    for (let i = 0; i < startWeekday; i++) {
        html += `<div class="empty"></div>`;
    }

    for (let d = 1; d <= totalDays; d++) {

    const fullDate =
    `${year}/${String(month+1).padStart(2,"0")}/${String(d).padStart(2,"0")}`;

    // 祭り・通常イベント（eventMap）
    const event = Object.values(eventMap).find(
        e => normalize(e.date) === normalize(fullDate)
    );

    // 練習日（practiceMap）
    const practice = Object.values(practiceMap).find(
        p => normalize(p.date) === normalize(fullDate)
    );

    let dots = "";
    if (event?.type === "festival") dots += '<span class="event-dot festival"></span>';
    if (event?.type === "regular")  dots += '<span class="event-dot regular"></span>';
    if (practice)                    dots += '<span class="event-dot practice"></span>';

    html += `
    <div class="day" data-date="${fullDate}">
        ${d}
        <div class="dots">
            ${dots}
        </div>
    </div>
    `;
    }

    html += `</div>`;
    cal.innerHTML = html;

    cal.querySelector(".prev").addEventListener("click", () => {
        const prev = new Date(year, month - 1);
        generateCalendar(prev.getFullYear(), prev.getMonth());
    });

    cal.querySelector(".next").addEventListener("click", () => {
        const next = new Date(year, month + 1);
        generateCalendar(next.getFullYear(), next.getMonth());
    });

    cal.querySelectorAll(".day").forEach(day => {
        day.addEventListener("click", () => {
            const date = day.dataset.date;
            loadEventByDate(date);
        });
    });
}
