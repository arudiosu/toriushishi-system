document.addEventListener("DOMContentLoaded", () => {
const loginBtn = document.getElementById("loginBtn");
const gotoRegist = document.getElementById("gotoRegist");
const message = document.getElementById("message");


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

        try {
            const res = await fetch(GAS_URL, {
                method: "POST",
                body: JSON.stringify({ action: "login", username, password })
            });

            const data = await res.json(); 
            console.log(data);

            if (data.success) {
                // 🔑 セッションIDだけ保存
                localStorage.setItem("sessionId", data.sessionId);

                // 他の情報は API を呼ぶたびに取得
                location.href = "main.html";
            } else {
                message.textContent = data.msg;
                loginBtn.disabled = false;
                loginBtn.textContent = "ログイン";
            }
        } catch (err) {
            message.textContent = "通信エラー";
            loginBtn.disabled = false;
            loginBtn.textContent = "ログイン";
            console.error(err);
        }
    });
}

if (gotoRegist) {
    gotoRegist.addEventListener("click", () => {
        location.href = "regist.html";
    });
}

});
