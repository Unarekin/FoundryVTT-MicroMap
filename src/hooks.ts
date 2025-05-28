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

    log("Canvas group initialized.");
  } catch (err) {
    logError(err as Error);
  }
})