import { GameConfig } from '../config.js';

export class Player {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.radius = 15; // Player is a circle
        this.vx = 0;
        this.vy = 0;

        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpTimer = 0;
        this.isJumping = false;

        this.config = GameConfig.world;
    }

    update(deltaTime) {
        // Input
        const input = this.game.input;

        // Horizontal Movement
        if (input.isDown('ArrowLeft') || input.isDown('KeyA')) {
            this.vx -= this.config.moveSpeed * 0.2; // Acceleration
        } else if (input.isDown('ArrowRight') || input.isDown('KeyD')) {
            this.vx += this.config.moveSpeed * 0.2;
        } else {
            // Friction
            this.vx *= this.config.friction;
        }

        // Clamp Speed
        if (this.vx > this.config.moveSpeed) this.vx = this.config.moveSpeed;
        if (this.vx < -this.config.moveSpeed) this.vx = -this.config.moveSpeed;

        // Setup Coyote Time
        if (this.grounded) {
            this.coyoteTimer = 100; // ms
        } else {
            this.coyoteTimer -= deltaTime;
        }

        // Jump Start
        if (input.isDown('Space')) {
            if (this.coyoteTimer > 0 && !this.isJumping) {
                this.vy = this.config.jumpForce;
                this.isJumping = true;
                this.grounded = false;
                this.coyoteTimer = 0;
                this.jumpTimer = 0;
            } else if (this.isJumping && this.jumpTimer < 200) {
                // Variable Jump Height (hold space)
                // Add small upward force while holding
                this.vy -= 0.5;
                this.jumpTimer += deltaTime;
            }
        } else {
            this.isJumping = false;
        }

        // Gravity
        this.vy += this.config.gravity;
        if (this.vy > this.config.maxFallSpeed) this.vy = this.config.maxFallSpeed;

        // Apply Velocity
        this.x += this.vx;
        this.y += this.vy;

        // Bounds (Horizontal Wrap or Wall?)
        // Let's implement Wall Stop for now
        if (this.x < this.radius) { this.x = this.radius; this.vx = 0; }
        if (this.x > this.game.width - this.radius) { this.x = this.game.width - this.radius; this.vx = 0; }

        // Collision Detection
        this.checkCollisions();
    }

    checkCollisions() {
        const world = this.game.world;
        const tileSize = world.tileSize; // 40

        // Check tiles around the player
        const startX = Math.floor((this.x - this.radius) / tileSize);
        const endX = Math.floor((this.x + this.radius) / tileSize);
        const startY = Math.floor((this.y - this.radius) / tileSize);
        const endY = Math.floor((this.y + this.radius) / tileSize);

        this.grounded = false;

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const tileId = world.getTile(x, y);
                if (tileId !== 0 && tileId !== 8) { // 0 is Air, 8 is Coin (Pass through)
                    // AABB of the tile
                    const tileLeft = x * tileSize;
                    const tileRight = (x + 1) * tileSize;
                    const tileTop = y * tileSize;
                    const tileBottom = (y + 1) * tileSize;

                    // Circle vs AABB resolution
                    const closestX = Math.max(tileLeft, Math.min(this.x, tileRight));
                    const closestY = Math.max(tileTop, Math.min(this.y, tileBottom));

                    const dx = this.x - closestX;
                    const dy = this.y - closestY;
                    const distanceSquared = dx * dx + dy * dy;

                    if (distanceSquared < this.radius * this.radius) {
                        // Collision Detected
                        this.resolveCollision(dx, dy, distanceSquared, closestX, closestY);
                    }
                }
            }
        }

        // Interaction Logic
        // Check center point for "Standing On" or "Touching"
        const centerTileX = Math.floor(this.x / tileSize);
        const centerTileY = Math.floor(this.y / tileSize);
        const centerTile = world.getTile(centerTileX, centerTileY);

        // Default modifiers
        let currentFriction = this.config.friction;
        let jumpForce = this.config.jumpForce;

        // Check the tile *below* the player for ground interactions
        const feetY = this.y + this.radius + 2;
        const feetTileY = Math.floor(feetY / tileSize);
        const feetTile = world.getTile(centerTileX, feetTileY);

        if (this.grounded) {
            if (feetTile === 2) { // Ice
                currentFriction = 0.98; // Slippery
            } else if (feetTile === 3) { // Mud
                currentFriction = 0.5; // Sticky
                jumpForce = this.config.jumpForce * 0.5; // Reduced jump
            }
        }

        // Interactions with overlap (Center or Box)
        // We can re-use the collision loop for collection or specialized triggers
        // But checking center/feet is often enough for "standing on"

        if (feetTile === 4) { // Spring
            // Boost
            this.vy = -20;
            this.grounded = false;
        }

        // Collectibles & Triggers (check all touching tiles)
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const tileId = world.getTile(x, y);

                if (tileId === 8) { // Coin
                    world.setTile(x, y, 0); // Remove coin
                    this.game.collectCoin();
                } else if (tileId === 7) { // Goal
                    this.game.win();
                } else if (tileId === 5) { // Jetpack
                    // this.game.activateJetpack();
                    world.setTile(x, y, 0); // Consume
                    console.log("Jetpack!"); // TODO: Implement flight
                }
            }
        }

    }

    resolveCollision(dx, dy, distanceSquared, closestX, closestY) {
        const distance = Math.sqrt(distanceSquared);
        if (distance === 0) return; // Prevent NaN

        const overlap = this.radius - distance;

        // Normalize normal
        const nx = dx / distance;
        const ny = dy / distance;

        // Push out
        this.x += nx * overlap;
        this.y += ny * overlap;

        // Adjust velocity
        if (ny < -0.5) { // Hit something below
            this.grounded = true;
            this.vy = 0;

            // Vanishing Block Logic (Tile 6)
            // We need to know WHICH tile we hit. 
            // closestX/Y is on the box.
            // Map back to tile index.
            const tileX = Math.floor(closestX / this.game.world.tileSize);
            const tileY = Math.floor(closestY / this.game.world.tileSize);

            // Check if it was tile 6 roughly
            // This is imprecise if we are between tiles, but acceptable.
            const tileId = this.game.world.getTile(tileX, tileY);
            if (tileId === 6) {
                this.game.world.triggerVanish(tileX, tileY);
            }

        } else if (ny > 0.5) { // Hit something above
            this.vy = 0;
        }

        if (Math.abs(nx) > 0.5) { // Hit wall
            this.vx = 0;
        }
    }

    render(ctx) {
        // Calculate Screen Position
        const screenY = this.game.world.worldToScreenY(this.y);

        ctx.fillStyle = this.config.player || '#0f0';
        ctx.beginPath();
        ctx.arc(this.x, screenY, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (pixel art style)
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - 6, screenY - 5, 4, 4);
        ctx.fillRect(this.x + 2, screenY - 5, 4, 4);
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x - 4, screenY - 3, 2, 2);
        ctx.fillRect(this.x + 4, screenY - 3, 2, 2);
    }
}
