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
            // mode: "cors" は省略可（デフォルト）、headersも text/plain でOK
            body: JSON.stringify({ action: "login", username, password })
        });

        // GASが正常にレスポンスを返せば、ここで直接JSONとして受け取れます
        const data = await res.json(); 
        console.log(data);

        if (data.success) {
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("role", data.role);
        localStorage.setItem("username", data.username);
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
