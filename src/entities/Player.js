import { GameConfig } from '../config.js';

export class Player {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.vx = 0;
        this.vy = 0;

        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpTimer = 0;
        this.isJumping = false;
    }

    get physicsConfig() {
        return GameConfig.physics;
    }

    get worldConfig() {
        return this.game.getCurrentWorldConfig();
    }

    update(deltaTime) {
        // Input
        const input = this.game.input;
        const phys = this.physicsConfig;

        // Horizontal Movement
        if (input.isDown('ArrowLeft') || input.isDown('KeyA')) {
            this.vx -= phys.moveSpeed * 0.2; // Acceleration
        } else if (input.isDown('ArrowRight') || input.isDown('KeyD')) {
            this.vx += phys.moveSpeed * 0.2;
        } else {
            // Friction
            this.vx *= phys.friction;
        }

        // Clamp Speed
        if (this.vx > phys.moveSpeed) this.vx = phys.moveSpeed;
        if (this.vx < -phys.moveSpeed) this.vx = -phys.moveSpeed;

        // Setup Coyote Time
        if (this.grounded) {
            this.coyoteTimer = 100; // ms
        } else {
            this.coyoteTimer -= deltaTime;
        }

        // Jump Start
        if (input.isDown('Space')) {
            if (this.coyoteTimer > 0 && !this.isJumping) {
                this.vy = phys.jumpForce;
                this.isJumping = true;
                this.grounded = false;
                this.coyoteTimer = 0;
                this.jumpTimer = 0;
            } else if (this.isJumping && this.jumpTimer < 200) {
                // Variable Jump Height (hold space)
                this.vy -= 0.5;
                this.jumpTimer += deltaTime;
            }
        } else {
            this.isJumping = false;
        }

        // Gravity
        const gravity = phys.gravity * this.worldConfig.gravityModifier;
        this.vy += gravity;
        if (this.vy > phys.maxFallSpeed) this.vy = phys.maxFallSpeed;

        // Apply Horizontal Velocity & Collision
        this.x += this.vx;
        this.handleCollisions(true);

        // Apply Vertical Velocity & Collision
        this.y += this.vy;
        this.grounded = false; // Assume falling until collision proves otherwise
        this.handleCollisions(false);

        // World Bounds
        if (this.x < 0) { this.x = 0; this.vx = 0; }
        if (this.x > this.game.width - this.width) { this.x = this.game.width - this.width; this.vx = 0; }

        // Interaction Logic (after movement)
        this.checkInteractions();
    }

    handleCollisions(horizontal) {
        const world = this.game.world;
        const tileSize = world.tileSize;

        // Determine grid bounds
        const startX = Math.floor(this.x / tileSize);
        const endX = Math.floor((this.x + this.width - 0.01) / tileSize);
        const startY = Math.floor(this.y / tileSize);
        const endY = Math.floor((this.y + this.height - 0.01) / tileSize);

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const tileId = world.getTile(x, y);
                // 0=Air, 8=Coin (pass), 7=Goal (pass), 5=Jetpack (pass)
                // Solid: 1, 2, 3, 4, 6
                // Pass-through should be defined better, but for now:
                const isSolid = [1, 2, 3, 4, 6].includes(tileId);

                if (isSolid) {
                    if (horizontal) {
                        if (this.vx > 0) {
                            // Moving Right
                            this.x = (x * tileSize) - this.width;
                            this.vx = 0;
                        } else if (this.vx < 0) {
                            // Moving Left
                            this.x = (x + 1) * tileSize;
                            this.vx = 0;
                        }
                        return; // Resolution done for this axis (simple)
                    } else {
                        if (this.vy > 0) {
                            // Falling
                            this.y = (y * tileSize) - this.height;
                            this.vy = 0;
                            this.grounded = true;

                            // Trigger Vanishing Block
                            if (tileId === 6) {
                                world.triggerVanish(x, y);
                            }
                        } else if (this.vy < 0) {
                            // Jumping Up
                            this.y = (y + 1) * tileSize;
                            this.vy = 0;
                        }
                        return; // Resolution done
                    }
                }
            }
        }
    }

    checkInteractions() {
        const world = this.game.world;
        const tileSize = world.tileSize;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        const centerTx = Math.floor(cx / tileSize);
        const centerTy = Math.floor(cy / tileSize);

        // Feet check for special ground
        const feetY = this.y + this.height + 1;
        const feetTx = Math.floor(cx / tileSize);
        const feetTy = Math.floor(feetY / tileSize);
        const feetTile = world.getTile(feetTx, feetTy);

        if (this.grounded) {
            if (feetTile === 2) { // Ice
                // Logic handled in movement (friction modifier) - TODO: Add friction modifier support
            } else if (feetTile === 3) { // Mud
                // Logic handled in movement
            } else if (feetTile === 4) { // Spring
                this.vy = -20;
                this.grounded = false;
            }
        }

        // Collectibles (Loop through all overlapped tiles)
        const startX = Math.floor(this.x / tileSize);
        const endX = Math.floor((this.x + this.width - 0.01) / tileSize);
        const startY = Math.floor(this.y / tileSize);
        const endY = Math.floor((this.y + this.height - 0.01) / tileSize);

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const tileId = world.getTile(x, y);
                if (tileId === 8) { // Coin
                    world.setTile(x, y, 0);
                    this.game.collectCoin();
                } else if (tileId === 7) { // Goal
                    this.game.win();
                } else if (tileId === 5) { // Jetpack
                    // this.game.activateJetpack();
                    world.setTile(x, y, 0);
                    console.log("Jetpack!");
                }
            }
        }
    }

    render(ctx) {
        // Calculate Screen Position
        const screenY = this.game.world.worldToScreenY(this.y);

        ctx.fillStyle = GameConfig.colors.player || '#0f0';
        ctx.fillRect(this.x, screenY, this.width, this.height);

        // Eyes
        ctx.fillStyle = '#fff';
        const eyeOffset = this.width / 4;
        const eyeY = screenY + this.height / 3;
        ctx.fillRect(this.x + eyeOffset, eyeY, 6, 6); // Left
        ctx.fillRect(this.x + this.width - eyeOffset - 6, eyeY, 6, 6); // Right

        ctx.fillStyle = '#000';
        // Direction based pupils?
        const pupilOffset = this.vx > 0.1 ? 2 : (this.vx < -0.1 ? -2 : 0);
        ctx.fillRect(this.x + eyeOffset + 2 + pupilOffset, eyeY + 2, 2, 2);
        ctx.fillRect(this.x + this.width - eyeOffset - 4 + pupilOffset, eyeY + 2, 2, 2);
    }
}
