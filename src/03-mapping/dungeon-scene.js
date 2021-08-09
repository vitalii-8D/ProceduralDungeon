import * as Phaser from "phaser";

import Dungeon from "@mikewesthad/dungeon";
import Player from "./player";

import TILES from './tile-mapping'

export default class DungeonScene extends Phaser.Scene {
   player;
   dungeon;

   groundLayer;
   stuffLayer;

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
      // Generate a random world with a few extra options:
      //  - Rooms should only have odd dimensions so that they have a center tile.
      //  - Doors should be at least 2 tiles away from corners, to leave enough room for the tiles
      //    that we're going to put on either side of the door opening.
      this.dungeon = new Dungeon({
         width: 50,
         height: 50,
         doorPadding: 2,
         rooms: {
            width: {min: 7, max: 15},
            height: {min: 7, max: 15},
            maxRooms: 12
         }
      });

      // dungeon.rooms is an array of objects with information about each room

      const map = this.make.tilemap({
         tileWidth: 48,
         tileHeight: 48,
         width: this.dungeon.width,
         height: this.dungeon.height
      });


      const tileset = map.addTilesetImage("tiles", null, 48, 48, 1, 2); // 1px margin, 2px spacing
      this.groundLayer = map.createBlankLayer("Ground", tileset); // createBlankDynamicLayer
      this.stuffLayer = map.createBlankLayer("Stuff", tileset); // createBlankDynamicLayer

      // We’re going to be using the dynamic layer’s fill, putTileAt,
      //    putTilesAt and weightedRandomize methods to build out our map.

      // Set all tiles in the ground layer with blank tiles (purple-black tile)
      this.groundLayer.fill(TILES.BLANK);

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

         // Place the non-corner wall tiles using fill with x, y, width, height parameters
         // this.groundLayer.fill(39, left + 1, top, width - 2, 1); // Top
         // this.groundLayer.fill(1, left + 1, bottom, width - 2, 1); // Bottom
         // this.groundLayer.fill(21, left, top + 1, 1, height - 2); // Left
         // this.groundLayer.fill(19, right, top + 1, 1, height - 2); // Right

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

      // Place the player in the center of the map. This works because the Dungeon generator places
      // the first room in the center of the map.
      this.player = new Player(this, map.widthInPixels / 2, map.heightInPixels / 2);

      // this.groundLayer.setCollision([1, 19, 21, 39, 3, 4, 23, 22]); // Collide these...
      this.groundLayer.setCollisionByExclusion([-1, 6, 7, 8, 26]); // Collide all except these...

      // Watch the player and layer for collisions, for the duration of the scene:
      this.physics.add.collider(this.player.sprite, this.groundLayer);

      // Phaser supports multiple cameras, but you can access the default camera like this:
      const camera = this.cameras.main;
      camera.startFollow(this.player.sprite);
      camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

      // Help text that has a "fixed" position on the screen
      this.add
         .text(16, 16, "Arrow keys to move", {
            font: "18px monospace",
            fill: "#000000",
            padding: {x: 20, y: 10},
            backgroundColor: "#ffffff"
         })
         .setScrollFactor(0);

   }

   update(time, dt) {
      this.player.update();
   }

}
