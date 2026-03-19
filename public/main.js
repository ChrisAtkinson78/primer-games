import { MathBlasterGame } from './game.js';

const root = document.querySelector('#root');

const DEFAULT_CUSTOM_OPS = ['+', '-', '×', '÷'];
const DIGIT_LIMITS = {
  1: 9,
  2: 99,
  3: 999,
};
const OPERATOR_NAMES = {
  '+': 'Addition',
  '-': 'Subtraction',
  '×': 'Multiplication',
  '÷': 'Division',
};
const OPERATOR_ALIASES = {
  '+': '+',
  '-': '-',
  '×': '×',
  '÷': '÷',
  '*': '×',
  x: '×',
  X: '×',
  '/': '÷',
};

const getRawQueryParam = (name) => {
  const query = window.location.search.startsWith('?') ? window.location.search.slice(1) : window.location.search;
  if (!query) {
    return null;
  }

  for (const pair of query.split('&')) {
    if (!pair) {
      continue;
    }

    const [rawKey, rawValue = ''] = pair.split('=');
    if (decodeURIComponent(rawKey) === name) {
      return rawValue;
    }
  }

  return null;
};

const parsePositiveInteger = (value) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getRoundBounds = (maxValue, roundIndex, rounds, minValue = 1) => {
  const roundMax = Math.max(minValue, Math.floor((maxValue * (roundIndex + 1)) / rounds));
  const previousMax = roundIndex === 0 ? minValue - 1 : Math.floor((maxValue * roundIndex) / rounds);
  const roundMin = Math.max(minValue, Math.min(roundMax, previousMax + 1));
  return { min: roundMin, max: roundMax };
};

const createCustomLevels = ({ ops, digits, rounds }) => {
  const operandMax = DIGIT_LIMITS[digits];
  const divisionQuotientCap = { 1: 5, 2: 12, 3: 20 }[digits];
  const divisionDivisorCap = { 1: 4, 2: 12, 3: 25 }[digits];
  const levels = [];

  ops.forEach((op, opIndex) => {
    for (let roundIndex = 0; roundIndex < rounds; roundIndex += 1) {
      const levelNumber = roundIndex + 1;
      const level = {
        op,
        label: `World ${opIndex + 1}-${levelNumber}: ${OPERATOR_NAMES[op]} ${levelNumber}`,
      };

      if (op === '÷') {
        const dividendBounds = getRoundBounds(operandMax, roundIndex, rounds, 4);
        const quotientBounds = getRoundBounds(divisionQuotientCap, roundIndex, rounds, 2);
        level.aMin = dividendBounds.min;
        level.aMax = dividendBounds.max;
        level.bMin = 2;
        level.bMax = Math.max(2, Math.min(divisionDivisorCap, dividendBounds.max));
        level.dividendMin = dividendBounds.min;
        level.dividendMax = dividendBounds.max;
        level.divisorMin = 2;
        level.divisorMax = level.bMax;
        level.quotientMin = quotientBounds.min;
        level.quotientMax = quotientBounds.max;
      } else {
        const bounds = getRoundBounds(operandMax, roundIndex, rounds, op === '×' ? 2 : 1);
        level.aMin = bounds.min;
        level.aMax = bounds.max;
        level.bMin = op === '×' ? Math.max(2, bounds.min) : bounds.min;
        level.bMax = bounds.max;
      }

      levels.push(level);
    }
  });

  return levels;
};

const getConfiguredLevels = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const rawOps = getRawQueryParam('ops');
  const parsedOps = rawOps === null
    ? null
    : [...new Set(
      decodeURIComponent(rawOps)
        .split(',')
        .map((value) => OPERATOR_ALIASES[value.trim()])
        .filter(Boolean),
    )];
  const digitsParam = searchParams.get('digits');
  const digits = digitsParam === null ? null : parsePositiveInteger(digitsParam);
  const roundsParam = searchParams.get('rounds');
  const rounds = roundsParam === null ? 3 : parsePositiveInteger(roundsParam) ?? 3;
  const customMode = rawOps !== null || digits !== null || roundsParam !== null;

  if (!customMode) {
    return null;
  }

  const resolvedDigits = digits && DIGIT_LIMITS[digits] ? digits : 1;
  const resolvedOps = parsedOps && parsedOps.length > 0 ? parsedOps : DEFAULT_CUSTOM_OPS;
  return createCustomLevels({
    ops: resolvedOps,
    digits: resolvedDigits,
    rounds,
  });
};

