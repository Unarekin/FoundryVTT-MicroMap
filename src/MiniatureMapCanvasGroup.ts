export class MiniatureMapCanvasGroup extends PIXI.Container {
  protected setInverseMatrix() {
    if (canvas?.app?.stage)
      this.transform.setFromMatrix(canvas.app.stage.localTransform.clone().invert());
  }

  constructor() {
    super();
    this.interactiveChildren = false;
    this.interactive = false;
    this.eventMode = "none";

    this.name = "MiniatureMapCanvasGroup";

    if (canvas?.app) {
      canvas.app.renderer.addListener("prerender", () => {
        this.setInverseMatrix();
      })
    }
  }
}