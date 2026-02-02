
checkAdminAccess();

/* =======================================================
共通変数・DOM取得
======================================================= */
const homeScheduleContainer = document.getElementById("home-schedule");
const eventActiveScheduleContainer = document.getElementById("event-active-schedule");
const eventPastScheduleContainer = document.getElementById("event-past-schedule");
let scheduleContainer = [];
let eventMap = {}; 


/* =======================================================
初期処理
======================================================= */
document.addEventListener("DOMContentLoaded", () => {
    initLoadingScreen();
    scheduleContainer = [homeScheduleContainer, eventActiveScheduleContainer, eventPastScheduleContainer];
    showSkeleton(scheduleContainer);
    loadHomeEvents();
    loadEventEvents();
    initBottomNav();
    initEventDelegation();
    initChatBot();
    loadMembersUser();
    loadMembersAdmin();
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
async function loadHomeEvents() {
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
            const tabId = target.closest(".tab-content")?.id;

            switch (tabId) {
                case "home":
                    showSkeleton([homeScheduleContainer]);
                    await loadHomeEvents();
                    break;

                case "event":
                    showSkeleton([
                        eventActiveScheduleContainer,
                        eventPastScheduleContainer
                    ]);
                    await loadEventEvents();
                    break;

                // case "user":
                //     // await loadMembersUser();
                //     // console.log("on");
                //     break;
            }
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
            const card = document.getElementById("eventCreateCard");
            card.classList.add("active");
            // 必要なら初期化関数を呼ぶ
            initEventCreateCard();
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

    // 承認待ちバッジ
    if (isHold) {
        const badge = document.createElement("span");
        badge.classList.add("badge-hold");
        badge.textContent = "承認待ち";
        li.appendChild(badge);
    }

    // 名前
    const nameSpan = document.createElement("span");
    nameSpan.classList.add("member-name");
    nameSpan.textContent = member.name;
    li.appendChild(nameSpan);

    // 子供
    appendChildren(li, member);

    // ボタン（管理者のみ）
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
    summary.textContent = `子供（${member.children.length}人）`;
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
// 新規入力　初期化
// ============================
function initEventCreateCard() {
    // タイトル・日付・時間を空に
    document.getElementById("eventTitle").value = "";
    document.getElementById("eventDate").value = "";
    document.getElementById("eventTime").value = "";

    // 演目リストを空に
    const performanceList = document.querySelector(".performance-list");
    performanceList.innerHTML = "";

    // 折りたたみリストを空に
    document.querySelectorAll(".response-list").forEach(ul => ul.innerHTML = "");

    // loading-overlay を非表示
    const overlay = document.querySelector(".event-create-card .loading-overlay");
    if (overlay) overlay.style.display = "none";
}

/* =======================================================
イベント新規作成
======================================================= */
document.addEventListener("DOMContentLoaded", () => {
    const addBtn = document.getElementById("addPerformanceBtn");
    const performanceList = document.getElementById("performanceList");
    const saveBtn = document.querySelector(".save-event-btn");
    const loadingOverlay = document.querySelector(".event-create-card .loading-overlay");

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

        if (!title) return alert("タイトルを入力してください");
        if (!date) return alert("日付を選択してください");
        if (!time) return alert("時間を選択してください");

        const eventData = { type, title, date, time, location };

        try {
            loadingOverlay.style.display = "flex";

            // イベント保存
            const res = await callGasApi({ action: "saveEvent", event: eventData });
            if (!res.success) throw new Error(res.message || "イベント保存失敗");
            const eventId = res.eventId;

            // 演目保存
            const items = document.querySelectorAll(".performance-item");
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const name = item.querySelector(".performance-name").value.trim();
                if (!name) continue;

                const roles = {};
                item.querySelectorAll(".performance-role").forEach(input => {
                    roles[input.dataset.role] = input.value.trim();
                });

                await callGasApi({
                    action: "addPerformance",
                    performance: { eventId, name, order: i + 1, roles }
                });
            }

            alert("イベントと演目を保存しました");
            document.getElementById("eventCreateCard").style.display = "none";

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

    try {
        // 基本情報
        card.querySelector(".event-detail-card-title").textContent = eventData.title || "";
        card.querySelector(".event-detail-card-date").textContent = eventData.date || "";
        card.querySelector(".event-detail-card-time-text").textContent = eventData.time || "";
        card.querySelector(".event-detail-card-location").textContent = eventData.location || "場所未設定";
        // 詳細取得
        const result = await callGasApi({
            action: "getEventDetailWithUserData",
            eventId: Number(eventData.eventId),
            userId
        });

        // 自分の回答
        const myAnswer = result.personal ? result.personal[String(eventData.eventId)] || "" : "";
        card.querySelector(".response-btn.yes").classList.toggle("selected", myAnswer === "参加");
        card.querySelector(".response-btn.no").classList.toggle("selected", myAnswer === "不参加");

        // 参加者リスト
        fillResponseList(card.querySelector("ul.response-list.yes"), result.yes);
        fillResponseList(card.querySelector("ul.response-list.no"), result.no);
        fillResponseList(card.querySelector("ul.response-list.na"), result.na);

        card.querySelector(".toggle-response-btn.yes").textContent = `参加者 ${result.yes.length}人`;
        card.querySelector(".toggle-response-btn.no").textContent  = `不参加者 ${result.no.length}人`;
        card.querySelector(".toggle-response-btn.na").textContent  = `未回答者 ${result.na.length}人`;

        // 演目リスト表示
        const perfList = card.querySelector(".performance-list");
        perfList.innerHTML = ""; // クリア

        if (Array.isArray(result.performances)) {
            result.performances.forEach(perf => {
                const li = document.createElement("li");
                li.classList.add("performance-item");

                // 演目名
                const nameSpan = document.createElement("span");
                nameSpan.classList.add("performance-name");
                nameSpan.textContent = perf.name || "未設定";
                li.appendChild(nameSpan);

                // 担当情報
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

        // 初期状態でリストを閉じる
        card.querySelectorAll(".response-list").forEach(ul => ul.style.display = "none");

    } catch(e) {
        console.error(e);
    } finally {
        if (overlay) overlay.style.display = "none";
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
