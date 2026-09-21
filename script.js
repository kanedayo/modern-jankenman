// --- ゲーム設定 ---
const GAME_CONFIG = {
    JUDGMENT_WINDOW: 300,
    BASE_REWARD: 2,
    MAX_DOUBLE: 32,
};

// --- 状態管理 ---
let state = {
    totalMedals: parseInt(localStorage.getItem('jankenman_medals')) || 0,
    currentRoundReward: 0,
    consecutiveWins: 0,
    gameState: 'IDLE', // IDLE, SELECTING, RESULT, DOUBLE_UP
    isAikoRound: false,
};

// --- DOM要素 ---
const elements = {
    totalMedals: document.getElementById('total-medals'),
    statusText: document.getElementById('status-text'),
    cpuHand: document.getElementById('cpu-hand'),
    playerHand: document.getElementById('player-hand'),
    startBtn: document.getElementById('start-btn'),
    jankenBtns: document.getElementById('janken-btns'),
    doubleUpBtns: document.getElementById('double-up-btns'),
    yesBtn: document.getElementById('yes-btn'),
    noBtn: document.getElementById('no-btn'),
    history: document.getElementById('history'),
    gameContainer: document.getElementById('game-container'),
};

// --- 音声管理 ---
const AudioAssets = {
    jankenpon: new Audio('assets/sounds/jankenpon.mp3'),
    aikodesyo: new Audio('assets/sounds/aikodesyo.mp3'),
    standby: new Audio('assets/sounds/standby.mp3'),
    feaver: new Audio('assets/sounds/feaver.mp3'),
    yappee: new Audio('assets/sounds/yappee.mp3'),
    zukoo: new Audio('assets/sounds/zukoo.mp3'),
};

// --- 初期化 ---
function init() {
    updateMedalDisplay();
    elements.startBtn.addEventListener('click', startGame);

    document.querySelectorAll('.janken-btn').forEach(btn => {
        btn.addEventListener('click', () => handleHandSelection(btn.dataset.hand));
    });

    elements.yesBtn.addEventListener('click', startDoubleUp);
    elements.noBtn.addEventListener('click', stopAndCollect);
}

function updateMedalDisplay() {
    elements.totalMedals.innerText = state.totalMedals;
    localStorage.setItem('jankenman_medals', state.totalMedals);
}

// --- ゲームフロー ---

function startGame() {
    state.gameState = 'SELECTING';
    state.currentRoundReward = 0;
    state.consecutiveWins = 0;
    state.isAikoRound = false;

    elements.statusText.innerText = "LISTEN & CHOOSE!";
    elements.startBtn.classList.add('hidden');
    elements.jankenBtns.classList.remove('hidden');
    elements.cpuHand.innerText = "?";
    elements.playerHand.innerText = "?";

    playSelectionSound();
    startRhythmText();
}

function playSelectionSound() {
    // 1回目は jankenpon、あいこ後は aikodesyo を再生
    const audio = state.isAikoRound ? AudioAssets.aikodesyo : AudioAssets.jankenpon;
    audio.currentTime = 0;
    audio.play().catch(e => console.log("Audio play blocked"));
}

async function startRhythmText() {
    const textSequence = state.isAikoRound
        ? ["あいこでしょ！", "準備して...", "ぽん！！！"]
        : ["じゃん...", "けん...", "ぽん！！！"];

    let i = 0;

    while (state.gameState === 'SELECTING') {
        elements.statusText.innerText = textSequence[i % textSequence.length];
        if (i % 3 !== 2) {
            elements.statusText.classList.add('pulse');
        } else {
            elements.statusText.classList.remove('pulse');
            elements.gameContainer.classList.add('flash');
            setTimeout(() => elements.gameContainer.classList.remove('flash'), 200);
        }

        await new Promise(r => setTimeout(r, 600));
        i++;
    }
}

function handleHandSelection(hand) {
    if (state.gameState !== 'SELECTING') return;

    // 再生中の音声を停止
    AudioAssets.jankenpon.pause();
    AudioAssets.aikodesyo.pause();
    AudioAssets.jankenpon.currentTime = 0;
    AudioAssets.aikodesyo.currentTime = 0;

    state.gameState = 'RESULT';
    elements.playerHand.innerText = getEmoji(hand);
    elements.jankenBtns.classList.add('hidden');
    elements.statusText.classList.remove('pulse');

    determineResult(hand);
}

function determineResult(playerHand) {
    const hands = ['rock', 'scissors', 'paper'];
    const cpuHand = hands[Math.floor(Math.random() * 3)];
    elements.cpuHand.innerText = getEmoji(cpuHand);

    let result = '';

    if (playerHand === cpuHand) {
        result = 'draw';
    } else if (
        (playerHand === 'rock' && cpuHand === 'scissors') ||
        (playerHand === 'scissors' && cpuHand === 'paper') ||
        (playerHand === 'paper' && cpuHand === 'rock')
    ) {
        result = 'win';
    } else {
        result = 'lose';
    }

    processResult(result);
}

function processResult(result) {
    if (result === 'draw') {
        state.isAikoRound = true;
        elements.statusText.innerText = "AIKO! (DRAW)";

        // 待機時間をなくし、即座に次のターンを開始
        elements.jankenBtns.classList.remove('hidden');
        state.gameState = 'SELECTING';
        playSelectionSound();
        startRhythmText();
    } else if (result === 'lose') {
        AudioAssets.zukoo.play();
        elements.statusText.innerText = "YOU LOSE!";
        state.currentRoundReward = 0;
        state.consecutiveWins = 0;
        endGame();
    } else {
        AudioAssets.yappee.play();
        state.consecutiveWins++;
        state.currentRoundReward = Math.pow(2, state.consecutiveWins);

        if (state.currentRoundReward >= GAME_CONFIG.MAX_DOUBLE) {
            elements.statusText.innerText = "MAX WIN!!";
            stopAndCollect();
        } else {
            elements.statusText.innerText = "WIN!!";
            setTimeout(showDoubleUpChoice, 1000);
        }
    }
}

function showDoubleUpChoice() {
    state.gameState = 'DOUBLE_UP';
    AudioAssets.feaver.play();
    elements.statusText.innerText = `REWARD: ${state.currentRoundReward} MEDALS`;
    elements.doubleUpBtns.classList.remove('hidden');
}

function startDoubleUp() {
    elements.doubleUpBtns.classList.add('hidden');
    elements.cpuHand.innerText = "?";
    elements.playerHand.innerText = "?";

    state.gameState = 'SELECTING';
    state.isAikoRound = false; // 倍増挑戦の1回目は通常のジャンケンから
    elements.statusText.innerText = "LISTEN & CHOOSE!";
    elements.jankenBtns.classList.remove('hidden');

    playSelectionSound();
    startRhythmText();
}

function stopAndCollect() {
    state.totalMedals += state.currentRoundReward;
    updateMedalDisplay();
    elements.statusText.innerText = `COLLECTED ${state.currentRoundReward} MEDALS!`;
    elements.doubleUpBtns.classList.add('hidden');
    endGame();
}

function endGame() {
    state.gameState = 'IDLE';
    setTimeout(() => {
        elements.statusText.innerText = "PRESS START";
        elements.startBtn.classList.remove('hidden');
        elements.doubleUpBtns.classList.add('hidden');
    }, 2000);
}

function getEmoji(hand) {
    const map = { rock: '✊', scissors: '✌️', paper: '🖐️' };
    return map[hand];
}

init();
