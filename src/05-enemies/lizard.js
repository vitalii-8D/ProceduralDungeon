import * as Phaser from "phaser";

const Direction = {
   UP: 0,
   DOWN: 1,
   LEFT: 2,
   RIGHT: 3
}

// Calculate new direction
const randomDirection = (exclude) => {
   let newDirection = Phaser.Math.Between(0, 3)

   while (newDirection === exclude) {
      newDirection = Phaser.Math.Between(0, 3)
   }

   return newDirection
}

export default class Lizard extends Phaser.Physics.Arcade.Sprite {
   direction = Direction.RIGHT

   constructor(scene, x, y, texture, frame) {
      super(scene, x, y, texture, frame);

      this.setScale(2)

      this.anims.play('lizard-idle', true)

      scene.physics.world.on(Phaser.Physics.Arcade.Events.TILE_COLLIDE, this.handleTileCollision, this) // collisions with all

      scene.time.addEvent({
         delay: 2000,
         callback: () => {
            this.direction = randomDirection(this.direction)
         },
         callbackScope: this,
         loop: true
      })

   }

   /**
    @param {Phaser.GameObjects.GameObject} go
    @param {Phaser.Tilemaps.Tile} tile
    */
   handleTileCollision(go, tile) {
      if (go !== this) return false;

      this.direction = randomDirection(this.direction)
   }

   /**
    @param {number} time
    @param {number} delta
    */
   preUpdate(time, delta) {
      super.preUpdate(time, delta);

      const speed = 50;

      switch (this.direction) {
         case Direction.UP:
            this.setVelocity(0, -speed)
            break
         case Direction.DOWN:
            this.setVelocity(0, speed)
            break
         case Direction.LEFT:
            this.setVelocity(-speed, 0)
            this.flipX = true;
            break
         case Direction.RIGHT:
            this.setVelocity(speed, 0)
            this.flipX = false;
            break
         default:
            this.setVelocity(0, 0)
      }

   }

   destroy() {
      super.destroy();
   }

}
