import { log, logError } from "./logging";
import { MiniatureMapCanvasGroup } from './MiniatureMapCanvasGroup';

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

