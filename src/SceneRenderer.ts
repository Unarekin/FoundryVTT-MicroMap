import { logError } from 'logging';
import { coerceScene } from './coercion';

export class SceneRenderer {
  private _active = false;

  private bgColorSprite: PIXI.Sprite;
  private bgImageSprite: PIXI.Sprite;
  private fgImageSprite: PIXI.Sprite;

  public get active() { return this._active; }
  public set active(val) {
    if (val !== this.active) {
      this._active = val;
      if (this.scene && this.active) this.initializeScene();
    }
  }

  private sprites: Record<string, PIXI.Sprite> = {};

  private _scene: Scene | undefined = undefined;
  public get scene(): Scene | undefined { return this._scene; }
  public set scene(val: string | Scene | undefined) {
    const scene = coerceScene(val);
    if (scene !== this.scene) {
      this._scene = scene;
      if (scene && this.active) this.initializeScene();
    }
  }

  private shouldProcessDocument(doc: TileDocument | TokenDocument): boolean {
    if (!this.active) return false;
    if (!(doc.parent instanceof Scene)) return false;
    if (doc.parent !== this.scene) return false;
    return true;
  }

  /**
   * Retrieves the {@link PIXI.DisplayObject} for a given {@link foundry.abstract.Document.Any}, if any.
   * 
   * Handles ensuring the reference remains, and the DisplayObject isn't destroyed.
   * @param doc 
   */
  private getSprite(doc: foundry.abstract.Document.Any): PIXI.Sprite | undefined {
    const sprite = this.sprites[doc.uuid];
    if (!sprite) return;
    if (sprite.destroyed) {
      delete this.sprites[doc.uuid];
      return;
    }
    return sprite;
  }

  private drawBackgroundColor() {
    if (!this.scene) return;
    if (!canvas?.app?.renderer) return;

    const texture = canvas.app.renderer.generateTexture(
      new PIXI.Graphics()
        .beginFill(this.scene.backgroundColor ?? "#999999")
        .drawRect(0, 0, this.scene.width!, this.scene.height!)
        .endFill()
    );
    if (this.bgColorSprite) {
      const oldTexture = this.bgColorSprite.texture;
      this.bgColorSprite.texture = texture;
      oldTexture.destroy();
    } else {
      this.bgColorSprite = new PIXI.Sprite(texture);
    }
    this.bgColorSprite.width = this.scene.width!;
    this.bgColorSprite.height = this.scene.height!;
    this.bgColorSprite.zIndex = -20000;
  }

  private drawBackgroundImage() {
    if (!this.scene) return;

    if (this.scene.background.src) {
      const oldTexture = this.bgImageSprite.texture;
      const texture = PIXI.Texture.from(this.scene.background.src);

      this.bgImageSprite.texture = texture;
      oldTexture.destroy();
      this.bgImageSprite.width = this.scene.width!;
      this.bgImageSprite.height = this.scene.height!;

      this.bgImageSprite.visible = true;
      this.bgImageSprite.zIndex = -10000;
    } else {
      this.bgImageSprite.visible = false;
    }
  }

  private drawForegroundImage() {
    if (!this.scene) return;

    if (this.scene.foreground) {
      const oldTexture = this.fgImageSprite.texture;
      const texture = PIXI.Texture.from(this.scene.foreground);
      this.fgImageSprite.texture = texture;
      oldTexture.destroy();

      this.fgImageSprite.width = this.scene.width!;
      this.fgImageSprite.height = this.scene.height!;

      this.fgImageSprite.visible = true;
      this.fgImageSprite.zIndex = 10000;
    } else {
      this.fgImageSprite.visible = false;
    }
  }

  private sceneUpdated() {
    try {
      if (!this.scene || !this.active) return;
      this.drawBackgroundColor();
      this.drawBackgroundImage();
      this.drawForegroundImage();
    } catch (err) {
      logError(err as Error);
    }
  }

  private initializeScene() {
    try {
      if (!this.scene) return;
      if (!this.active) return;


      // Clean out old sprites
      const entries = Object.entries(this.sprites);
      entries.forEach(([uuid, sprite]) => {
        sprite.destroy();
        delete this.sprites[uuid];
      });

      // Add tokens and tiles
      this.scene.tokens.forEach(doc => { this.documentAdded(doc); });
      this.scene.tiles.forEach(doc => { this.documentAdded(doc); });

      this.sceneUpdated();
    } catch (err) {
      logError(err as Error);
    }
  }

  private documentAdded(doc: TileDocument | TokenDocument) {
    try {
      if (!this.shouldProcessDocument(doc)) return;
      if (!doc.texture.src) return;

      // Create sprite
      const texture = PIXI.Texture.from(doc.texture.src);
      const sprite = new PIXI.Sprite(texture);

      // Ensure that a video texture is playing and loops
      if (texture.baseTexture.resource instanceof PIXI.VideoResource)
        game.video?.play(texture.baseTexture.resource.source, { loop: true });

      sprite.name = doc.name ?? doc.uuid;
      this.sprites[doc.uuid] = sprite;
      this.container.addChild(sprite);
      this.documentUpdated(doc, {});
    } catch (err) {
      logError(err as Error);
    }
  }

