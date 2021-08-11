import * as Phaser from "phaser";

import Dungeon from "@mikewesthad/dungeon";
import Player from "./player";
import Lizard from "./lizard";
import Chest from "./chest";

import TILES from './tile-mapping'
import TilemapVisibility from "./tilemap-visibility";

/** @typedef {Phaser.Events.EventEmitter} uiEventEmitter  */
import {uiEventEmitter} from "./event-center";

export default class DungeonScene extends Phaser.Scene {
   /** @type {Player} */
   player;
   dungeon;
   lizardGroup;
   knives;
   chests;

   groundLayer;
   stuffLayer;
   tilemapVisibility;

   level;
   lives;
   hasPlayerReachedStairs;

   constructor() {
      super();
      this.level = 0;
      this.lives = 2;
   }

   preload() {
      this.load.image("tiles", "./src/assets/tilesets/buch-tileset-48px-extruded.png");
      this.load.image("ui-heart-empty", "./src/assets/images/ui_heart_empty.png");
      this.load.image("ui-heart-full", "./src/assets/images/ui_heart_full.png");
      this.load.image("coin", "./src/assets/images/coin4.png");

      this.load.spritesheet(
         "characters",
         "./src/assets/spritesheets/buch-characters-64px-extruded.png",
         {
            frameWidth: 64,
            frameHeight: 64,
            margin: 1,
            spacing: 2
         }
      );
      this.load.spritesheet(
         'green_lizard',
         './src/assets/spritesheets/lizard.png',
         {frameWidth: 16, frameHeight: 28})
      this.load.spritesheet(
         'chest',
         './src/assets/spritesheets/chest04_96x32_sheet.png',
         {frameWidth: 32, frameHeight: 32})
      this.load.image('knife', './src/assets/images/weapon_knife.png')
   }

