import Phaser from "phaser";

import {uiEventEmitter} from "./event-center";

export default class GameUI extends Phaser.Scene {
   /** @type {Phaser.GameObjects.Group} */
   hearts;

   constructor() {
      super('game-ui');
   }

   create() {
      this.hearts = this.add.group({
         classType: Phaser.GameObjects.Image
      });

      const gameWidth = this.scale.width;

      this.hearts.createMultiple({
         key: 'ui-heart-full',
         setScale: {x: 3.2, y:3.2},
         setXY: {x: gameWidth - (32 + 60*2), y: 32, stepX: 60},
         quantity: 3
      });

      uiEventEmitter.on('player-hit', this.handleHealthChanges, this);

   }

   handleHealthChanges(health) {
      console.log('hit');
      this.hearts.children.each((heart, ind) => {
         if (ind + 1 > health) {
            heart.setTexture('ui-heart-empty');
            return undefined;
         }
      })
   }

}
