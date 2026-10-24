const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const roundEl = document.getElementById("round");
const timerEl = document.getElementById("timer");
const gameOverEl = document.getElementById("game-over");
const scoreForm = document.getElementById("score-form");
const playerNameEl = document.getElementById("player-name");
const scoreMessageEl = document.getElementById("score-message");
const leaderboardStatusEl = document.getElementById("leaderboard-status");
const leaderboardListEl = document.getElementById("leaderboard-list");
const ownerControlsEl = document.getElementById("owner-controls");
const resetLeaderboardButton = document.getElementById("reset-leaderboard");
const leaderboardConfig = window.LEADERBOARD_CONFIG || {};

let score = 0;
let lives = 3;
let round = 1;
let isGameOver = false;
let invulnerableUntil = 0;
let roundStartedAt = 0;
let roundMessageUntil = 0;
let scoreSubmitted = false;
const DEFAULT_LIVES = 3;
const LEADERBOARD_KEY = "spaceShooterLeaderboard";
const MAX_LEADERBOARD_ENTRIES = 10;
const MAX_PLAYER_NAME_LENGTH = 35;
const OWNER_NAME = "GIYOMI";
const supabaseUrl = typeof leaderboardConfig.supabaseUrl === "string"
    ? leaderboardConfig.supabaseUrl.trim().replace(/\/+$/, "")
    : "";
const supabaseAnonKey = typeof leaderboardConfig.supabaseAnonKey === "string"
    ? leaderboardConfig.supabaseAnonKey.trim()
    : "";
const isSharedLeaderboardEnabled = Boolean(supabaseUrl && supabaseAnonKey);

const player = {
    x: canvas.width / 2 - 24,
    y: canvas.height - 62,
    width: 48,
    height: 48,
    speed: 6
};

const keys = { Left: false, Right: false, Up: false, Down: false };
window.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) && !isGameOver) {
        e.preventDefault();
        if (e.key === "ArrowLeft") keys.Left = true;
        if (e.key === "ArrowRight") keys.Right = true;
        if (e.key === "ArrowUp") keys.Up = true;
        if (e.key === "ArrowDown") keys.Down = true;
    }
    if (e.code === "Space" && !isGameOver) {
        e.preventDefault();
        shootBullet();
    }
});
window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft") keys.Left = false;
    if (e.key === "ArrowRight") keys.Right = false;
    if (e.key === "ArrowUp") keys.Up = false;
    if (e.key === "ArrowDown") keys.Down = false;
});

let bullets = [];
function shootBullet() {
    bullets.push({
        x: player.x + player.width / 2 - 3,
        y: player.y,
        width: 6,
        height: 16,
        speed: 9
    });
}

let enemies = [];
let lifeItems = [];
let roundToken = 0;

function spawnEnemy(token) {
    if (isGameOver || token !== roundToken) return;

    const difficulty = round - 1;
    const size = Math.floor(Math.random() * 31) + 20;
    enemies.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        speed: (Math.random() * 3 + 2) * (1 + difficulty * 0.08)
    });
    setTimeout(() => spawnEnemy(token), Math.max(350, 1000 - difficulty * 70));
}

function spawnLifeItem(token) {
    if (isGameOver || token !== roundToken) return;

    const size = 28;
    lifeItems.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        speed: 2
    });
    setTimeout(() => spawnLifeItem(token), 9000 + Math.random() * 7000);
}

function startRound(now) {
    roundStartedAt = now;
    roundMessageUntil = now + 2000;
    roundEl.textContent = round;
    lives = DEFAULT_LIVES;
    livesEl.textContent = lives;
    enemies = [];
    bullets = [];
    lifeItems = [];
    invulnerableUntil = now + 1200;

    roundToken += 1;
    const token = roundToken;
    spawnEnemy(token);
    setTimeout(() => spawnLifeItem(token), 9000 + Math.random() * 7000);
}

function getRoundDuration(roundNumber) {
    return (roundNumber % 2 === 1 ? 45 : 30) * 1000;
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y;
}

