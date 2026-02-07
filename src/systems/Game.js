import { World } from '../systems/World.js';
import { Player } from '../entities/Player.js';
import { Input } from './Input.js';
import { Assets } from './Assets.js';
import { GameConfig } from '../config.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width = 800;
        this.height = canvas.height = 600;
        this.lastTime = 0;

        this.ctx.imageSmoothingEnabled = false;

        this.input = new Input();
        this.assets = new Assets();
        this.world = new World(this);
        this.player = null;

        this.lives = GameConfig.general.startingLives;
        this.coins = 0;
        this.initialCoins = 0; // Coins at start of level
        this.lavaY = 0;
        this.state = 'MENU'; // MENU, PLAYING, GAMEOVER, WIN
        this.currentWorldId = 'world_1';

        this.levelStartTime = 0;
        this.levelEndTime = 0;
        this.inputCooldown = 0; // Debounce timer
        this.initialLevelData = null; // Store CSV text for reset

        window.addEventListener('resize', () => {
            // Optional
        });
    }

    getCurrentWorldConfig() {
        return GameConfig.worlds[this.currentWorldId];
    }

    async start() {
        console.log("Loading Assets...");
        try {
            // Load CSV
            try {
                const csvText = await this.assets.loadText('level1', '/levels/world-1.csv');
                this.initialLevelData = csvText;
                this.world.loadFromCSV(csvText);
            } catch (e) {
                console.error("Failed to load level:", e);
                // Fallback level?
            }

            // Try load images
            try {
                const tileset = await this.assets.loadImage('tileset', '/assets/tileset.png');
                this.world.setTileset(tileset);

                await this.assets.loadImage('player', '/assets/player.png');
                await this.assets.loadImage('background', '/assets/background.png');
            } catch (e) { console.warn("Assets not found, using valid fallbacks."); }

            this.resetLevel(true); // True = Full Reset
            // this.state = 'PLAYING'; // Wait for input

            console.log("Game Loop Started");
            this.gameLoop(0);
        } catch (e) {
            console.error("Game Initialization Failed:", e);
        }
    }

    resetLevel(fullReset = false) {
        // Debounce input
        this.inputCooldown = 500;

        if (fullReset) {
            // Restore map
            if (this.initialLevelData) {
                this.world.loadFromCSV(this.initialLevelData);
            }
            // Restore coins to what they were entering the level (or 0 if new game)
            // But if we are dead-dead (GameOver), we reset everything in 'die' or 'start'.
            // Here 'fullReset' implies "Retry Level" or "New Level".
            // If it's a "Life Lost" reset, we don't restore map items (coins), 
            // BUT user asked: "coins and powerups disappear. Please implement full reset... return coin count... back to before level started"

            // So on ANY restart of the level (even death?), we strictly follow user request:
            // "return coin count... back to what it was before the level was started"
            this.coins = this.initialCoins;
        }

        // Reset Player
        // Start at bottom of world (Rows are 0..Height-1)
        // Row Height-1 is the bottom-most row.
        // We want to spawn on top of the first solid ground.
        // Hardcode for now: 
        const spawnY = (this.world.height * 40) - 100;
        this.player = new Player(this, 300, spawnY);

        // Reset Camera
        this.world.cameraY = spawnY - 400; // Center ish
        if (this.world.cameraY > (this.world.height * 40) - 600)
            this.world.cameraY = (this.world.height * 40) - 600;

        // Reset Lava logic
        // Lava starts well below
        this.lavaY = (this.world.height * 40) + 200;

        // Timer
        if (fullReset) {
            this.levelStartTime = performance.now();
        }
    }

    gameLoop(timeStamp) {
        const deltaTime = timeStamp - this.lastTime;
        this.lastTime = timeStamp;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(deltaTime) {
        if (this.inputCooldown > 0) {
            this.inputCooldown -= deltaTime;
        }

        if (this.state === 'MENU') {
            if (this.input.isDown('Space') && this.inputCooldown <= 0) {
                this.state = 'PLAYING';
                this.initialCoins = 0; // New Game
                this.resetLevel(true); // Ensure fresh start
            }
        } else if (this.state === 'PLAYING') {

            // Lava Rising
            const worldConfig = this.getCurrentWorldConfig();
            this.lavaY -= worldConfig.lavaSpeed; // Y decreases (goes up)

            if (this.player) {
                this.player.update(deltaTime);

                // Check Death (Lava)
                if (this.player.y + this.player.height > this.lavaY) {
                    this.die();
                }

                // Camera Follow Logic (Vertical only)
                const playerScreenY = this.player.y - this.world.cameraY;
                const targetY = 300;
                let targetCameraY = this.player.y - targetY;

                const maxCameraY = (this.world.height * 40) - this.height;
                const minCameraY = 0;

                if (targetCameraY > maxCameraY) targetCameraY = maxCameraY;
                if (targetCameraY < minCameraY) targetCameraY = minCameraY;

                this.world.cameraY += (targetCameraY - this.world.cameraY) * 0.1;
            }
        } else if (this.state === 'GAMEOVER' || this.state === 'WIN') {
            if (this.input.isDown('Space') && this.inputCooldown <= 0) {
                // Restart logic
                this.lives = GameConfig.general.startingLives;
                this.coins = 0;
                this.state = 'MENU';
                this.inputCooldown = 500;
            }
        }
    }

    collectCoin() {
        this.coins++;
        if (this.coins >= 10) {
            this.lives++;
            this.coins = 0;
        }
    }

    die() {
        this.lives--;
        console.log("Died! Lives left:", this.lives);
        if (this.lives <= 0) {
            this.state = 'GAMEOVER';
            this.inputCooldown = 1000;
        } else {
            // "return the coin count of the player back to what it was before the level was started"
            // "power ups re appear when the level is reset"
            // This implies a full map reset even on death if we want powerups back?
            // "Also, when the level is reset. The coins and the powerups disappear. Please implement a full reset..."
            // Usually "reset level" means losing a life.
            this.resetLevel(true);
        }
    }

    win() {
        this.state = 'WIN';
        this.levelEndTime = performance.now();
        this.inputCooldown = 1000;
        console.log("You Win!");
    }

    render() {
        // Clear
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (this.state === 'MENU') {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '40px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(GameConfig.general.gameTitle, this.width / 2, 200);

            this.ctx.font = '20px Courier New';
            // Blink effect
            if (Math.floor(Date.now() / 500) % 2 === 0) {
                this.ctx.fillText("Press SPACE to Start", this.width / 2, 400);
            }
            this.ctx.textAlign = 'left';

        } else if (this.state === 'PLAYING') {
            this.world.render(this.ctx);
            if (this.player) this.player.render(this.ctx);

            // HUD
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px Courier New';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`Lives: ${this.lives}  Coins: ${this.coins}`, 20, 30);

            // Timer
            const time = Math.floor((performance.now() - this.levelStartTime) / 1000);
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`Time: ${time}`, this.width - 20, 30);

        } else if (this.state === 'GAMEOVER') {
            this.ctx.fillStyle = '#f00';
            this.ctx.font = '40px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("GAME OVER", this.width / 2, 300);
            this.ctx.font = '20px Courier New';
            this.ctx.fillText("Press SPACE for Title", this.width / 2, 350);
            this.ctx.textAlign = 'left';

        } else if (this.state === 'WIN') {
            this.ctx.fillStyle = '#0f0';
            this.ctx.font = '40px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("LEVEL CLEAR!", this.width / 2, 300);

            const time = ((this.levelEndTime - this.levelStartTime) / 1000).toFixed(2);
            this.ctx.font = '30px Courier New';
            this.ctx.fillText(`Time: ${time}s`, this.width / 2, 350);

            this.ctx.font = '20px Courier New';
            this.ctx.fillText("Press SPACE for Title", this.width / 2, 400);
            this.ctx.textAlign = 'left';
        }
    }
}
