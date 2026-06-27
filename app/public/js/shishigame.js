// =======================================================
// 獅子、町を行く
// =======================================================

const SG_W = 360;
const SG_H = 220;
const SG_GROUND = 168;
const SG_LION_X = 72;
const SG_GRAVITY = 0.58;
const SG_JUMP_VY = -11.5;

let sgGame = null;
let sgRankingLoaded = false;

// -------------------------------------------------------
// Entry
// -------------------------------------------------------

function openGameCard() {
    document.getElementById("gameCard").classList.add("active");
    if (!sgGame) {
        const canvas = document.getElementById("sgCanvas");
        setupGameCanvas(canvas);
    }
    showGameTab("game");
}

function setupGameCanvas(canvas) {
    canvas.width = SG_W;
    canvas.height = SG_H;
    sgGame = new ShishiGame(canvas, onGameOver);
    sgGame.drawIdle();

    canvas.addEventListener("click", () => sgHandleInput());
    canvas.addEventListener("touchstart", e => { e.preventDefault(); sgHandleInput(); }, { passive: false });
}

function sgHandleInput() {
    if (!sgGame) return;
    if (sgGame.dead || !sgGame.started) {
        sgGame.start();
    } else {
        sgGame.jump();
    }
}

document.addEventListener("keydown", e => {
    const card = document.getElementById("gameCard");
    if (!card || !card.classList.contains("active")) return;
    if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        sgHandleInput();
    }
});

async function onGameOver(score, bites) {
    const res = await callGasApi({ action: "saveGameScore", userId, score });
    if (res?.success && res.isHighScore) {
        document.getElementById("sgHighScoreBadge").style.display = "inline";
    } else {
        document.getElementById("sgHighScoreBadge").style.display = "none";
    }
    document.getElementById("sgFinalScore").textContent = score;
    document.getElementById("sgFinalBites").textContent = bites;
    document.getElementById("sgResultOverlay").style.display = "flex";
    sgRankingLoaded = false;
}

function sgRetry() {
    document.getElementById("sgResultOverlay").style.display = "none";
    if (sgGame) sgGame.start();
}

function showGameTab(tab) {
    document.getElementById("sgGamePane").style.display = tab === "game" ? "" : "none";
    document.getElementById("sgRankingPane").style.display = tab === "ranking" ? "" : "none";
    document.getElementById("sgTabGame").classList.toggle("active", tab === "game");
    document.getElementById("sgTabRanking").classList.toggle("active", tab === "ranking");
    if (tab === "ranking" && !sgRankingLoaded) loadGameRanking();
}

async function loadGameRanking() {
    const list = document.getElementById("sgRankingList");
    list.innerHTML = '<p class="sg-rank-loading">読み込み中…</p>';
    const res = await callGasApi({ action: "getGameRanking" });
    sgRankingLoaded = true;
    if (!res?.success) { list.innerHTML = '<p class="sg-rank-loading">取得失敗</p>'; return; }
    const ranking = res.ranking || [];
    if (!ranking.length) { list.innerHTML = '<p class="sg-rank-loading">まだ記録なし</p>'; return; }
    list.innerHTML = ranking.map((r, i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
        const isMe = String(r.user_id) === String(userId);
        return `
        <div class="sg-rank-row${isMe ? " sg-rank-me" : ""}">
            <span class="sg-rank-pos">${medal}</span>
            <span class="sg-rank-name">${escHtml(r.user_name)}</span>
            <span class="sg-rank-score">${r.score.toLocaleString()}pt</span>
        </div>`;
    }).join("");
}

// -------------------------------------------------------
// Game Class
// -------------------------------------------------------

