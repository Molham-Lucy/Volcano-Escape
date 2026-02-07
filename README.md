# Volcano Escape - Game Mechanics

## Overview
Volcano Escape is a 2D vertical platformer where you must outrun rising lava and reach the goal at the top of the level.

## Controls
-   **Move Left**: Left Arrow or A
-   **Move Right**: Right Arrow or D
-   **Jump**: Spacebar (Hold for higher jump)
-   **Fly (Jetpack)**: Hold Spacebar while in air (requires Jetpack item)
-   **Start Game / Next Level**: Spacebar

## Tile Keys (For Level Creation)
The game uses CSV files (comma-separated values) to define levels. Each number corresponds to a specific tile type:

| ID | Name | Description | Color (Fallback) |
| :--- | :--- | :--- | :--- |
| **0** | Air | Empty space | Transparent |
| **1** | Ground | Solid block | Grey |
| **2** | Ice | **Low Friction**. Players slide on this surface. | Light Blue |
| **3** | Mud | **High Friction**. Players move slow and **Jump Height is reduced by 33%**. | Brown |
| **4** | Spring | Bounces the player upwards. | Pink |
| **5** | Jetpack | Collectible. Grants temporary flight (3 seconds). | Yellow |
| **6** | Vanishing Platform | Disappears shortly after standing on it. | Light Grey |
| **7** | Goal | Reaching this completes the level. | Gold |
| **8** | Coin | Collect 10 to gain an extra life. | Yellow |
| **9** | Wings | **Power-up**. Grants Double Jump for 5 seconds. | Cyan |

## Configuration
Game settings can be adjusted in `src/config.js`.

### Physics Settings
-   `friction`: Standard air/ground friction (Default: 0.8)
-   `iceFriction`: Friction on Ice blocks (Higher = More slippery, e.g., 0.96)
-   `mudFriction`: Friction on Mud blocks (Lower = Stickier, e.g., 0.4)
-   `mudJumpModifier`: Multiplier for jump height when on mud (e.g., 0.67 for 66% height)
-   `springForce`: Upward force of springs (Negative value, e.g., -18)
-   `jetpackForce`: Upward force of jetpack (Negative value, e.g., -0.95)
-   `jetpackDuration`: Duration of jetpack in milliseconds (e.g., 3000)
-   `wingsDuration`: Duration of wings power-up in milliseconds (e.g., 5000)

### World Settings
Each world can have its own configuration:
-   `lavaColor`: Color of the rising lava.
-   `lavaSpeed`: Speed at which lava rises.
-   `backgroundImg`: Background image filename (must be in `/assets/`).
-   `levelCount`: Number of levels in the world (e.g., 2).

## Level Naming Convention
Levels must be named `world-X-Y.csv` and placed in `public/levels/`.
-   `X` = World Number
-   `Y` = Level Number
