import { log, logError } from "logging";
import { SceneRenderer } from "SceneRenderer";

export class WeatherHandler {


  protected clearWeather() {
    const children = [
      ...this.sceneRenderer.weatherContainer.children
    ];
    for (const child of children) child.destroy();
  }

  public initializeWeather() {
    log("Initializing weather");
    this.clearWeather();
    if (!this.scene?.weather) return;

    const weatherEffect = CONFIG.weatherEffects[this.scene.weather]

    const { effects } = weatherEffect;
    let zIndex = 0;

    // TODO: Occlusion filter
    // const useOcclusionFilter = weatherEffect.filter?.enabled !== false;
    // if (useOcclusionFilter) {

    // }

    for (const effect of effects) {
      // Check performance level
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const requiredPerformanceLevel = Number.isNumeric((effect as any).performanceLevel) ? (effect as any).performanceLevel as number : 0;
      if ((canvas?.performance?.mode ?? 0) < requiredPerformanceLevel) continue;


      let ec: any;
      try {

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        ec = new (effect.effectClass as any)(effect.config, (effect as any).shaderClass);

      } catch (err) {
        logError(err as Error);
        continue;
      }



      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      ec.zIndex = (effect as any).zIndex ?? zIndex++;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      ec.blendMode = (effect as any).blendMode ?? PIXI.BLEND_MODES.NORMAL;

      // TODO: Effect-level occlusion
      // if ((effect as any).shaderClass && !useOcclusionFilter) {

      // }

      this.sceneRenderer.weatherContainer.addChild(ec);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ec.x = 0;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ec.y = 0;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ec.width = this.scene.width;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ec.height = this.scene.height;


      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      ec.play();
    }

  }

  constructor(private sceneRenderer: SceneRenderer, public scene?: Scene) {
    this.initializeWeather();
  }
}