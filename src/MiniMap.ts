import { DRAG_MODE, MapMarkerConfig, MapMode, MapPosition, MapShape, MapView, OverlaySettings } from './types';
import { coerceScene } from './coercion';
import { logError } from 'logging';
import { getEffectiveFlagsForScene, getGame, localize, nineSliceScale } from 'utils';
import { SceneRenderer } from './SceneRenderer';
import { synchronizeView } from 'sockets';
import { LocalizedError } from 'errors';
import { MapMarkerApplication } from 'applications';
import { confirm } from 'applications/functions';

export class MiniMap {
  public readonly container = new PIXI.Container();
  private readonly markerContainer = new PIXI.Container();

  private _suppressUpdate = false;
  #dragMode: DRAG_MODE = DRAG_MODE.NONE;

  public static readonly DefaultWidth = 300;
  public static readonly DefaultHeight = 200;
  public static readonly MinZoom = .01;
  public static readonly MaxZoom = 5;

  public get showWeather() { return this.sceneRenderer.showWeather; }
  public set showWeather(val) { this.sceneRenderer.showWeather = val; }

  public get showDarkness() { return this.sceneRenderer.showDarkness; }
  public set showDarkness(val) { this.sceneRenderer.showDarkness = val; }

  public get showDrawings() { return this.sceneRenderer.showDrawings; }
  public set showDrawings(val) { this.sceneRenderer.showDrawings = val; }

  public get showNotes() { return this.sceneRenderer.showNotes; }
  public set showNotes(val) { this.sceneRenderer.showNotes = val; }

  public get showGrid() { return this.sceneRenderer.showGrid; }
  public set showGrid(val) { this.sceneRenderer.showGrid = val; }

  public readonly mapMarkers: MapMarkerConfig[] = [];

  private _antiAliasing = true;
  public get antiAliasing() { return this._antiAliasing; }
  public set antiAliasing(val) {
    if (this.antiAliasing !== val) {
      this._antiAliasing = val;
    }

    this.sceneRenderer.antiAliasing = val;
  }

  #bgSprite: PIXI.Sprite;
  #mapContainer = new PIXI.Container();

  protected readonly sceneRenderer: SceneRenderer

  private _mode: MapMode = "image";
  private _scene: Scene | undefined = undefined;
  private _image = `modules/${__MODULE_ID__}/assets/transparent.webp`;
  private _overlay = "";
  private _shape: MapShape = "rectangle";
  private _position: MapPosition = "bottomRight";
  private _width = 300;
  private _height = 200;
  private _mask = "";
  private _bgColor = "#000000";
  private _panX = 0;
  private _panY = 0;
  private _zoom = 1;
  private _allowPan = true;
  private _allowZoom = true;
  private _padding = new PIXI.ObservablePoint(() => { this.update(); }, undefined, 0, 0);

  public lockGMView = false;

  public get allowPan() {
    if (this.lockGMView) return game!.user!.isGM;
    return (game!.user!.can("SETTINGS_MODIFY") ?? false) || this._allowPan
  }
  public set allowPan(val) {
    if (val !== this._allowPan) {
      this._allowPan = val;
    }
  }

  public get allowZoom() {
    if (this.lockGMView) return game!.user!.isGM;
    return (game!.user!.can("SETTINGS_MODIFY") ?? false) || this._allowZoom
  }
  public set allowZoom(val) {
    if (val !== this._allowZoom) {
      this._allowZoom = val;
    }
  }

  public get view(): MapView {
    return {
      x: this.panX,
      y: this.panY,
      zoom: this.zoom
    }
  }
  public set view(view) {
    this.panX = view.x;
    this.panY = view.y;
    this.zoom = view.zoom;
  }

  public get mode() { return this._mode; }
  public set mode(val) {
    if (this._mode !== val) {
      this._mode = val;
      if (val === "scene" && this.scene) this.sceneRenderer.active = true;
      else this.sceneRenderer.active = false;

      this.update();
    }
  }

  public get scene(): Scene | undefined { return this._scene; }
  public set scene(val: unknown) {
    const scene = coerceScene(val);
    if (scene !== this.scene) {
      this._scene = scene;
      this.sceneRenderer.scene = scene;
      if (scene && this.mode === "scene") {
        this.sceneRenderer.active = true;
        this.resetPosition();
      } else {
        this.sceneRenderer.active = false;
      }

      this.update();
    }
  }

  public get image() { return this._image; }
  public set image(val) {
    if (val !== this.image) {
      this._image = val;

      if (val) {
        const texture = PIXI.Texture.from(val);
        if (!texture.valid) {
          texture.baseTexture.once("loaded", () => {
            this.staticSprite.texture = texture;
            this.update();
          })
        } else {
          this.staticSprite.texture = texture;
          this.update();
        }
      } else {
        this.update();
      }
    }
  }

