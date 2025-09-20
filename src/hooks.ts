import { log, logError } from "./logging";
import { MiniatureMapCanvasGroup } from './MiniatureMapCanvasGroup';
import { registerKeyBindings } from "./keybindings";
import { NoteConfigV2Mixin, NoteConfigV1Mixin } from "applications";
import { getGame } from "utils";

Hooks.once("init", () => {
  registerKeyBindings();
});

Hooks.once("ready", () => {
  getGame()
    .then(game => {
      const oldClass = CONFIG.Note.sheetClasses.base["core.NoteConfig"].cls;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const mixed = game.release.isNewer("13") ? NoteConfigV2Mixin(oldClass as any) : NoteConfigV1Mixin(oldClass as any);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      if (mixed) CONFIG.Note.sheetClasses.base["core.NoteConfig"].cls = mixed as any;
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

