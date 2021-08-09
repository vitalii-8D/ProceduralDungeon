import * as Phaser from "phaser";

export default class Player {
   scene;
   sprite;
   keys;

   constructor(scene, x, y) {
      this.scene = scene;

      const anims = scene.anims;
      anims.create({
         key: 'player-walk',
         frames: anims.generateFrameNumbers('characters', {start: 46, end: 49}),
         frameRate: 15,
         repeat: -1
      })
      anims.create({
         key: "player-walk-back",
         frames: anims.generateFrameNumbers("characters", { start: 65, end: 68 }),
         frameRate: 8,
         repeat: -1
      });

      this.sprite = scene.physics.add
         .sprite(x, y, 'characters', 0)
         .setSize(22,33)
         .setOffset(23, 27)

      this.sprite.anims.play('player-walk-back');

      this.keys = scene.input.keyboard.createCursorKeys();
   }//* constructor(scene, x, y) {}

   freeze() {
      this.sprite.body.moves = false;
   }

   update() {
      const keys = this.keys;
      const sprite = this.sprite;
      const speed = 300;
      const prevVelocity = sprite.body.velocity.clone();

      // Stop any previous movement from the last frame
      sprite.body.setVelocity(0);

      // Horizontal movement
      if (keys.left.isDown) {
         sprite.body.setVelocityX(-speed);
         sprite.setFlipX(true);
      } else if (keys.right.isDown) {
         sprite.body.setVelocityX(speed);
         sprite.setFlipX(false);
      }

      // Vertical movements
      if (keys.up.isDown) {
         sprite.body.setVelocityY(-speed);
      } else if (keys.down.isDown) {
         sprite.body.setVelocityY(speed);
      }

      // Normalize and scale the velocity so that sprite can't move faster along a diagonal
      sprite.body.velocity.normalize().scale(speed);

      // Update the animation last and give left/right/down animations precedence over up animations
      if (keys.left.isDown || keys.right.isDown || keys.down.isDown) {
         sprite.anims.play('player-walk', true);
      } else if (keys.up.isDown) {
         sprite.anims.play('player-walk-back', true);
      } else {
         sprite.anims.stop();

         // If we were moving & now we're not, then pick a single idle frame to use
         if (prevVelocity.y < 0) sprite.setTexture('characters', 65);
         else sprite.setTexture('characters' ,46);
      }

   }//* update() {}

   destroy() {
      this.sprite.destroy();
   }

}
