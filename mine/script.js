
// 音を一度解放する（ページ最初のどこかに）
document.body.addEventListener("touchstart", () => {
  Object.values(sounds).forEach(sound => {
    sound.play().then(() => {
      sound.pause();
      sound.currentTime = 0;
    }).catch(() => { });
  });
}, { once: true });
// 音
const sounds = {
  open: new Audio("sounds/open.mp3"),
  explosion: new Audio("sounds/explosion.mp3"),
  flag: new Audio("sounds/flag.mp3"),
  clear: new Audio("sounds/clear.mp3")
};
const game = document.getElementById("game");
const message = document.getElementById("message");
const size = 9; // ← マス数
const mineCount = 9; // ← 地雷数
let cells = [];
let mineMap = [];
// 勝利判定
let openedCount = 0;

let hintIndex = null;  // 現在ヒント表示している地雷のインデックス
let hintCount = 0;
const maxHints = 2;

function updateHintText() {
  const hintBtn = document.getElementById("hintBtn");
  hintBtn.textContent = `ヒントを表示（残り${maxHints - hintCount}回）`;
}

function showHint() {
  // ヒント回数を超えていたら無効化
  if (hintCount >= maxHints) {
    alert("ヒントはもう使い切りました！");
    return;
  }
  // もし前のヒントがあれば消す
  if (hintIndex !== null) {
    cells[hintIndex].classList.remove("hint");
  }

  // 開いていない地雷マスを抽出
  const unopenedMines = mineMap
    .map((v, i) => ({v, i}))
    .filter(cell => cell.v === "👻" && !cells[cell.i].classList.contains("open"));

  if (unopenedMines.length === 0) {
    alert("もうヒントを表示できる爆弾がありません！");
    return;
  }

  const randomCell = unopenedMines[Math.floor(Math.random() * unopenedMines.length)];
  hintIndex = randomCell.i;
  cells[hintIndex].classList.add("hint");

  // カウントアップ
  hintCount++;

  // 赤丸を表示するためのクラスを付ける
  cells[hintIndex].classList.add("hint");

  updateHintText(); // ← これを必ず最後に追加！
}
document.getElementById("hintBtn").addEventListener("click", showHint);

// showHint()の最後に追加
updateHintText();

// リセット時にも
updateHintText();


function resetGame() {
  // マップと状態の初期化
  mineMap = [];
  openedCount = 0;
  cells.forEach((cell) => {
    cell.className = "cell";
    cell.textContent = "";
  });

  // メッセージ非表示
  message.innerHTML = "";
  message.style.opacity = "0";
  message.style.animation = "none";

  // マイン配置の再作成
  generateMines();
}

function init() {
  hintCount = 0;
  hintIndex = null;
  updateHintText(); // ← ヒント表示をリセット
  message.innerHTML = ""; // ← 追加
  message.style.opacity = "0"; // ← 追加
  message.style.animation = "none"; // ← 追加
  message.className = "message";
  message.style.opacity = "0";
  message.style.animation = "none";
  message.innerHTML = "";
  game.innerHTML = "";
  message.textContent = "";
  openedCount = 0;  // ← ここでリセット！
  cells = [];
  mineMap = Array(size * size).fill(0);

  // 地雷を配置
  let mines = 0;
  while (mines < mineCount) {
    let index = Math.floor(Math.random() * size * size);
    if (mineMap[index] === 0) {
      mineMap[index] = "👻";
      mines++;
    }
  }

  // 周囲の地雷数をカウント
  for (let i = 0; i < size * size; i++) {
    if (mineMap[i] === "👻") continue;
    const x = i % size;
    const y = Math.floor(i / size);
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = x + dx;
        const ny = y + dy;
        const ni = ny * size + nx;
        if (
          nx >= 0 &&
          nx < size &&
          ny >= 0 &&
          ny < size &&
          mineMap[ni] === "👻"
        ) {
          count++;
        }
      }
    }
    mineMap[i] = count;
  }

  // マス生成ループ内（for ループの中）で、タップ＆クリックの設定のあとに追記
  // 例として既存のコードと合わせて示します。

  for (let i = 0; i < size * size; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.index = i;

    let pressTimer = null;
    let isLongPress = false;

    cell.addEventListener("touchstart", (e) => {
      e.preventDefault();
      isLongPress = false;
      pressTimer = setTimeout(() => {
        toggleFlag(i);
        isLongPress = true;
      }, 200);//長タッチ時間
    });

    cell.addEventListener("touchend", () => {
      clearTimeout(pressTimer);
      if (!isLongPress) {
        openCell(i);
      }
    });

    cell.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      toggleFlag(i);
    });

    cell.addEventListener("click", () => openCell(i));

    game.appendChild(cell);
    cells.push(cell);
  }
}

function openCell(index) {
  const cell = cells[index];
  if (cell.classList.contains("open") || cell.classList.contains("flag")) return;

  cell.classList.add("open");
  const value = mineMap[index];

  if (value === "👻") {
    sounds.explosion.play();
    cell.textContent = "👻";
    message.innerHTML = "ゲームオーバー！<br>💥💀💥";
    message.className = "message message-fail";
    message.style.color = "#f70000";
    message.style.background = "#000000dd"; // 半透明の黒背景（好みに応じて）
    message.style.opacity = "1"; // ← 追加
    message.style.animation = "popup 0.6s ease forwards"; // ← 追加
    revealMines();
    return;
  }

  openedCount++;  // ← 地雷じゃないマスを開いたら加算

  if (value > 0) {
    cell.textContent = value;
  } else {
    cell.textContent = "";
    openAround(index);
  }

  sounds.open.play();  // ← if の外に移動（常に鳴らす）

  // 🎉 勝利条件チェック
  if (openedCount === size * size - mineCount) {
    message.innerHTML = "👏退治成功！🎉<br>おめでとう！";
    message.className = "message message-success";
    message.style.color = "#eeff55ff";
    message.style.background = "linear-gradient(45deg, #ff00cc, #3333ff)";
    message.style.opacity = "1";
    message.style.animation = "popup 0.6s ease forwards";
    sounds.clear.play();
    revealMines();
  }
}

function openAround(index) {
  const x = index % size;
  const y = Math.floor(index / size);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const nx = x + dx;
      const ny = y + dy;
      const ni = ny * size + nx;
      if (
        nx >= 0 &&
        nx < size &&
        ny >= 0 &&
        ny < size &&
        !cells[ni].classList.contains("open")
      ) {
        openCell(ni);
      }
    }
  }
}

function toggleFlag(index) {
  const cell = cells[index];
  if (cell.classList.contains("open")) return;
  if (cell.classList.contains("flag")) {
    cell.classList.remove("flag");
    cell.textContent = "";
  } else {
    cell.classList.add("flag");
    cell.textContent = "👀";
    sounds.flag.play();
  }
}


function revealMines() {
  for (let i = 0; i < size * size; i++) {
    if (mineMap[i] === "👻") {
      cells[i].textContent = "👻";
      cells[i].classList.add("open");
    }
  }
}

init();

// リセット
document.getElementById("reset").addEventListener("click", () => {
  init();  // ゲーム初期化関数を再実行
});


