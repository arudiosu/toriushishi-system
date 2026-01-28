
// ★ ここにあなたのデプロイURLを入れる
window.GAS_URL = "https://script.google.com/macros/s/AKfycbyzeUMTM_AK_8v00OUNz_BivDg-tL8GBhQclvMkUjLO5v60Xy4MlfyNjBev1xMT4gEj/exec";

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
権限チェック
======================================================= */
let userId;   // ページ内で一時的に保持
let userRole; // ページ内で一時的に保持

async function checkAdminAccess() {
    try {
        const sessionId = localStorage.getItem("sessionId");
        if (!sessionId) {
            alert("ログインしてください");
            location.href = "index.html";
            return false;
        }

        const res = await callGasApi({
            action: "validateSession",
            sessionId,
            requiredRole: "admin"
        });

        if (!res.valid) {
            alert(res.msg || "権限がありません");
            return false;
        }

        // 管理者 OK の場合、userId と role を取得
        userId = res.userId;
        userRole = res.role; // ← 正しいプロパティ名
        return true;

    } catch (err) {
        console.error("Admin check error:", err);
        alert("通信エラー");
        return false;
    }
}

