import Phaser from "phaser";

export default class Chest extends Phaser.Physics.Arcade.Sprite {
   /** @type {Phaser.Scene} */
   scene;
   isActive;
   coinImg;

   constructor(scene, x, y, texture = 'chest', frame = 0) {
      super(scene, x, y, texture, frame);

      this.scene = scene;

      this.anims.play('chest-close');
      this.isActive = true;
   }

   open() {
      this.isActive = false;
      this.setTint(0xffffff);
      this.anims.play('chest-opening');

      this.showCoin();
   }

   showCoin() {
      const coin = this.scene.add.sprite(this.x, this.y, 'coin');
      this.scene.tweens.add({
         targets: [coin],
         duration: 1500,
         y: '-=100',
         alpha: 0.2,
         scale: 0.4,
         delay: 100,
         onComplete: () => {
            coin.destroy(true)
         }
      })

   }

}


