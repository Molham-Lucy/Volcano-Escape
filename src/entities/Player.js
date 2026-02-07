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

        this.facingRight = true;

        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpTimer = 0;
        this.jumpTimer = 0;
        this.isJumping = false;

        this.hasJetpack = false;
        this.jetpackTimer = 0;

        this.hasWings = false;
        this.wingsTimer = 0;
        this.canDoubleJump = false;
        this.lastSpaceDown = false;
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

        // Check ground for special physics
        let currentFriction = phys.friction;
        let jumpForce = phys.jumpForce;

        // Simple check for what is under feet
        const cx = this.x + this.width / 2;
        const feetY = this.y + this.height + 1;
        const feetTx = Math.floor(cx / this.game.world.tileSize);
        const feetTy = Math.floor(feetY / this.game.world.tileSize);
        const tileUnderFeet = this.game.world.getTile(feetTx, feetTy);

        if (this.grounded) {
            if (tileUnderFeet === 2) { // Ice
                currentFriction = phys.iceFriction;
            } else if (tileUnderFeet === 3) { // Mud
                currentFriction = phys.mudFriction;
                jumpForce = phys.jumpForce * phys.mudJumpModifier;
            }
        }

        // Horizontal Movement
        if (input.isDown('ArrowLeft') || input.isDown('KeyA')) {
            this.vx -= phys.moveSpeed * 0.2; // Acceleration
        } else if (input.isDown('ArrowRight') || input.isDown('KeyD')) {
            this.vx += phys.moveSpeed * 0.2;
        } else {
            // Friction
            this.vx *= currentFriction;
        }

        // Update facing
        if (this.vx > 0.1) this.facingRight = true;
        if (this.vx < -0.1) this.facingRight = false;

        // Clamp Speed
        if (this.vx > phys.moveSpeed) this.vx = phys.moveSpeed;
        if (this.vx < -phys.moveSpeed) this.vx = -phys.moveSpeed;

        // Update Coyote / Grounded State to enable double jump if falling
        if (this.hasWings && !this.grounded && !this.isJumping && this.vy > 0 && !this.canDoubleJump && this.wingsTimer > 0) {
            // If we have wings, are falling, and haven't jumped yet (e.g. walked off ledge),
            // We should probably allow a double jump (air jump)?
            // The user asked for "Double Jump", which usually means Jump -> Jump.
            // But if we want it to be responsive, maybe we ensure we can.
            // However, for strict "Double Jump", we need to have jumped first?
            // Let's stick to: Must have jumped or be in air.
            // Actually, the issue of "clunky" might be because they walk off a ledge and expect to jump?
            // That's usually "Air Jump".
            // Let's initialize canDoubleJump to true when acquiring wings?
            // I did that in checkInteractions.
            // But if I land, canDoubleJump should reset?
        }

        if (this.grounded) {
            // Reset double jump availability on ground
            if (this.hasWings) this.canDoubleJump = true;
            this.coyoteTimer = 100; // ms
        } else {
            this.coyoteTimer -= deltaTime;
        }

        // Jump & Double Jump Logic
        const spaceDown = input.isDown('Space');
        const justPressed = spaceDown && !this.lastSpaceDown;
        this.lastSpaceDown = spaceDown;

        if (justPressed) {
            // Processing Jump Initiation
            if (this.grounded || this.coyoteTimer > 0) {
                // Ground Jump
                this.vy = jumpForce;
                this.isJumping = true;
                this.grounded = false;
                this.coyoteTimer = 0;
                this.jumpTimer = 0;
                if (this.hasWings) this.canDoubleJump = true;
            } else if (this.hasWings && this.canDoubleJump) {
                // Double Jump (Air)
                this.vy = phys.jumpForce; // Ignore mud modifier for air jump
                this.canDoubleJump = false;
                this.isJumping = true;
                this.jumpTimer = 0;
                console.log("Double Jump! VY set to:", this.vy);
            }
        }

        // Variable Jump Height (holding space)
        if (spaceDown && this.isJumping) {
            if (this.jumpTimer < 200) {
                this.vy -= 0.5;
                this.jumpTimer += deltaTime;
            }
        } else {
            // If space released, stop variable jump (but allow double jump on next press)
            this.isJumping = false;
        }

        // Wings Logic
        if (this.hasWings) {
            this.wingsTimer -= deltaTime;
            if (this.wingsTimer <= 0) {
                this.hasWings = false;
                this.wingsTimer = 0;
                this.canDoubleJump = false;
                console.log("Wings expired");
            }
        }

        // Jetpack Logic (Override double jump if flying? Or work together?)
        // Priority: Jetpack if holding space?
        // Actually jetpack logic is "If hasJetpack && input.isDown".
        // If we have both, Jetpack takes precedence usually.
        if (this.hasJetpack) {
            if (input.isDown('Space')) {
                this.vy += phys.jetpackForce;
                // Cap upward speed? 
                if (this.vy < -phys.maxFallSpeed) this.vy = -phys.maxFallSpeed;
            }

            this.jetpackTimer -= deltaTime;
            if (this.jetpackTimer <= 0) {
                this.hasJetpack = false;
                this.jetpackTimer = 0;
                console.log("Jetpack expired");
            }
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
                this.vy = this.physicsConfig.springForce;
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
                    this.game.handleGoal();
                } else if (tileId === 5) { // Jetpack
                    this.hasJetpack = true;
                    this.jetpackTimer = this.physicsConfig.jetpackDuration;
                    world.setTile(x, y, 0);
                    console.log("Jetpack Acquired!");
                } else if (tileId === 9) { // Wings
                    this.hasWings = true;
                    this.wingsTimer = this.physicsConfig.wingsDuration;
                    this.canDoubleJump = true; // In case we pick up while in air?
                    world.setTile(x, y, 0); // Remove tile
                    console.log("Wings Acquired!");
                }
            }
        }
    }

    render(ctx) {
        // Calculate Screen Position
        const screenY = this.game.world.worldToScreenY(this.y);

        // Render Jetpack (Behind) - Draw BEFORE player sprite
        if (this.hasJetpack) {
            ctx.fillStyle = '#ff0';
            const jetpackX = this.facingRight ? this.x - 5 : this.x + this.width;
            ctx.fillRect(jetpackX, screenY + 10, 5, 10);
        }

        // Render Wings (Behind/Sides)
        if (this.hasWings) {
            ctx.fillStyle = '#0ff'; // Cyan
            // Simple "wings" shape
            if (this.facingRight) {
                ctx.fillRect(this.x - 8, screenY + 5, 8, 4); // Top Wing
                ctx.fillRect(this.x - 6, screenY + 12, 6, 3); // Bottom Wing
            } else {
                ctx.fillRect(this.x + this.width, screenY + 5, 8, 4);
                ctx.fillRect(this.x + this.width, screenY + 12, 6, 3);
            }
        }

        const sprite = this.game.assets.getImage('player');
        if (sprite) {
            // Check if we need to flip the sprite based on facingRight
            // For now, drawing as is, but could add scale(-1, 1) logic here if sprite needs flipping
            ctx.drawImage(sprite, this.x, screenY, this.width, this.height);
        } else {
            ctx.fillStyle = GameConfig.colors.player || '#0f0';
            ctx.fillRect(this.x, screenY, this.width, this.height);

            // Eyes
            ctx.fillStyle = '#fff';
            const eyeY = screenY + this.height / 3;

            // Adjust eyes based on facing
            if (this.facingRight) {
                ctx.fillRect(this.x + 18, eyeY, 6, 6); // Front Eye
                ctx.fillRect(this.x + 6, eyeY, 6, 6); // Back Eye
            } else {
                ctx.fillRect(this.x + 6, eyeY, 6, 6); // Front Eye
                ctx.fillRect(this.x + 18, eyeY, 6, 6); // Back Eye
            }

            ctx.fillStyle = '#000';
            // Pupils moved by vx logic
            const pupilOffset = this.vx > 0.1 ? 2 : (this.vx < -0.1 ? -2 : 0);
            if (this.facingRight) {
                ctx.fillRect(this.x + 18 + 2 + pupilOffset, eyeY + 2, 2, 2);
                ctx.fillRect(this.x + 6 + 2 + pupilOffset, eyeY + 2, 2, 2);
            } else {
                ctx.fillRect(this.x + 6 + pupilOffset, eyeY + 2, 2, 2);
                ctx.fillRect(this.x + 18 + pupilOffset, eyeY + 2, 2, 2);
            }
        }
    }
}
