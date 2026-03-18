const LEVELS = [
  { min: 1, max: 5, label: 'Level 1: Addition Warmup' },
  { min: 3, max: 9, label: 'Level 2: Bigger Sums' },
  { min: 6, max: 12, label: 'Level 3: Final Transfer' },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const randomInt = (min, max) => {
  const span = max - min + 1;
  return min + Math.floor(Math.random() * span);
};

const lerp = (start, end, amount) => start + (end - start) * amount;

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
    this.problemBottom = elements.problemBottom;
    this.nextRoundButton = elements.nextRoundButton;
    this.completeLabel = elements.completeLabel;

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
    this.bullets = [];
    this.phase = 'playing';
    this.phaseTimer = 0;
    this.resultValue = null;
    this.finalMessage = '';
    this.lastTime = 0;

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
    this.resetLevel(0);
  }

  setMovement(nextMovement) {
    this.movement = nextMovement;
  }

  fire() {
    if (this.phase !== 'playing' || this.playerNumber <= 0 || this.bullets.length >= this.playerNumber) {
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

    if (this.phase === 'crash') {
      this.phaseTimer += deltaSeconds;
      if (this.phaseTimer >= this.crashDuration) {
        this.resetLevel(this.levelIndex);
      }
    } else if (this.phase === 'result' || this.phase === 'complete') {
      this.phaseTimer += deltaSeconds;
      this.enemyShip.warp = clamp(this.phaseTimer / 1.4, 0, 1);
    }
  }

  updatePlayer(deltaSeconds) {
    if (this.phase !== 'playing') {
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
    if (this.phase !== 'playing') {
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

    if (this.shipsCollide()) {
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

  resolveHit() {
    if (this.phase !== 'playing' || this.playerNumber <= 0) {
      return;
    }

    this.playerNumber -= 1;
    this.enemyNumber += 1;
    this.updateHud();

    if (this.playerNumber === 0) {
      this.resultValue = this.initialPlayerNumber + this.initialEnemyNumber;
      this.finalMessage = `${this.initialPlayerNumber} + ${this.initialEnemyNumber} = ${this.resultValue}`;
      if (this.levelIndex >= LEVELS.length - 1) {
        this.phase = 'complete';
        this.phaseTimer = 1.4;
        this.enemyShip.warp = 1;
        this.messageLabel.textContent = `All rescues complete. Final sum: ${this.finalMessage}`;
      } else {
        this.phase = 'result';
        this.phaseTimer = 0;
        this.messageLabel.textContent = `${this.finalMessage}. Press Next Round.`;
      }

      this.updateHud();
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
    const config = LEVELS[this.levelIndex];
    this.initialPlayerNumber = randomInt(config.min, config.max);
    this.initialEnemyNumber = randomInt(config.min, config.max);
    this.playerNumber = this.initialPlayerNumber;
    this.enemyNumber = this.initialEnemyNumber;
    this.bullets = [];
    this.phase = 'playing';
    this.phaseTimer = 0;
    this.resultValue = null;
    this.finalMessage = '';
    this.enemyShip.warp = 0;
    this.playerShip.x = this.width * 0.2;
    this.playerShip.y = this.height * 0.78;
    this.messageLabel.textContent = `${config.label}. Teleport ${this.playerNumber} people to the rescue ship.`;
    this.updateHud();
  }

  updateHud() {
    this.levelLabel.textContent = `${this.levelIndex + 1} / ${LEVELS.length}`;
    this.playerLabel.textContent = `${this.playerNumber} aboard | ${this.playerNumber - this.bullets.length} teleports ready`;
    this.enemyLabel.textContent = `${this.enemyNumber}`;
    this.problemTop.textContent = `${this.initialPlayerNumber}`;
    this.problemMiddle.textContent = `${this.initialEnemyNumber}`;
    this.problemBottom.textContent = this.resultValue === null ? '?' : `${this.resultValue}`;

    const showNextRound = this.phase === 'result' || this.phase === 'complete';
    this.nextRoundButton.hidden = !showNextRound;
    this.nextRoundButton.disabled = this.phase === 'complete';
    this.completeLabel.hidden = this.phase !== 'complete';
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(ctx);
    this.drawArena(ctx);
    this.drawPlayer(ctx);
    this.drawEnemy(ctx);
    this.drawBullets(ctx);

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

  drawResultOverlay(ctx) {
    const resultText = this.finalMessage || (this.resultValue ? String(this.resultValue) : '');
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
    ctx.fillText('Addition Complete', this.width / 2, this.height * 0.34);
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