class ShishiGame {
    constructor(canvas, onOver) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.onOver = onOver;
        this.raf = null;
        this.dead = false;
        this.started = false;
        this._buildings = this._genBuildings();
        this._init();
    }

    _init() {
        this.score = 0;
        this.bites = 0;
        this.dist = 0;
        this.speed = 4;
        this.frame = 0;
        this.dead = false;
        this.started = false;
        this.lion = { y: SG_GROUND, vy: 0, onGround: true };
        this.objects = [];
        this.particles = [];
        this.spawnCD = 80;
        this.bgX = 0;
    }

    _genBuildings() {
        const arr = [];
        let x = 0;
        while (x < SG_W * 3) {
            const w = 38 + Math.random() * 34;
            arr.push({ x, w, h: 36 + Math.random() * 55, hue: 200 + Math.random() * 40, light: 48 + Math.random() * 20 });
            x += w + 8 + Math.random() * 20;
        }
        return arr;
    }

    start() {
        this._init();
        if (this.raf) cancelAnimationFrame(this.raf);
        const loop = () => {
            this.update();
            this.draw();
            if (!this.dead) this.raf = requestAnimationFrame(loop);
        };
        this.started = true;
        loop();
    }

    drawIdle() {
        this._init();
        this.draw();
    }

    jump() {
        if (this.lion.onGround && !this.dead) {
            this.lion.vy = SG_JUMP_VY;
            this.lion.onGround = false;
        }
    }

    update() {
        this.frame++;
        this.dist++;
        this.speed = 4 + Math.floor(this.dist / 700) * 0.5;
        this.score = Math.floor(this.dist / 8) + this.bites * 100;

        // Lion physics
        this.lion.vy += SG_GRAVITY;
        this.lion.y += this.lion.vy;
        if (this.lion.y >= SG_GROUND) {
            this.lion.y = SG_GROUND;
            this.lion.vy = 0;
            this.lion.onGround = true;
        }

        // Background scroll (world moves left as lion advances)
        this.bgX += this.speed * 0.28;

        // Spawn
        this.spawnCD--;
        if (this.spawnCD <= 0) {
            const isChild = Math.random() < 0.38;
            this.objects.push({ type: isChild ? "child" : "car", x: SG_W + 20, scored: false, hit: false });
            this.spawnCD = 52 + Math.random() * 72;
        }

        // Objects
        for (const obj of this.objects) {
            obj.x -= this.speed;
            if (obj.type === "child" && !obj.scored) {
                if (Math.abs(obj.x - SG_LION_X) < 22 && this.lion.onGround) {
                    obj.scored = true;
                    this.bites++;
                    for (let i = 0; i < 8; i++) {
                        this.particles.push({
                            x: SG_LION_X + 18, y: SG_GROUND - 28,
                            vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4 - 1,
                            life: 28, color: i % 2 === 0 ? "#FFD700" : "#FF6B6B"
                        });
                    }
                }
            }
            if (obj.type === "car" && !obj.hit) {
                const lx = SG_LION_X - 16, ly = this.lion.y - 42;
                const ox = obj.x - 22, oy = SG_GROUND - 34;
                if (lx < ox + 44 && lx + 32 > ox && ly < oy + 34 && ly + 42 > oy) {
                    obj.hit = true;
                    this.dead = true;
                    this.onOver && this.onOver(this.score, this.bites);
                    return;
                }
            }
        }

        // Particles
        this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life--; });
        this.particles = this.particles.filter(p => p.life > 0);
        this.objects = this.objects.filter(o => o.x > -80);
    }

    draw() {
        const ctx = this.ctx;
        const W = SG_W, H = SG_H;
        const f = this.frame;

        // Sky
        const sky = ctx.createLinearGradient(0, 0, 0, SG_GROUND);
        sky.addColorStop(0, "#6AADDA");
        sky.addColorStop(1, "#B8DCF0");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);

        // Buildings
        const period = SG_W * 3;
        const bx = ((this.bgX % period) + period) % period;
        for (const b of this._buildings) {
            const dx = ((b.x - bx) % period + period) % period;
            if (dx > W + 80) continue;
            ctx.fillStyle = `hsl(${b.hue},18%,${b.light}%)`;
            ctx.fillRect(dx, SG_GROUND - b.h, b.w, b.h);
            ctx.fillStyle = "rgba(255,255,180,0.55)";
            for (let wy = SG_GROUND - b.h + 7; wy < SG_GROUND - 7; wy += 14) {
                for (let wx = dx + 5; wx < dx + b.w - 5; wx += 11) {
                    ctx.fillRect(wx, wy, 6, 7);
                }
            }
        }

        // Ground
        ctx.fillStyle = "#A0876A";
        ctx.fillRect(0, SG_GROUND + 2, W, H - SG_GROUND - 2);
        ctx.fillStyle = "#7A6248";
        ctx.fillRect(0, SG_GROUND, W, 3);

        // Road dashes
        ctx.fillStyle = "#8A7460";
        const dashOffset = (f * this.speed) % 50;
        for (let x = -dashOffset; x < W; x += 50) {
            ctx.fillRect(x, SG_GROUND + 8, 28, 3);
        }

        // Objects
        ctx.font = "28px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        for (const obj of this.objects) {
            if (obj.type === "child") {
                ctx.fillText(obj.scored ? "😵" : (Math.floor(f / 10) % 2 === 0 ? "🧒" : "👦"), obj.x, SG_GROUND + 4);
            } else {
                ctx.fillText("🚗", obj.x, SG_GROUND + 4);
            }
        }

        // Particles
        ctx.textBaseline = "alphabetic";
        for (const p of this.particles) {
            ctx.globalAlpha = p.life / 28;
            ctx.fillStyle = p.color;
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("✦", p.x, p.y);
        }
        ctx.globalAlpha = 1;

        // Lion
        this._drawLion(ctx, SG_LION_X, this.lion.y, f);

        // HUD
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(`スコア: ${this.score}`, 8, 8);
        ctx.fillText(`噛み: ${this.bites}回`, 8, 26);
        const lv = Math.floor(this.dist / 700) + 1;
        ctx.textAlign = "right";
        ctx.fillText(`Lv.${lv}`, W - 8, 8);

        // Idle prompt
        if (!this.started) {
            ctx.fillStyle = "rgba(0,0,0,0.38)";
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = "white";
            ctx.font = "bold 17px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("タップ / スペースでスタート", W / 2, H / 2 + 10);
            ctx.font = "13px sans-serif";
            ctx.fillText("🚗 障害物を跳び越えよう！　🧒 子供の頭を噛もう！", W / 2, H / 2 + 36);
        }
    }

    // 伝統的な獅子舞（頭は右向き＝進行方向、緑の唐草胴体が後ろに流れる）
    _drawLion(ctx, x, y, f) {
        ctx.save();
        ctx.translate(x, y);
        const leg = Math.floor(f / 7) % 2;
        const bob = Math.sin(f / 6) * 1.5;            // 胴体の上下の揺れ
        const jaw = (Math.floor(f / 9) % 2) ? 7 : 1;  // 口のパクパク

        // ---- 脚（胴体の後ろ）----
        const legSets = leg === 0
            ? [[-20, 6, 14], [-2, 6, 10]]
            : [[-18, 6, 10], [-4, 6, 14]];
        legSets.forEach(([lx, lw, lh]) => {
            ctx.fillStyle = "#1f7a3d";
            ctx.fillRect(lx, -lh, lw, lh);
            ctx.fillStyle = "#f4f4f0";          // 白い足先
            ctx.fillRect(lx, -3, lw, 3);
        });

        ctx.save();
        ctx.translate(0, bob);

        // ---- 胴体（緑の唐草模様の布）----
        ctx.fillStyle = "#2e9e52";
        ctx.beginPath();
        ctx.moveTo(-30, -8);
        ctx.quadraticCurveTo(-36, -32, -16, -34);
        ctx.lineTo(8, -34);
        ctx.quadraticCurveTo(16, -22, 6, -8);
        ctx.closePath();
        ctx.fill();
        // 白い波のフリル（裾）
        ctx.strokeStyle = "#eaf7ee";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = -28; i <= 4; i += 8) {
            ctx.moveTo(i, -9);
            ctx.arc(i + 4, -9, 4, Math.PI, 0, false);
        }
        ctx.stroke();
        // 唐草の渦（白い丸）
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        [[-22, -24], [-10, -28], [-16, -15], [-4, -18]].forEach(([cx, cy]) => {
            ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
        });

        // ---- 頭（赤い漆塗り風、右向き）----
        // 緑のたてがみフリル（頭の後ろ）
        ctx.fillStyle = "#1f7a3d";
        for (let a = -Math.PI / 2; a <= Math.PI / 2; a += Math.PI / 6) {
            ctx.beginPath();
            ctx.arc(13 + Math.cos(a) * 15, -36 + Math.sin(a) * 14, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 頭の土台
        ctx.fillStyle = "#cc1f1f";
        ctx.beginPath();
        ctx.ellipse(16, -36, 15, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        // 金の眉バンド
        ctx.fillStyle = "#e8b53a";
        ctx.fillRect(6, -44, 22, 4);
        // 頭頂のこぶ（角）
        ctx.fillStyle = "#b51818";
        ctx.beginPath(); ctx.arc(14, -48, 4, 0, Math.PI * 2); ctx.fill();

        // 耳（垂れ耳）
        ctx.fillStyle = "#a51515";
        ctx.beginPath();
        ctx.ellipse(6, -42, 5, 7, -0.4, 0, Math.PI * 2);
        ctx.fill();

        // 目（大きな金色）
        ctx.fillStyle = "#f5d76e";
        ctx.beginPath(); ctx.arc(18, -38, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#111";
        ctx.beginPath(); ctx.arc(20, -38, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(19, -39, 1, 0, Math.PI * 2); ctx.fill();

        // ---- パクパクする口（歯付き）----
        // 上あご
        ctx.fillStyle = "#cc1f1f";
        ctx.beginPath();
        ctx.moveTo(24, -40);
        ctx.lineTo(34, -37);
        ctx.lineTo(32, -31);
        ctx.lineTo(24, -31);
        ctx.closePath();
        ctx.fill();
        // 口の中（赤）
        ctx.fillStyle = "#5a0d0d";
        ctx.beginPath();
        ctx.moveTo(24, -31);
        ctx.lineTo(33, -31);
        ctx.lineTo(31, -31 + jaw + 1);
        ctx.lineTo(24, -31 + jaw + 3);
        ctx.closePath();
        ctx.fill();
        // 下あご
        ctx.fillStyle = "#a51515";
        ctx.fillRect(23, -31 + jaw, 10, 4);
        // 上の歯
        ctx.fillStyle = "#fff";
        ctx.fillRect(25, -32, 2, 3);
        ctx.fillRect(30, -32, 2, 3);
        // 下の歯
        ctx.fillRect(25, -31 + jaw, 2, 2);
        ctx.fillRect(30, -31 + jaw, 2, 2);

        ctx.restore();
        ctx.restore();
    }
}
