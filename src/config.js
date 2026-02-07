export const GameConfig = {
  general: {
    gameTitle: "Volcano Escape",
    startingLives: 5,
    debug: false,
  },
  physics: {
    friction: 0.8,
    moveSpeed: 4,
    jumpForce: -12,
    maxFallSpeed: 6,
    gravity: 0.9,
    springForce: -18, // Default -20
    jetpackDuration: 3000, // 3 seconds
    jetpackForce: -0.95, // Upward force for jetpack
  },
  worlds: {
    "world_1": {
      name: "The Volcanic Core",
      lavaColor: "rgba(255, 69, 0, 0.8)",
      lavaSpeed: 0.1,
      gravityModifier: 1.0,
      backgroundImg: "1.png",
      levelCount: 2,
    },
    // World 2 shares config structure, example:
    "world_2": {
      name: "The Icy Depths",
      lavaColor: "rgba(0, 191, 255, 0.8)", // Blue Lava
      lavaSpeed: 0.15, // Fast!
      gravityModifier: 1.0,
      backgroundImg: "2.png", // Ensure this exists or fallback
      levelCount: 1,
    }
  },
  tiles: {
    size: 40, // 40x40px
  },
  colors: {
    background: "#222",
    text: "#fff",
    player: "#00ff00",
  }
};
