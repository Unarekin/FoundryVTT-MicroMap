import { getSceneFlags, defaultSceneFlags, localize } from "utils";
import { sceneConfigSelectOptions } from "./functions";
import { MapMode, MapShape, OverlaySettings, SceneFlags } from "types";
import { logError } from "logging";
import { OverlaySettingsApplication } from "./OverlaySettingsApplication";

export function SceneConfigV1Mixin(Base: typeof SceneConfig) {
  return class SceneConfigV1 extends Base {

    #overlaySettings: OverlaySettings | undefined = undefined;
    #overrideFlags: SceneFlags | undefined = undefined;

    async _renderInner(data: ReturnType<this["getData"]>): Promise<JQuery<HTMLElement>> {
      const html = await super._renderInner(data);

      // Append tab
      html
        .find(`nav.tabs[data-group="main"]`)
        .append(
          $("<a>")
            .addClass("item")
            .attr("data-tab", "micromap")
            .append(`<i class="fa-solid fa-fw fa-map"></i> ${localize("SCENE.TABS.SHEET.micromap")}`)
        );

      const flags = this.#overrideFlags ?? getSceneFlags(this.document);

      const content = await renderTemplate(`modules/${__MODULE_ID__}/templates/SceneConfig.hbs`, {
        microMap: {
          isV1: true,
          flags,
          scene: this.document,
          idPrefix: this.document.uuid.replaceAll(".", "-"),
          ...sceneConfigSelectOptions()
        }
      });

      html.find(`.sheet-footer`)
        .before(
          $(`<div>`)
            .addClass("tab")
            .attr("data-tab", "micromap")
            .append(content)
        )

      const modeSelect = html[0].querySelector(`[data-role="mode-select"]`);
      if (modeSelect instanceof HTMLSelectElement)
        modeSelect.addEventListener("change", () => { this.setSelectedMode(html[0], modeSelect.value as MapMode); });
      this.setSelectedMode(html[0], flags.mode);

      const shapeSelect = html[0].querySelector(`[data-role="shape-select"]`);
      if (shapeSelect instanceof HTMLSelectElement)
        shapeSelect.addEventListener("change", () => { this.setSelectedShape(html[0], shapeSelect.value as MapShape); });
      this.setSelectedShape(html[0], flags.shape);

      const overlayButton = html[0].querySelector(`[data-action="overlaySettings"]`);
      if (overlayButton instanceof HTMLButtonElement)
        overlayButton.addEventListener("click", () => { this.configureOverlay().catch(logError); });

      const resetButton = html[0].querySelector(`[data-action="resetOverrides"]`);
      if (resetButton instanceof HTMLButtonElement)
        resetButton.addEventListener("click", () => { this.resetOverrides(); });
      return html;
    }

    private resetOverrides() {
      this.#overrideFlags = foundry.utils.deepClone(defaultSceneFlags());
      this.render();
    }

    private async configureOverlay() {
      const flags = getSceneFlags(this.document);
      const settings = await OverlaySettingsApplication.configure(this.#overlaySettings ?? flags.overlaySettings);
      if (!settings) return;

      this.#overlaySettings = settings;
    }

    private setSelectedMode(html: HTMLElement, val: MapMode) {
      const elements = html.querySelectorAll(`[data-tab="micromap"] [data-mode]`);
      for (const elem of elements) {
        if (elem instanceof HTMLElement) elem.style.display = elem.dataset.mode === val ? "flex" : "none";
      }
    }

    private setSelectedShape(html: HTMLElement, val: MapShape) {
      const elements = html.querySelectorAll(`[data-tab="micromap"] [data-shape]`);
      for (const elem of elements) {
        if (elem instanceof HTMLElement) elem.style.display = elem.dataset.shape === val ? "flex" : "none";
      }
    }

    async _onSubmit(event: Event, options?: FormApplication.OnSubmitOptions): Promise<any> {
      const form = this.element.find("form")[0];
      if (form instanceof HTMLFormElement) {
        const data = (foundry.utils.expandObject((new FormDataExtended(form)).object) as Record<string, unknown>).microMap as SceneFlags;
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
          })
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.document.update(update as any).catch(logError);

      }

      return super._onSubmit(event, options);
    }
  }


}