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
  },
  worlds: {
    "world_1": {
      name: "The Volcanic Core",
      lavaColor: "rgba(255, 69, 0, 0.8)",
      lavaSpeed: 0.1,
      gravityModifier: 1.0,
      backgroundImg: "1.png",
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
