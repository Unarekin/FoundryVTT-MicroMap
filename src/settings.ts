import { getGame, getMiniMap, localize } from "./utils";
import { log, logError } from "./logging";
import { MiniMap } from "MiniMap";
import { MapPosition, MapShape, OverlaySettings, MapMode } from './types';
import { OverlaySettingsApplication } from "./applications";
import { synchronizeView } from "sockets";

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

      game.settings.register(__MODULE_ID__, "unlockPlayers", {
        name: "MINIMAP.SETTINGS.UNLOCKPLAYERS.NAME",
        config: true,
        scope: "world",
        type: Boolean,
        default: true,
        requiresReload: false,
        onChange(value: boolean) {
          const map = getMiniMap();
          if (!(map instanceof MiniMap)) return;
          map.allowPan = value;
          map.allowZoom = value;
        }
      });

      game.settings.register(__MODULE_ID__, "lockGMView", {
        name: "MINIMAP.SETTINGS.LOCKGMVIEW.NAME",
        hint: "MINIMAP.SETTINGS.LOCKGMVIEW.HINT",
        config: true,
        scope: "world",
        type: Boolean,
        default: false,
        requiresReload: false,
        onChange(value: boolean, data: unknown, user: string) {
          const map = getMiniMap();
          if (!(map instanceof MiniMap)) return;
          map.lockGMView = value;
          getGame()
            .then(game => {
              if (game.user.id === user)
                void synchronizeView();
            })
            .catch((err: Error) => { logError(err); })
            ;
        }
      })

      game.settings.register(__MODULE_ID__, "mode", {
        name: "MINIMAP.SETTINGS.MODE.NAME",
        config: true,
        scope: "world",
        type: String,
        default: "image",
        requiresReload: false,
        choices: {
          "image": "Image",
          "scene": "DOCUMENT.Scene"
        },
        onChange(value: MapMode) {
          const map = getMiniMap();
          if (!(map instanceof MiniMap)) return;
          map.mode = value;
        }
      });

      game.settings.register(__MODULE_ID__, "image", {
        name: "Image",
        config: true,
        scope: "world",
        type: String,
        default: "",
        requiresReload: false,
        filePicker: "image",
        onChange(value: string) {
          const map = getMiniMap();
          if (!(map instanceof MiniMap)) return;
          map.image = value;
        }
      });

      game.settings.register(__MODULE_ID__, "scene", {
        name: "DOCUMENT.Scene",
        config: true,
        scope: "world",
        type: new foundry.data.fields.ForeignDocumentField(Scene, {
          nullable: true,
          idOnly: true
        }),
        default: null,
        requiresReload: false,
        onChange(id: string) {
          const map = getMiniMap();
          if (!(map instanceof MiniMap)) return;
          map.scene = id;
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

      game.settings.register(__MODULE_ID__, "bgColor", {
        name: "MINIMAP.SETTINGS.BGCOLOR.NAME",
        hint: "MINIMAP.SETTINGS.BGCOLOR.HINT",
        config: true,
        scope: "world",
        type: new foundry.data.fields.ColorField(),
        default: "#000000",
        onChange(value: string) {
          const map = getMiniMap();
          if (!(map instanceof MiniMap)) return;
          map.bgColor = value;
        }
      })

      game.settings.register(__MODULE_ID__, "padding", {
        name: "MINIMAP.SETTINGS.PADDING.NAME",
        hint: "MINIMAP.SETTINGS.PADDING.HINT",
        config: true,
        scope: "world",
        type: Number,
        default: 0,
        requiresReload: false,
        required: true,
        onChange(value: number) {
          const map = getMiniMap();
          if (!(map instanceof MiniMap)) return;
          map.padding = value;
        }
      });

      game.settings.register(__MODULE_ID__, "width", {
        name: "Width",
        config: true,
        scope: "world",
        type: Number,
        default: 256,
        required: true,
        onChange(width: number) {
          const miniMap = getMiniMap();
          if (!(miniMap instanceof MiniMap)) return;
          miniMap.width = width;
        }
      });

      game.settings.register(__MODULE_ID__, "height", {
        name: "Height",
        config: true,
        scope: "world",
        type: Number,
        default: 256,
        required: true,
        onChange(height: number) {
          const miniMap = getMiniMap();
          if (!(miniMap instanceof MiniMap)) return;
          miniMap.height = height;
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
        requiresReload: false,
        onChange(shape: MapShape) {
          const miniMap = getMiniMap();
          if (!(miniMap instanceof MiniMap)) return;
          miniMap.shape = shape;
        }
      });

      game.settings.register(__MODULE_ID__, "mask", {
        name: "MINIMAP.SETTINGS.MASK.NAME",
        hint: "MINIMAP.SETTINGS.MASK.HINT",
        config: true,
        scope: "world",
        type: String,
        default: "",
        requiresReload: false,
        filePicker: "image",
        onChange(file: string) {
          const miniMap = getMiniMap();
          if (!(miniMap instanceof MiniMap)) return;
          miniMap.mask = file;
        }
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



      game.settings.register(__MODULE_ID__, "view", {
        scope: "client",
        config: false,
        type: Object,
        default: { x: 0, y: 0, zoom: 1 }
      });


      log("Settings registered");
    })
    .catch((err: Error) => { logError(err); });
})

Hooks.once("libWrapper.Ready", () => {

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  libWrapper.register(__MODULE_ID__, "foundry.applications.settings.SettingsConfig.prototype._onRender", async function (this: foundry.applications.settings.SettingsConfig, wrapped: Function, ...args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const onRender = wrapped(...args);

    const game = await getGame();

    const shape = this.element.querySelector(`[name="${__MODULE_ID__}.shape"]`);
    const mask = this.element.querySelector(`.form-group:has([name="${__MODULE_ID__}.mask"])`);

    if (mask instanceof HTMLElement && shape instanceof HTMLSelectElement) {
      mask.style.display = shape.value === "mask" ? "flex" : "none";
      shape.addEventListener("change", () => { mask.style.display = shape.value === "mask" ? "flex" : "none"; });
    }

    const width = this.element.querySelector(`.form-group:has([name="${__MODULE_ID__}.width"])`);
    if (width instanceof HTMLElement) width.remove();

    const height = this.element.querySelector(`.form-group:has([name="${__MODULE_ID__}.height"])`);
    if (height instanceof HTMLElement) height.remove();

    const pos = this.element.querySelector(`.form-group:has([name="${__MODULE_ID__}.position"])`);
    if (pos instanceof HTMLElement) {
      // Inject formatted width/height
      const elem = document.createElement(`div`);
      elem.classList.add("form-group");
      elem.classList.add("slim");

      const width = game.settings.get(__MODULE_ID__, "width") as number;
      const height = game.settings.get(__MODULE_ID__, "height") as number;

      elem.innerHTML = `<label>${localize("TILE.Dimensions")}</label>
  <div class="form-fields">
    <label for="settings-config-${__MODULE_ID__}.width">${localize("Width")}</label>
    <div class="form-fields">
      <input type="number" name="${__MODULE_ID__}.width" id="settings-config-${__MODULE_ID__}.width" value="${width.toString()}" step="any">
    </div>
    <label for="settings-config-${__MODULE_ID__}.height">${localize("Height")}</label>
    <div class="form-fields">
      <input type="number" name="${__MODULE_ID__}.height" id="settings-config-${__MODULE_ID__}.height" value="${height.toString()}" step="any">
    </div>
  </div>
`

      pos.after(elem);
    }

    const scene = this.element.querySelector(`.form-group:has([name="${__MODULE_ID__}.scene"])`);
    const image = this.element.querySelector(`.form-group:has([name="${__MODULE_ID__}.image"])`);

    const mode = game.settings.get(__MODULE_ID__, "mode") as MapMode;
    if (scene instanceof HTMLElement) scene.style.display = mode === "scene" ? "flex" : "none";
    if (image instanceof HTMLElement) image.style.display = mode === "image" ? "flex" : "none";

    const modeSelect = this.element.querySelector(`[name="${__MODULE_ID__}.mode"]`);
    if (modeSelect instanceof HTMLSelectElement) {
      modeSelect.addEventListener("change", () => {
        if (scene instanceof HTMLElement) {
          scene.style.display = modeSelect.value === "scene" ? "flex" : "none";
          if (modeSelect.value === "scene") scene.setAttribute("required", "true");
          else scene.removeAttribute("required");
        }
        if (image instanceof HTMLElement) {
          image.style.display = modeSelect.value === "image" ? "flex" : "none";
          if (modeSelect.value === "image") image.setAttribute("required", "true");
          else image.removeAttribute("required");
        }
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return onRender;
  });
});