  public get overlay() { return this._overlay; }
  public set overlay(val) {
    if (val !== this.overlay) {
      this._overlay = val;
      this.update();
    }
  }

  public get shape() { return this._shape; }
  public set shape(val) {
    if (val !== this.shape) {
      this._shape = val;
      this.setMask(val);
      this.update();
    }
  }

  public get width() { return this._width; }
  public set width(val) {
    if (val !== this.width) {
      this._width = val;
      this.setMask(this.shape);
      this.update();
    }
  }

  public get height() { return this._height }
  public set height(val) {
    if (val !== this.height) {
      this._height = val;
      this.setMask(this.shape);
      this.update();
    }
  }

  public get position() { return this._position; }
  public set position(val) {
    if (val !== this.position) {
      this._position = val;
      this.update();
    }
  }

  public get visible() { return this.container.visible; }
  public set visible(val) {
    if (val !== this.visible) {
      this.container.visible = val;
      this.update();
    }
  }

  public get mask() { return this._mask; }
  public set mask(val) {
    if (val !== this.mask) {
      this._mask = val;
      if (this.shape === "mask") this.setMask(this.shape);
      this.update();
    }
  }

  public get bgColor() { return this._bgColor; }
  public set bgColor(val) {
    if (this.bgColor !== val) {
      const color = new PIXI.Color(val);
      this._bgColor = color.toHex();
      this.update();
    }
  }

  public get panX() { return this._panX; }
  public set panX(val) {
    if (val !== this.panX) {
      this._panX = val;
      void this.updateView();
      this.update();
    }
  }

  public get panY() { return this._panY; }
  public set panY(val) {
    if (val !== this.panY) {
      this._panY = val;
      void this.updateView();
      this.update();
    }
  }

  public get zoom() { return this._zoom; }
  public set zoom(val) {
    if (val !== this.zoom) {
      this._zoom = val;
      void this.updateView();
      this.update();
    }
  }

  public get padding(): PIXI.ObservablePoint { return this._padding; }
  public set padding(val: { x: number, y: number } | number) {
    if (typeof val === "number") this.padding.set(val, val)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    else if (val instanceof PIXI.ObservablePoint) this._padding = val;
    else this.padding.set(val.x ?? 0, val.y ?? 0);
  }

  protected get screenTop() {
    if (game?.release?.isNewer("13")) {
      const uiTop = document.getElementById("scene-navigation-inactive");
      if (!(uiTop instanceof HTMLElement)) return 0;
      return uiTop.getBoundingClientRect().y;
    } else {
      const uiTop = document.getElementById("ui-top");
      if (!(uiTop instanceof HTMLElement)) return 0;
      return uiTop.getBoundingClientRect().bottom;
    }
  }

  public get screenLeft() {
    const uiLeft = document.getElementById(game?.release?.isNewer("13") ? "ui-left-column-1" : "ui-left");
    if (!(uiLeft instanceof HTMLElement)) return 0;
    return uiLeft.getBoundingClientRect().right;
  }

  // protected get screenRight() { return window.innerWidth - this.width; }
  protected get screenRight() {

    const uiRight = document.getElementById(game?.release?.isNewer("13") ? "chat-message" : "ui-right");
    if (!(uiRight instanceof HTMLElement)) return window.innerWidth - this.width;
    return uiRight.getBoundingClientRect().x - this.width;
  }
  protected get screenBottom() {
    const uiBottom = document.getElementById(game?.release?.isNewer("13") ? "hotbar" : "ui-bottom");
    if (!(uiBottom instanceof HTMLElement)) return window.innerHeight - this.height;
    return uiBottom.getBoundingClientRect().y - this.height;
  }

  private resetPosition() {
    this.#mapContainer.scale.set(1, 1);
    this.#mapContainer.x = -this.#mapContainer.width / 2;
    this.#mapContainer.y = -this.#mapContainer.height / 2;
  }

