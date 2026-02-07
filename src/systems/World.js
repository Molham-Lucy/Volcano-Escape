import { GameConfig } from '../config.js';

export class World {
    constructor(game) {
        this.game = game;
        this.tiles = []; // Array of rows, where each row is an array of tile IDs
        this.tileSize = GameConfig.tiles.size;
        this.width = 0;
        this.height = 0; // Total height in rows
        this.cameraY = 0;
        this.tileset = null;
    }

    setTileset(image) {
        this.tileset = image;
    }

    loadFromCSV(csvText) {
        const rows = csvText.trim().split('\n');
        this.tiles = [];

        // Parse rows. Note: CSV Row 0 is the TOP of the file (Finish).
        // Standard iterate: rows[0] is y=0 in tile coordinates.
        for (let y = 0; y < rows.length; y++) {
            const row = rows[y].trim().split(',').map(Number);
            this.tiles.push(row);
        }

        this.height = this.tiles.length;
        this.width = this.tiles[0].length;

        console.log(`World Loaded: ${this.width}x${this.height} tiles.`);
    }

    getTile(x, y) {
        // x, y in tile coordinates
        if (y < 0 || y >= this.height || x < 0 || x >= this.width) {
            return 0; // Empty/Air if out of bounds
        }
        return this.tiles[y][x];
    }

    // Convert world Y to Screen Y based on camera
    worldToScreenY(y) {
        return y - this.cameraY;
    }

    setTile(x, y, id) {
        if (y < 0 || y >= this.height || x < 0 || x >= this.width) return;
        this.tiles[y][x] = id;
    }

    triggerVanish(x, y) {
        // Simple timeout to remove block
        // Visual cue?
        setTimeout(() => {
            if (this.getTile(x, y) === 6) {
                this.setTile(x, y, 0); // Poof
            }
        }, 1000);
    }

    update(deltaTime, lavaSpeed) {
        // Lava Logic could go here or in Game
    }

    render(ctx) {
        // Draw Background
        const worldConfig = this.game.getCurrentWorldConfig();
        const bgName = worldConfig.backgroundImg; // e.g. "1.png"
        const bg = this.game.assets.getImage(bgName);

        if (bg) {
            ctx.drawImage(bg, 0, 0, this.game.width, this.game.height);
        } else {
            // Fallback
            ctx.fillStyle = "#222";
            ctx.fillRect(0, 0, this.game.width, this.game.height);
        }

        const startRow = Math.floor(this.cameraY / this.tileSize);
        const endRow = startRow + Math.ceil(this.game.height / this.tileSize) + 1;

        for (let y = startRow; y < endRow; y++) {
            if (y < 0 || y >= this.height) continue;

            for (let x = 0; x < this.width; x++) {
                const tileId = this.tiles[y][x];
                if (tileId === 0) continue; // Air

                // For now, render colored rectangles if tileset is missing
                // Or render sub-images from tileset
                const screenX = x * this.tileSize;
                const screenY = (y * this.tileSize) - this.cameraY;

                if (this.tileset) {
                    this.renderTile(ctx, tileId, screenX, screenY);
                } else {
                    this.renderFallback(ctx, tileId, screenX, screenY);
                }
            }
        }

        // Render Lava
        if (this.game.lavaY !== undefined) {
            const screenLavaY = this.game.lavaY - this.cameraY;
            const worldConfig = this.game.getCurrentWorldConfig();
            ctx.fillStyle = worldConfig.lavaColor;
            ctx.fillRect(0, screenLavaY, this.game.width, this.game.height); // Fill down?
            // Actually Lava rises, so it covers everything BELOW lavaY.

            // To make it look like a sea:
            ctx.fillRect(0, screenLavaY, this.game.width, this.game.height * 2);
        }
    }

    renderFallback(ctx, tileId, x, y) {
        switch (tileId) {
            case 1: ctx.fillStyle = '#666'; break; // Ground
            case 2: ctx.fillStyle = '#aaf'; break; // Ice
            case 3: ctx.fillStyle = '#642'; break; // Mud
            case 4: ctx.fillStyle = '#f0f'; break; // Spring
            case 5: ctx.fillStyle = '#ff0'; break; // Jetpack
            case 6: ctx.fillStyle = '#aaa'; break; // Vanishing
            case 7: ctx.fillStyle = '#ffd700'; break; // Goal
            case 8: ctx.fillStyle = '#ff0'; break; // Coin
            case 9: ctx.fillStyle = '#0ff'; break; // Wings
            default: ctx.fillStyle = '#f00'; break; // Unknown
        }
        ctx.fillRect(x, y, this.tileSize, this.tileSize);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(x, y, this.tileSize, this.tileSize);
    }

    renderTile(ctx, tileId, x, y) {
        // Assuming 3x3 grid in tileset.png
        // 0 1 2
        // 3 4 5
        // 6 7 8
        // Mapping tileId to sourceX/Y is tricky without a strict map.
        // Let's assume tileId matches the index 1-8.

        // Tile 0 is Air (skipped)
        // Map tileId to source index (0-8)
        // But our tileIds start at 1.

        /* 
        Legend:
        1: Ground -> Index 0
        2: Ice -> Index 1
        3: Mud -> Index 2
        4: Spring -> Index 3
        5: Jetpack -> Index 4
        6: Vanish -> Index 5
        7: Goal -> Index 6
        8: Coin -> Index 7
        */

        const index = tileId - 1;
        const cols = 3;
        const srcX = (index % cols) * 40;
        const srcY = Math.floor(index / cols) * 40;

        ctx.drawImage(this.tileset, srcX, srcY, 40, 40, x, y, 40, 40);
    }
}
