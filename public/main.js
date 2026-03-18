import { MathBlasterGame } from './game.js';

const root = document.querySelector('#root');

root.innerHTML = `
  <div class="app-shell">
    <div class="hud">
      <div class="hud__group hud__group--problem">
        <div class="hud__label">Problem</div>
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
        <div id="roundRecap" class="hud__note hud__note--recap" hidden></div>
      </div>
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
      <div class="hud__group hud__group--wide">
        <div class="hud__label">Mission</div>
        <div id="messageLabel" class="hud__value">Press Teleport to send people to safety.</div>
        <div id="helperCaption" class="hud__note" hidden></div>
      </div>
      <div class="hud__actions">
        <button id="nextRoundButton" class="hud__button" type="button" hidden>Next Round</button>
        <div id="completeLabel" class="hud__complete" hidden>Complete</div>
      </div>
      <button id="restartButton" class="hud__button" type="button">Restart</button>
    </div>

    <div class="game-frame">
      <canvas id="gameCanvas" width="960" height="540" aria-label="Math space game"></canvas>
    </div>

    <div class="controls" aria-label="Touch controls">
      <button id="upButton" class="control-button" type="button">Move Up</button>
      <button id="fireButton" class="control-button control-button--accent controls__fire" type="button">Teleport</button>
      <button id="leftButton" class="control-button" type="button">Move Left</button>
      <button id="rightButton" class="control-button" type="button">Move Right</button>
      <button id="downButton" class="control-button" type="button">Move Down</button>
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

const createPlanningMissionQuestions = () => {
  const questions = [];

  for (let count = 0; count < 3; count += 1) {
    const a = randomInt(1, 9);
    const b = randomInt(1, 9);
    questions.push({
      answer: a + b,
      op: '+',
      a,
      b,
      prompt: `Teleport briefing: ${a} people are already aboard the rescue ship, and ${b} more arrive by teleport. How many people are on the rescue ship now? (${a} + ${b})`,
    });
  }

  for (let count = 0; count < 3; count += 1) {
    const a = randomInt(5, 18);
    const b = randomInt(1, Math.min(9, a - 1));
    questions.push({
      answer: a - b,
      op: '-',
      a,
      b,
      prompt: `Drone briefing: ${a} hazards block the route, and the drones clear ${b} of them. How many hazards are left? (${a} - ${b})`,
    });
  }

  for (let count = 0; count < 3; count += 1) {
    const a = randomInt(2, 6);
    const b = randomInt(2, 6);
    questions.push({
      answer: a * b,
      op: '×',
      a,
      b,
      prompt: `Cargo briefing: send ${a} cargo waves with ${b} crates in each wave. How many crates are sent altogether? (${a} × ${b})`,
    });
  }

  for (let count = 0; count < 3; count += 1) {
    const b = randomInt(2, 5);
    const trips = randomInt(2, 6);
    const a = b * trips;
    questions.push({
      answer: trips,
      op: '÷',
      a,
      b,
      prompt: `Shuttle briefing: ${a} people must travel, and each shuttle trip moves ${b} people. How many trips are needed? (${a} ÷ ${b})`,
    });
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
  missionElements.progress.textContent = 'All 12 questions solved';
  missionElements.prompt.textContent = 'The Planning Mission is ready. Every rescue route, drone sweep, cargo wave, and shuttle trip is confirmed.';
  missionElements.feedback.textContent = 'Correct. Briefing complete.';
  missionElements.feedback.dataset.state = 'correct';
  missionElements.answer.hidden = true;
  setShowMeVisible(false);
  missionElements.confirmButton.textContent = 'Close Briefing';
  missionElements.confirmButton.focus();
};

const openPlanningMission = () => {
  missionState.questions = createPlanningMissionQuestions();
  missionState.index = 0;
  missionState.active = true;
  missionState.complete = false;
  missionState.demoPlaying = false;
  missionElements.modal.hidden = false;
  renderPlanningMissionQuestion();
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

const game = new MathBlasterGame({
  canvas: document.querySelector('#gameCanvas'),
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