   create() {
      this.level++;
      this.hasPlayerReachedStairs = false;

      this.scene.run('game-ui');

      createLizardAnims(this.anims);
      createChestAnims(this.anims);
      createPlayerAnims(this.anims);

      //  ******  CREATING OUR GROUPS   ***************
      this.lizardGroup = this.physics.add.group({
         classType: Lizard,
         /** @param {Lizard} lizard */
         createCallback: (lizard) => {

            lizard.body.onCollide = true
            lizard.setSize(16, 16).setOffset(0, 12)
         }
      })

      this.knives = this.physics.add.group({
         classType: Phaser.Physics.Arcade.Image,
         maxSize: 5
      })
      this.chests = this.physics.add.staticGroup({
         classType: Chest,
         /** @param {Chest} chest */
         createCallback: (chest) => {
            chest.setScale(1.6);
            chest.body.updateFromGameObject();
            chest.body.setSize(48, 22).setOffset(2, 28)
         }
      })

      //  ******  RANDOMIZE DUNGEON   ***************
      this.dungeon = new Dungeon({
         width: 50,
         height: 50,
         doorPadding: 2,
         rooms: {
            width: {min: 7, max: 15, onlyOdd: true},
            height: {min: 7, max: 15, onlyOdd: true},
            maxRooms: 12
         }
      });

      // this.dungeon.drawToConsole();

      const map = this.make.tilemap({
         tileWidth: 48,
         tileHeight: 48,
         width: this.dungeon.width,
         height: this.dungeon.height
      });


      const tileset = map.addTilesetImage("tiles", null, 48, 48, 1, 2); // 1px margin, 2px spacing
      this.groundLayer = map.createBlankLayer("Ground", tileset); // createBlankDynamicLayer
      this.stuffLayer = map.createBlankLayer("Stuff", tileset); // createBlankDynamicLayer

      // Shadow
      const shadowLayer = map.createBlankLayer("Shadow", tileset).fill(TILES.BLANK).setDepth(100);
      this.tilemapVisibility = new TilemapVisibility(shadowLayer)

      // Set all tiles in the ground layer with blank tiles (purple-black tile)
      this.groundLayer.fill(TILES.BLANK);

      // Use the array of rooms generated to place tiles in the map
      this.dungeon.rooms.forEach(room => {
         // These room properties are all in grid units (not pixels units)
         const {x, y, width, height, left, right, top, bottom} = room;

         // Fill the room (minus the walls) with mostly clean floor tiles (90% of the time), but
         // occasionally place a dirty tile (10% of the time).
         this.groundLayer.weightedRandomize([
            {index: 6, weight: 9}, // 9/10 times, use index 6
            {index: [7, 8, 26], weight: 1} // 1/10 times, randomly pick 7, 8 or 26
         ], x + 1, y + 1, width - 2, height - 2);

         // Place the room corners tiles
         this.groundLayer.putTileAt(TILES.WALL.TOP_LEFT, left, top);
         this.groundLayer.putTileAt(TILES.WALL.TOP_RIGHT, right, top);
         this.groundLayer.putTileAt(TILES.WALL.BOTTOM_RIGHT, right, bottom);
         this.groundLayer.putTileAt(TILES.WALL.BOTTOM_LEFT, left, bottom);

         // Fill the walls with mostly clean tiles
         this.groundLayer.weightedRandomize(TILES.WALL.TOP, left + 1, top, width - 2, 1);
         this.groundLayer.weightedRandomize(TILES.WALL.BOTTOM, left + 1, bottom, width - 2, 1);
         this.groundLayer.weightedRandomize(TILES.WALL.LEFT, left, top + 1, 1, height - 2);
         this.groundLayer.weightedRandomize(TILES.WALL.RIGHT, right, top + 1, 1, height - 2);

         // Dungeons have rooms that are connected with doors. Each door has an x & y relative to the
         // room's location. Each direction has a different door to tile mapping.
         let doors = room.getDoorLocations();
         for (let i = 0; i < doors.length; i++) {
            const {x: doorX, y: doorY} = doors[i];

            if (doorY === 0) {
               this.groundLayer.putTilesAt(TILES.DOOR.TOP, x + doorX - 1, y + doorY);
            } else if (doorY === height - 1) {
               this.groundLayer.putTilesAt(TILES.DOOR.BOTTOM, x + doorX - 1, y + doorY);
            } else if (doorX === 0) {
               this.groundLayer.putTilesAt(TILES.DOOR.LEFT, x + doorX, y + doorY - 1);
            } else if (doorX === width - 1) {
               this.groundLayer.putTilesAt(TILES.DOOR.RIGHT, x + doorX, y + doorY - 1);
            }
         }

      })

      // ***************   ROOMS  ******************
      const rooms = this.dungeon.rooms.slice();
      const startRoom = rooms.shift();
      const endRoom = Phaser.Utils.Array.RemoveRandomElement(rooms);
      const otherRooms = Phaser.Utils.Array.Shuffle(rooms).slice(0, rooms.length * 0.9);

      // Place the stairs
      this.stuffLayer.putTileAt(TILES.STAIRS, endRoom.centerX, endRoom.centerY);

      // Place stuff in the 90% "otherRooms"
      otherRooms.forEach(room => {
         let rand = Math.random();
         if (rand <= 0.9) {
            // 25% chance of chest
            // this.stuffLayer.putTileAt(TILES.CHEST, room.centerX, room.centerY);
            const chestX = this.groundLayer.tileToWorldX(room.centerX);
            const chestY = this.groundLayer.tileToWorldY(room.centerY);
            this.chests.get(chestX, chestY);

            this.putLizardAtTile(room.centerX - 1, room.centerY - 1)
            this.putLizardAtTile(room.centerX + 1, room.centerY - 1)
            this.putLizardAtTile(room.centerX, room.centerY + 2)
         } else if (rand <= 0.5) {
            // 50% chance of a pot anywhere in the room... except don't block a door!
            const x = Phaser.Math.Between(room.left + 2, room.right - 2);
            const y = Phaser.Math.Between(room.top + 2, room.bottom - 2);
            this.stuffLayer.weightedRandomize(TILES.POT, x, y, 1, 1);

            this.putLizardAtTile(x - 1, y - 1)
         } else {
            // 25% of either 2 or 4 towers, depending on the room size
            if (room.height >= 9) {
               this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX - 1, room.centerY + 1);
               this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX + 1, room.centerY + 1);
               this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX - 1, room.centerY - 2);
               this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX + 1, room.centerY - 2);

               // Put lizards in the big room
               this.putLizardAtTile(room.centerX - 1, room.centerY)
               this.putLizardAtTile(room.centerX + 1, room.centerY)
            } else {
               this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX - 1, room.centerY - 1);
               this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX + 1, room.centerY - 1);

               // Put lizard in the mall room
               this.putLizardAtTile(room.centerX, room.centerY)
            }
         }

      })

      // this.groundLayer.setCollision([1, 19, 21, 39, 3, 4, 23, 22]); // Collide these...
      this.groundLayer.setCollisionByExclusion([-1, 6, 7, 8, 26]);  // Collide all except these...
      this.stuffLayer.setCollisionByExclusion([-1, 6, 7, 8, 26]);

      this.stuffLayer.setTileIndexCallback(TILES.STAIRS, () => {
         this.stuffLayer.setTileIndexCallback(TILES.STAIRS, null);
         this.hasPlayerReachedStairs = true;
         this.player.freeze();
         const cam = this.cameras.main;
         cam.fade(250, 0, 0, 0);
         cam.once("camerafadeoutcomplete", () => {
            this.player.destroy();
            this.scene.restart();
         });
      });

      // Place the player in the first room
      const playerRoom = startRoom;
      const x = map.tileToWorldX(playerRoom.centerX);
      const y = map.tileToWorldY(playerRoom.centerY);
      this.player = new Player(this, x, y);
      this.player.setKnives(this.knives)

      // Watch the player and layer for collisions, for the duration of the scene:
      this.physics.add.collider(this.player.sprite, this.groundLayer);
      this.physics.add.collider(this.player.sprite, this.stuffLayer);

      this.physics.add.collider(this.lizardGroup, this.groundLayer);
      this.physics.add.collider(this.lizardGroup, this.stuffLayer);
      this.physics.add.collider(this.lizardGroup, this.player.sprite, this.handleLizardPlayerCollision, undefined, this);

      this.physics.add.collider(this.knives, this.lizardGroup, this.handleKnifeLizardCollision, undefined, this);
      this.physics.add.collider(this.knives, this.groundLayer, this.handleKnifeObjectsCollision, undefined, this);
      this.physics.add.collider(this.knives, this.stuffLayer, this.handleKnifeObjectsCollision, undefined, this);

      this.physics.add.collider(this.player.sprite, this.chests, this.handlePlayerChestCollision, undefined, this);

      // this.physics.add.collider(this.knives, this.player.sprite);

      // Phaser supports multiple cameras, but you can access the default camera like this:
      const camera = this.cameras.main;
      camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      camera.startFollow(this.player.sprite);

      // Help text that has a "fixed" position on the screen
      this.add
         .text(16, 16, `Find the stairs. Go deeper.\nCurrent level: ${this.level}`, {
            font: "18px monospace",
            fill: "#000000",
            padding: {x: 20, y: 10},
            backgroundColor: "#ffffff"
         })
         .setScrollFactor(0)
         .setDepth(1200);

   }


   update(time, dt) {
      if (this.hasPlayerReachedStairs) return;
      this.player.update();

      // Find the player's room using another helper method from the dungeon that converts from
      // dungeon XY (in grid units) to the corresponding room instance
      const playerTileX = this.groundLayer.worldToTileX(this.player.sprite.x);
      const playerTileY = this.groundLayer.worldToTileY(this.player.sprite.y);
      const playerRoom = this.dungeon.getRoomAt(playerTileX, playerTileY);

      this.tilemapVisibility.setActiveRoom(playerRoom);
   }

   handleKnifeObjectsCollision(knife, obj) {
      knife.disableBody(true, true)
      // this.knives.killAndHide(knife)
   }

   handleKnifeLizardCollision(knife, lizard) {
      knife.disableBody(true, true)
      lizard.disableBody(true, true)
   }

   /** @param {Lizard} lizard
    * @param {Phaser.Physics.Arcade} playerSprite */
   handleLizardPlayerCollision(lizard, playerSprite) {
      if (this.player.isDamaged || this.player.isDead) return undefined;

      this.lives--;
      const dx = lizard.x - playerSprite.x;
      const dy = lizard.y - playerSprite.y;
      const dir = new Phaser.Math.Vector2(dx, dy).normalize().scale(200);

      this.player.handleDamage(dir);
      uiEventEmitter.emit('player-hit', this.lives);

      if (this.lives === 0) {
         this.player.isDead = true;
      }

   }

   /** @param {Phaser.Physics.Arcade} playerSprite
    * @param {Chest} chest */
   handlePlayerChestCollision(playerSprite, chest) {
      if (!chest.isActive) return undefined;

      this.player.setActiveChest(chest);
   }

   putLizardAtTile(x, y) {
      const lX = this.groundLayer.tileToWorldX(x);
      const lY = this.groundLayer.tileToWorldY(y);
      this.lizardGroup.get(lX, lY, 'green_lizard')
   }

}