const getConfiguredBriefAfter = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const briefAfterParam = searchParams.get('briefAfter');
  return briefAfterParam === null ? null : parsePositiveInteger(briefAfterParam);
};

const getConfiguredQuizPerOp = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const quizPerOpParam = searchParams.get('quizPerOp');
  return quizPerOpParam === null ? 3 : parsePositiveInteger(quizPerOpParam) ?? 3;
};

root.innerHTML = `
  <div class="app-shell">
    <div class="game-layout">
      <section class="arena-pane" aria-labelledby="arenaLabel">
        <div id="arenaLabel" class="hud__label">Arena</div>
        <div class="game-frame">
          <canvas id="gameCanvas" width="960" height="540" aria-label="Math space game"></canvas>
        </div>
      </section>

      <section class="problem-card" aria-labelledby="problemPanelLabel">
        <div id="problemPanelLabel" class="hud__label">Problem</div>
        <div class="problem-panel" aria-live="polite">
          <div class="problem-panel__line">
            <span class="problem-panel__operator" aria-hidden="true"></span>
            <span id="problemTop" class="problem-panel__value">0</span>
          </div>
          <div class="problem-panel__line">
            <span id="problemOpMiddle" class="problem-panel__operator" aria-hidden="true">+</span>
            <span id="problemMiddle" class="problem-panel__value">0</span>
          </div>
          <div class="problem-panel__line">
            <span id="problemOpBottom" class="problem-panel__operator" aria-hidden="true">=</span>
            <span id="problemBottom" class="problem-panel__value">?</span>
          </div>
        </div>
      </section>

      <section class="hud" aria-labelledby="missionHudLabel">
        <div id="missionHudLabel" class="hud__label hud__label--pane">Mission HUD</div>
        <div class="hud__stack">
          <div class="hud__group">
            <div class="hud__label">Level</div>
            <div id="levelLabel" class="hud__value">1 / 12</div>
          </div>
          <div class="hud__group">
            <div class="hud__label">Player Status</div>
            <div id="playerLabel" class="hud__value">0</div>
          </div>
          <div class="hud__group">
            <div class="hud__label">Target Status</div>
            <div id="enemyLabel" class="hud__value">0</div>
          </div>
          <div class="hud__group hud__group--mission">
            <div class="hud__label">Mission</div>
            <div id="messageLabel" class="hud__value">Press Teleport to send people to safety.</div>
            <div id="helperCaption" class="hud__note" hidden></div>
            <div id="roundRecap" class="hud__note hud__note--recap" hidden></div>
          </div>
          <div class="hud__actions">
            <button id="nextRoundButton" class="hud__button" type="button" hidden>Next Round</button>
            <div id="completeLabel" class="hud__complete" hidden>Complete</div>
            <button id="restartButton" class="hud__button" type="button">Restart</button>
          </div>
          <div class="hud__group hud__group--controls">
            <div class="hud__label">Controls</div>
            <div class="controls controls--pane" aria-label="Controls">
              <button id="upButton" class="control-button" type="button">Up</button>
              <button id="fireButton" class="control-button control-button--accent controls__fire" type="button">Teleport</button>
              <button id="leftButton" class="control-button" type="button">Left</button>
              <button id="rightButton" class="control-button" type="button">Right</button>
              <button id="downButton" class="control-button" type="button">Down</button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div id="planningMissionModal" class="mission-modal" hidden>
      <div class="mission-modal__backdrop"></div>
      <section
        class="mission-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="missionTitle"
        aria-describedby="missionPrompt"
      >
        <div class="mission-modal__eyebrow">Planning Mission</div>
        <h2 id="missionTitle" class="mission-modal__title">Mission Briefing</h2>
        <p id="missionProgress" class="mission-modal__progress">Question 1 / 12</p>
        <p id="missionPrompt" class="mission-modal__prompt"></p>
        <p id="missionFeedback" class="mission-modal__feedback" aria-live="polite"></p>
        <label class="mission-modal__field" for="missionAnswer">Your answer</label>
        <input
          id="missionAnswer"
          class="mission-modal__input"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          spellcheck="false"
        />
        <div class="mission-modal__actions">
          <button id="missionShowMeButton" class="hud__button mission-modal__button" type="button" hidden>Show me</button>
          <button id="missionConfirmButton" class="hud__button mission-modal__button" type="button">Confirm</button>
        </div>
      </section>
    </div>
  </div>
`;

const randomInt = (min, max) => {
  const span = max - min + 1;
  return min + Math.floor(Math.random() * span);
};

const shuffle = (items) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

