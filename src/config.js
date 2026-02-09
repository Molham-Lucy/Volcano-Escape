export const GameConfig = {
  general: {
    gameTitle: "Volcano Escape",
    startingLives: 5,
    debug: false,
  },
  physics: {
    friction: 0.8,
    moveSpeed: 6,
    jumpForce: -12,
    maxFallSpeed: 10,
    gravity: 0.9,
    springForce: -18, // Default -20
    jetpackDuration: 3250, // 3 seconds
    jetpackForce: -2, // Upward force for jetpack
    wingsDuration: 5000, // 5 seconds
    iceFriction: 0.96, // Slippery (Current friction is 0.8)
    mudFriction: 0.4, // Sticky
    mudJumpModifier: 0.67, // 33% reduction
  },
  worlds: {
    "world_1": {
      name: "The Volcanic Core",
      lavaColor: "rgba(255, 69, 0, 0.8)",
      lavaSpeed: 0.7,
      gravityModifier: 1.0,
      backgroundImg: "1.png",
      levelCount: 6,
    },
    "world_2": {
      name: "The Icy Depths",
      lavaColor: "rgba(0, 191, 255, 0.8)", // Blue Lava
      lavaSpeed: 1.0, // Faster
      gravityModifier: 1.0,
      backgroundImg: "2.png", // Ensure this exists or fallback
      levelCount: 2,
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