  private documentUpdated(doc: TileDocument | TokenDocument, delta: Partial<TileDocument> | Partial<TokenDocument>) {
    try {
      if (!this.shouldProcessDocument(doc)) return;
      const sprite = this.getSprite(doc);
      if (!sprite) return;

      if (typeof delta?.texture?.src === "string") {
        // Texture was changed
        const texture = PIXI.Texture.from(delta.texture.src);
        const oldTexture = sprite.texture;
        sprite.texture = texture;
        oldTexture.destroy();
      }

      sprite.tint = delta.texture?.tint ?? (doc.texture.tint ?? "#FFFFFF");

      sprite.x = (typeof delta.x === "number" ? delta.x : doc.x) - this.scene!.dimensions.sceneX;
      sprite.y = (typeof delta.y === "number" ? delta.y : doc.y) - this.scene!.dimensions.sceneY;
      sprite.zIndex = (typeof delta.sort === "number" ? delta.sort : doc.sort);

      const gridSize = this.scene!.grid.size;   // Our shoudlProcessDocument call earlier ensures scene is not null

      sprite.renderable = !(delta.hidden ?? doc.hidden);
      sprite.alpha = delta.alpha ?? doc.alpha;

      if (doc instanceof TokenDocument) {
        sprite.width = ((typeof delta.width === "number" ? delta.width : doc.width) ?? 1) * gridSize;
        sprite.height = ((typeof delta.height === "number" ? delta.height : doc.height) ?? 1) * gridSize;
      } else if (doc instanceof TileDocument) {
        sprite.width = delta.width ?? doc.width;
        sprite.height = delta.height ?? doc.height;
      }

      const scaleX = delta?.texture?.scaleX ?? doc.texture?.scaleX ?? 1;
      const scaleY = delta?.texture?.scaleY ?? doc.texture?.scaleY ?? 1;

      if (scaleX < 0 && sprite.scale.x > 0) sprite.scale.x *= -1;
      else if (scaleX > 0 && sprite.scale.x < 0) sprite.scale.x *= -1;

      if (scaleY < 0 && sprite.scale.y > 0) sprite.scale.y *= -1;
      else if (scaleY > 0 && sprite.scale.y < 0) sprite.scale.y *= -1;

      // if (sprite.scale.x < 0) sprite.x += sprite.width;
      // if (sprite.scale.y < 0) sprite.y += sprite.height;

      sprite.anchor.x = sprite.anchor.y = 0.5;
      sprite.x += sprite.width * sprite.anchor.x;
      sprite.y += sprite.height * sprite.anchor.y;
      // sprite.x += (sprite.width / 2);
      // sprite.y += (sprite.height / 2);

      // if (doc instanceof TokenDocument) {
      //   sprite.x += (sprite.width / 2) * sprite.scale.x;
      //   sprite.y += (sprite.height / 2) * sprite.scale.y;
      // } else {
      //   sprite.x += sprite.width / 2;
      //   sprite.y += sprite.height / 2;
      // }

      sprite.angle = delta.rotation ?? doc.rotation;

    } catch (err) {
      logError(err as Error);
    }
  }
  private documentRemoved(doc: TileDocument | TokenDocument) {
    if (!this.shouldProcessDocument(doc)) return;

    const sprite = this.getSprite(doc);
    // Destroy sprite
    if (sprite instanceof PIXI.DisplayObject) {
      if (!sprite.destroyed) sprite.destroy();
      delete this.sprites[doc.uuid];
    }
  }

  constructor(protected readonly container: PIXI.Container) {
    this.container.sortableChildren = true;

    this.bgColorSprite = new PIXI.Sprite();
    this.fgImageSprite = new PIXI.Sprite();
    this.bgImageSprite = new PIXI.Sprite();

    this.bgColorSprite.name = "Scene BG Color";
    this.fgImageSprite.name = "Scene FG Image";
    this.bgImageSprite.name = "Scene BG Image";

    this.container.addChild(this.bgColorSprite);
    this.container.addChild(this.bgImageSprite);
    this.container.addChild(this.fgImageSprite);

    // Set up some hooks
    Hooks.on("sceneUpdate", (scene: Scene) => { if (this.active && scene === this.scene) this.sceneUpdated(); });
    Hooks.on("createToken", (token: TokenDocument) => { this.documentAdded(token); });
    Hooks.on("deleteToken", (token: TokenDocument) => { this.documentRemoved(token); });
    Hooks.on("updateToken", (token: TokenDocument, delta: Partial<TokenDocument>) => { this.documentUpdated(token, delta); });

    Hooks.on("createTile", (tile: TileDocument) => { this.documentAdded(tile); });
    Hooks.on("deleteTile", (tile: TileDocument) => { this.documentRemoved(tile); });
    Hooks.on("updateTile", (tile: TileDocument, delta: Partial<TileDocument>) => { this.documentUpdated(tile, delta); });
  }
}