import { log, logError } from "./logging";
import { MiniatureMapCanvasGroup } from './MiniatureMapCanvasGroup';
import { registerKeyBindings } from "./keybindings";
import { NoteConfigV2Mixin, NoteConfigV1Mixin, SceneConfigV1Mixin, SceneConfigV2Mixin } from "applications";
import { getGame, getMiniMap, getEffectiveFlagsForScene } from "utils";
import { DeepPartial } from "types";

Hooks.once("init", () => {
  registerKeyBindings();
});

Hooks.once("ready", () => {
  getGame()
    .then(game => {

      const noteConfigMixin = game.release.isNewer("13") ? NoteConfigV2Mixin : NoteConfigV1Mixin;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment
      CONFIG.Note.sheetClasses.base["core.NoteConfig"].cls = noteConfigMixin(CONFIG.Note.sheetClasses.base["core.NoteConfig"].cls as any) as any;

      const sceneConfigMixin = game.release.isNewer("13") ? SceneConfigV2Mixin : SceneConfigV1Mixin;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment
      CONFIG.Scene.sheetClasses.base["core.SceneConfig"].cls = sceneConfigMixin(CONFIG.Scene.sheetClasses.base["core.SceneConfig"].cls as any) as any;

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
  map.visible = settings.show;
  map.position = settings.position;
  map.showWeather = settings.showWeather;
  map.showDarkness = settings.showDarkness;
  map.showDrawings = settings.showDrawings;
  map.setOverlayFromSettings(settings.overlaySettings);
}

Hooks.on("updateScene", (scene: Scene, delta: DeepPartial<Scene>) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (scene.active && typeof (delta?.flags as any)?.["micro-map"] !== "undefined") updateMap(scene);
  if (delta.active) updateMap(scene);
});

