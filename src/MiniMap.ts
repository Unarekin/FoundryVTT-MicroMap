import { MapMode, MapPosition, MapShape } from './types';
import { coerceScene } from './coercion';
import { log } from 'logging';

export class MiniMap {
  public readonly container = new PIXI.Container();

  public static readonly DefaultWidth = 300;
  public static readonly DefaultHeight = 200;

  private _mode: MapMode = "image";
  private _scene: Scene | undefined = undefined;
  private _image = `modules/${__MODULE_ID__}/assets/placeholder.webp`;
  private _overlay = "";
  private _shape: MapShape = "rectangle";
  private _position: MapPosition = "bottomRight";
  private _width = 300;
  private _height = 200;
  private _padding = 50;

  public get mode() { return this._mode; }
  public set mode(val) {
    if (this._mode !== val) {
      this._mode = val;
      this.update();
    }
  }

  public get scene(): Scene | undefined { return this._scene; }
  public set scene(val: unknown) {
    const scene = coerceScene(val);
    if (scene !== this.scene) {
      this._scene = scene;
      this.update();
    }
  }

  public get image() { return this._image; }
  public set image(val) {
    if (val !== this.image) {
      this._image = val;

      const texture = PIXI.Texture.from(val);
      if (!texture.valid) {
        texture.baseTexture.once("loaded", () => {
          this.staticSprite.texture = texture;
          this.update();
        })
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
      this.update();
    }
  }

  public get width() { return this._width; }
  public set width(val) {
    if (val !== this.width) {
      this._width = val;
      this.update();
    }
  }

  public get height() { return this._height }
  public set height(val) {
    if (val !== this.height) {
      this._height = val;
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


  protected readonly screenTop = 0;
  protected readonly screenLeft = 0;
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

  /**
   * Updates the visuals of our minimap in accordance with its settings.
   */
  protected update() {
    this.staticSprite.visible = this.mode === "image";
    this.sceneSprite.visible = this.mode === "scene";

    this.overlaySprite.visible = !!this.overlay;

    this.staticSprite.width = this.width;
    this.staticSprite.height = this.height;

    this.overlaySprite.width = this.width;
    this.overlaySprite.height = this.height;

    this.sceneSprite.width = this.width;
    this.sceneSprite.height = this.height;

    // Set everything to top left of container
    this.staticSprite.x = this.staticSprite.y = this.overlaySprite.x = this.overlaySprite.y = this.sceneSprite.x = this.sceneSprite.y = 0;

    if (this.container?.parent) {
      // TODO: Account for UI elements
      switch (this.position) {
        case "bottomLeft":
          this.container.x = this.screenTop + this.padding;
          this.container.y = this.screenBottom - this.padding;
          break;
        case "bottomRight":
          this.container.x = this.screenRight - this.padding;
          this.container.y = this.screenBottom - this.padding;
          break;
        case "topLeft":
          this.container.x = this.screenTop + this.padding;
          this.container.y = this.screenLeft + this.padding;
          break;
        case "topRight":
          this.container.x = this.screenRight - this.padding;
          this.container.y = this.screenTop + this.padding;
          break;
      }
    }
  }

  protected staticSprite: PIXI.Sprite;
  protected sceneSprite: PIXI.Sprite;
  protected overlaySprite: PIXI.Sprite;

  private _contextMenu: foundry.applications.ux.ContextMenu<false> | undefined = undefined;

  protected async showContextMenu(x: number, y: number) {
    log("Showing context menu:", x, y);

    if (this._contextMenu) await this._contextMenu.close();

    const elem = document.createElement("section");
    elem.style.position = "absolute";
    elem.style.pointerEvents = "auto";
    elem.dataset.role = "minimap-menu"

    const container = document.getElementById("mm-menu-container");
    if (!(container instanceof HTMLElement)) return;
    elem.style.top = `${y}px`;
    elem.style.left = `${x}px`

    container.appendChild(elem);

    const menu = new foundry.applications.ux.ContextMenu(
      container,
      `[data-role="minimap-menu"]`,
      [
        {
          name: "Test",
          callback: () => { /* empty */ }
        }
      ],
      {
        onClose: () => {
          elem.remove();
          if (this._contextMenu === menu) this._contextMenu = undefined;
        },
        jQuery: false
      }
    );


    this._contextMenu = menu;
    await menu.render(elem);
    const listener = (e: MouseEvent) => {
      if (!menu.element.contains(e.currentTarget as HTMLElement)) {
        void menu.close();
        document.removeEventListener("click", listener);
        document.removeEventListener("contextmenu", listener);
      }
    };
    document.addEventListener("click", listener);
    document.addEventListener("contextmenu", listener);
  }

  constructor() {

    this.container.sortableChildren = true;
    this.container.interactive = true;
    this.container.eventMode = "dynamic";

    if (this.image)
      this.staticSprite = PIXI.Sprite.from(this.image);
    else
      this.staticSprite = new PIXI.Sprite();

    if (this.overlay)
      this.overlaySprite = PIXI.Sprite.from(this.overlay);
    else
      this.overlaySprite = new PIXI.Sprite();

    this.sceneSprite = new PIXI.Sprite();

    this.container.addChild(this.staticSprite);
    this.container.addChild(this.sceneSprite);
    this.container.addChild(this.overlaySprite);

    if (!this.staticSprite.texture.valid)
      this.staticSprite.texture.baseTexture.once("loaded", () => { this.update(); })
    else
      this.update();

    this.container.addEventListener("rightclick", (e: PIXI.FederatedPointerEvent) => {
      e.preventDefault();
      void this.showContextMenu(e.clientX, e.clientY);
    });

    window.addEventListener("resize", () => { this.update(); })
    Hooks.on("collapseSidebar", () => { setTimeout(() => { this.update(); }, 500) });
    Hooks.on("changeSidebarTab", () => { this.update(); });
  }
}