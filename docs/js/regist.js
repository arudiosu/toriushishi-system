// 戻るボタン
document.getElementById("backLogin").addEventListener("click", () => {
google.script.run
    .withSuccessHandler(html => {
    document.open();
    document.write(html); // 完全リセット
    document.close();
    })
    .getLoginPage();
});

// 子供追加
document.getElementById("addChildBtn").addEventListener("click", () => {
const list = document.getElementById("childList");
const input = document.createElement("input");
input.type = "text";
input.classList.add("child-name");
input.placeholder = "子供の名前";
list.appendChild(input);
});

// 登録ボタン
document.getElementById("registBtn").addEventListener("click", () => {

const lastName  = document.getElementById("lastName").value.trim();
const firstName = document.getElementById("firstName").value.trim();
const password  = document.getElementById("password").value.trim();

if (!lastName || !firstName || !password) {
    alert("氏名とパスワードは必須です。");
    return;
}

const childInputs = document.querySelectorAll(".child-name");
const children = Array.from(childInputs).map(i => i.value.trim());

const form = { lastName, firstName, password, children };

// ボタンを無効化して連打防止
const btn = document.getElementById("registBtn");
btn.disabled = true;
btn.textContent = "申請中...";

google.script.run
    .withSuccessHandler(() => {
    alert("申請を行いました。承認されるまでお待ちください。");
    })
    .withFailureHandler(err => {
    alert("エラー：" + err.message);
    btn.disabled = false;     // エラーならボタンを再有効化
    btn.textContent = "申請";
    })
    .registUser(form);
});
