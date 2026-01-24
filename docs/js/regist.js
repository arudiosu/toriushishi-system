// =============================
// 戻るボタン（ログイン画面に戻す）
// =============================
document.getElementById("backLogin").addEventListener("click", () => {
    // 通常の画面遷移（フロント用）
    window.location.href = "index.html"; 
});


// =============================
// 子供追加
// =============================
document.getElementById("addChildBtn").addEventListener("click", () => {
    const list = document.getElementById("childList");
    const input = document.createElement("input");
    input.type = "text";
    input.classList.add("child-name");
    input.placeholder = "子供の名前";
    list.appendChild(input);
});


// =============================
// 登録ボタン
// =============================
document.getElementById("registBtn").addEventListener("click", async () => {

    const lastName  = document.getElementById("lastName").value.trim();
    const firstName = document.getElementById("firstName").value.trim();
    const password  = document.getElementById("password").value.trim();

    if (!lastName || !firstName || !password) {
        alert("氏名とパスワードは必須です。");
        return;
    }

    const childInputs = document.querySelectorAll(".child-name");
    const children = Array.from(childInputs).map(i => i.value.trim());

    const form = {
        action: "regist",
        lastName,
        firstName,
        password,
        children
    };

    // 連打防止
    const btn = document.getElementById("registBtn");
    btn.disabled = true;
    btn.textContent = "申請中...";

    try {
        // ★ 共通 API を使う形に変更！
        const result = await callGasApi(form);

        if (result.success) {
            alert("申請を行いました。承認されるまでお待ちください。");
            window.location.href = "index.html";
        } else {
            throw new Error(result.msg || "エラーが発生しました。");
        }

    } catch (err) {
        alert("エラー：" + err.message);
        btn.disabled = false;
        btn.textContent = "申請";
    }
});
