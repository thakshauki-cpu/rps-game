// ─────────────────────────────────────────────
//  🔧 CONFIGURATION — replace with your model URL
//  After training on teachablemachine.withgoogle.com,
//  click "Export Model" → "Upload (shareable link)"
//  and paste the URL here (keep the trailing slash).
// ─────────────────────────────────────────────
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/45OxSm45g/";

// Class names must exactly match what you named them in Teachable Machine
const CLASS_ROCK     = "Rock";
const CLASS_PAPER    = "Paper";
const CLASS_SCISSORS = "Scissors";

// How many rounds per game
const MAX_ROUNDS = 5;

// ─────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────
let model, webcam;
let cameraReady = false;
let loopRunning = false;
let scorePlayer = 0, scoreCpu = 0, round = 1;

const EMOJIS = { Rock: "✊", Paper: "✋", Scissors: "✌️" };
const MOVES  = [CLASS_ROCK, CLASS_PAPER, CLASS_SCISSORS];

// ─────────────────────────────────────────────
//  DOM refs
// ─────────────────────────────────────────────
const btnStart    = document.getElementById("btnStart");
const btnPlay     = document.getElementById("btnPlay");
const btnReset    = document.getElementById("btnReset");
const btnPlayAgain= document.getElementById("btnPlayAgain");
const statusBar   = document.getElementById("statusBar");
const camOverlay  = document.getElementById("camOverlay");
const webcamCont  = document.getElementById("webcam-container");

const scorePlayerEl = document.getElementById("scorePlayer");
const scoreCpuEl    = document.getElementById("scoreCpu");
const roundNumEl    = document.getElementById("roundNum");

const emojiPlayer = document.getElementById("emojiPlayer");
const emojiCpu    = document.getElementById("emojiCpu");
const cardPlayer  = document.getElementById("cardPlayer");
const cardCpu     = document.getElementById("cardCpu");
const resultBox   = document.getElementById("resultBox");
const resultText  = document.getElementById("resultText");

const overlay      = document.getElementById("overlay");
const overlayEmoji = document.getElementById("overlayEmoji");
const overlayTitle = document.getElementById("overlayTitle");
const overlaySub   = document.getElementById("overlaySub");

const fillRock     = document.getElementById("fillRock");
const fillPaper    = document.getElementById("fillPaper");
const fillScissors = document.getElementById("fillScissors");
const pctRock      = document.getElementById("pctRock");
const pctPaper     = document.getElementById("pctPaper");
const pctScissors  = document.getElementById("pctScissors");

// ─────────────────────────────────────────────
//  Init: load model + start webcam
// ─────────────────────────────────────────────
btnStart.addEventListener("click", async () => {

  if (MODEL_URL.includes("YOUR_MODEL_ID")) {
    setStatus("⚠️ Please replace YOUR_MODEL_ID in game.js with your Teachable Machine model URL.");
    return;
  }

  btnStart.disabled = true;
  setStatus("Loading AI model…");

  try {
    model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
    setStatus("Starting camera…");

    webcam = new tmImage.Webcam(300, 300, true); // width, height, flip
    await webcam.setup();
    await webcam.play();

    webcamCont.appendChild(webcam.canvas);
    camOverlay.classList.add("hidden");

    cameraReady = true;
    loopRunning = true;
    window.requestAnimationFrame(predictionLoop);

    btnPlay.disabled = false;
    setStatus("Ready! Show your hand then click Play Round.");
  } catch (err) {
    console.error(err);
    setStatus("❌ Could not load model or camera. Check your model URL and allow camera access.");
    btnStart.disabled = false;
  }
});

// ─────────────────────────────────────────────
//  Prediction loop (runs every frame)
// ─────────────────────────────────────────────
async function predictionLoop() {
  if (!loopRunning) return;
  webcam.update();

  const predictions = await model.predict(webcam.canvas);
  updateBars(predictions);

  window.requestAnimationFrame(predictionLoop);
}

function updateBars(predictions) {
  predictions.forEach(p => {
    const pct = Math.round(p.probability * 100);
    if (p.className === CLASS_ROCK)     { fillRock.style.width     = pct + "%"; pctRock.textContent     = pct + "%"; }
    if (p.className === CLASS_PAPER)    { fillPaper.style.width    = pct + "%"; pctPaper.textContent    = pct + "%"; }
    if (p.className === CLASS_SCISSORS) { fillScissors.style.width = pct + "%"; pctScissors.textContent = pct + "%"; }
  });
}

