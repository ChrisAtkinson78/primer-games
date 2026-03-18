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
            <span class="problem-panel__operator" aria-hidden="true">+</span>
            <span id="problemMiddle" class="problem-panel__value">0</span>
          </div>
          <div class="problem-panel__line">
            <span class="problem-panel__operator" aria-hidden="true">=</span>
            <span id="problemBottom" class="problem-panel__value">?</span>
          </div>
        </div>
      </div>
      <div class="hud__group">
        <div class="hud__label">Level</div>
        <div id="levelLabel" class="hud__value">1 / 3</div>
      </div>
      <div class="hud__group">
        <div class="hud__label">Player Bullets</div>
        <div id="playerLabel" class="hud__value">0</div>
      </div>
      <div class="hud__group">
        <div class="hud__label">Enemy Number</div>
        <div id="enemyLabel" class="hud__value">0</div>
      </div>
      <div class="hud__group hud__group--wide">
        <div class="hud__label">Addition Result</div>
        <div id="messageLabel" class="hud__value">Press fire to transfer your number.</div>
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
      <button id="fireButton" class="control-button control-button--accent controls__fire" type="button">Fire</button>
      <button id="leftButton" class="control-button" type="button">Move Left</button>
      <button id="rightButton" class="control-button" type="button">Move Right</button>
      <button id="downButton" class="control-button" type="button">Move Down</button>
    </div>
  </div>
`;

const game = new MathBlasterGame({
  canvas: document.querySelector('#gameCanvas'),
  levelLabel: document.querySelector('#levelLabel'),
  playerLabel: document.querySelector('#playerLabel'),
  enemyLabel: document.querySelector('#enemyLabel'),
  messageLabel: document.querySelector('#messageLabel'),
  problemTop: document.querySelector('#problemTop'),
  problemMiddle: document.querySelector('#problemMiddle'),
  problemBottom: document.querySelector('#problemBottom'),
  nextRoundButton: document.querySelector('#nextRoundButton'),
  completeLabel: document.querySelector('#completeLabel'),
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

document.querySelector('#restartButton').addEventListener('click', () => {
  held.left = false;
  held.right = false;
  held.up = false;
  held.down = false;
  syncMovement();
  game.restart();
});

game.start();
