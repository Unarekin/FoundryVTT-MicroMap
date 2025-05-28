import { logError } from "logging";
import { OverlaySettingsRenderContext } from "./types";
import { LocalizedError } from '../errors';
import { getGame } from "utils";

export class OverlaySettingsApplication extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  public static readonly DEFAULT_OPTIONS = {
    window: {
      title: "MINIMAP.SETTINGS.OVERLAY.NAME",
      icon: "fas fa-frame",
      contentClasses: ["standard-form"]
    },
    tag: "form",
    form: {
      closeOnSubmit: true,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      handler: OverlaySettingsApplication.onSubmit
    }
  };

  public static readonly PARTS: Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    body: {
      template: `modules/${__MODULE_ID__}/templates/overlaySettings.hbs`
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  }

  public static onSubmit(this: OverlaySettingsApplication, e: Event | SubmitEvent, elem: HTMLFormElement, formData: FormDataExtended) {
    const data = foundry.utils.expandObject(formData.object) as Record<string, unknown>;

    getGame()
      .then(game => game.settings.set(__MODULE_ID__, "overlaySettings", data))
      .catch((err: Error) => { logError(err); })
  }

  _onChangeForm(config: foundry.applications.api.ApplicationV2.FormConfiguration, event: Event) {
    super._onChangeForm(config, event);

    if (!(this.element instanceof HTMLFormElement)) return;
    const data = foundry.utils.expandObject(new FormDataExtended(this.element).object) as OverlaySettingsRenderContext;

    const { top, bottom, left, right } = data;
    void this.drawPreview(data.file, { top, bottom, left, right });
  }

  protected async drawPreview(file: string, border: { top: number, left: number, bottom: number, right: number }) {
    try {
      if (!canvas?.app?.renderer) return;

      const previewCanvas = this.element.querySelector(`[data-role="preview"]`);
      if (!(previewCanvas instanceof HTMLCanvasElement)) return;

      const bufferCanvas = document.createElement("canvas");
      const ctx = bufferCanvas.getContext("2d");
      if (!ctx) return;

      // If no file, then we go ahead and bail after we've cleared our canvas.
      if (!file) {
        previewCanvas.style.display = "none";
        return;
      } else {
        previewCanvas.style.display = "block";
      }

      const texture = PIXI.Texture.from(file);
      if (!texture) throw new LocalizedError("FILENOTFOUND", { file });

      // Ensure texture has loaded.
      if (!texture.valid)
        await new Promise<void>(resolve => { texture.baseTexture.once("loaded", () => { resolve(); }) });

      const { width, height } = texture;
      const sprite = new PIXI.Sprite(texture);

      const renderTexture = PIXI.RenderTexture.create({ width, height });
      canvas.app.renderer.render(sprite, { renderTexture, skipUpdateTransform: true, clear: false });

      const img = await canvas.app.renderer.extract.image(renderTexture);

      const targetCanvas = document.createElement("canvas");
      targetCanvas.width = previewCanvas.clientWidth;
      targetCanvas.height = previewCanvas.clientHeight;

      // Top row
      ctx.drawImage(img, 0, 0, border.left, border.top, 0, 0, border.left, border.top);
      ctx.drawImage(img, border.left, 0, width - border.right - border.left, border.top, border.left, 0, targetCanvas.width - border.left - border.right, border.top);
      ctx.drawImage(img, width - border.right, 0, border.right, border.top, targetCanvas.width - border.right, 0, border.right, border.top);

      // Middle row
      ctx.drawImage(img, 0, border.top, border.left, height - border.top - border.bottom, 0, border.top, border.left, targetCanvas.height - border.bottom - border.top);
      ctx.drawImage(img, border.left, border.top, width - border.left - border.right, height - border.top - border.bottom, border.left, border.top, targetCanvas.width - border.left - border.right, targetCanvas.height - border.top - border.bottom);
      ctx.drawImage(img, width - border.right, border.top, border.right, height - border.top - border.bottom, targetCanvas.width - border.right, border.top, border.right, targetCanvas.height - border.top - border.bottom);

      // Bottom row
      ctx.drawImage(img, 0, height - border.bottom, border.right, border.bottom, 0, targetCanvas.height - border.bottom, border.left, border.bottom);
      ctx.drawImage(img, border.left, height - border.bottom, width - border.right - border.left, border.bottom, border.left, targetCanvas.height - border.bottom, targetCanvas.width - border.right - border.left, border.bottom);
      ctx.drawImage(img, width - border.right, height - border.bottom, border.right, border.bottom, targetCanvas.width - border.right, targetCanvas.height - border.bottom, border.right, border.bottom);

      // Add guidelines
      ctx.beginPath();
      ctx.moveTo(border.left, 0);
      ctx.lineTo(border.left, targetCanvas.height);

      ctx.moveTo(targetCanvas.width - border.right, 0);
      ctx.lineTo(targetCanvas.width - border.right, targetCanvas.height);

      ctx.moveTo(0, border.top);
      ctx.lineTo(targetCanvas.width, border.top);

      ctx.moveTo(0, targetCanvas.height - border.bottom);
      ctx.lineTo(targetCanvas.width, targetCanvas.height - border.bottom);

      ctx.strokeStyle = "red";
      ctx.stroke();

      const previewCtx = previewCanvas.getContext("2d");

      if (!previewCtx) return;
      previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      previewCanvas.width = bufferCanvas.width;
      previewCanvas.height = bufferCanvas.height;

      previewCtx.drawImage(bufferCanvas, 0, 0);


      renderTexture.destroy();
      sprite.destroy();
    } catch (err) {
      logError(err as Error);
    }
  }

  protected async _prepareContext(options: foundry.applications.api.ApplicationV2.RenderOptions): Promise<OverlaySettingsRenderContext> {
    const game = await getGame();

    const context: OverlaySettingsRenderContext = {
      file: "",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      ...(await super._prepareContext(options)),
      ...(game.settings.get(__MODULE_ID__, "overlaySettings") as object),
      buttons: [
        { type: "submit", icon: "fas fa-save", label: "SETTINGS.Save" }
      ]
    }


    return context;
  }

  protected async _onRender(context: OverlaySettingsRenderContext, options: foundry.applications.api.ApplicationV2.RenderOptions): Promise<void> {
    await super._onRender(context, options);
    const { top, bottom, left, right } = context;
    await this.drawPreview(context.file, { top, bottom, left, right });
  }
}