// ─────────────────────────────────────────────
//  Play a round
// ─────────────────────────────────────────────
btnPlay.addEventListener("click", async () => {
  if (!cameraReady) return;

  btnPlay.disabled = true;

  // capture snapshot prediction
  const predictions = await model.predict(webcam.canvas);
  const playerMove  = getBestPrediction(predictions);
  const cpuMove     = getRandomMove();
  const outcome     = decideWinner(playerMove, cpuMove);

  // update display
  emojiPlayer.textContent = EMOJIS[playerMove];
  emojiCpu.textContent    = EMOJIS[cpuMove];

  // clear card classes
  ["win","lose","draw"].forEach(c => {
    cardPlayer.classList.remove(c);
    cardCpu.classList.remove(c);
    resultBox.classList.remove(c);
  });

  if (outcome === "win") {
    cardPlayer.classList.add("win"); cardCpu.classList.add("lose");
    resultBox.classList.add("win");
    resultText.textContent = "🏆 You win this round!";
    scorePlayer++;
    bumpScore(scorePlayerEl);
  } else if (outcome === "lose") {
    cardPlayer.classList.add("lose"); cardCpu.classList.add("win");
    resultBox.classList.add("lose");
    resultText.textContent = "💀 CPU wins this round!";
    cardPlayer.classList.add("shake");
    setTimeout(() => cardPlayer.classList.remove("shake"), 450);
    scoreCpu++;
    bumpScore(scoreCpuEl);
  } else {
    cardPlayer.classList.add("draw"); cardCpu.classList.add("draw");
    resultBox.classList.add("draw");
    resultText.textContent = "🤝 It's a draw!";
  }

  scorePlayerEl.textContent = scorePlayer;
  scoreCpuEl.textContent    = scoreCpu;
  roundNumEl.textContent    = round;

  setStatus(`Round ${round}: You played ${playerMove}, CPU played ${cpuMove}.`);

  // check game over (first to 3, or after 5 rounds)
  if (scorePlayer >= 3 || scoreCpu >= 3 || round >= MAX_ROUNDS) {
    setTimeout(showGameOver, 700);
  } else {
    round++;
    roundNumEl.textContent = round;
    btnPlay.disabled = false;
  }
});

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function getBestPrediction(predictions) {
  return predictions.reduce((best, p) =>
    p.probability > best.probability ? p : best
  ).className;
}

function getRandomMove() {
  return MOVES[Math.floor(Math.random() * MOVES.length)];
}

function decideWinner(player, cpu) {
  if (player === cpu) return "draw";
  if (
    (player === CLASS_ROCK     && cpu === CLASS_SCISSORS) ||
    (player === CLASS_PAPER    && cpu === CLASS_ROCK)     ||
    (player === CLASS_SCISSORS && cpu === CLASS_PAPER)
  ) return "win";
  return "lose";
}

function setStatus(msg) {
  statusBar.textContent = msg;
}

function bumpScore(el) {
  el.style.animation = "none";
  el.offsetHeight; // reflow
  el.style.animation = "bump 0.3s ease";
}

// ─────────────────────────────────────────────
//  Game Over
// ─────────────────────────────────────────────
function showGameOver() {
  loopRunning = false;

  if (scorePlayer > scoreCpu) {
    overlayEmoji.textContent = "🏆";
    overlayTitle.textContent = "You Win!";
  } else if (scoreCpu > scorePlayer) {
    overlayEmoji.textContent = "🤖";
    overlayTitle.textContent = "CPU Wins!";
  } else {
    overlayEmoji.textContent = "🤝";
    overlayTitle.textContent = "It's a Tie!";
  }
  overlaySub.textContent = `Final score: ${scorePlayer} – ${scoreCpu}`;
  overlay.hidden = false;
}

// ─────────────────────────────────────────────
//  Reset
// ─────────────────────────────────────────────
function resetGame() {
  scorePlayer = 0; scoreCpu = 0; round = 1;
  scorePlayerEl.textContent = 0;
  scoreCpuEl.textContent    = 0;
  roundNumEl.textContent    = 1;
  emojiPlayer.textContent   = "❓";
  emojiCpu.textContent      = "❓";
  resultText.textContent    = "Show your hand to the camera!";
  ["win","lose","draw"].forEach(c => {
    cardPlayer.classList.remove(c);
    cardCpu.classList.remove(c);
    resultBox.classList.remove(c);
  });
  overlay.hidden = true;
  setStatus("Game reset. Click Play Round to start.");

  if (cameraReady) {
    btnPlay.disabled = false;
    loopRunning = true;
    window.requestAnimationFrame(predictionLoop);
  }
}

btnReset.addEventListener("click", resetGame);
btnPlayAgain.addEventListener("click", resetGame);