  /**
   * Updates the visuals of our minimap in accordance with its settings.
   */
  public update() {
    if (this._suppressUpdate) return;
    this.staticSprite.visible = this.mode === "image" && !!this.image;
    this.sceneSprite.visible = this.mode === "scene" && !!this.scene;

    // this.staticSprite.width = this.width;
    // this.staticSprite.height = this.height;

    this.overlayPlane.width = this.width;
    this.overlayPlane.height = this.height;

    // this.sceneSprite.width = this.width;
    // this.sceneSprite.height = this.height;

    this.#bgSprite.tint = this.bgColor;
    this.#bgSprite.width = this.width;
    this.#bgSprite.height = this.height;

    // Set scale
    this.#mapContainer.scale.x = this.#mapContainer.scale.y = this.zoom;

    // Set pan
    this.#mapContainer.x = this.panX;
    this.#mapContainer.y = this.panY;

    if (this.container?.parent) {
      switch (this.position) {
        case "bottomLeft":
          this.container.x = this.screenLeft + this.padding.x;
          this.container.y = this.screenBottom - this.padding.y;
          break;
        case "bottomRight":
          this.container.x = this.screenRight - this.padding.x;
          this.container.y = this.screenBottom - this.padding.y;
          break;
        case "topLeft":
          this.container.x = this.screenLeft + this.padding.x;
          this.container.y = this.screenTop + this.padding.y;
          break;
        case "topRight":
          this.container.x = this.screenRight - this.padding.x;
          this.container.y = this.screenTop + this.padding.y;
          break;
      }
    }
  }

  public fitMapView() {
    this.panX = 0;
    this.panY = 0;

    const width = this.baseWidth;
    const height = this.baseHeight;

    const maxWidth = this.width;
    const maxHeight = this.height;


    if (width > height) {
      if (width > maxWidth) {
        this.zoom = maxWidth / width;
      }
    } else {
      if (height > maxHeight) {
        this.zoom = maxHeight / height;
      }
    }

    void this.updateViewIfLocked();
  }

  protected staticSprite: PIXI.Sprite;
  protected sceneSprite: PIXI.Sprite;
  protected overlayPlane: PIXI.NineSlicePlane;

  private _contextMenu: foundry.applications.ux.ContextMenu<false> | undefined = undefined;

  private async updateView() {
    const game = await getGame();
    await game.settings.set(__MODULE_ID__, "view", {
      x: this.panX,
      y: this.panY,
      zoom: this.zoom
    });
  }

  private removeSpriteFilters(sprite: PIXI.DisplayObject, filterType: typeof PIXI.Filter) {
    if (!sprite.filters?.length) return;
    const filters = sprite.filters.filter(filter => filter instanceof filterType);
    if (!filters?.length) return;

    for (const filter of filters) {
      const index = sprite.filters.indexOf(filter);
      if (index > -1) sprite.filters.splice(index, 1);
      filter.destroy();
    }
  }

  // #region Map Markers

  private mapMarkerUnderMouse: { config: MapMarkerConfig, sprite: PIXI.DisplayObject } | undefined = undefined;

  protected mapMarkerEnter(e: PIXI.FederatedPointerEvent, marker: MapMarkerConfig, sprite: PIXI.DisplayObject) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.removeSpriteFilters(sprite, (PIXI.filters as any).OutlineFilter as typeof PIXI.Filter);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const outline = new (PIXI.filters as any).OutlineFilter() as PIXI.Filter;
    if (Array.isArray(sprite.filters)) sprite.filters.push(outline);
    else sprite.filters = [outline];
    this.mapMarkerUnderMouse = {
      config: marker,
      sprite
    };

    const label = sprite.children?.find(child => child instanceof PreciseText);
    if (label) {
      label.style.fontSize = marker.fontSize * (1 / this.#mapContainer.scale.x);
      if (!marker.showLabel) label.renderable = true;
    }
  }
  protected mapMarkerLeave(e: PIXI.FederatedPointerEvent, marker: MapMarkerConfig, sprite: PIXI.DisplayObject) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.removeSpriteFilters(sprite, (PIXI.filters as any).OutlineFilter as typeof PIXI.Filter);
    this.mapMarkerUnderMouse = undefined;

