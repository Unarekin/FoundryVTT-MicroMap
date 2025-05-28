import { getGame, getMiniMap } from "./utils";
import { log, logError } from "./logging";
import { MiniMap } from "MiniMap";
import { MapPosition } from './types';

Hooks.once("init", () => {
  /*
        name: "Current StageObjects",
        hint: "Serialized list of StageObjects currently present.",
        config: false,
        scope: "world",
        type: Array,
        default: [],
        requiresReload: false
  */
  getGame()
    .then(game => {
      // Register settings
      game.settings.register(__MODULE_ID__, "show", {
        name: "MINIMAP.SETTINGS.SHOW.NAME",
        hint: "MINIMAP.SETTINGS.SHOW.HINT",
        config: true,
        scope: "world",
        type: Boolean,
        default: false,
        requiresReload: false,
        onChange(value: boolean) {
          const map = getMiniMap();
          if (!(map instanceof MiniMap)) return;
          map.visible = value;
        }
      });

      game.settings.register(__MODULE_ID__, "position", {
        name: "MINIMAP.SETTINGS.POSITION.NAME",
        hint: "MINIMAP.SETTINGS.POSITION.HINT",
        config: true,
        scope: "world",
        type: String,
        default: "bottomRight",
        requiresReload: false,
        choices: {
          bottomLeft: "MINIMAP.SETTINGS.POSITION.BOTTOMLEFT",
          bottomRight: "MINIMAP.SETTINGS.POSITION.BOTTOMRIGHT",
          topLeft: "MINIMAP.SETTINGS.POSITION.TOPLEFT",
          topRight: "MINIMAP.SETTINGS.POSITION.TOPRIGHT"
        },
        onChange(value: MapPosition) {
          const map = getMiniMap();
          if (!(map instanceof MiniMap)) return;
          map.position = value;
        }
      });

      game.settings.register(__MODULE_ID__, "shape", {
        name: "MINIMAP.SETTINGS.SHAPE.NAME",
        hint: "MINIMAP.SETTINGS.SHAPE.HINT",
        config: true,
        scope: "world",
        type: String,
        choices: {
          rectangle: "MINIMAP.SETTINGS.SHAPE.RECTANGLE",
          circle: "MINIMAP.SETTINGS.SHAPE.CIRCLE",
          diamond: "MINIMAP.SETTINGS.SHAPE.DIAMOND",
          mask: "MINIMAP.SETTINGS.SHAPE.MASK"
        },
        default: "rectangle",
        requiresReload: false
      });

      game.settings.register(__MODULE_ID__, "mask", {
        name: "MINIMAP.SETTINGS.MASK.NAME",
        hint: "MINIMAP.SETTINGS.MASK.HINT",
        config: true,
        scope: "world",
        type: String,
        default: "",
        requiresReload: false,
        filePicker: "image"
      });

      game.settings.register(__MODULE_ID__, "overlay", {
        name: "MINIMAP.SETTINGS.OVERLAY.NAME",
        hint: "MINIMAP.SETTINGS.OVERLAY.HINT",
        config: true,
        scope: "world",
        type: String,
        default: "",
        requiresReload: false,
        filePicker: "image"
      });

      log("Settings registered");
    })
    .catch((err: Error) => { logError(err); });
})