const createPlanningMissionQuestions = ({ ops, digits, perOp = 3 } = {}) => {
  // Default: match the game ops/difficulty so the briefing doesn't surprise the player.
  const opList = Array.isArray(ops) && ops.length > 0 ? ops : ['+', '-', '×', '÷'];
  const digitMax = DIGIT_LIMITS[digits] || 9;

  const questions = [];

  const addAddition = () => {
    for (let count = 0; count < perOp; count += 1) {
      const a = randomInt(1, digitMax);
      const b = randomInt(1, digitMax);
      questions.push({
        answer: a + b,
        op: '+',
        a,
        b,
        prompt: `Teleport briefing: ${a} people are already aboard the rescue ship, and ${b} more arrive by teleport. How many people are on the rescue ship now? (${a} + ${b})`,
      });
    }
  };

  const addSubtraction = () => {
    for (let count = 0; count < perOp; count += 1) {
      // Ensure A > B
      const a = randomInt(Math.max(3, Math.floor(digitMax / 4)), digitMax);
      const b = randomInt(1, Math.max(1, Math.min(digitMax, a - 1)));
      questions.push({
        answer: a - b,
        op: '-',
        a,
        b,
        prompt: `Drone briefing: ${a} hazards block the route, and the drones clear ${b} of them. How many hazards are left? (${a} - ${b})`,
      });
    }
  };

  const addMultiplication = () => {
    // Keep kid-friendly: even with digits=3, cap factors to avoid huge products.
    const aMax = digits >= 3 ? 20 : (digits === 2 ? 12 : 9);
    const bMax = digits >= 3 ? 20 : (digits === 2 ? 12 : 9);

    for (let count = 0; count < perOp; count += 1) {
      const a = randomInt(2, aMax);
      const b = randomInt(2, bMax);
      questions.push({
        answer: a * b,
        op: '×',
        a,
        b,
        prompt: `Cargo briefing: send ${a} cargo waves with ${b} crates in each wave. How many crates are sent altogether? (${a} × ${b})`,
      });
    }
  };

  const addDivision = () => {
    const bMax = digits >= 3 ? 25 : (digits === 2 ? 12 : 6);
    const tripsMax = digits >= 3 ? 20 : (digits === 2 ? 12 : 9);

    for (let count = 0; count < perOp; count += 1) {
      const b = randomInt(2, bMax);
      const trips = randomInt(2, tripsMax);
      const a = b * trips;
      questions.push({
        answer: trips,
        op: '÷',
        a,
        b,
        prompt: `Shuttle briefing: ${a} people must travel, and each shuttle trip moves ${b} people. How many trips are needed? (${a} ÷ ${b})`,
      });
    }
  };

  for (const op of opList) {
    if (op === '+') addAddition();
    if (op === '-') addSubtraction();
    if (op === '×') addMultiplication();
    if (op === '÷') addDivision();
  }

  return shuffle(questions);
};

const missionElements = {
  modal: document.querySelector('#planningMissionModal'),
  title: document.querySelector('#missionTitle'),
  progress: document.querySelector('#missionProgress'),
  prompt: document.querySelector('#missionPrompt'),
  feedback: document.querySelector('#missionFeedback'),
  answer: document.querySelector('#missionAnswer'),
  showMeButton: document.querySelector('#missionShowMeButton'),
  confirmButton: document.querySelector('#missionConfirmButton'),
};
const restartButton = document.querySelector('#restartButton');

const missionState = {
  questions: [],
  index: 0,
  active: false,
  complete: false,
  demoPlaying: false,
};

const setShowMeVisible = (visible) => {
  missionElements.showMeButton.hidden = !visible;
};

const closePlanningMission = () => {
  missionState.active = false;
  missionState.complete = false;
  missionState.demoPlaying = false;
  missionState.questions = [];
  missionState.index = 0;
  missionElements.modal.hidden = true;
  missionElements.answer.value = '';
  missionElements.answer.disabled = false;
  missionElements.feedback.textContent = '';
  missionElements.feedback.dataset.state = '';
  missionElements.confirmButton.disabled = false;
  missionElements.showMeButton.disabled = false;
  restartButton.disabled = false;
  setShowMeVisible(false);
};

const renderPlanningMissionQuestion = () => {
  const question = missionState.questions[missionState.index];
  missionElements.title.textContent = 'Mission Briefing';
  missionElements.progress.textContent = `Question ${missionState.index + 1} / ${missionState.questions.length}`;
  missionElements.prompt.textContent = question.prompt;
  missionElements.feedback.textContent = '';
  missionElements.feedback.dataset.state = '';
  missionElements.answer.hidden = false;
  missionElements.answer.disabled = false;
  missionElements.answer.value = '';
  missionElements.confirmButton.textContent = 'Confirm';
  missionElements.confirmButton.disabled = false;
  missionElements.showMeButton.disabled = false;
  setShowMeVisible(false);
  missionElements.answer.focus();
};

