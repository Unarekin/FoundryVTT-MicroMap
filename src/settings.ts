import { getGame, getMiniMap } from "./utils";
import { log, logError } from "./logging";
import { MiniMap } from "MiniMap";
import { MapPosition, OverlaySettings } from './types';
import { OverlaySettingsApplication } from "./applications";

Hooks.once("init", () => {

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

      game.settings.register(__MODULE_ID__, "padding", {
        name: "MINIMAP.SETTINGS.PADDING.NAME",
        hint: "MINIMAP.SETTINGS.PADDING.HINT",
        config: true,
        scope: "world",
        type: Number,
        default: 0,
        requiresReload: false,
        onChange(value: number) {
          const map = getMiniMap();
          if (!(map instanceof MiniMap)) return;
          map.padding = value;
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

      game.settings.registerMenu(__MODULE_ID__, "overlayMenu", {
        name: "MINIMAP.SETTINGS.OVERLAY.NAME",
        hint: "MINIMAP.SETTINGS.OVERLAY.HINT",
        label: "MINIMAP.SETTINGS.OVERLAY.BUTTON",
        restricted: true,
        icon: "fas fa-frame",
        type: OverlaySettingsApplication
      });

      game.settings.register(__MODULE_ID__, "overlaySettings", {
        scope: "world",
        config: false,
        type: Object,
        default: {
          show: true,
          file: "",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0
        },
        onChange(settings: OverlaySettings) {
          const miniMap = getMiniMap();
          if (!(miniMap instanceof MiniMap)) return;
          miniMap.setOverlayFromSettings(settings);
        }
      });

      log("Settings registered");
    })
    .catch((err: Error) => { logError(err); });
})

