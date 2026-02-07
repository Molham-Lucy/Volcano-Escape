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
        this.lavaY = 0;
        this.state = 'MENU'; // MENU, PLAYING, GAMEOVER, WIN
        this.currentWorldId = 'world_1';

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
                this.world.loadFromCSV(csvText);
            } catch (e) {
                console.error("Failed to load level:", e);
                // Fallback level?
            }

            // Try load images
            try {
                const tileset = await this.assets.loadImage('tileset', '/assets/tileset.png');
                this.world.setTileset(tileset);
            } catch (e) { console.warn("Tileset not found, using fallback."); }

            this.resetLevel();
            // this.state = 'PLAYING'; // Wait for input

            console.log("Game Loop Started");
            this.gameLoop(0);
        } catch (e) {
            console.error("Game Initialization Failed:", e);
        }
    }

    resetLevel() {
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
    }

    gameLoop(timeStamp) {
        const deltaTime = timeStamp - this.lastTime;
        this.lastTime = timeStamp;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(deltaTime) {
        if (this.state === 'MENU') {
            if (this.input.isDown('Space')) {
                this.state = 'PLAYING';
                this.resetLevel(); // Ensure fresh start
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
            if (this.input.isDown('Space')) {
                // Restart logic
                this.lives = GameConfig.general.startingLives;
                this.coins = 0;
                this.state = 'MENU';
                // Debounce space?
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
        } else {
            this.resetLevel();
        }
    }

    win() {
        this.state = 'WIN';
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
            this.ctx.font = '20px Courier New';
            this.ctx.fillText("Press SPACE for Title", this.width / 2, 350);
            this.ctx.textAlign = 'left';
        }
    }
}
