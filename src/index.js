import * as Phaser from "phaser";

// import DungeonScene from "./02-simple-mapping/dungeon-scene";
// import DungeonScene from "./03-mapping/dungeon-scene";
import DungeonScene from "./04-stuff/dungeon-scene";

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1200,
    height: 800,
    // pixelArt: true,
    backgroundColor: "#1d212d",
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: true,
            // gravity: {y: 0}
        }
    },
    scene: [DungeonScene]
};

export default new Phaser.Game(config);