// ********  ANIMATIONS  *************

/** @param {Phaser.Animations.AnimationManager} anims */
const createPlayerAnims = anims => {
   anims.create({
      key: 'player-walk',
      frames: anims.generateFrameNumbers('characters', {start: 46, end: 49}),
      frameRate: 15,
      repeat: -1
   })
   anims.create({
      key: "player-walk-back",
      frames: anims.generateFrameNumbers("characters", {start: 65, end: 68}),
      frameRate: 8,
      repeat: -1
   });
   anims.create({
      key: 'player-dead',
      frames: [{
         key: 'characters',
         frame: 22
      }]
   })
}

/** @param {Phaser.Animations.AnimationManager} anims */
const createLizardAnims = (anims) => {
   // Lizard anims
   anims.create({
      key: 'lizard-hit',
      frames: [{key: 'green_lizard', frame: 0}]
   })

   anims.create({
      key: 'lizard-idle',
      frames: anims.generateFrameNames('green_lizard', {
         start: 1, end: 4
      }),
      repeat: -1,
      frameRate: 10
   })

   anims.create({
      key: 'lizard-run',
      frames: anims.generateFrameNames('green_lizard', {
         start: 5, end: 8
      }),
      repeat: -1,
      frameRate: 10
   })

}

/** @param {Phaser.Animations.AnimationManager} anims */
const createChestAnims = (anims) => {
   anims.create({
      key: 'chest-close',
      frames: [{
         key: 'chest',
         frame: 0
      }]
   })
   anims.create({
      key: 'chest-open',
      frames: [{
         key: 'chest',
         frame: 2
      }]
   })
   anims.create({
      key: 'chest-opening',
      frames: anims.generateFrameNumbers(
         'chest',
         {
            start: 0,
            end: 2
         }
      ),
      frameRate: 5
   })

} // *** createChestAnims  ***
