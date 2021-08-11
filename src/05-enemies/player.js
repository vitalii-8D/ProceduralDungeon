import * as Phaser from "phaser";

export default class Player {
   /** @type {Phaser.Scene} */
   scene;
   /** @type {Phaser.Physics.Arcade.Sprite} */
   sprite;
   keys;
   knives;
   throwDirection = new Phaser.Math.Vector2(1, 0);
   activeChest = null;

   isDamaged = false;
   isDead = false;

   constructor(scene, x, y) {
      this.scene = scene;

      this.sprite = scene.physics.add
         .sprite(x, y, 'characters')
         .setSize(28, 40)
         .setOffset(20, 24)
         .setScale(0.8)

      // this.sprite.anims.play('player-walk-back');

      this.keys = scene.input.keyboard.createCursorKeys();
   } //* constructor(scene, x, y) {}

   freeze() {
      this.sprite.body.moves = false;
   }

   setKnives(knives) {
      this.knives = knives
   }

   handleDamage(dir) {
      this.isDamaged = true;
      this.sprite.setTint(0xee5555);
      this.sprite.setVelocity(dir.x, dir.y);

      this.scene.time.delayedCall(500, () => {
         this.isDamaged = false;
         this.sprite.setTint(0xffffff);
         this.sprite.setVelocity(0);

         if (this.isDead) {
            this.sprite.active = false;
            this.sprite.setVelocity(0);
            this.sprite.disableBody();

            this.sprite.setFrame(2);
         }
      }, [], this);
   }

   update() {
      if (this.isDamaged || this.isDead) return undefined;

      const keys = this.keys;
      const sprite = this.sprite;
      const speed = 250;
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

      // handle throw direction
      const vel = sprite.body.velocity
      if (vel.x || vel.y) {
         this.throwDirection = sprite.body.velocity.clone()
      }

      // Check for the activeChest
      if (this.activeChest) {
         const distance = Phaser.Math.Distance.Between(
            sprite.x, sprite.y,
            this.activeChest.x, this.activeChest.y
         )
         if (distance > 60) {
            this.activeChest.setTint(0xffffff);
            this.activeChest = null;
         }
      }

      // Throw a knife or open the activeChest
      if (Phaser.Input.Keyboard.JustDown(keys.space)) {
         if (this.activeChest) {
            this.activeChest.open();
            this.activeChest = null;
         } else {
            this.throwKnife(this.throwDirection);
         }
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
         else sprite.setTexture('characters', 46);
      }

   } //* update() {}

   setActiveChest(chest) {
      chest.setTint(0xbdba13)
      this.activeChest = chest;
   }

   throwKnife(prevSpeedVec) {
      if (!this.knives) return undefined;

      const vec = prevSpeedVec.normalize()
      // .scale(1);
      const angle = vec.angle()
      const knife = this.knives.get(this.sprite.x + vec.x * 14, this.sprite.y + vec.y * 14 + 6, 'knife')

      if (!knife) return undefined

      knife.setActive(true)
      knife.setVisible(true)

      // knife.enableBody(true, knife.x, knife.y, true, true)

      knife.body.enable = true

      knife.setScale(2)
      knife.setRotation(angle)  // TODO rotate the hitbox also

      knife.setVelocity(vec.x * 400, vec.y * 400);

   } // *** throwKnife() ***

   destroy() {
      this.sprite.destroy();
   }

}