function drawPlayer(now) {
    if (now < invulnerableUntil && Math.floor(now / 100) % 2 === 0) return;

    const center = player.x + player.width / 2;
    const bottom = player.y + player.height;
    const glow = ctx.createLinearGradient(0, player.y, 0, bottom);
    glow.addColorStop(0, "#b8fbff");
    glow.addColorStop(1, "#358cff");

    ctx.save();
    ctx.shadowColor = "#45dfff";
    ctx.shadowBlur = 14;

    // Broad wings and a pointed nose make the ship silhouette easy to see.
    ctx.fillStyle = "#2874d8";
    ctx.beginPath();
    ctx.moveTo(center, player.y);
    ctx.lineTo(player.x, bottom - 3);
    ctx.lineTo(player.x + 11, bottom - 8);
    ctx.lineTo(center, player.y + 13);
    ctx.lineTo(player.x + player.width - 11, bottom - 8);
    ctx.lineTo(player.x + player.width, bottom - 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(center, player.y + 3);
    ctx.lineTo(center - 10, bottom - 8);
    ctx.lineTo(center, bottom - 12);
    ctx.lineTo(center + 10, bottom - 8);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff3a6";
    ctx.beginPath();
    ctx.ellipse(center, player.y + 22, 5, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff9852";
    ctx.beginPath();
    ctx.moveTo(center - 5, bottom - 4);
    ctx.lineTo(center, bottom + 6);
    ctx.lineTo(center + 5, bottom - 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawLifeItem(item) {
    const centerX = item.x + item.width / 2;
    const centerY = item.y + item.height / 2;

    ctx.save();
    ctx.shadowColor = "#66ff9b";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#42e879";
    ctx.beginPath();
    ctx.moveTo(centerX, centerY + 11);
    ctx.lineTo(centerX - 11, centerY);
    ctx.bezierCurveTo(centerX - 20, centerY - 9, centerX - 7, centerY - 17, centerX, centerY - 8);
    ctx.bezierCurveTo(centerX + 7, centerY - 17, centerX + 20, centerY - 9, centerX + 11, centerY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function loseLife() {
    lives -= 1;
    livesEl.textContent = lives;
    invulnerableUntil = performance.now() + 1200;

    if (lives <= 0) {
        isGameOver = true;
        gameOverEl.style.display = "block";
        fitLeaderboardNames();
        scoreMessageEl.textContent = "";
        refreshLeaderboard();
        playerNameEl.focus();
    }
}

function readLeaderboard() {
    let stored;
    try {
        stored = localStorage.getItem(LEADERBOARD_KEY);
    } catch (error) {
        scoreMessageEl.textContent = "순위 기록을 읽을 수 없습니다. 브라우저 저장소 설정을 확인하세요.";
        console.error("Unable to read leaderboard from local storage.", error);
        return null;
    }

    if (stored === null) return [];

    let entries;
    try {
        entries = JSON.parse(stored);
    } catch (error) {
        scoreMessageEl.textContent = "순위 기록을 읽지 못했습니다. 저장된 기록 데이터가 손상되었습니다.";
        console.error("Leaderboard data is not valid JSON.", error);
        return null;
    }

    if (!Array.isArray(entries)) {
        scoreMessageEl.textContent = "순위 기록을 읽지 못했습니다. 저장된 기록 형식이 올바르지 않습니다.";
        return null;
    }

    return entries.filter((entry) =>
        entry &&
        typeof entry.name === "string" &&
        Number.isFinite(entry.score) &&
        Number.isFinite(entry.round)
    );
}

function renderLeaderboard(entries = readLeaderboard()) {
    leaderboardListEl.replaceChildren();
    if (entries === null) return;

    const sortedEntries = entries
        .sort((first, second) => second.score - first.score || second.round - first.round)
        .slice(0, MAX_LEADERBOARD_ENTRIES);

    if (sortedEntries.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 4;
        cell.textContent = "아직 기록이 없습니다.";
        row.appendChild(cell);
        leaderboardListEl.appendChild(row);
        return;
    }

    sortedEntries.forEach((entry, index) => {
        const row = document.createElement("tr");
        [index + 1, entry.name, entry.score, entry.round].forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });
        leaderboardListEl.appendChild(row);

        const nameCell = row.cells[1];
        nameCell.classList.add("leaderboard-name");
    });
    fitLeaderboardNames();
}

function fitLeaderboardNames() {
    const measurementContext = document.createElement("canvas").getContext("2d");
    if (!measurementContext) {
        throw new Error("Unable to measure leaderboard name text.");
    }

    leaderboardListEl.querySelectorAll(".leaderboard-name").forEach((cell) => {
        const availableWidth = cell.clientWidth - 6;
        if (availableWidth <= 0) return;

        const name = cell.textContent;
        const fontFamily = getComputedStyle(cell).fontFamily;
        measurementContext.font = `14px ${fontFamily}`;
        const textWidth = measurementContext.measureText(name).width;
        const fontSize = textWidth > availableWidth
            ? Math.max(4, 14 * availableWidth / textWidth)
            : 14;
        cell.style.fontSize = `${fontSize}px`;
    });
}

async function refreshLeaderboard() {
    if (!isSharedLeaderboardEnabled) {
        leaderboardStatusEl.textContent = "이 브라우저에만 저장되는 순위표입니다. 전체 공유는 Supabase 설정이 필요합니다.";
        renderLeaderboard();
        return true;
    }

    leaderboardStatusEl.textContent = "공유 순위표를 불러오는 중...";
    try {
        const response = await fetch(
            `${supabaseUrl}/rest/v1/leaderboard?select=name,score,round&order=score.desc,round.desc&limit=${MAX_LEADERBOARD_ENTRIES}`,
            { headers: { apikey: supabaseAnonKey } }
        );
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const entries = await response.json();
        if (!Array.isArray(entries)) {
            throw new Error("The leaderboard response was not a list.");
        }

        renderLeaderboard(entries);
        leaderboardStatusEl.textContent = "모든 방문자와 공유되는 순위표입니다.";
        return true;
    } catch (error) {
        leaderboardListEl.replaceChildren();
        leaderboardStatusEl.textContent = "공유 순위표를 불러오지 못했습니다. Supabase 설정과 연결을 확인하세요.";
        console.error("Unable to load shared leaderboard.", error);
        return false;
    }
}

async function saveSharedScore(entry) {
    const response = await fetch(`${supabaseUrl}/rest/v1/leaderboard`, {
        method: "POST",
        headers: {
            apikey: supabaseAnonKey,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
        },
        body: JSON.stringify(entry)
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
}

async function resetSharedLeaderboard() {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/reset_shared_leaderboard`, {
        method: "POST",
        headers: {
            apikey: supabaseAnonKey,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ p_confirm: true })
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    return response.json();
}

scoreForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (scoreSubmitted) return;

    const name = playerNameEl.value.trim();
    if (!name) {
        scoreMessageEl.textContent = "이름을 입력해 주세요.";
        playerNameEl.focus();
        return;
    }
    if (Array.from(name).length > MAX_PLAYER_NAME_LENGTH) {
        scoreMessageEl.textContent = "너무길어요,,";
        playerNameEl.focus();
        return;
    }

    if (isSharedLeaderboardEnabled) {
        try {
            await saveSharedScore({ name, score, round });
        } catch (error) {
            scoreMessageEl.textContent = "순위를 공유 저장하지 못했습니다. Supabase 설정과 연결을 확인하세요.";
            console.error("Unable to save shared leaderboard score.", error);
            return;
        }

        scoreSubmitted = true;
        playerNameEl.disabled = true;
        scoreForm.querySelector("button").disabled = true;
        scoreMessageEl.textContent = "";
        if (!(await refreshLeaderboard())) {
            scoreMessageEl.textContent = "점수는 저장됐지만 순위표를 새로 불러오지 못했습니다.";
        }
        return;
    }

    const entries = readLeaderboard();
    if (entries === null) return;

    entries.push({ name, score, round });
    entries.sort((first, second) => second.score - first.score || second.round - first.round);
    const topEntries = entries.slice(0, MAX_LEADERBOARD_ENTRIES);
    try {
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(topEntries));
    } catch (error) {
        scoreMessageEl.textContent = "순위를 저장하지 못했습니다. 브라우저 저장 공간을 확인하세요.";
        console.error("Unable to save leaderboard to local storage.", error);
        return;
    }

    scoreSubmitted = true;
    playerNameEl.disabled = true;
    scoreForm.querySelector("button").disabled = true;
    scoreMessageEl.textContent = "순위가 이 브라우저에만 저장되었습니다.";
    renderLeaderboard(topEntries);
});

playerNameEl.addEventListener("input", () => {
    ownerControlsEl.hidden = playerNameEl.value.trim() !== OWNER_NAME;
    if (Array.from(playerNameEl.value.trim()).length > MAX_PLAYER_NAME_LENGTH) {
        scoreMessageEl.textContent = "너무길어요,,";
    } else if (scoreMessageEl.textContent === "너무길어요,,") {
        scoreMessageEl.textContent = "";
    }
});

window.addEventListener("resize", fitLeaderboardNames);

resetLeaderboardButton.addEventListener("click", async () => {
    if (playerNameEl.value.trim() !== OWNER_NAME) return;

    if (isSharedLeaderboardEnabled) {
        if (!window.confirm("공유 순위표의 모든 기록을 초기화할까요?")) return;

        resetLeaderboardButton.disabled = true;
        try {
            const wasReset = await resetSharedLeaderboard();
            if (!wasReset) {
                scoreMessageEl.textContent = "초기화 함수가 완료 응답을 보내지 않았습니다. Supabase 설정을 확인하세요.";
                return;
            }

            scoreMessageEl.textContent = "공유 순위표가 초기화되었습니다.";
            await refreshLeaderboard();
        } catch (error) {
            scoreMessageEl.textContent = `공유 순위표 초기화 오류: ${error.message}`;
            console.error("Unable to reset shared leaderboard.", error);
        } finally {
            resetLeaderboardButton.disabled = false;
        }
        return;
    }

    if (playerNameEl.value.trim() !== OWNER_NAME) return;
    if (!window.confirm("저장된 순위 기록을 모두 초기화할까요?")) return;

    try {
        localStorage.removeItem(LEADERBOARD_KEY);
    } catch (error) {
        scoreMessageEl.textContent = "순위표를 초기화하지 못했습니다. 브라우저 저장소 설정을 확인하세요.";
        console.error("Unable to reset leaderboard in local storage.", error);
        return;
    }

    renderLeaderboard([]);
    scoreMessageEl.textContent = "순위표가 초기화되었습니다.";
});

ownerControlsEl.hidden = playerNameEl.value.trim() !== OWNER_NAME;
refreshLeaderboard();

function gameLoop(now) {
    if (isGameOver) return;
    const roundDuration = getRoundDuration(round);
    if (now - roundStartedAt >= roundDuration) {
        round += 1;
        startRound(now);
    }

    const remainingSeconds = Math.max(0, Math.ceil((getRoundDuration(round) - (now - roundStartedAt)) / 1000));
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    timerEl.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (keys.Left) player.x = Math.max(0, player.x - player.speed);
    if (keys.Right) player.x = Math.min(canvas.width - player.width, player.x + player.speed);
    if (keys.Up) player.y = Math.max(0, player.y - player.speed);
    if (keys.Down) player.y = Math.min(canvas.height - player.height, player.y + player.speed);
    drawPlayer(now);

    enemies = enemies.filter((enemy) => {
        enemy.y += enemy.speed;
        if (enemy.y > canvas.height) {
            score += enemy.width;
            scoreEl.textContent = score;
            return false;
        }

        ctx.fillStyle = "#ff4d5a";
        ctx.beginPath();
        ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 2, 0, Math.PI * 2);
        ctx.fill();
        return true;
    });

    bullets = bullets.filter((bullet) => {
        bullet.y -= bullet.speed;
        if (bullet.y + bullet.height < 0) return false;

        ctx.fillStyle = "#fff27a";
        ctx.shadowColor = "#ffe45c";
        ctx.shadowBlur = 8;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        ctx.shadowBlur = 0;

        for (let i = enemies.length - 1; i >= 0; i -= 1) {
            if (checkCollision(bullet, enemies[i])) {
                enemies.splice(i, 1);
                score += 10;
                scoreEl.textContent = score;
                return false;
            }
        }
        return true;
    });

    lifeItems = lifeItems.filter((item) => {
        item.y += item.speed;
        if (item.y > canvas.height) return false;

        drawLifeItem(item);
        if (checkCollision(player, item)) {
            lives += 1;
            livesEl.textContent = lives;
            return false;
        }
        return true;
    });

    if (now >= invulnerableUntil) {
        const hitIndex = enemies.findIndex((enemy) => checkCollision(player, enemy));
        if (hitIndex !== -1) {
            enemies.splice(hitIndex, 1);
            loseLife();
        }
    }

    if (now < roundMessageUntil) {
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(0, canvas.height / 2 - 42, canvas.width, 84);
        ctx.fillStyle = "#b8fbff";
        ctx.font = "bold 34px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`ROUND ${round}`, canvas.width / 2, canvas.height / 2 + 12);
        ctx.restore();
    }

    requestAnimationFrame(gameLoop);
}

startRound(performance.now());
gameLoop(performance.now());
