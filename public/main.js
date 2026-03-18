import { MathBlasterGame } from './game.js';

const root = document.querySelector('#root');

root.innerHTML = `
  <div class="app-shell">
    <div class="hud">
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
      <button id="restartButton" class="hud__button" type="button">Restart</button>
    </div>

    <div class="game-frame">
      <canvas id="gameCanvas" width="960" height="540" aria-label="Math space game"></canvas>
    </div>

    <div class="controls" aria-label="Touch controls">
      <button id="leftButton" class="control-button" type="button">Move Left</button>
      <button id="fireButton" class="control-button control-button--accent" type="button">Fire</button>
      <button id="rightButton" class="control-button" type="button">Move Right</button>
    </div>
  </div>
`;

const game = new MathBlasterGame({
  canvas: document.querySelector('#gameCanvas'),
  levelLabel: document.querySelector('#levelLabel'),
  playerLabel: document.querySelector('#playerLabel'),
  enemyLabel: document.querySelector('#enemyLabel'),
  messageLabel: document.querySelector('#messageLabel'),
});

const held = {
  left: false,
  right: false,
};

const syncMovement = () => {
  game.setMovement({
    left: held.left,
    right: held.right,
  });
};

const keyMap = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
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

document.querySelector('#fireButton').addEventListener('click', () => {
  game.fire();
});

document.querySelector('#restartButton').addEventListener('click', () => {
  held.left = false;
  held.right = false;
  syncMovement();
  game.restart();
});

game.start();
