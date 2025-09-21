import { getSceneFlags, defaultSceneFlags } from "utils";
import { sceneConfigSelectOptions } from "./functions";
import { MapMode, MapShape, OverlaySettings, SceneFlags } from "types";
import { OverlaySettingsApplication } from "./OverlaySettingsApplication";
import { logError } from "logging";

export function SceneConfigV2Mixin(Base: typeof foundry.applications.sheets.SceneConfig) {
  class SceneConfigV2 extends Base {
    #overlaySettings: OverlaySettings | undefined = undefined;

    #overrideFlags: SceneFlags | undefined = undefined;

    public static DEFAULT_OPTIONS = {
      actions: {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        overlaySettings: SceneConfigV2.ConfigureOverlay,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        resetOverrides: SceneConfigV2.ResetOverrides
      }
    }

    static async ResetOverrides(this: SceneConfigV2) {
      try {
        const flags = defaultSceneFlags();
        this.#overrideFlags = foundry.utils.deepClone(flags);
        await this.render();
      } catch (err) {
        logError(err as Error);
      }
    }

    static async ConfigureOverlay(this: SceneConfigV2) {
      const flags = getSceneFlags(this.document);
      const settings = await OverlaySettingsApplication.configure(this.#overlaySettings ?? flags.overlaySettings);
      if (!settings) return;
      this.#overlaySettings = settings;
    }

    async _onSubmitForm(formConfig: foundry.applications.api.ApplicationV2.FormConfiguration, event: Event | SubmitEvent): Promise<void> {
      if (this.form instanceof HTMLFormElement) {

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        const data = (foundry.utils.expandObject((new foundry.applications.ux.FormDataExtended(this.form) as any).object) as Record<string, unknown>).microMap as SceneFlags;
        const update = {
          flags: {
            [__MODULE_ID__]: data
          }
        };
        if (this.#overlaySettings) {
          foundry.utils.mergeObject(update, {
            flags: {
              [__MODULE_ID__]: {
                overlaySettings: this.#overlaySettings
              }
            }
          });
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.document.update(update as any).catch(logError);
      }

      await super._onSubmitForm(formConfig, event);
    }

    async _prepareContext(options: foundry.applications.api.DocumentSheetV2.RenderOptions) {
      const context = await super._prepareContext(options);

      const flags = this.#overrideFlags ?? getSceneFlags(this.document);

      (context as unknown as Record<string, unknown>).microMap = {
        isV1: false,
        flags,
        scene: this.document,
        idPrefix: this.document.uuid.replaceAll(".", "-"),
        ...sceneConfigSelectOptions()
      }

      return context;
    }

    async _onRender(context: foundry.applications.sheets.SceneConfig.RenderContext, options: foundry.applications.api.ApplicationV2.RenderOptions) {
      await super._onRender(context, options);

      const flags = getSceneFlags(this.document);
      this.setSelectedShape(flags.shape);
      this.setSelectedMode(flags.mode);

      const modeSelect = this.element.querySelector(`[data-role="mode-select"]`);
      if (modeSelect instanceof HTMLSelectElement)
        modeSelect.addEventListener("change", () => { this.setSelectedMode(modeSelect.value as MapMode); });

      const shapeSelect = this.element.querySelector(`[data-role="shape-select"]`);
      if (shapeSelect instanceof HTMLSelectElement)
        shapeSelect.addEventListener("change", () => { this.setSelectedShape(shapeSelect.value as MapShape); });
    }

    private setSelectedShape(val: MapShape) {
      const elements = this.element.querySelectorAll(`[data-tab="micromap"] [data-shape]`);
      for (const elem of elements) {
        if (elem instanceof HTMLElement) elem.style.display = elem.dataset.shape === val ? "flex" : "none";
      }
    }

    private setSelectedMode(val: MapMode) {
      const elements = this.element.querySelectorAll(`[data-tab="micromap"] [data-mode]`);
      for (const elem of elements) {
        if (elem instanceof HTMLElement) elem.style.display = elem.dataset.mode === val ? "flex" : "none";
      }
    }

  }

  const parts = SceneConfigV2.PARTS;
  const footer = parts.footer;
  delete parts.footer;

  foundry.utils.mergeObject(parts, {
    micromap: {
      template: `modules/${__MODULE_ID__}/templates/SceneConfig.hbs`
    },
    footer
  });

  foundry.utils.mergeObject(SceneConfigV2.PARTS ?? {}, parts);

  SceneConfigV2.TABS.sheet.tabs.push({
    id: "micromap",
    icon: "fa-solid fa-map",
    cssClass: ""
  });

  return SceneConfigV2;
}