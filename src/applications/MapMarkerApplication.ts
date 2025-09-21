import { DeepPartial, MapMarkerConfig } from "types";
import { MapMarkerRenderContext } from "./types";

// const MarkerColors = [
//   "#03a8a0",
//   "#039c4b",
//   "#66d313",
//   "#fedf17",
//   "#ff0984",
//   "#21409a",
//   "#04adff",
//   "#e48873",
//   "#f16623",
//   "#f44546"
// ]

export class MapMarkerApplication extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  #promise: Promise<MapMarkerConfig | undefined> | undefined = undefined;
  #resolve: ((data?: MapMarkerConfig) => void) | undefined = undefined;
  // eslint-disable-next-line no-unused-private-class-members
  #reject: ((err: Error) => void) | undefined = undefined;
  #marker: MapMarkerConfig;

  public static DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration> = {
    window: {
      title: "MINIMAP.MARKERS.CREATE",
      icon: "fa-solid fa-location-dot",
      contentClasses: ["standard-form"]
    },
    position: {
      width: 600
    },
    tag: "form",
    form: {
      closeOnSubmit: true,
      submitOnChange: false,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      handler: MapMarkerApplication.OnSubmit
    },
    actions: {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      cancel: MapMarkerApplication.Cancel
    }
  }

  public static PARTS: Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    main: {
      template: `modules/${__MODULE_ID__}/templates/MapMarker.hbs`
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  }

  public static OnSubmit(this: MapMarkerApplication, event: SubmitEvent | Event, form: HTMLFormElement, formData: foundry.applications.ux.FormDataExtended) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const data = foundry.utils.expandObject((formData as any).object);
    if (this.#resolve) {
      this.#resolve(data as MapMarkerConfig);
      this.#promise = this.#resolve = this.#reject = undefined;
    }
  }

  public static async Cancel(this: MapMarkerApplication) {
    await this.close();
  }

  async _prepareContext(options: foundry.applications.api.ApplicationV2.RenderOptions) {
    const context = await super._prepareContext(options) as MapMarkerRenderContext;
    context.marker = this.#marker;

    context.idPrefix = context.marker.id;
    context.fontSelect = Object.fromEntries(FontConfig.getAvailableFonts().sort((a, b) => a.localeCompare(b)).map(font => [font, font]));

    context.labelAlignSelect = {
      top: "MINIMAP.MARKERS.LABELALIGN.TOP",
      bottom: "MINIMAP.MARKERS.LABELALIGN.BOTTOM"
    }

    context.buttons = [
      { type: "button", icon: "fa-solid fa-times", label: "Cancel", action: "cancel" },
      { type: "submit", icon: "fas fa-save", label: "SETTINGS.Save" }
    ]

    return context;
  }

  protected async _onRender(context: MapMarkerRenderContext, options: foundry.applications.api.ApplicationV2.RenderOptions): Promise<void> {
    await super._onRender(context, options);

    // Set up font drop-down
    const fontSelectors = Array.from(this.element.querySelectorAll(`[data-font-select]`)).filter(elem => elem instanceof HTMLSelectElement);
    for (const select of fontSelectors) {
      for (const option of select.options) {
        option.style.fontFamily = option.value;
      }
      select.style.fontFamily = select.value;
      select.addEventListener("change", () => { select.style.fontFamily = select.value; });
    }
  }

  protected _onClose(options: foundry.applications.api.ApplicationV2.RenderOptions): void {
    if (this.#promise) {
      if (this.#resolve) this.#resolve();
      this.#promise = undefined;
      this.#resolve = undefined;
      this.#reject = undefined;
    }
    return super._onClose(options);
  }

  public static create(marker?: DeepPartial<MapMarkerConfig>): Promise<MapMarkerConfig | undefined> {
    const app = new MapMarkerApplication(marker);
    return app.edit();
  }

  public static edit(marker: MapMarkerConfig): Promise<MapMarkerConfig | undefined> {
    const app = new MapMarkerApplication(marker);
    return app.edit();
  }

  public async edit(): Promise<MapMarkerConfig | undefined> {
    if (!this.#promise) {
      this.#promise = new Promise<MapMarkerConfig | undefined>((resolve, reject) => {
        this.#resolve = resolve;
        this.#reject = reject;
      });
    }
    await this.render(true);
    return this.#promise;
  }

  constructor(marker?: DeepPartial<MapMarkerConfig>, options?: foundry.applications.api.ApplicationV2.Configuration) {
    super(options);

    this.#marker = {
      id: foundry.utils.randomID(),
      label: "",
      showLabel: false,
      tint: "#FFFFFF", //MarkerColors[Math.floor(Math.random() * MarkerColors.length)],
      icon: `modules/${__MODULE_ID__}/assets/map markers/marker.svg`,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      dropShadow: true,
      labelAlign: "bottom",
      fontFamily: CONFIG.defaultFontFamily,
      fontSize: 32,
      fontColor: "#FFFFFF"
    };
    if (marker) {
      foundry.utils.mergeObject(this.#marker, marker);
    }
  }
}