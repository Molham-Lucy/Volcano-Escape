import '../style.css'
import { Game } from './systems/Game.js'

console.log("Starting Volcano Escape...");

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);
    game.start();
});
