import * as Phaser from "phaser";

import Dungeon from "@mikewesthad/dungeon";
import Player from "./player";

import TILES from './tile-mapping'
import TilemapVisibility from "./tilemap-visibility";

export default class DungeonScene extends Phaser.Scene {
   player;
   dungeon;

   groundLayer;
   stuffLayer;
   tilemapVisibility;

   level;
   hasPlayerReachedStairs;

   constructor() {
      super();
      this.level = 0;
   }

   preload() {
      this.load.image("tiles", "./src/assets/tilesets/buch-tileset-48px-extruded.png");
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
   }

   create() {
      this.level++;
      this.hasPlayerReachedStairs = false;

      // Generate a random world with a few extra options:
      //  - Rooms should only have odd dimensions so that they have a center tile.
      //  - Doors should be at least 2 tiles away from corners, to leave enough room for the tiles
      //    that we're going to put on either side of the door opening.
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

      this.dungeon.drawToConsole();

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
      const shadowLayer = map.createBlankLayer("Shadow", tileset).fill(TILES.BLANK);
      this.tilemapVisibility = new TilemapVisibility(shadowLayer)

      // Set all tiles in the ground layer with blank tiles (purple-black tile)
      this.groundLayer.fill(TILES.BLANK);
      // this.stuffLayer.fill(TILES.BLANK);

      // Use the array of rooms generated to place tiles in the map
      // Note: using an arrow function here so that "this" still refers to our scene
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

      // ********  Separate out the rooms into:  ************
      //  - The starting room (index = 0)
      //  - A random room to be designated as the end room (with stairs and nothing else)
      //  - An array of 90% of the remaining rooms, for placing random stuff (leaving 10% empty)
      const rooms = this.dungeon.rooms.slice();
      const startRoom = rooms.shift();
      const endRoom = Phaser.Utils.Array.RemoveRandomElement(rooms);
      const otherRooms = Phaser.Utils.Array.Shuffle(rooms).slice(0, rooms.length * 0.9);

      // Place the stairs
      this.stuffLayer.putTileAt(TILES.STAIRS, endRoom.centerX, endRoom.centerY);

      // Place stuff in the 90% "otherRooms"
      otherRooms.forEach(room => {
         let rand = Math.random();
         if (rand <= 0.25) {
            // 25% chance of chest
            this.stuffLayer.putTileAt(TILES.CHEST, room.centerX, room.centerY);
         } else if (rand <= 0.5) {
            // 50% chance of a pot anywhere in the room... except don't block a door!
            const x = Phaser.Math.Between(room.left + 2, room.right - 2);
            const y = Phaser.Math.Between(room.top + 2, room.bottom - 2);
            this.stuffLayer.weightedRandomize(TILES.POT, x, y, 1, 1);
         } else {
            // 25% of either 2 or 4 towers, depending on the room size
            if (room.height >= 9) {
               this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX - 1, room.centerY + 1);
               this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX + 1, room.centerY + 1);
               this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX - 1, room.centerY - 2);
               this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX + 1, room.centerY - 2);
            } else {
               this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX - 1, room.centerY - 1);
               this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX + 1, room.centerY - 1);
            }
         }

      })

      // this.groundLayer.setCollision([1, 19, 21, 39, 3, 4, 23, 22]); // Collide these...
      this.groundLayer.setCollisionByExclusion([-1, 6, 7, 8, 26]); // Collide all except these...
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

      // Watch the player and layer for collisions, for the duration of the scene:
      this.physics.add.collider(this.player.sprite, this.groundLayer);
      this.physics.add.collider(this.player.sprite, this.stuffLayer);

      // Phaser supports multiple cameras, but you can access the default camera like this:
      const camera = this.cameras.main;
      camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      camera.startFollow(this.player.sprite);

      // Help text that has a "fixed" position on the screen
      // Help text that has a "fixed" position on the screen
      this.add
         .text(16, 16, `Find the stairs. Go deeper.\nCurrent level: ${this.level}`, {
            font: "18px monospace",
            fill: "#000000",
            padding: { x: 20, y: 10 },
            backgroundColor: "#ffffff"
         })
         .setScrollFactor(0);

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

}
