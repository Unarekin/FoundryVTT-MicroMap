import { MiniMap } from './MiniMap';
export class MiniatureMapCanvasGroup extends PIXI.Container {
  protected setInverseMatrix() {
    if (canvas?.app?.stage)
      this.transform.setFromMatrix(canvas.app.stage.localTransform.clone().invert());
  }

  public readonly miniMap: MiniMap;

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

    this.miniMap = new MiniMap();
    this.addChild(this.miniMap.container);
    this.interactiveChildren = true;
    this.interactive = true;
  }
}