const DEFAULT_LEVELS = [
  { op: '+', aMin: 1, aMax: 5, bMin: 1, bMax: 5, label: 'World 1-1: Addition Warmup' },
  { op: '+', aMin: 3, aMax: 9, bMin: 2, bMax: 8, label: 'World 1-2: Addition Run' },
  { op: '+', aMin: 6, aMax: 12, bMin: 4, bMax: 10, label: 'World 1-3: Addition Finale' },
  { op: '-', aMin: 4, aMax: 9, bMin: 1, bMax: 4, label: 'World 2-1: Hazard Sweep' },
  { op: '-', aMin: 6, aMax: 12, bMin: 2, bMax: 6, label: 'World 2-2: Hazard Control' },
  { op: '-', aMin: 9, aMax: 15, bMin: 3, bMax: 8, label: 'World 2-3: Hazard Finale' },
  { op: '×', aMin: 2, aMax: 4, bMin: 2, bMax: 5, label: 'World 3-1: Cargo Groups' },
  { op: '×', aMin: 3, aMax: 6, bMin: 3, bMax: 6, label: 'World 3-2: Cargo Waves' },
  { op: '×', aMin: 4, aMax: 7, bMin: 4, bMax: 7, label: 'World 3-3: Cargo Finale' },
  { op: '÷', aMin: 6, aMax: 16, bMin: 2, bMax: 4, label: 'World 4-1: Shuttle Trips' },
  { op: '÷', aMin: 8, aMax: 24, bMin: 2, bMax: 6, label: 'World 4-2: Shuttle Waves' },
  { op: '÷', aMin: 12, aMax: 30, bMin: 3, bMax: 6, label: 'World 4-3: Shuttle Finale' },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const randomInt = (min, max) => {
  const span = max - min + 1;
  return min + Math.floor(Math.random() * span);
};

const lerp = (start, end, amount) => start + (end - start) * amount;

const operatorGlyph = (op) => {
  return op;
};

const EQUATION_FLASH_MS = 300;
const HELPER_CAPTION_SECONDS = 4.2;
const POPUP_LIFETIME_SECONDS = 0.85;
const HAZARD_POOF_LIFETIME_SECONDS = 0.45;

const HELPER_CAPTIONS = {
  '+': 'Each teleport moves 1 from your ship to the rescue ship. That makes the rescue total grow by 1.',
  '-': 'Each teleport uses 1 drone to remove 1 hazard. Both sides go down together.',
  '×': 'Each teleport sends one whole group of B. Repeating that A times builds multiplication.',
  '÷': 'Each trip moves B at once. Counting the trips shows how many equal groups fit into A.',
};

export class MathBlasterGame {
  constructor(elements) {
    this.canvas = elements.canvas;
    this.ctx = this.canvas.getContext('2d');
    this.levelLabel = elements.levelLabel;
    this.playerLabel = elements.playerLabel;
    this.enemyLabel = elements.enemyLabel;
    this.messageLabel = elements.messageLabel;
    this.problemTop = elements.problemTop;
    this.problemMiddle = elements.problemMiddle;
    this.problemOpMiddle = elements.problemOpMiddle;
    this.problemOpBottom = elements.problemOpBottom;
    this.problemBottom = elements.problemBottom;
    this.helperCaption = elements.helperCaption;
    this.roundRecap = elements.roundRecap;
    this.nextRoundButton = elements.nextRoundButton;
    this.completeLabel = elements.completeLabel;
    this.onComplete = elements.onComplete;
    this.levels = Array.isArray(elements.levels) && elements.levels.length > 0 ? elements.levels : DEFAULT_LEVELS;

    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this.movement = { left: false, right: false, up: false, down: false };
    this.playerSpeed = 380;
    this.playerShip = {
      x: this.width * 0.2,
      y: this.height * 0.78,
      width: 88,
      height: 50,
    };
    this.enemyShip = {
      x: this.width * 0.78,
      y: this.height * 0.28,
      width: 108,
      height: 58,
      warp: 0,
    };
    this.enemySpeed = 92;
    this.crashDuration = 0.9;

    this.levelIndex = 0;
    this.currentLevel = this.levels[0];
    this.bullets = [];
    this.phase = 'playing';
    this.phaseTimer = 0;
    this.resultValue = null;
    this.finalMessage = '';
    this.lastTime = 0;
    this.tripCount = 0;
    this.helperCaptionTimer = 0;
    this.deltaPopups = [];
    this.hazards = [];
    this.hazardPoofs = [];
    this.explainedOperations = new Set();
    this.flashTimeouts = new Map();
    this.completionNotified = false;
    this.controlsLocked = false;
    this.collisionDisabled = false;
    this.demoSession = null;

    this.resetLevel(0);
  }

  start() {
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.frame(time));
  }

  restart() {
    this.bullets = [];
    this.phase = 'playing';
    this.phaseTimer = 0;
    this.resultValue = null;
    this.finalMessage = '';
    this.enemyShip.warp = 0;
    this.tripCount = 0;
    this.helperCaptionTimer = 0;
    this.deltaPopups = [];
    this.hazards = [];
    this.hazardPoofs = [];
    this.explainedOperations.clear();
    this.completionNotified = false;
    this.controlsLocked = false;
    this.collisionDisabled = false;
    this.demoSession = null;
    this.hideHelperCaption();
    this.hideRoundRecap();
    this.resetLevel(0);
  }

  setMovement(nextMovement) {
    if (this.controlsLocked) {
      this.movement = { left: false, right: false, up: false, down: false };
      return;
    }

    this.movement = nextMovement;
  }

  fire() {
    if (this.controlsLocked || this.phase !== 'playing' || this.availableShots() <= 0) {
      return;
    }

    const bullet = {
      x: this.playerShip.x + this.playerShip.width * 0.45,
      y: this.playerShip.y,
      progress: 0,
      speed: 1.7,
      radius: 7,
    };

    this.bullets.push(bullet);
    this.updateHud();
  }

  frame(time) {
    const deltaSeconds = Math.min((time - this.lastTime) / 1000, 0.033);
    this.lastTime = time;

    this.update(deltaSeconds);
    this.render();

    requestAnimationFrame((nextTime) => this.frame(nextTime));
  }

  update(deltaSeconds) {
    this.updatePlayer(deltaSeconds);
    this.updateEnemy(deltaSeconds);
    this.updateBullets(deltaSeconds);
    this.updateDeltaPopups(deltaSeconds);
    this.updateHazardPoofs(deltaSeconds);
    this.updateHelperCaption(deltaSeconds);

    if (this.phase === 'crash') {
      this.phaseTimer += deltaSeconds;
      if (this.phaseTimer >= this.crashDuration) {
        this.resetLevel(this.levelIndex);
      }
    } else if (this.phase === 'result' || this.phase === 'complete') {
      this.phaseTimer += deltaSeconds;
      this.enemyShip.warp = clamp(this.phaseTimer / 1.4, 0, 1);
    }

    this.updateDemo(deltaSeconds);
  }

  updatePlayer(deltaSeconds) {
    if (this.controlsLocked || this.phase !== 'playing') {
      return;
    }

    let horizontalDirection = 0;
    let verticalDirection = 0;
    if (this.movement.left) horizontalDirection -= 1;
    if (this.movement.right) horizontalDirection += 1;
    if (this.movement.up) verticalDirection -= 1;
    if (this.movement.down) verticalDirection += 1;

    if (horizontalDirection !== 0 && verticalDirection !== 0) {
      const normalizedSpeed = Math.SQRT1_2;
      horizontalDirection *= normalizedSpeed;
      verticalDirection *= normalizedSpeed;
    }

    this.playerShip.x += horizontalDirection * this.playerSpeed * deltaSeconds;
    this.playerShip.y += verticalDirection * this.playerSpeed * deltaSeconds;

    const minX = 54;
    const maxX = this.width - this.playerShip.width - 54;
    const minY = 54 + this.playerShip.height * 0.5;
    const maxY = this.height - 54 - this.playerShip.height * 0.5;
    this.playerShip.x = clamp(this.playerShip.x, minX, maxX);
    this.playerShip.y = clamp(this.playerShip.y, minY, maxY);
  }

  updateEnemy(deltaSeconds) {
    if (this.phase !== 'playing' || this.demoSession) {
      return;
    }

    const targetX = this.playerShip.x + this.playerShip.width * 0.5 - this.enemyShip.width * 0.5;
    const targetY = this.playerShip.y;
    const deltaX = targetX - this.enemyShip.x;
    const deltaY = targetY - this.enemyShip.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance > 1) {
      const maxStep = this.enemySpeed * deltaSeconds;
      const stepScale = Math.min(1, maxStep / distance);
      this.enemyShip.x += deltaX * stepScale;
      this.enemyShip.y += deltaY * stepScale;
    }

    const minX = this.width * 0.48;
    const maxX = this.width - this.enemyShip.width - 40;
    const minY = 54 + this.enemyShip.height * 0.5;
    const maxY = this.height - 54 - this.enemyShip.height * 0.5;
    this.enemyShip.x = clamp(this.enemyShip.x, minX, maxX);
    this.enemyShip.y = clamp(this.enemyShip.y, minY, maxY);

    if (!this.collisionDisabled && this.shipsCollide()) {
      this.handleCrash();
    }
  }

  updateBullets(deltaSeconds) {
    const activeBullets = [];
    for (const bullet of this.bullets) {
      bullet.progress += bullet.speed * deltaSeconds;
      if (bullet.progress >= 1) {
        this.resolveHit();
        continue;
      }
      activeBullets.push(bullet);
    }
    this.bullets = activeBullets;
  }

  availableShots() {
    const reservedShots = this.bullets.length;
    if (this.currentLevel.op === '÷') {
      return Math.floor(this.playerNumber / this.operandB) - reservedShots;
    }
    return this.playerNumber - reservedShots;
  }

  resolveHit() {
    if (this.phase !== 'playing') {
      return;
    }

    const op = this.currentLevel.op;
    let hitResolved = false;

    switch (op) {
      case '+':
        if (this.playerNumber <= 0) return;
        this.playerNumber -= 1;
        this.enemyNumber += 1;
        hitResolved = true;
        break;
      case '-':
        if (this.playerNumber <= 0 || this.enemyNumber <= 0) return;
        this.playerNumber -= 1;
        this.enemyNumber -= 1;
        this.removeHazard();
        hitResolved = true;
        break;
      case '×':
        if (this.playerNumber <= 0) return;
        this.playerNumber -= 1;
        this.enemyNumber += this.operandB;
        hitResolved = true;
        break;
      case '÷':
        if (this.playerNumber < this.operandB) return;
        this.playerNumber -= this.operandB;
        this.enemyNumber += this.operandB;
        this.tripCount += 1;
        hitResolved = true;
        break;
      default:
        return;
    }

    if (!hitResolved) {
      return;
    }

    this.showOperationFeedback(op);
    this.updateHud();

    if (this.playerNumber === 0) {
      this.finishRound();
    }
  }

  finishRound() {
    this.resultValue = this.computeResultValue();
    this.finalMessage = `${this.operandA} ${operatorGlyph(this.currentLevel.op)} ${this.operandB} = ${this.resultValue}`;

    if (this.demoSession) {
      this.phase = 'result';
      this.phaseTimer = 0;
      this.enemyShip.warp = 0;
      this.messageLabel.textContent = `${this.finalMessage}. Demo complete.`;
      this.showRoundRecap();
      this.updateHud();
      return;
    }

    if (this.levelIndex >= this.levels.length - 1) {
      this.phase = 'complete';
      this.phaseTimer = 1.4;
      this.enemyShip.warp = 1;
      this.messageLabel.textContent = `All worlds complete. ${this.finalMessage}`;
      if (!this.completionNotified && typeof this.onComplete === 'function') {
        this.completionNotified = true;
        this.onComplete({
          level: this.currentLevel.label,
          equation: this.finalMessage,
        });
      }
    } else {
      this.phase = 'result';
      this.phaseTimer = 0;
      this.messageLabel.textContent = `${this.finalMessage}. Press Next Round.`;
    }

    this.showRoundRecap();
    this.updateHud();
  }

  computeResultValue() {
    switch (this.currentLevel.op) {
      case '+':
        return this.operandA + this.operandB;
      case '-':
        return this.operandA - this.operandB;
      case '×':
        return this.operandA * this.operandB;
      case '÷':
        return this.tripCount;
      default:
        return 0;
    }
  }

  shipsCollide() {
    const playerBounds = {
      left: this.playerShip.x + 6,
      right: this.playerShip.x + this.playerShip.width - 8,
      top: this.playerShip.y - this.playerShip.height * 0.42,
      bottom: this.playerShip.y + this.playerShip.height * 0.42,
    };
    const enemyBounds = {
      left: this.enemyShip.x,
      right: this.enemyShip.x + this.enemyShip.width,
      top: this.enemyShip.y - this.enemyShip.height * 0.5,
      bottom: this.enemyShip.y + this.enemyShip.height * 0.5,
    };

    return !(
      playerBounds.right < enemyBounds.left ||
      playerBounds.left > enemyBounds.right ||
      playerBounds.bottom < enemyBounds.top ||
      playerBounds.top > enemyBounds.bottom
    );
  }

  handleCrash() {
    if (this.phase !== 'playing') {
      return;
    }

    this.phase = 'crash';
    this.phaseTimer = 0;
    this.bullets = [];
    this.messageLabel.textContent = 'Rescue ship collision. Resetting this level...';
    this.hideHelperCaption();
    this.updateHud();
  }

  nextRound() {
    if (this.phase !== 'result') {
      return;
    }

    this.resetLevel(this.levelIndex + 1);
  }

  resetLevel(nextLevelIndex) {
    this.levelIndex = nextLevelIndex;
    this.currentLevel = this.levels[this.levelIndex];
    this.setupRoundState();
    this.bullets = [];
    this.phase = 'playing';
    this.phaseTimer = 0;
    this.resultValue = null;
    this.finalMessage = '';
    this.enemyShip.warp = 0;
    this.helperCaptionTimer = 0;
    this.deltaPopups = [];
    this.hazardPoofs = [];
    this.playerShip.x = this.width * 0.2;
    this.playerShip.y = this.height * 0.78;
    this.messageLabel.textContent = this.getInstructionMessage();
    this.hideHelperCaption();
    this.hideRoundRecap();
    this.updateHud();
  }

  setupRoundState() {
    const { op, aMin, aMax, bMin, bMax } = this.currentLevel;
    const operands = this.generateOperands(op, aMin, aMax, bMin, bMax);
    this.configureRoundState(op, operands.a, operands.b);
  }

  configureRoundState(op, operandA, operandB) {
    this.operandA = operandA;
    this.operandB = operandB;
    this.tripCount = 0;

    switch (op) {
      case '+':
        this.initialPlayerNumber = operandA;
        this.initialEnemyNumber = operandB;
        break;
      case '-':
        this.initialPlayerNumber = operandB;
        this.initialEnemyNumber = operandA;
        break;
      case '×':
      case '÷':
        this.initialPlayerNumber = operandA;
        this.initialEnemyNumber = 0;
        break;
      default:
        this.initialPlayerNumber = 0;
        this.initialEnemyNumber = 0;
        break;
    }

    this.playerNumber = this.initialPlayerNumber;
    this.enemyNumber = this.initialEnemyNumber;
    this.hazards = op === '-' ? this.createHazards(operandA) : [];
  }

  configureDemoRoundState(op, operandA, operandB) {
    this.configureRoundState(op, operandA, operandB);

    if (op === '+') {
      this.initialPlayerNumber = operandB;
      this.initialEnemyNumber = operandA;
      this.playerNumber = operandB;
      this.enemyNumber = operandA;
    }
  }

  createHazards(count) {
    const hazards = [];
    const columns = 5;
    const spacingX = 30;
    const spacingY = 28;
    const totalRows = Math.ceil(count / columns);
    const clusterWidth = Math.min(columns, count) * spacingX;
    const clusterHeight = totalRows * spacingY;
    const originX = this.width - 252;
    const originY = 102;
    const startX = originX + (160 - clusterWidth) * 0.5 + spacingX * 0.5;
    const startY = originY + (110 - clusterHeight) * 0.5 + spacingY * 0.5;

    for (let index = 0; index < count; index += 1) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const jitterX = ((index * 17) % 7) - 3;
      const jitterY = ((index * 11) % 7) - 3;
      hazards.push({
        x: startX + column * spacingX + jitterX,
        y: startY + row * spacingY + jitterY,
        radius: 8 + (index % 3),
        rotation: ((index * 37) % 360) * (Math.PI / 180),
        variant: index % 3,
      });
    }

    return hazards;
  }

  generateOperands(op, aMin, aMax, bMin, bMax) {
    if (op === '-') {
      const b = randomInt(bMin, bMax);
      const a = randomInt(Math.max(aMin, b), aMax);
      return { a, b };
    }

    if (op === '÷') {
      const quotientMin = this.currentLevel.quotientMin ?? 1;
      const quotientMax = this.currentLevel.quotientMax ?? Number.POSITIVE_INFINITY;
      const dividendMin = this.currentLevel.dividendMin ?? aMin;
      const dividendMax = this.currentLevel.dividendMax ?? aMax;
      const divisorMin = this.currentLevel.divisorMin ?? bMin;
      const divisorMax = this.currentLevel.divisorMax ?? bMax;
      const validPairs = [];
      for (let b = divisorMin; b <= divisorMax; b += 1) {
        for (let a = dividendMin; a <= dividendMax; a += 1) {
          if (a % b === 0 && a / b >= quotientMin && a / b <= quotientMax) {
            validPairs.push({ a, b });
          }
        }
      }

      return validPairs[randomInt(0, validPairs.length - 1)];
    }

    return {
      a: randomInt(aMin, aMax),
      b: randomInt(bMin, bMax),
    };
  }

  getInstructionMessage() {
    const { label, op } = this.currentLevel;

    switch (op) {
      case '+':
        return `${label}. Click or tap Teleport to add ${this.operandB} more to the rescue ship.`;
      case '-':
        return `${label}. Click or tap Teleport to clear ${this.operandB} hazards with repair drones.`;
      case '×':
        return `${label}. Click or tap Teleport to send ${this.operandA} waves of ${this.operandB}.`;
      case '÷':
        return `${label}. Click or tap Teleport to move ${this.operandB} people per trip.`;
      default:
        return `${label}. Click or tap Teleport.`;
    }
  }

  getPlayerStatusText() {
    const teleportsReady = Math.max(0, this.availableShots());

    switch (this.currentLevel.op) {
      case '+':
        return `${this.playerNumber} aboard | ${teleportsReady} teleports ready`;
      case '-':
        return `${this.playerNumber} drones | ${teleportsReady} teleports ready`;
      case '×':
        return `${this.playerNumber} teleports left | ${teleportsReady} ready`;
      case '÷':
        return `${this.playerNumber} aboard | ${teleportsReady} trips ready`;
      default:
        return `${this.playerNumber}`;
    }
  }

  getEnemyStatusText() {
    switch (this.currentLevel.op) {
      case '-':
        return `${this.enemyNumber} hazards`;
      case '×':
        return `${this.enemyNumber} delivered`;
      case '÷':
        return `${this.enemyNumber} rescued | ${this.tripCount} trips`;
      default:
        return `${this.enemyNumber}`;
    }
  }

  getOverlayTitle() {
    switch (this.currentLevel.op) {
      case '+':
        return 'Addition Complete';
      case '-':
        return 'Subtraction Complete';
      case '×':
        return 'Multiplication Complete';
      case '÷':
        return 'Division Complete';
      default:
        return 'Round Complete';
    }
  }

  updateHud() {
    this.levelLabel.textContent = this.demoSession ? 'Demo' : `${this.levelIndex + 1} / ${this.levels.length}`;
    this.playerLabel.textContent = this.getPlayerStatusText();
    this.enemyLabel.textContent = this.getEnemyStatusText();
    this.problemTop.textContent = `${this.operandA}`;
    this.problemMiddle.textContent = `${this.operandB}`;
    this.problemOpMiddle.textContent = operatorGlyph(this.currentLevel.op);
    this.problemOpBottom.textContent = '=';
    this.problemBottom.textContent = this.resultValue === null ? '?' : `${this.resultValue}`;

    const showNextRound = this.phase === 'result' || this.phase === 'complete';
    this.nextRoundButton.hidden = !showNextRound;
    this.nextRoundButton.disabled = this.phase === 'complete';
    this.completeLabel.hidden = this.phase !== 'complete';
  }

  updateDemo(deltaSeconds) {
    if (!this.demoSession) {
      return;
    }

    if (this.phase === 'result' || this.phase === 'complete') {
      this.demoSession.restoreDelay = Math.max(0, this.demoSession.restoreDelay - deltaSeconds);
      if (this.demoSession.restoreDelay === 0) {
        this.restoreDemoState();
      }
    }
  }

  updateHelperCaption(deltaSeconds) {
    if (this.helperCaptionTimer <= 0) {
      return;
    }

    this.helperCaptionTimer = Math.max(0, this.helperCaptionTimer - deltaSeconds);
    if (this.helperCaptionTimer === 0) {
      this.hideHelperCaption();
    }
  }

  updateDeltaPopups(deltaSeconds) {
    this.deltaPopups = this.deltaPopups.filter((popup) => {
      popup.age += deltaSeconds;
      return popup.age < popup.lifetime;
    });
  }

  updateHazardPoofs(deltaSeconds) {
    this.hazardPoofs = this.hazardPoofs.filter((poof) => {
      poof.age += deltaSeconds;
      return poof.age < poof.lifetime;
    });
  }

  showOperationFeedback(op) {
    this.spawnDeltaPopups(op);
    this.flashEquationParts();

    if (!this.explainedOperations.has(op)) {
      this.explainedOperations.add(op);
      this.showHelperCaption(HELPER_CAPTIONS[op], HELPER_CAPTION_SECONDS);
    }
  }

  showHelperCaption(text, durationSeconds) {
    this.helperCaption.textContent = text;
    this.helperCaption.hidden = false;
    this.helperCaptionTimer = durationSeconds;
  }

  hideHelperCaption() {
    this.helperCaption.hidden = true;
    this.helperCaption.textContent = '';
    this.helperCaptionTimer = 0;
  }

  showRoundRecap() {
    this.roundRecap.textContent = this.getRoundRecapText();
    this.roundRecap.hidden = false;
  }

  hideRoundRecap() {
    this.roundRecap.hidden = true;
    this.roundRecap.textContent = '';
  }

  getRoundRecapText() {
    switch (this.currentLevel.op) {
      case '+':
        return `${this.operandA} plus ${this.operandB} makes ${this.resultValue}. You moved 1 person each teleport until both groups were together.`;
      case '-':
        return `${this.operandA} minus ${this.operandB} leaves ${this.resultValue}. Each teleport cleared 1 hazard with 1 drone.`;
      case '×':
        return `${this.operandA} groups of ${this.operandB} make ${this.resultValue}. Each teleport added one full group.`;
      case '÷':
        return `${this.operandA} divided into groups of ${this.operandB} makes ${this.resultValue} trips. Each trip moved the same amount.`;
      default:
        return this.finalMessage;
    }
  }

  flashEquationParts() {
    this.flashElement(this.problemTop, 'problem-panel__value--flash');
    this.flashElement(this.problemMiddle, 'problem-panel__value--flash');
    this.flashElement(this.problemOpMiddle, 'problem-panel__operator--flash');
  }

  flashElement(element, className) {
    const timeoutKey = `${element.id}:${className}`;
    const existingTimeout = this.flashTimeouts.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    element.classList.add(className);
    const timeout = window.setTimeout(() => {
      element.classList.remove(className);
      this.flashTimeouts.delete(timeoutKey);
    }, EQUATION_FLASH_MS);
    this.flashTimeouts.set(timeoutKey, timeout);
  }

  spawnDeltaPopups(op) {
    const playerX = this.playerShip.x + this.playerShip.width * 0.36;
    const playerY = this.playerShip.y - this.playerShip.height * 0.9;
    const enemyX = this.enemyShip.x + this.enemyShip.width * 0.5;
    const enemyY = this.enemyShip.y - this.enemyShip.height * 0.95;

    switch (op) {
      case '+':
        this.addPopup(playerX, playerY, '-1', '#ffd39a');
        this.addPopup(enemyX, enemyY, '+1', '#9df2ff');
        break;
      case '-':
        this.addPopup(playerX, playerY, '-1', '#ffd39a');
        this.addPopup(enemyX, enemyY, '-1', '#ffb3b3');
        break;
      case '×':
        this.addPopup(playerX, playerY, '-1', '#ffd39a');
        this.addPopup(enemyX, enemyY, `+${this.operandB}`, '#9df2ff');
        break;
      case '÷':
        this.addPopup(playerX, playerY, `-${this.operandB}`, '#ffd39a');
        this.addPopup(enemyX, enemyY, `+${this.operandB}`, '#9df2ff');
        this.addPopup(this.width - 126, 76, 'Trip +1', '#fff2a8', 1);
        break;
      default:
        break;
    }
  }

  addPopup(x, y, text, color, scale = 0) {
    this.deltaPopups.push({
      x,
      y,
      text,
      color,
      age: 0,
      lifetime: POPUP_LIFETIME_SECONDS,
      scale,
    });
  }

  cloneItems(items) {
    return items.map((item) => ({ ...item }));
  }

  createDemoSnapshot() {
    return {
      levelIndex: this.levelIndex,
      currentLevel: { ...this.currentLevel },
      operandA: this.operandA,
      operandB: this.operandB,
      initialPlayerNumber: this.initialPlayerNumber,
      initialEnemyNumber: this.initialEnemyNumber,
      playerNumber: this.playerNumber,
      enemyNumber: this.enemyNumber,
      tripCount: this.tripCount,
      bullets: this.cloneItems(this.bullets),
      phase: this.phase,
      phaseTimer: this.phaseTimer,
      resultValue: this.resultValue,
      finalMessage: this.finalMessage,
      playerShip: { ...this.playerShip },
      enemyShip: { ...this.enemyShip },
      helperCaptionTimer: this.helperCaptionTimer,
      helperCaptionText: this.helperCaption.textContent,
      helperCaptionHidden: this.helperCaption.hidden,
      roundRecapText: this.roundRecap.textContent,
      roundRecapHidden: this.roundRecap.hidden,
      deltaPopups: this.cloneItems(this.deltaPopups),
      hazards: this.cloneItems(this.hazards),
      hazardPoofs: this.cloneItems(this.hazardPoofs),
      explainedOperations: [...this.explainedOperations],
      completionNotified: this.completionNotified,
      movement: { ...this.movement },
      messageText: this.messageLabel.textContent,
    };
  }

  runDemo(question) {
    if (this.demoSession) {
      return Promise.resolve();
    }

    const { op, a, b } = question;
    const snapshot = this.createDemoSnapshot();

    this.demoSession = {
      snapshot,
      restoreDelay: 1.5,
      resolve: null,
    };

    this.collisionDisabled = true;
    this.movement = { left: false, right: false, up: false, down: false };
    this.currentLevel = { ...this.currentLevel, op, label: 'Planning Mission Demo' };
    this.configureDemoRoundState(op, a, b);
    this.bullets = [];
    this.phase = 'playing';
    this.phaseTimer = 0;
    this.resultValue = null;
    this.finalMessage = '';
    this.enemyShip.warp = 0;
    this.helperCaptionTimer = 0;
    this.deltaPopups = [];
    this.hazardPoofs = [];
    this.playerShip.x = this.width * 0.2;
    this.playerShip.y = this.height * 0.78;
    this.enemyShip.x = this.width * 0.74;
    this.enemyShip.y = this.height * 0.3;
    this.hideRoundRecap();
    this.hideHelperCaption();
    this.messageLabel.textContent = this.getDemoInstructionMessage(op, a, b);
    this.updateHud();
    this.lastTime = performance.now();

    return new Promise((resolve) => {
      this.demoSession.resolve = resolve;
    });
  }

  getDemoInstructionMessage(op, a, b) {
    switch (op) {
      case '+':
        return `Planning Mission demo. Teleport ${b} more people so the rescue ship reaches ${a + b}.`;
      case '-':
        return `Planning Mission demo. Teleport ${b} drones to clear hazards until ${a - b} remain.`;
      case '×':
        return `Planning Mission demo. Teleport ${a} cargo waves of ${b} crates each for ${a * b} total.`;
      case '÷':
        return `Planning Mission demo. Make shuttle trips of ${b} people until all ${a} are rescued.`;
      default:
        return 'Planning Mission demo.';
    }
  }

  restoreDemoState() {
    if (!this.demoSession) {
      return;
    }

    const { snapshot, resolve } = this.demoSession;
    this.demoSession = null;
    this.controlsLocked = false;
    this.collisionDisabled = false;
    this.levelIndex = snapshot.levelIndex;
    this.currentLevel = { ...snapshot.currentLevel };
    this.operandA = snapshot.operandA;
    this.operandB = snapshot.operandB;
    this.initialPlayerNumber = snapshot.initialPlayerNumber;
    this.initialEnemyNumber = snapshot.initialEnemyNumber;
    this.playerNumber = snapshot.playerNumber;
    this.enemyNumber = snapshot.enemyNumber;
    this.tripCount = snapshot.tripCount;
    this.bullets = this.cloneItems(snapshot.bullets);
    this.phase = snapshot.phase;
    this.phaseTimer = snapshot.phaseTimer;
    this.resultValue = snapshot.resultValue;
    this.finalMessage = snapshot.finalMessage;
    this.playerShip = { ...snapshot.playerShip };
    this.enemyShip = { ...snapshot.enemyShip };
    this.helperCaptionTimer = snapshot.helperCaptionTimer;
    this.deltaPopups = this.cloneItems(snapshot.deltaPopups);
    this.hazards = this.cloneItems(snapshot.hazards);
    this.hazardPoofs = this.cloneItems(snapshot.hazardPoofs);
    this.explainedOperations = new Set(snapshot.explainedOperations);
    this.completionNotified = snapshot.completionNotified;
    this.movement = { ...snapshot.movement };
    this.messageLabel.textContent = snapshot.messageText;

    if (snapshot.helperCaptionHidden) {
      this.hideHelperCaption();
    } else {
      this.helperCaption.textContent = snapshot.helperCaptionText;
      this.helperCaption.hidden = false;
    }

    if (snapshot.roundRecapHidden) {
      this.hideRoundRecap();
    } else {
      this.roundRecap.textContent = snapshot.roundRecapText;
      this.roundRecap.hidden = false;
    }

    this.updateHud();
    this.lastTime = performance.now();
    if (typeof resolve === 'function') {
      resolve();
    }
  }

  removeHazard() {
    if (this.currentLevel.op !== '-' || this.hazards.length === 0) {
      return;
    }

    const hazard = this.hazards.pop();
    this.hazardPoofs.push({
      x: hazard.x,
      y: hazard.y,
      age: 0,
      lifetime: HAZARD_POOF_LIFETIME_SECONDS,
      radius: hazard.radius + 8,
    });
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(ctx);
    this.drawArena(ctx);
    this.drawHazards(ctx);
    this.drawPlayer(ctx);
    this.drawEnemy(ctx);
    this.drawBullets(ctx);
    this.drawDeltaPopups(ctx);

    if (this.phase === 'result' || this.phase === 'complete') {
      this.drawResultOverlay(ctx);
    } else if (this.phase === 'crash') {
      this.drawCrashOverlay(ctx);
    }
  }

  drawBackground(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#06131f');
    gradient.addColorStop(0.55, '#0f2741');
    gradient.addColorStop(1, '#190f29');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    for (let i = 0; i < 40; i += 1) {
      const x = (i * 137) % this.width;
      const y = (i * 83) % this.height;
      const size = (i % 3) + 1;
      ctx.globalAlpha = 0.35 + (i % 4) * 0.1;
      ctx.fillStyle = '#f8fbff';
      ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1;
  }

  drawArena(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 226, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.strokeRect(28, 28, this.width - 56, this.height - 56);
    ctx.restore();
  }

  drawHazards(ctx) {
    if (this.currentLevel.op !== '-') {
      return;
    }

    ctx.save();
    ctx.fillStyle = 'rgba(9, 19, 30, 0.28)';
    ctx.strokeStyle = 'rgba(178, 214, 244, 0.14)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(this.width - 266, 90, 188, 126, 24);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    for (const hazard of this.hazards) {
      ctx.save();
      ctx.translate(hazard.x, hazard.y);
      ctx.rotate(hazard.rotation + this.lastTime * 0.00018 * (hazard.variant + 1));
      ctx.fillStyle = hazard.variant === 0 ? '#7f8fa1' : '#8f7886';
      ctx.strokeStyle = 'rgba(232, 244, 255, 0.2)';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      for (let point = 0; point < 7; point += 1) {
        const angle = (Math.PI * 2 * point) / 7;
        const radius = hazard.radius + ((point + hazard.variant) % 2 === 0 ? 2.8 : -1.6);
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (point === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 214, 153, 0.3)';
      ctx.beginPath();
      ctx.arc(-hazard.radius * 0.2, -hazard.radius * 0.15, hazard.radius * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const poof of this.hazardPoofs) {
      const progress = poof.age / poof.lifetime;
      const alpha = 1 - progress;
      const ringRadius = poof.radius * (0.45 + progress * 0.75);

      ctx.save();
      ctx.translate(poof.x, poof.y);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ffe4ae';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fff7cf';
      for (let spark = 0; spark < 6; spark += 1) {
        const angle = (Math.PI * 2 * spark) / 6 + progress * 0.55;
        const distance = poof.radius * (0.2 + progress * 0.8);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        ctx.beginPath();
        ctx.arc(x, y, 1.8 + (1 - progress), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawPlayer(ctx) {
    const ship = this.playerShip;
    const damageRatio = this.initialPlayerNumber > 0 ? 1 - this.playerNumber / this.initialPlayerNumber : 0;
    const smokeCount = 3 + Math.round(damageRatio * 4);
    const flameCount = damageRatio <= 0 ? 0 : 1 + Math.floor(damageRatio * 2);

    ctx.save();
    ctx.translate(ship.x, ship.y);

    for (let i = 0; i < smokeCount; i += 1) {
      const offset = (this.lastTime * 0.0018 + i * 0.27) % 1;
      const drift = Math.sin(this.lastTime * 0.002 + i * 1.9) * (4 + damageRatio * 8);
      const radius = lerp(7, 15, offset) + damageRatio * 4;
      const alpha = lerp(0.18, 0.04, offset) + damageRatio * 0.05;
      const smokeX = ship.width * (0.14 + (i % 2) * 0.08) - offset * 12 + drift;
      const smokeY = -ship.height * 0.06 - offset * (20 + damageRatio * 18) + (i % 2) * 5;
      ctx.fillStyle = `rgba(168, 181, 189, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(smokeX, smokeY, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (flameCount > 0) {
      for (let i = 0; i < flameCount; i += 1) {
        const flicker = 0.7 + 0.3 * Math.sin(this.lastTime * 0.02 + i * 2.1);
        const flameHeight = lerp(7, 14, damageRatio) * flicker;
        const baseX = ship.width * (0.08 + i * 0.07);
        const baseY = ship.height * (0.04 + i * 0.03);

        ctx.fillStyle = `rgba(255, 157, 63, ${(0.48 + damageRatio * 0.2).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(baseX - 5, baseY);
        ctx.lineTo(baseX + 2, baseY - flameHeight);
        ctx.lineTo(baseX + 8, baseY + 1);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = `rgba(255, 224, 128, ${(0.42 + damageRatio * 0.18).toFixed(3)})`;
        ctx.fillRect(baseX - 1, baseY - flameHeight * 0.65, 4, flameHeight * 0.62);
      }
    }

    ctx.fillStyle = '#66d6ff';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ship.width * 0.72, -ship.height * 0.4);
    ctx.lineTo(ship.width, 0);
    ctx.lineTo(ship.width * 0.72, ship.height * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#baf4ff';
    ctx.fillRect(ship.width * 0.16, -10, ship.width * 0.22, 20);

    ctx.fillStyle = 'rgba(27, 56, 74, 0.55)';
    ctx.fillRect(ship.width * 0.08, -6, ship.width * 0.14, 12);
    ctx.restore();

    this.drawShipNumber(ctx, ship.x + ship.width * 0.32, ship.y + 4, this.playerNumber, '#06131f', '#f6fbff');
  }

  drawEnemy(ctx) {
    const ship = this.enemyShip;
    const warpScale = 1 + ship.warp * 0.9;
    const alpha = 1 - ship.warp * 0.85;

    ctx.save();
    ctx.translate(ship.x + ship.width / 2, ship.y);
    ctx.scale(warpScale, 1 - ship.warp * 0.5);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ff9275';
    ctx.beginPath();
    ctx.moveTo(-ship.width * 0.5, 0);
    ctx.lineTo(-ship.width * 0.18, -ship.height * 0.5);
    ctx.lineTo(ship.width * 0.5, -ship.height * 0.18);
    ctx.lineTo(ship.width * 0.5, ship.height * 0.18);
    ctx.lineTo(-ship.width * 0.18, ship.height * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 231, 221, 0.9)';
    ctx.lineWidth = 3;
    ctx.strokeRect(-ship.width * 0.1, -12, ship.width * 0.22, 24);
    ctx.restore();

    if (alpha > 0.1) {
      this.drawShipNumber(
        ctx,
        ship.x + ship.width * 0.46,
        ship.y + 4,
        this.enemyNumber,
        '#3c1208',
        '#fff5ef',
        alpha,
      );
    }
  }

  drawShipNumber(ctx, x, y, value, panelColor, textColor, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = panelColor;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 28, y - 22, 56, 44, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), x, y + 1);
    ctx.restore();
  }

  drawBullets(ctx) {
    const startX = this.playerShip.x + this.playerShip.width * 0.9;
    const startY = this.playerShip.y;
    const endX = this.enemyShip.x + this.enemyShip.width * 0.15;
    const endY = this.enemyShip.y;

    for (const bullet of this.bullets) {
      const t = bullet.progress;
      const arcHeight = 110;
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t - Math.sin(t * Math.PI) * arcHeight;

      ctx.save();
      ctx.fillStyle = '#ffe58f';
      ctx.shadowColor = '#ffd24d';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(x, y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawDeltaPopups(ctx) {
    for (const popup of this.deltaPopups) {
      const progress = popup.age / popup.lifetime;
      const lift = 28 * progress;
      const alpha = 1 - progress;
      const scale = 1 + popup.scale * (1 - progress * 0.5);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(popup.x, popup.y - lift);
      ctx.scale(scale, scale);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 24px Arial, sans-serif';
      ctx.fillStyle = popup.color;
      ctx.strokeStyle = 'rgba(6, 12, 20, 0.78)';
      ctx.lineWidth = 5;
      ctx.strokeText(popup.text, 0, 0);
      ctx.fillText(popup.text, 0, 0);
      ctx.restore();
    }
  }

  drawResultOverlay(ctx) {
    const resultText = this.finalMessage || (this.resultValue !== null ? String(this.resultValue) : '');
    if (!resultText) {
      return;
    }

    ctx.save();
    ctx.fillStyle = 'rgba(6, 10, 18, 0.44)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#fff8de';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 26px Arial, sans-serif';
    ctx.fillText(this.getOverlayTitle(), this.width / 2, this.height * 0.34);
    ctx.font = '700 54px Arial, sans-serif';
    ctx.fillText(resultText, this.width / 2, this.height * 0.48);

    if (this.phase === 'complete') {
      ctx.font = '600 22px Arial, sans-serif';
      ctx.fillText('Press Restart to play again.', this.width / 2, this.height * 0.62);
    }
    ctx.restore();
  }

  drawCrashOverlay(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 10, 18, 0.26)';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#ffe5cf';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 34px Arial, sans-serif';
    ctx.fillText('Collision!', this.width / 2, this.height * 0.42);
    ctx.font = '600 22px Arial, sans-serif';
    ctx.fillText('Rescue route lost. Resetting level...', this.width / 2, this.height * 0.52);
    ctx.restore();
  }
}
