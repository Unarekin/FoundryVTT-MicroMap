import { log, logError } from "./logging";
import { MiniatureMapCanvasGroup } from './MiniatureMapCanvasGroup';
import { registerKeyBindings } from "./keybindings";
import { NoteConfigV2Mixin, NoteConfigV1Mixin, SceneConfigV1Mixin, SceneConfigV2Mixin } from "applications";
import { getGame, getMiniMap, getEffectiveFlagsForScene } from "utils";
import { DeepPartial } from "types";

Hooks.once("init", () => {
  registerKeyBindings();
});

function applyMixin(collection: Record<string, any>, mixin: any) {
  const entries = Object.entries(collection);
  for (const [key, { cls }] of entries) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const mixed = mixin(cls);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    collection[key].cls = mixed;
  }
}

Hooks.once("ready", () => {
  getGame()
    .then(game => {

      const noteConfigMixin = game.release.isNewer("13") ? NoteConfigV2Mixin : NoteConfigV1Mixin;
      applyMixin(CONFIG.Note.sheetClasses.base, noteConfigMixin);

      const sceneConfigMixin = game.release.isNewer("13") ? SceneConfigV2Mixin : SceneConfigV1Mixin;
      applyMixin(CONFIG.Scene.sheetClasses.base, sceneConfigMixin);

    }).catch(logError);

})

Hooks.once("canvasReady", () => {
  try {
    if (!canvas?.stage) return;
    if (canvas.stage.getChildByName("MiniatureMapCanvasGroup")) return;

    // Initialize Pixi DevTools if we are a debug build
    if (__DEV__) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (window as any).__PIXI_DEVTOOLS__ = {
        stage: canvas.stage,
        renderer: canvas?.app?.renderer
      }
      log("Pixi DevTools enabled.");
    }

    // TODO: Stage Manager integration
    const canvasGroup = new MiniatureMapCanvasGroup();
    canvas.stage.addChild(canvasGroup);

    const menuContainer = document.createElement("section");
    menuContainer.id = "mm-menu-container";
    menuContainer.style.position = "absolute";
    menuContainer.style.pointerEvents = "none";
    menuContainer.style.top = "0";
    menuContainer.style.left = "0";
    menuContainer.style.width = "100%";
    menuContainer.style.height = "100%";
    document.body.appendChild(menuContainer);

    const menuElem = document.createElement("section");
    menuElem.style.position = "absolute";
    menuElem.style.pointerEvents = "auto";
    menuElem.dataset.role = "minimap-menu";
    menuContainer.appendChild(menuElem);

    log("Canvas group initialized.");

    getGame()
      .then(game => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (game as any).MicroMap = {
          map: canvasGroup.miniMap
        }
      })
      .catch(logError);
  } catch (err) {
    logError(err as Error);
  }
});

function updateMap(scene: Scene) {
  const map = getMiniMap();
  if (!map) return;
  const settings = getEffectiveFlagsForScene(scene);

  map.bgColor = settings.bgColor;
  map.width = settings.width;
  map.height = settings.height;
  map.padding.x = settings.padX;
  map.padding.y = settings.padY;
  map.mode = settings.mode;
  map.image = settings.image ?? "";
  map.scene = settings.scene ?? "";
  map.shape = settings.shape;
  map.mask = settings.mask;
  map.visible = settings.enable && !!(game.settings?.get(__MODULE_ID__, "show"));
  map.position = settings.position;
  map.showWeather = settings.showWeather;
  map.showDarkness = settings.showDarkness;
  map.showDrawings = settings.showDrawings;
  map.showNotes = settings.showNotes;
  map.setOverlayFromSettings(settings.overlaySettings);
  map.loadCanvas();
}

Hooks.on("updateScene", (scene: Scene, delta: DeepPartial<Scene>) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (scene.active && typeof (delta?.flags as any)?.["micro-map"] !== "undefined") updateMap(scene);
  if (delta.active) updateMap(scene);
});