const renderPlanningMissionComplete = () => {
  missionState.complete = true;
  missionElements.title.textContent = 'Mission Complete';
  missionElements.progress.textContent = `All ${missionState.questions.length} questions solved`;
  missionElements.prompt.textContent = 'The Planning Mission is ready. Every rescue route, drone sweep, cargo wave, and shuttle trip is confirmed.';
  missionElements.feedback.textContent = 'Correct. Briefing complete.';
  missionElements.feedback.dataset.state = 'correct';
  missionElements.answer.hidden = true;
  setShowMeVisible(false);
  missionElements.confirmButton.textContent = 'Close Briefing';
  missionElements.confirmButton.focus();
};

const openPlanningMission = () => {
  missionState.questions = createPlanningMissionQuestions({
    ops: configuredOps,
    digits: configuredDigits,
    perOp: configuredQuizPerOp,
  });
  missionState.index = 0;
  missionState.active = true;
  missionState.complete = false;
  missionState.demoPlaying = false;
  missionElements.modal.hidden = false;
  renderPlanningMissionQuestion();
};

// Admin shortcut: jump straight to the Planning Mission quiz.
// Usage:
// - Add `?mission=1` (or `?quiz=1`) to the URL
// - Or press Ctrl+Shift+M (Cmd+Shift+M on macOS)
const maybeAutoOpenPlanningMission = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('mission') === '1' || params.get('quiz') === '1') {
    openPlanningMission();
  }
};

const submitPlanningMissionAnswer = () => {
  if (!missionState.active || missionState.demoPlaying) {
    return;
  }

  if (missionState.complete) {
    closePlanningMission();
    return;
  }

  const question = missionState.questions[missionState.index];
  const answer = Number.parseInt(missionElements.answer.value.trim(), 10);

  if (!Number.isFinite(answer)) {
    missionElements.feedback.textContent = 'Try again.';
    missionElements.feedback.dataset.state = 'incorrect';
    setShowMeVisible(false);
    missionElements.answer.focus();
    missionElements.answer.select();
    return;
  }

  if (answer !== question.answer) {
    missionElements.feedback.textContent = 'Try again.';
    missionElements.feedback.dataset.state = 'incorrect';
    setShowMeVisible(true);
    missionElements.answer.focus();
    missionElements.answer.select();
    return;
  }

  missionElements.feedback.textContent = 'Correct.';
  missionElements.feedback.dataset.state = 'correct';
  setShowMeVisible(false);

  if (missionState.index >= missionState.questions.length - 1) {
    renderPlanningMissionComplete();
    return;
  }

  missionState.index += 1;
  window.setTimeout(() => {
    if (missionState.active && !missionState.complete) {
      renderPlanningMissionQuestion();
    }
  }, 500);
};

const configuredLevels = getConfiguredLevels();
const configuredBriefAfter = getConfiguredBriefAfter();
const configuredQuizPerOp = getConfiguredQuizPerOp();
const configuredOps = configuredLevels ? [...new Set(configuredLevels.map((level) => level.op))] : null;
const configuredDigits = (() => {
  if (!configuredLevels) return null;
  const maxSeen = Math.max(
    ...configuredLevels.flatMap((level) => [level.aMax ?? 0, level.bMax ?? 0]).filter(Number.isFinite),
  );
  if (maxSeen > 99) return 3;
  if (maxSeen > 9) return 2;
  return 1;
})();

const game = new MathBlasterGame({
  canvas: document.querySelector('#gameCanvas'),
  levels: configuredLevels,
  levelLabel: document.querySelector('#levelLabel'),
  playerLabel: document.querySelector('#playerLabel'),
  enemyLabel: document.querySelector('#enemyLabel'),
  messageLabel: document.querySelector('#messageLabel'),
  problemTop: document.querySelector('#problemTop'),
  problemMiddle: document.querySelector('#problemMiddle'),
  problemOpMiddle: document.querySelector('#problemOpMiddle'),
  problemOpBottom: document.querySelector('#problemOpBottom'),
  problemBottom: document.querySelector('#problemBottom'),
  helperCaption: document.querySelector('#helperCaption'),
  roundRecap: document.querySelector('#roundRecap'),
  nextRoundButton: document.querySelector('#nextRoundButton'),
  completeLabel: document.querySelector('#completeLabel'),
  briefingAfterLevels: configuredBriefAfter,
  onComplete: openPlanningMission,
});

