export const GameConfig = {
  general: {
    gameTitle: "Volcano Escape",
    startingLives: 5,
    debug: false,
  },
  world: {
    lavaColor: "rgba(255, 50, 0, 0.8)",
    lavaSpeed: 0.5, // Pixels per frame, adjusts difficulty
    gravity: 0.9,
    friction: 0.8,
    moveSpeed: 4,
    jumpForce: -12,
    maxFallSpeed: 6,
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
