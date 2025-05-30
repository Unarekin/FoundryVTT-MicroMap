import { MapMode, MapPosition, MapShape, MapView, OverlaySettings } from './types';
import { coerceScene } from './coercion';
import { logError } from 'logging';
import { getGame } from 'utils';
import { SceneRenderer } from './SceneRenderer';
import { synchronizeView } from 'sockets';
import { LocalizedError } from 'errors';

export class MiniMap {
  public readonly container = new PIXI.Container();

  private _suppressUpdate = false;

  public static readonly DefaultWidth = 300;
  public static readonly DefaultHeight = 200;
  public static readonly MinZoom = .01;
  public static readonly MaxZoom = 5;

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
  private _padding = 0;
  private _mask = "";
  private _bgColor = "#000000";
  private _panX = 0;
  private _panY = 0;
  private _zoom = 1;
  private _allowPan = true;
  private _allowZoom = true;

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

  public get padding() { return this._padding; }
  public set padding(val) {
    if (val !== this.padding) {
      this._padding = val;
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

  protected get screenTop() {
    const uiTop = document.getElementById("scene-navigation-inactive");
    if (!(uiTop instanceof HTMLElement)) return 0;

    return uiTop.getBoundingClientRect().y;
  }

  public get screenLeft() {
    const uiLeft = document.getElementById("ui-left-column-1");
    if (!(uiLeft instanceof HTMLElement)) return 0;
    return uiLeft.getBoundingClientRect().right;
  }

  // protected get screenRight() { return window.innerWidth - this.width; }
  protected get screenRight() {
    const uiRight = document.getElementById("chat-message");
    if (!(uiRight instanceof HTMLElement)) return window.innerWidth - this.width;
    const { x } = uiRight.getBoundingClientRect();
    return x - this.width;
  }
  protected get screenBottom() {
    const hotbar = document.getElementById("hotbar");
    if (!(hotbar instanceof HTMLElement)) return window.innerHeight - this.height;
    const { y } = hotbar.getBoundingClientRect();
    return y - this.height;
  }

  private resetPosition() {
    this.#mapContainer.scale.set(1, 1);
    this.#mapContainer.x = -this.#mapContainer.width / 2;
    this.#mapContainer.y = -this.#mapContainer.height / 2;
  }

  /**
   * Updates the visuals of our minimap in accordance with its settings.
   */
  protected update() {
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
      // TODO: Account for UI elements
      switch (this.position) {
        case "bottomLeft":
          this.container.x = this.screenLeft + this.padding;
          this.container.y = this.screenBottom - this.padding;
          break;
        case "bottomRight":
          this.container.x = this.screenRight - this.padding;
          this.container.y = this.screenBottom - this.padding;
          break;
        case "topLeft":
          this.container.x = this.screenLeft + this.padding;
          this.container.y = this.screenTop + this.padding;
          break;
        case "topRight":
          this.container.x = this.screenRight - this.padding;
          this.container.y = this.screenTop + this.padding;
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

  protected async getContextMenuItems(): Promise<foundry.applications.ux.ContextMenu.Entry<HTMLElement>[]> {
    const game = await getGame();
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
      const menuItems = await this.getContextMenuItems();
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

  protected generateMaskImage(shape: MapShape): PIXI.Texture | undefined {
    switch (shape) {
      case "circle":
        return this.generateCircularMask();
        break;
      case "diamond":
        return this.generateDiamondMask();
        break;
      case "mask":
        if (this.mask) return PIXI.Texture.from(this.mask);
        break;
      case "rectangle":
        return this.generateRectangleMask();
        break;
    }
  }

  protected setMask(shape: MapShape) {
    const texture = this.generateMaskImage(shape);
    if (!(texture instanceof PIXI.Texture)) return;
    if (this.#mapContainer.mask instanceof PIXI.Sprite && !this.#mapContainer.mask.destroyed) this.#mapContainer.mask.destroy();

    // if (this.staticSprite.mask instanceof PIXI.Sprite && !this.staticSprite.mask.destroyed) this.staticSprite.mask.destroy();
    // if (this.sceneSprite.mask instanceof PIXI.Sprite && !this.sceneSprite.mask.destroyed) this.sceneSprite.mask.destroy();
    // if (this.#bgSprite.mask instanceof PIXI.Sprite && !this.#bgSprite.mask.destroyed) this.#bgSprite.mask.destroy();

    const sprite = new PIXI.Sprite(texture);
    sprite.name = "Mask";
    sprite.width = this.width;
    sprite.height = this.height;
    this.container.addChild(sprite);
    this.#mapContainer.mask = sprite;
    // this.staticSprite.mask = sprite;
    // this.sceneSprite.mask = sprite;
    this.#bgSprite.mask = sprite;
    // this.container.mask = sprite;
  }

  // #dragListener: (tyepof this.onDragMove) | null = null;
  #dragListener: ((e: PIXI.FederatedPointerEvent) => void) | null = null;

  protected onDragStart(e: PIXI.FederatedPointerEvent) {
    if (!this.allowPan) return;
    if (!canvas?.app?.stage) return;
    if (this.#dragListener) canvas.app.stage.off("pointermove", this.#dragListener);
    this.#dragListener = this.onDragMove.bind(this);
    canvas.app.stage.on("pointermove", this.#dragListener);
    e.preventDefault();
    e.stopPropagation();
  }

  protected onDragEnd(e: PIXI.FederatedPointerEvent) {
    if (this.#dragListener) {
      if (canvas?.app?.stage) canvas.app.stage.off("pointermove", this.#dragListener);

      this.#dragListener = null;
      e.preventDefault();
      e.stopPropagation();
    }
  }

  protected onDragMove(e: PIXI.FederatedPointerEvent) {
    if (!this.allowPan) return;
    e.preventDefault();
    e.stopPropagation();
    this.panX += e.movementX;
    this.panY += e.movementY;

    void this.updateViewIfLocked();

  }

  protected onRightClick(e: PIXI.FederatedPointerEvent) {
    void this.showContextMenu(e.clientX, e.clientY);
  }

  private async updateViewIfLocked() {
    const game = await getGame();
    if (!this.lockGMView || !game.user.isGM) return;
    await synchronizeView();
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
      if (e.deltaY < 0) this.zoom = Math.min(Math.max(this.zoom + this.zoomStep, MiniMap.MinZoom), MiniMap.MaxZoom);
      else if (e.deltaY > 0) this.zoom = Math.min(Math.max(this.zoom - this.zoomStep, MiniMap.MinZoom), MiniMap.MaxZoom);
      void this.updateViewIfLocked();
    }
  }

  constructor() {
    this.container.name = "MiniMap Container";
    this.container.sortableChildren = true;
    this.container.interactive = true;
    this.container.eventMode = "dynamic";

    if (this.image)
      this.staticSprite = PIXI.Sprite.from(this.image);
    else
      this.staticSprite = new PIXI.Sprite();

    this.staticSprite.name = "Static Image Sprite";

    const overlayTexture = this.overlay ? PIXI.Texture.from(this.overlay) : PIXI.Texture.from(`modules/${__MODULE_ID__}/assets/transparent.webp`);
    this.overlayPlane = new PIXI.NineSlicePlane(overlayTexture, 0, 0, 0, 0);
    this.overlayPlane.name = "Overlay Plane";

    this.sceneSprite = new PIXI.Sprite();
    this.sceneSprite.interactiveChildren = false;
    this.sceneSprite.name = "Scene Sprite";

    this.#bgSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.#bgSprite.name = "Background Sprite";

    this.container.addChild(this.#bgSprite);
    this.#mapContainer.addChild(this.staticSprite);
    this.#mapContainer.addChild(this.sceneSprite);
    this.container.addChild(this.#mapContainer);
    this.container.addChild(this.overlayPlane);

    this.#mapContainer.name = "Internal Container";

    this.sceneRenderer = new SceneRenderer(this.sceneSprite);

    if (!this.staticSprite.texture.valid)
      this.staticSprite.texture.baseTexture.once("loaded", () => { this.update(); })
    else
      this.update();

    this.container.addEventListener("pointerdown", e => {
      e.preventDefault();
      e.stopPropagation();
      if (e.button === 0) this.onDragStart(e);
      else if (e.button === 2) this.onRightClick(e);
    });
    this.container.addEventListener("pointerup", e => { this.onDragEnd(e); });
    this.container.addEventListener("pointerupoutside", e => { this.onDragEnd(e); });
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
          this._suppressUpdate = true;
          this.visible = !!game.settings.get(__MODULE_ID__, "show");
          this.position = game.settings.get(__MODULE_ID__, "position") as MapPosition;
          this.shape = game.settings.get(__MODULE_ID__, "shape") as MapShape;
          this.padding = game.settings.get(__MODULE_ID__, "padding") as number;
          this.mask = game.settings.get(__MODULE_ID__, "mask") as string;
          this.bgColor = game.settings.get(__MODULE_ID__, "bgColor") as string;

          this.height = game.settings.get(__MODULE_ID__, "height") as number;
          this.width = game.settings.get(__MODULE_ID__, "width") as number;

          this.mode = game.settings.get(__MODULE_ID__, "mode") as MapMode;
          this.image = game.settings.get(__MODULE_ID__, "image") as string;
          this.scene = game.settings.get(__MODULE_ID__, "scene") as string;

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

          const overlaySettings = game.settings.get(__MODULE_ID__, "overlaySettings") as OverlaySettings;
          this.setOverlayFromSettings(overlaySettings);
          this.setMask(this.shape);
        } catch (err) {
          logError(err as Error);
        } finally {
          this._suppressUpdate = false;
          this.update();
          // if (this.scene && this.mode === "scene") this.sceneRenderer.active = true;
        }
      })
      .catch((err: Error) => { logError(err); })

    // this.update = foundry.utils.debounce(this.update.bind(this), 16)
  }
}