const held = {
  left: false,
  right: false,
  up: false,
  down: false,
};

const syncMovement = () => {
  game.setMovement({
    left: held.left,
    right: held.right,
    up: held.up,
    down: held.down,
  });
};

const keyMap = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowDown: 'down',
  KeyS: 'down',
};

window.addEventListener('keydown', (event) => {
  // Admin shortcut: open Planning Mission immediately.
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyM') {
    event.preventDefault();
    openPlanningMission();
    return;
  }

  if (missionState.active && !missionState.complete && !missionState.demoPlaying && event.code === 'Enter') {
    event.preventDefault();
    submitPlanningMissionAnswer();
    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    game.fire();
    return;
  }

  const direction = keyMap[event.code];
  if (!direction) {
    return;
  }

  event.preventDefault();
  held[direction] = true;
  syncMovement();
});

window.addEventListener('keyup', (event) => {
  const direction = keyMap[event.code];
  if (!direction) {
    return;
  }

  event.preventDefault();
  held[direction] = false;
  syncMovement();
});

const bindHoldButton = (element, direction) => {
  const press = (event) => {
    event.preventDefault();
    held[direction] = true;
    syncMovement();
  };

  const release = (event) => {
    event.preventDefault();
    held[direction] = false;
    syncMovement();
  };

  element.addEventListener('pointerdown', press);
  element.addEventListener('pointerup', release);
  element.addEventListener('pointerleave', release);
  element.addEventListener('pointercancel', release);
};

bindHoldButton(document.querySelector('#leftButton'), 'left');
bindHoldButton(document.querySelector('#rightButton'), 'right');
bindHoldButton(document.querySelector('#upButton'), 'up');
bindHoldButton(document.querySelector('#downButton'), 'down');

const canvas = document.querySelector('#gameCanvas');
let canvasPointer = null;

canvas.addEventListener('pointerdown', (event) => {
  canvasPointer = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  };
});

canvas.addEventListener('pointerup', (event) => {
  if (!canvasPointer || canvasPointer.id !== event.pointerId) {
    return;
  }

  const movedX = event.clientX - canvasPointer.x;
  const movedY = event.clientY - canvasPointer.y;
  const movedDistance = Math.hypot(movedX, movedY);
  canvasPointer = null;

  if (movedDistance <= 10) {
    game.fire();
  }
});

canvas.addEventListener('pointercancel', () => {
  canvasPointer = null;
});

window.addEventListener('pointerup', (event) => {
  if (canvasPointer && canvasPointer.id === event.pointerId) {
    canvasPointer = null;
  }
});

window.addEventListener('pointercancel', (event) => {
  if (canvasPointer && canvasPointer.id === event.pointerId) {
    canvasPointer = null;
  }
});

document.querySelector('#fireButton').addEventListener('click', () => {
  game.fire();
});

document.querySelector('#nextRoundButton').addEventListener('click', () => {
  game.nextRound();
});

restartButton.addEventListener('click', () => {
  held.left = false;
  held.right = false;
  held.up = false;
  held.down = false;
  syncMovement();
  closePlanningMission();
  game.restart();
});

missionElements.confirmButton.addEventListener('click', () => {
  submitPlanningMissionAnswer();
});

missionElements.showMeButton.addEventListener('click', async () => {
  if (!missionState.active || missionState.complete || missionState.demoPlaying) {
    return;
  }

  const question = missionState.questions[missionState.index];
  missionState.demoPlaying = true;
  missionElements.answer.disabled = true;
  missionElements.confirmButton.disabled = true;
  missionElements.showMeButton.disabled = true;
  restartButton.disabled = true;
  missionElements.modal.hidden = true;

  try {
    await game.runDemo(question);
  } finally {
    missionState.demoPlaying = false;

    if (!missionState.active || missionState.complete || missionState.questions[missionState.index] !== question) {
      restartButton.disabled = false;
      return;
    }

    missionElements.modal.hidden = false;
    missionElements.answer.disabled = false;
    missionElements.confirmButton.disabled = false;
    missionElements.showMeButton.disabled = false;
    restartButton.disabled = false;
    missionElements.answer.focus();
    missionElements.answer.select();
  }
});

missionElements.answer.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') {
    return;
  }

  event.preventDefault();
  submitPlanningMissionAnswer();
});

game.start();

// If URL has ?mission=1 or ?quiz=1, jump straight into the Planning Mission quiz.
maybeAutoOpenPlanningMission();