    const label = sprite.children?.find(child => child instanceof PreciseText);
    if (label) {
      label.style.fontSize = marker.fontSize ?? 32;
      if (!marker.showLabel) label.renderable = false;
    }
  }






  #draggingMarker = "";


  protected mapMarkerMouseDown(e: PIXI.FederatedPointerEvent, marker: MapMarkerConfig, sprite: PIXI.DisplayObject) {
    if (game?.user?.isGM && e.button === 0) {
      e.stopPropagation();
      this.mapMarkerDragStart(marker, sprite);
    }
  }


  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected mapMarkerDragStart(marker: MapMarkerConfig, sprite: PIXI.DisplayObject) {
    this.#draggingMarker = marker.id;
    this.#dragMode = DRAG_MODE.MARKER;
  }

  protected mapMarkerDrag(e: PIXI.FederatedPointerEvent) {
    if (game?.user?.isGM && this.#draggingMarker) {
      const marker = this.mapMarkers.find(item => item.id === this.#draggingMarker);
      if (marker) {
        const global = new PIXI.Point(e.globalX, e.globalY);
        const local = this.markerContainer.toLocal(global);
        marker.x = Math.round(local.x)
        marker.y = Math.round(local.y);
        this.setMapMarkers(foundry.utils.deepClone(this.mapMarkers));
      }
    }
  }



  protected mapMarkerDrop(e: PIXI.FederatedPointerEvent) {
    this.#draggingMarker = "";
    this.#dragMode = DRAG_MODE.NONE;

    e.stopPropagation();
    // e.preventDefault();

    getGame()
      .then(game => game.settings.set(__MODULE_ID__, "markers", foundry.utils.deepClone(this.mapMarkers)))
      .catch(logError)
  }

  public refreshMapMarkers() {
    getGame()
      .then(game => {
        const markers = game.settings.get(__MODULE_ID__, "markers");
        this.setMapMarkers(markers);
      })
      .catch(logError);
  }

  public async removeAllMapMarkers() {
    try {
      if (!this.mapMarkers?.length) return;
      const confirmed = await confirm(
        localize("MINIMAP.MARKERS.CLEAR.TITLE"),
        localize("MINIMAP.MARKERS.CLEAR.MESSAGE").replaceAll("\n", "<br>\n")
      );
      if (!confirmed) return;
      this.setMapMarkers([]);
      const game = await getGame()
      await game.settings.set(__MODULE_ID__, "markers", foundry.utils.deepClone(this.mapMarkers));
    } catch (err) {
      logError(err as Error);
    }
  }

  public async editMapMarker(marker: MapMarkerConfig) {
    try {
      const config = await MapMarkerApplication.edit(foundry.utils.deepClone(marker));
      if (!config) return;
      const index = this.mapMarkers.findIndex(item => item.id === marker.id);
      if (index > -1) this.mapMarkers.splice(index, 1, config);
      this.setMapMarkers(foundry.utils.deepClone(this.mapMarkers));
      const game = await getGame();
      if (!game) return;
      await game.settings.set(__MODULE_ID__, "markers", foundry.utils.deepClone(this.mapMarkers));
      // this.addMapMarker(config);
    } catch (err) {
      logError(err as Error);
    }
  }

  public async removeMapMarker(marker: MapMarkerConfig) {
    try {
      const confirmed = await confirm(
        localize("MINIMAP.MARKERS.REMOVE.TITLE"),
        localize("MINIMAP.MARKERS.REMOVE.MESSAGE").replaceAll("\n", "<br>\n")
      );
      if (!confirmed) return;

      const index = this.mapMarkers.findIndex(item => item.id === marker.id);
      if (index > -1) {
        this.mapMarkers.splice(index, 1);
        this.setMapMarkers(foundry.utils.deepClone(this.mapMarkers));
        const game = await getGame()
        await game.settings.set(__MODULE_ID__, "markers", foundry.utils.deepClone(this.mapMarkers));
      }
    } catch (err) {
      logError(err as Error);
    }
  }

  public addMapMarker(marker: MapMarkerConfig) {
    this.mapMarkers.push(marker);

    const container = new PIXI.Container();
    const sprite = PIXI.Sprite.from(marker.icon);

    sprite.tint = marker.tint;
    this.markerContainer.addChild(container);

    sprite.width = marker.width ?? 100;
    sprite.height = marker.height ?? 100;

    sprite.name = `Map Marker ${marker.id}`;
    // sprite.texture.baseTexture.setStyle(0, 0);
    sprite.interactive = true;

    container.addChild(sprite);
    container.x = marker.x - (container.width / 2);
    container.y = marker.y - (container.height);


    if (marker.dropShadow) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const shadow = new (PIXI.filters as any).DropShadowFilter() as PIXI.Filter;
      if (Array.isArray(sprite.filters)) sprite.filters.push(shadow);
      else sprite.filters = [shadow];
    }

    const text = new PreciseText(marker.label ?? "");
    const textStyle = PreciseText.getTextStyle({
      fontFamily: marker.fontFamily ?? CONFIG.defaultFontFamily,
      fontSize: marker.fontSize ?? 32,
      fill: marker.fontColor ?? "#FFFFFF",
      strokeThickness: 2,
      dropShadowBlur: marker.dropShadow ? 2 : 0,
      align: "center",
      wordWrap: true,
      wordWrapWidth: sprite.width,
      padding: 8
    });
    // // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    // text.filters = [new (PIXI.filters as any).OutlineFilter() as PIXI.Filter];
    text.style = textStyle;
    text.anchor.x = 0.5;

    container.addChild(text);

    text.x = sprite.width / 2;

    switch (marker.labelAlign) {
      case "top":
        text.y = 0;
        text.anchor.y = 1;
        break;
      case "bottom":
        text.y = sprite.height;
        text.anchor.y = 0;
        break;
    }

    text.renderable = !!marker.label && marker.showLabel;

    sprite.addEventListener("pointerenter", e => { this.mapMarkerEnter(e, marker, container); });
    sprite.addEventListener("pointerleave", e => { this.mapMarkerLeave(e, marker, container); });
    sprite.addEventListener("pointerdown", e => { this.mapMarkerMouseDown(e, marker, container); });
    // sprite.addEventListener("pointerup", e => { this.mapMarkerMouseUp(e, marker, container); });
  }

  protected async createMapMarker(x: number, y: number) {
    const marker = await MapMarkerApplication.create({ x, y });
    if (!marker) return;
    // this.addMapMarker(foundry.utils.deepClone(marker));

    getGame()
      .then(game => {
        const markers = game.settings.get(__MODULE_ID__, "markers");
        return game.settings.set(__MODULE_ID__, "markers", [...foundry.utils.deepClone(markers), foundry.utils.deepClone(marker)])
      })
      .catch(logError);
  }

  // #endregion

  // #region Map Pan

  protected onPanStart(e: PIXI.FederatedPointerEvent) {
    // e.preventDefault();
    e.stopPropagation();
    this.#dragMode = DRAG_MODE.PAN;
  }

  protected onPanMove(e: PIXI.FederatedPointerEvent) {
    // e.preventDefault();
    e.stopPropagation();
    this.panX += e.movementX;
    this.panY += e.movementY;
    this.updateViewIfLocked().catch(logError);
  }

  protected onPanStop(e: PIXI.FederatedPointerEvent) {
    // e.preventDefault();
    e.stopPropagation();
    this.#dragMode = DRAG_MODE.NONE;
  }

  // #endregion


  protected async getContextMenuItems(data: { x: number, y: number }): Promise<foundry.applications.ux.ContextMenu.Entry<HTMLElement>[]> {
    const game = await getGame();
    const currentMapMarker = this.mapMarkerUnderMouse?.config?.id;

    const sceneEntries = this.mode === "scene" ? (await this.sceneRenderer.getContextMenuItems(data)) : [];

    return [
      {
        name: "MINIMAP.CONTEXTMENU.SETTINGS",
        icon: `<i class="fas fa-cogs"></i>`,
        condition: () => game.user.can("SETTINGS_MODIFY"),
        callback: () => {

          // This may seem odd, but v13's render() function returns a promise, v12 does not.
          // And trying to change the tab in v12 on the first time the application has been
          // rendered will throw an error, since the DOM elements do not yet exist.
          Hooks.once("renderSettingsConfig", () => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            if (game.release?.isNewer("13")) (game.settings.sheet as any).changeTab(__MODULE_ID__, "categories");
            else game.settings.sheet.activateTab(__MODULE_ID__);
          });
          game.settings.sheet.render(true);
        }
      },
      ...sceneEntries,
      {
        name: "MINIMAP.CONTEXTMENU.MARKERS.ADD",
        icon: `<i class="fa-solid fa-location-dot"></i>`,
        condition: () => game.user.isGM && !this.mapMarkerUnderMouse,
        callback: () => {
          const localPoint = new PIXI.Point();
          this.markerContainer.toLocal(new PIXI.Point(data.x, data.y), undefined, localPoint);
          this.createMapMarker(Math.round(localPoint.x), Math.round(localPoint.y)).catch(logError);
        }
      },
      {
        name: "MINIMAP.CONTEXTMENU.MARKERS.EDIT",
        icon: `<i class="fa-solid fa-location-dot"></i>`,
        condition: () => game.user.isGM && !!this.mapMarkerUnderMouse,
        callback: () => {
          if (currentMapMarker) {
            const config = this.mapMarkers.find(marker => marker.id === currentMapMarker);
            if (config) void this.editMapMarker(config);
          }
        }
      },
      {
        name: "MINIMAP.CONTEXTMENU.MARKERS.REMOVE",
        icon: `<i class="fa-solid fa-trash"></i>`,
        condition: () => game.user.isGM && !!this.mapMarkerUnderMouse,
        callback: () => {
          if (currentMapMarker) {
            const config = this.mapMarkers.find(marker => marker.id === currentMapMarker);
            if (config) void this.removeMapMarker(config);
          }
        }
      },
      {
        name: "MINIMAP.CONTEXTMENU.MARKERS.CLEAR",
        icon: `<i class="fa-solid fa-circle-minus"></i>`,
        condition: () => game.user.isGM && !!this.mapMarkers.length,
        callback: () => { void this.removeAllMapMarkers(); }
      },
      {
        name: "MINIMAP.CONTEXTMENU.FIT",
        icon: `<i class="fas fa-frame"></i>`,
        condition: () => this.allowPan && this.allowZoom,
        callback: () => { this.fitMapView(); }
      },
      {
        name: "MINIMAP.CONTEXTMENU.SYNCHRONIZE",
        icon: `<i class="fas fa-refresh"></i>`,
        condition: () => game.user.isGM,
        callback: () => { if (game.user.isGM) void synchronizeView(); }
      },
      {
        name: "MINIMAP.CONTEXTMENU.LOCKGM",
        icon: `<i class="fas fa-lock"></i>`,
        condition: () => game.user.isGM && !game.settings.get(__MODULE_ID__, "lockGMView"),
        callback: () => { if (game.user.isGM) void game.settings.set(__MODULE_ID__, "lockGMView", true); }
      },
      {
        name: "MINIMAP.CONTEXTMENU.UNLOCKGM",
        icon: `<i class="fas fa-lock-open"></i>`,
        condition: () => game.user.isGM && game.settings.get(__MODULE_ID__, "lockGMView") as boolean,
        callback: () => { if (game.user.isGM) void game.settings.set(__MODULE_ID__, "lockGMView", false); }
      },
      {
        name: "MINIMAP.CONTEXTMENU.HIDE",
        icon: `<i class="fas fa-eye-slash"></i>`,
        condition: () => game.user.can("SETTINGS_MODIFY"),
        callback: () => { game.settings.set(__MODULE_ID__, "show", false).catch(logError) }
      },
    ]
  }


  protected async showContextMenu(x: number, y: number) {
    try {
      const elem = document.querySelector(`[data-role="minimap-menu"]`);
      if (!(elem instanceof HTMLElement)) throw new LocalizedError("CONTEXTMENUELEMENTNOTFOUND");
      const menuItems = await this.getContextMenuItems({ x, y });
      if (!menuItems.some(item => typeof item.condition === "function" ? item.condition(elem) : typeof item.condition === "boolean" ? item.condition : true)) return;

      // Position parent element
      elem.style.top = `${y}px`;
      elem.style.left = `${x}px`

      if (!this._contextMenu) {
        // Create context menu
        const container = document.getElementById(`mm-menu-container`);
        if (!(container instanceof HTMLElement)) throw new LocalizedError("CONTEXTMENUELEMENTNOTFOUND");
        if (game.release?.isNewer("13")) {
          this._contextMenu = new foundry.applications.ux.ContextMenu(
            container,
            `[data-role="minimap-menu"]`,
            menuItems,
            {
              jQuery: false
            }
          )
        } else {
          // The v13 types do not include this declaration, but in Foundry 12 and below,
          // ContextMenu *does* exist.

          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          this._contextMenu = new ContextMenu(
            $(container),
            `[data-role="minimap-menu"]`,
            menuItems
          ) as foundry.applications.ux.ContextMenu<false>;
        }
      } else {
        this._contextMenu.menuItems.splice(0, this._contextMenu.menuItems.length, ...menuItems);
      }
      await this._contextMenu.render(game.release?.isNewer("13") ? elem : $(elem) as unknown as HTMLElement);
    } catch (err) {
      logError(err as Error);
    }
  }


  public setOverlayFromSettings(settings: OverlaySettings) {
    if (!settings.file) {
      this.overlayPlane.visible = false;
      return;
    }

    this.overlay = settings.file;
    const texture = PIXI.Texture.from(settings.file);
    this.overlayPlane.texture = texture;
    const { left, right, top, bottom } = settings;
    this.overlayPlane.leftWidth = left;
    this.overlayPlane.rightWidth = right;
    this.overlayPlane.topHeight = top;
    this.overlayPlane.bottomHeight = bottom;

    this.overlayPlane.visible = settings.visible;
    this.update();
  }

  protected generateRectangleMask(): PIXI.Texture | undefined {
    const canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return PIXI.Texture.from(canvas);
  }

  protected generateCircularMask(): PIXI.Texture | undefined {
    const canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width / 2, canvas.height / 2), 0, 2 * Math.PI);
    ctx.fill();

    return PIXI.Texture.from(canvas);
  }

  protected generateDiamondMask(): PIXI.Texture | undefined {
    const canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.closePath();
    ctx.fill();

    return PIXI.Texture.from(canvas);
  }

  protected async generateMaskImage(shape: MapShape): Promise<PIXI.Texture | undefined> {
    switch (shape) {
      case "circle":
        return this.generateCircularMask();
        break;
      case "diamond":
        return this.generateDiamondMask();
        break;
      case "mask": {
        if (!this.mask) return;
        const cv = await nineSliceScale(this.mask, this.width, this.height, this.overlayPlane.leftWidth, this.overlayPlane.rightWidth, this.overlayPlane.topHeight, this.overlayPlane.bottomHeight);
        if (cv) return PIXI.Texture.from(cv);
        break;
      }
      case "rectangle":
        return this.generateRectangleMask();
        break;
    }
  }

  protected setMask(shape: MapShape) {
    this.generateMaskImage(shape)
      .then(texture => {
        if (!texture) return;

        if (!(texture instanceof PIXI.Texture)) return;
        if (this.#mapContainer.mask instanceof PIXI.Sprite && !this.#mapContainer.mask.destroyed) this.#mapContainer.mask.destroy();

        const sprite = new PIXI.Sprite(texture);
        sprite.name = "Mask";
        sprite.width = this.width;
        sprite.height = this.height;
        this.container.addChild(sprite);
        this.#mapContainer.mask = sprite;
        this.#bgSprite.mask = sprite;
      })
      .catch((err: Error) => { logError(err); });
  }



  protected onRightClick(e: PIXI.FederatedPointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    void this.showContextMenu(e.clientX, e.clientY);
  }

  private async updateViewIfLocked() {
    const game = await getGame();
    if (!this.lockGMView || !game.user.isGM) return;
    synchronizeView();
  }

  public get baseWidth() {
    if (this.mode === "image") return this.staticSprite.texture.width;
    else if (this.mode === "scene") return this.scene?.dimensions.sceneWidth ?? 0;
    else return 0;
  }

  public get baseHeight() {
    if (this.mode === "image") return this.staticSprite.texture.height;
    else if (this.mode === "scene") return this.scene?.dimensions.sceneHeight ?? 0;
    else return 0;
  }

  public readonly zoomStep = .025;
  protected onWheel(e: WheelEvent) {
    if (!this.visible || !this.allowZoom) return;
    const bounds = this.container.getBounds();
    if (bounds.contains(e.clientX, e.clientY)) {
      e.stopPropagation();

      const localPos = this.#mapContainer.toLocal(new PIXI.Point(e.clientX, e.clientY));
      const oldX = localPos.x * this.#mapContainer.scale.x;
      const oldY = localPos.y * this.#mapContainer.scale.y;

      if (e.deltaY < 0) this.zoom = Math.min(Math.max(this.zoom + this.zoomStep, MiniMap.MinZoom), MiniMap.MaxZoom);
      else if (e.deltaY > 0) this.zoom = Math.min(Math.max(this.zoom - this.zoomStep, MiniMap.MinZoom), MiniMap.MaxZoom);

      const newX = localPos.x * this.#mapContainer.scale.x;
      const newY = localPos.y * this.#mapContainer.scale.y;

      this.panX -= (newX - oldX);
      this.panY -= (newY - oldY);

      void this.updateViewIfLocked();
    }
  }

  protected clearMapMarkers() {
    this.mapMarkers.splice(0, this.mapMarkers.length);
    const sprites = [...this.markerContainer.children];

    for (const sprite of sprites)
      sprite.destroy();
  }

  protected setMapMarkers(markers: MapMarkerConfig[]) {
    this.clearMapMarkers();
    for (const marker of markers)
      this.addMapMarker(marker);
  }

  constructor() {
    this.container.name = "MiniMap Container";
    this.container.sortableChildren = true;
    this.container.interactive = true;
    this.container.interactiveChildren = true;
    this.container.eventMode = "dynamic";

    if (this.image)
      this.staticSprite = PIXI.Sprite.from(this.image);
    else
      this.staticSprite = new PIXI.Sprite();

    this.staticSprite.name = "Static Image Sprite";

    const overlayTexture = this.overlay ? PIXI.Texture.from(this.overlay) : PIXI.Texture.from(`modules/${__MODULE_ID__}/assets/transparent.webp`);
    this.overlayPlane = new PIXI.NineSlicePlane(overlayTexture, 0, 0, 0, 0);
    this.overlayPlane.name = "Overlay Plane";
    this.overlayPlane.eventMode = "none";

    this.sceneSprite = new PIXI.Sprite();
    this.sceneSprite.interactiveChildren = true;
    this.sceneSprite.name = "Scene Sprite";

    this.#bgSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.#bgSprite.name = "Background Sprite";

    this.markerContainer.name = "Map Markers";
    this.markerContainer.zIndex = 10000;

    this.container.addChild(this.#bgSprite);
    this.#mapContainer.addChild(this.staticSprite);
    this.#mapContainer.addChild(this.sceneSprite);
    this.#mapContainer.addChild(this.markerContainer);
    this.container.addChild(this.#mapContainer);
    this.container.addChild(this.overlayPlane);

    this.#mapContainer.name = "Internal Container";

    this.sceneRenderer = new SceneRenderer(this.sceneSprite);



    if (!this.staticSprite.texture.valid)
      this.staticSprite.texture.baseTexture.once("loaded", () => { this.update(); })
    else
      this.update();

    this.container.addEventListener("pointerdown", e => {
      if (e.button === 0) this.onPanStart(e);
      else if (e.button === 2) this.onRightClick(e);
    });


    this.container.addEventListener("pointermove", e => {
      switch (this.#dragMode) {
        case DRAG_MODE.MARKER:
          this.mapMarkerDrag(e);
          break;
        case DRAG_MODE.PAN:
          this.onPanMove(e);
          break;
      }
    })


    this.container.addEventListener("pointerup", e => {
      switch (this.#dragMode) {
        case DRAG_MODE.MARKER:
          this.mapMarkerDrop(e);
          break;
        case DRAG_MODE.PAN:
          this.onPanStop(e);
          break;
      }
    });

    this.container.on("pointerupoutside", e => {
      switch (this.#dragMode) {
        case DRAG_MODE.MARKER:
          this.mapMarkerDrop(e);
          break;
        case DRAG_MODE.PAN:
          this.onPanStop(e);
          break;
      }
    });
    // this.container.addEventListener("wheel", e => { this.onWheel(e); })
    const board = document.getElementById("board");
    if (board instanceof HTMLElement) board.addEventListener("wheel", e => { this.onWheel(e); }, true)



    window.addEventListener("resize", () => { this.update(); })
    Hooks.on("collapseSidebar", () => { setTimeout(() => { this.update(); }, 500) });
    Hooks.on("changeSidebarTab", () => { this.update(); });

    // Set up context menu

    document.addEventListener("click", (e: MouseEvent) => {
      if (this._contextMenu) {
        const elem = this._contextMenu.element instanceof HTMLElement ? this._contextMenu.element : (this._contextMenu.element as JQuery<HTMLElement>)[0];
        if (!elem.contains(e.currentTarget as HTMLElement)) {
          void this._contextMenu.close();
        }
      }
    });

    document.addEventListener("contextmenu", (e: MouseEvent) => {
      if (this._contextMenu) {
        const point = this.container.toLocal({ x: e.x, y: e.y });
        const bounds = this.container.getLocalBounds();
        if (!bounds.contains(point.x, point.y)) void this._contextMenu.close();
      }
    });

    getGame()
      .then(game => {
        try {
          const settings = getEffectiveFlagsForScene(canvas.scene instanceof Scene ? canvas.scene : undefined);

          this._suppressUpdate = true;
          this.visible = !!settings.show;
          this.position = settings.position;
          this.shape = settings.shape;
          // this.padding = game.settings.get(__MODULE_ID__, "padding");
          this.padding.x = settings.padX;
          this.padding.y = settings.padY;

          this.mask = settings.mask;
          this.bgColor = settings.bgColor;

          this.height = settings.height;
          this.width = settings.width;

          this.mode = settings.mode;
          this.image = settings.image ?? "";
          this.scene = settings.scene;

          this.showWeather = settings.showWeather;
          this.showDarkness = settings.showDarkness;
          this.showDrawings = settings.showDrawings;
          this.showNotes = settings.showNotes;
          this.showGrid = settings.showGrid;

          this.allowPan = game.settings.get(__MODULE_ID__, "unlockPlayers") as boolean;
          this.allowZoom = game.settings.get(__MODULE_ID__, "unlockPlayers") as boolean;

          this.lockGMView = game.settings.get(__MODULE_ID__, "lockGMView") as boolean;

          // Get client settings
          const view: MapView | null = game.settings.get(__MODULE_ID__, "view") as MapView | null;
          if (view) {
            this.panX = view.x;
            this.panY = view.y;
            this.zoom = view.zoom;
          }

          const overlaySettings = game.settings.get(__MODULE_ID__, "overlaySettings");
          this.setOverlayFromSettings(overlaySettings);

          this.setMask(this.shape);


          return this.setMapMarkers(game.settings.get(__MODULE_ID__, "markers"));
        } catch (err) {
          logError(err as Error);
        } finally {
          this._suppressUpdate = false;
          this.update();
          // if (this.scene && this.mode === "scene") this.sceneRenderer.active = true;
        }
      })
      .catch((err: Error) => { logError(err); })
  }
}