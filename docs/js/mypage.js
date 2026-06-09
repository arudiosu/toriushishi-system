// =======================================================
// マイページ
// =======================================================

function openMyPage() {
    document.getElementById("myPageCard").classList.add("active");
    loadMyPage();
}

async function loadMyPage() {
    const card = document.getElementById("myPageCard");
    const overlay = card.querySelector(".loading-overlay");
    const content = document.getElementById("myPageContent");
    overlay.style.display = "flex";
    content.innerHTML = "";
    const res = await callGasApi({ action: "getMyPage", userId });
    overlay.style.display = "none";
    if (!res?.success) { content.innerHTML = '<p style="padding:16px;color:var(--text-3);">取得失敗</p>'; return; }
    renderMyPage(res);
}

function renderMyPage({ user, gear, eventRate, practiceRate }) {
    const content = document.getElementById("myPageContent");
    const g = gear || {};
    const gearRows = [
        { label: "法被番号",     val: g.happi_no },
        { label: "Tシャツサイズ", val: g.tshirt_size },
        { label: "手甲",         val: g.tekkou },
        { label: "はかま",       val: g.hakama },
        { label: "着物（上）",   val: g.kimono_top },
        { label: "着物（下）",   val: g.kimono_bottom },
        { label: "メモ",         val: g.memo },
    ].filter(r => r.val !== "" && r.val !== undefined);

    const roleLabel = user.role === "admin" ? "管理者" : "一般";
    const eventPct  = eventRate   ? Math.round(eventRate.rate * 100)   : null;
    const pracPct   = practiceRate ? Math.round(practiceRate.rate * 100) : null;

    content.innerHTML = `
        <div class="mypage-profile">
            <div class="mypage-avatar"><i class="fas fa-user"></i></div>
            <div class="mypage-profile-info">
                <div class="mypage-name">${escHtml(user.name)}</div>
                <div class="mypage-role">${roleLabel}</div>
            </div>
        </div>

        <div class="mypage-section">
            <div class="mypage-section-title">参加率</div>
            ${eventRate ? rateBar("イベント", eventPct, eventRate.participated, eventRate.total) : '<p class="mypage-empty">データなし</p>'}
            ${practiceRate ? rateBar("練習", pracPct, practiceRate.participated, practiceRate.total) : ""}
        </div>

        <div class="mypage-section">
            <div class="mypage-section-title">装備情報</div>
            ${gearRows.length ? gearRows.map(r => `
                <div class="mypage-gear-row">
                    <span class="mypage-gear-label">${escHtml(r.label)}</span>
                    <span class="mypage-gear-val">${escHtml(String(r.val))}</span>
                </div>
            `).join("") : '<p class="mypage-empty">未登録</p>'}
        </div>
    `;
}

function rateBar(label, pct, participated, total) {
    return `
        <div class="mypage-rate-item">
            <div class="mypage-rate-header">
                <span class="mypage-rate-label">${label}</span>
                <span class="mypage-rate-pct">${pct}%</span>
                <span class="mypage-rate-count">${participated}/${total}</span>
            </div>
            <div class="mypage-bar-wrap">
                <div class="mypage-bar" style="width:${pct}%"></div>
            </div>
        </div>
    `;
}
