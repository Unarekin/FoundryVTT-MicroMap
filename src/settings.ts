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
        required: false,
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
          idOnly: true,
          blank: true
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
        min: 0,
        step: 1,
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
        min: 0,
        step: 1,
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

Hooks.on("renderSettingsConfig", async (config: foundry.applications.settings.SettingsConfig, elem: HTMLElement | JQuery<HTMLElement>) => {
  const element = elem instanceof HTMLElement ? elem : elem[0];
  const game = await getGame();

  const shape = element.querySelector(`[name="${__MODULE_ID__}.shape"]`);
  const mask = element.querySelector(`.form-group:has([name="${__MODULE_ID__}.mask"])`);

  // Show/hide image mask selection based on shape
  if (mask instanceof HTMLElement && shape instanceof HTMLSelectElement) {
    mask.style.display = shape.value === "mask" ? "flex" : "none";
    shape.addEventListener("change", () => { mask.style.display = shape.value === "mask" ? "flex" : "none"; });
  }

  // Show/hide scene or image based on mode

  const scene = element.querySelector(`.form-group:has([name="${__MODULE_ID__}.scene"])`);
  const image = element.querySelector(`.form-group:has([name="${__MODULE_ID__}.image"])`);

  const mode = game.settings.get(__MODULE_ID__, "mode") as MapMode;
  if (scene instanceof HTMLElement) scene.style.display = mode === "scene" ? "flex" : "none";
  if (image instanceof HTMLElement) image.style.display = mode === "image" ? "flex" : "none";

  const modeSelect = element.querySelector(`[name="${__MODULE_ID__}.mode"]`);
  if (modeSelect instanceof HTMLSelectElement) {
    modeSelect.addEventListener("change", () => {
      if (scene instanceof HTMLElement) scene.style.display = modeSelect.value === "scene" ? "flex" : "none";
      if (image instanceof HTMLElement) image.style.display = modeSelect.value === "image" ? "flex" : "none";
    });
  }


  // Remove pre-rendered width and height fields
  const width = element.querySelector(`.form-group:has([name="${__MODULE_ID__}.width"])`);
  if (width instanceof HTMLElement) width.remove();
  const height = element.querySelector(`.form-group:has([name="${__MODULE_ID__}.height"])`);
  if (height instanceof HTMLElement) height.remove();

  // We will inject a new form group after the position element
  const pos = element.querySelector(`.form-group:has([name="${__MODULE_ID__}.position"])`);
  if (pos instanceof HTMLElement) {
    const dimensions = document.createElement("div");
    dimensions.classList.add("form-group");
    dimensions.classList.add("slim");

    const widthField = new foundry.data.fields.NumberField(game.settings.settings.get(`${__MODULE_ID__}.width`));
    const heightField = new foundry.data.fields.NumberField(game.settings.settings.get(`${__MODULE_ID__}.height`));

    const widthElem = widthField.toFormGroup({ label: "Width", localize: true }, { value: game.settings.get(__MODULE_ID__, "width") as number, name: `${__MODULE_ID__}.width`, id: `settings-config-${__MODULE_ID__}.width` });
    const heightElem = heightField.toFormGroup({ label: "Height", localize: true }, { value: game.settings.get(__MODULE_ID__, "height") as number, name: `${__MODULE_ID__}.height`, id: `settings-config-${__MODULE_ID__}.height` });

    dimensions.innerHTML = `<label>${localize("TOKEN.Dimensions")}</label>
  <div class="form-fields">
    ${widthElem.innerHTML}
    ${heightElem.innerHTML}
  </div>`;

    pos.after(dimensions);
  }

});
