import { downloadJSON, getGame, uploadJSON } from "utils";
import { MapMarkerSettingsRenderContext } from "./types";
import { MapMarkerConfig } from "types";
import { logError } from "logging";
import { MapMarkerApplication } from "./MapMarkerApplication";

export class MapMarkerSettingsApplication extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  #markers: MapMarkerConfig[] = [];

  public static readonly DEFAULT_OPTIONS = {
    window: {
      title: "MINIMAP.SETTINGS.MARKERS.NAME",
      icon: "fas fa-location-point",
      contentClasses: ["standard-form", "micromap"]
    },
    position: {
      width: 500
    },
    tag: "form",
    form: {
      closeOnSubmit: true,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      handler: MapMarkerSettingsApplication.Submit
      // handler: OverlaySettingsApplication.onSubmit
    },
    actions: {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      clearMarkers: MapMarkerSettingsApplication.ClearMarkers,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      cancel: MapMarkerSettingsApplication.Cancel,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      editMarker: MapMarkerSettingsApplication.Edit,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      removeMarker: MapMarkerSettingsApplication.Remove,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      exportMarkers: MapMarkerSettingsApplication.Export,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      importMarkers: MapMarkerSettingsApplication.Import
    }
  };

  public static PARTS: Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    main: {
      template: `modules/${__MODULE_ID__}/templates/MapMarkerSettings.hbs`,
      scrollable: ['.scrollable']
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  }

  public static async Cancel(this: MapMarkerSettingsApplication) {
    await this.close();
  }

  public static async Submit(this: MapMarkerSettingsApplication) {
    try {
      const game = await getGame();
      if (!game) return;
      await game.settings.set(__MODULE_ID__, "markers", foundry.utils.deepClone(this.#markers));
    } catch (err) {
      logError(err as Error);
    }
  }

  public static Export(this: MapMarkerSettingsApplication) {
    try {
      const data = foundry.utils.deepClone(this.#markers);
      downloadJSON(data, `Map Markers - ${Date.now()}.json`);
    } catch (err) {
      logError(err as Error);
    }
  }

  public static async Import(this: MapMarkerSettingsApplication) {
    try {
      const markers = await uploadJSON<MapMarkerConfig[]>();
      if (!markers) return;
      this.#markers.splice(1, this.#markers.length, ...markers);
      await this.render();
    } catch (err) {
      logError(err as Error);
    }
  }

  public static async Remove(this: MapMarkerSettingsApplication, e: Event, elem: HTMLElement) {
    try {
      const id = elem.dataset.marker;
      if (!id) return;
      const index = this.#markers.findIndex(item => item.id === id);
      if (index > -1) this.#markers.splice(index, 1);
      await this.render();
    } catch (err) {
      logError(err as Error);
    }
  }

  public static async Edit(this: MapMarkerSettingsApplication, e: Event, elem: HTMLElement) {
    try {
      const id = elem.dataset.marker;
      if (!id) return;

      const marker = this.#markers.find(item => item.id === id);
      if (marker) {
        const config = await MapMarkerApplication.edit(marker);
        if (config) {
          const index = this.#markers.findIndex(item => item.id === id);
          if (index > -1) this.#markers.splice(index, 1, config);
          await this.render();
        }
      }
    } catch (err) {
      logError(err as Error);
    }
  }

  public static async ClearMarkers(this: MapMarkerSettingsApplication) {
    this.#markers.splice(0, this.#markers.length);
    await this.render();
  }

  protected async _prepareContext(options: foundry.applications.api.ApplicationV2.RenderOptions): Promise<MapMarkerSettingsRenderContext> {
    const context = await super._prepareContext(options) as MapMarkerSettingsRenderContext;

    const game = await getGame();

    if (options.isFirstRender)
      this.#markers = foundry.utils.deepClone(game.settings.get(__MODULE_ID__, "markers") ?? []);

    context.markers = foundry.utils.deepClone(this.#markers);

    context.buttons = [
      { type: "button", icon: "fa-solid fa-times", label: "Cancel", action: "cancel" },
      { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" }
    ]

    return context;
  }
}