document.addEventListener("DOMContentLoaded", () => {

const loginBtn = document.getElementById("loginBtn");
const gotoRegist = document.getElementById("gotoRegist");
const message = document.getElementById("message");

// GAS WebApp の URL
const GAS_URL = "https://script.google.com/macros/s/AKfycbyzeUMTM_AK_8v00OUNz_BivDg-tL8GBhQclvMkUjLO5v60Xy4MlfyNjBev1xMT4gEj/exec";

// ログインボタン
if (loginBtn) {
    loginBtn.addEventListener("click", async () => {

    const form = document.getElementById("loginForm");
    const username = form.username.value.trim();
    const password = form.password.value.trim();

    if (!username || !password) {
        message.textContent = "ユーザー名とパスワードを入力してください";
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "ログイン中...";

    const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({
        action: "login",
        username,
        password
        })
    });

    const data = await res.json();
    console.log(data);

    if (data.success) {
        // ログイン成功 → main.html に飛ばす
        // 必要なら userId, role を localStorage に保存
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("role", data.role);
        localStorage.setItem("username", data.username);

        location.href = "main.html";
    } else {
        message.textContent = data.msg;
        loginBtn.disabled = false;
        loginBtn.textContent = "ログイン";
    }
    });
}

// 登録画面へ
if (gotoRegist) {
    gotoRegist.addEventListener("click", () => {
    location.href = "regist.html";
    });
}

});
