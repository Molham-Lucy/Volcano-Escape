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
        this.currentWorld = 1;
        this.currentLevel = 1;

        this.levelStartTime = 0;
        this.levelEndTime = 0;
        this.inputCooldown = 0; // Debounce timer
        this.initialLevelData = null; // Store CSV text for reset

        window.addEventListener('resize', () => {
            // Optional
        });
    }

    getCurrentWorldConfig() {
        return GameConfig.worlds[`world_${this.currentWorld}`] || GameConfig.worlds['world_1'];
    }

    async start() {
        console.log("Loading Assets...");
        try {
            // Load CSV for Level 1-1 initially
            await this.loadLevel(this.currentWorld, this.currentLevel);

            // Load Images
            try {
                const tileset = await this.assets.loadImage('tileset', '/assets/tileset.png');
                this.world.setTileset(tileset);
            } catch (e) { console.error("Failed to load tileset", e); }

            try {
                await this.assets.loadImage('player', '/assets/player.png');
            } catch (e) { console.error("Failed to load player", e); }

            // Load World Backgrounds
            try {
                await this.assets.loadImage('1.png', '/assets/1.png');
                await this.assets.loadImage('2.png', '/assets/2.png');
            } catch (e) { console.error("Failed to load backgrounds", e); }

            this.resetLevel(true); // True = Full Reset

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
            this.coins = this.initialCoins;
        }

        // Reset Player
        // Start at bottom of world (Rows are 0..Height-1)
        // Find safe spawn spot.
        // We want to spawn on top of a solid block (1, 2, 3, 4).
        // NOT: 0 (Air), 5 (Jetpack), 6 (Vanish), 7 (Goal), 8 (Coin), 9 (Wings)

        let spawnX = 300;
        let spawnY = (this.world.height * 40) - 100;

        // Search for valid ground
        // Start from bottom-most row, scan upwards
        // Search x around center (approx tile 7) outwards
        const centerTileX = Math.floor(300 / 40);
        const searchOrder = [];

        // Generate search order (center out)
        for (let i = 0; i < this.world.width; i++) {
            if (i === 0) searchOrder.push(centerTileX);
            else {
                if (centerTileX - i >= 0) searchOrder.push(centerTileX - i);
                if (centerTileX + i < this.world.width) searchOrder.push(centerTileX + i);
            }
        }

        let foundSafeSpot = false;

        // We limit search to bottom 20 rows to avoid spawning at top
        const startY = this.world.height - 1;
        const endY = Math.max(0, this.world.height - 20);

        for (let y = startY; y >= endY; y--) {
            for (let x of searchOrder) {
                const tile = this.world.getTile(x, y);
                // Valid ground: 1, 2, 3, 4 (Solid)
                // Invalid: 0, 5, 6, 7, 8, 9
                const isSolid = [1, 2, 3, 4].includes(tile);

                if (isSolid) {
                    // Check if space ABOVE is emptyish (not solid)
                    const tileAbove = this.world.getTile(x, y - 1);
                    const isBlocked = [1, 2, 3, 4, 6].includes(tileAbove); // 6 is vanish, typically solid-ish

                    if (!isBlocked) {
                        spawnX = x * 40;
                        spawnY = (y - 1) * 40; // Standing on top
                        foundSafeSpot = true;
                        break;
                    }
                }
            }
            if (foundSafeSpot) break;
        }

        if (!foundSafeSpot) {
            console.warn("No safe spawn found! Using fallback.");
            spawnY = (this.world.height * 40) - 100;
        }

        this.player = new Player(this, spawnX, spawnY);

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

    async loadLevel(world, level) {
        const levelPath = `/levels/world-${world}-${level}.csv`;
        console.log(`Loading Level: ${levelPath}`);
        try {
            const csvText = await this.assets.loadText(`level_${world}_${level}`, levelPath);
            this.initialLevelData = csvText;
            this.world.loadFromCSV(csvText);
            this.resetLevel(true);
        } catch (e) {
            console.error("Failed to load level:", levelPath, e);
            // If level load fails (e.g. end of world), maybe go to next world?
            // checking if it was world-X-Y failure.
            // Simplified: If 1-2 fails, try 2-1.
            if (level > 1) {
                // Try next world
                console.log("Level not found, trying next world...");
                this.currentWorld++;
                this.currentLevel = 1;
                await this.loadLevel(this.currentWorld, this.currentLevel);
            } else {
                // Even world X-1 failed. End of game?
                console.log("Game Complete or Error");
                this.state = 'MENU'; // Back to title
            }
        }
    }

    async nextLevel() {
        console.log(`Starting Next Level Sequence. Current: ${this.currentWorld}-${this.currentLevel}`);

        let targetWorld = this.currentWorld;
        let targetLevel = this.currentLevel + 1;

        const worldConfig = this.getCurrentWorldConfig();
        // Check if we exceeded the levels in the current world
        if (targetLevel > worldConfig.levelCount) {
            targetWorld++;
            targetLevel = 1;
        }

        console.log(`Advancing to: ${targetWorld}-${targetLevel}`);
        this.currentWorld = targetWorld;
        this.currentLevel = targetLevel;

        await this.loadLevel(this.currentWorld, this.currentLevel);

        // check if we are actually playing now (load succeeded)
        // If loadLevel failed, it might have changed world or set state to MENU.
        if (this.world.height > 0) {
            this.state = 'PLAYING';
            this.initialCoins = this.coins; // Checkpoint value
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
                this.currentWorld = 1;
                this.currentLevel = 1;
                this.loadLevel(1, 1);
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

    handleGoal() {
        // Check if there is a next level in this world
        const worldConfig = this.getCurrentWorldConfig();
        if (this.currentLevel < worldConfig.levelCount) {
            this.state = 'LEVEL_COMPLETE';
            this.levelEndTime = performance.now();
            this.inputCooldown = 1000;
        } else {
            // Check if there is a next world
            const nextWorldId = this.currentWorld + 1;
            if (GameConfig.worlds[`world_${nextWorldId}`]) {
                this.state = 'LEVEL_COMPLETE'; // End of world is also level complete unless we want a "World Clear" screen
                this.levelEndTime = performance.now();
                this.inputCooldown = 1000;
            } else {
                // No more worlds -> Game Win
                this.state = 'WIN'; // True Game Over Win
                this.levelEndTime = performance.now();
                this.inputCooldown = 1000;
                console.log("Game Completed!");
            }
        }
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
            // Timer & Level
            const time = Math.floor((performance.now() - this.levelStartTime) / 1000);
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`Level: ${this.currentWorld}-${this.currentLevel}  Time: ${time}`, this.width - 20, 30);

        } else if (this.state === 'GAMEOVER') {
            this.ctx.fillStyle = '#f00';
            this.ctx.font = '40px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("GAME OVER", this.width / 2, 300);
            this.ctx.font = '20px Courier New';
            this.ctx.fillText("Press SPACE for Title", this.width / 2, 350);
            this.ctx.textAlign = 'left';

        } else if (this.state === 'LEVEL_COMPLETE') {
            this.ctx.fillStyle = '#0f0';
            this.ctx.font = '40px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("LEVEL COMPLETE!", this.width / 2, 300);

            const time = ((this.levelEndTime - this.levelStartTime) / 1000).toFixed(2);
            this.ctx.font = '30px Courier New';
            this.ctx.fillText(`Time: ${time}s`, this.width / 2, 350);

            this.ctx.font = '20px Courier New';
            this.ctx.fillText("Press SPACE for Next Level", this.width / 2, 400);
            this.ctx.textAlign = 'left';

            if (this.input.isDown('Space') && this.inputCooldown <= 0) {
                this.nextLevel();
            }

        } else if (this.state === 'WIN') {
            this.ctx.fillStyle = '#ffd700'; // Gold
            this.ctx.font = '40px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("YOU HAVE ESCAPED!", this.width / 2, 300);

            const time = ((this.levelEndTime - this.levelStartTime) / 1000).toFixed(2);
            this.ctx.font = '30px Courier New';
            this.ctx.fillText(`Total Time: ${time}s`, this.width / 2, 350);
            this.ctx.fillText(`Lives: ${this.lives} Coins: ${this.coins}`, this.width / 2, 400);

            this.ctx.font = '20px Courier New';
            this.ctx.fillText("Press SPACE for Title", this.width / 2, 450);
            this.ctx.textAlign = 'left';

            if (this.input.isDown('Space') && this.inputCooldown <= 0) {
                // Return to menu
                this.lives = GameConfig.general.startingLives;
                this.coins = 0;
                this.state = 'MENU';
                this.inputCooldown = 500;
            }
        }
    }
}
