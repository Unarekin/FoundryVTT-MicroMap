import { logError } from 'logging';
import { coerceScene } from './coercion';
import { DeepPartial } from 'types';
import { getNoteFlags } from 'utils';
import { WeatherHandler } from "./WeatherHandler";

type SceneDocument = TileDocument | TokenDocument | DrawingDocument | NoteDocument;

export class SceneRenderer {
  private _active = false;
  private _weatherHandler;
  private _initialized = false;

  private bgColorSprite: PIXI.Sprite;
  private bgImageSprite: PIXI.Sprite;
  private fgImageSprite: PIXI.Sprite;
  private darknessSprite: PIXI.Sprite;
  private gridMesh: GridMesh | undefined = undefined;

  private _showWeather = true;
  public get showWeather() { return this._showWeather; }
  public set showWeather(val) {
    if (this.showWeather !== val) {
      this._showWeather = val;
      this.weatherContainer.renderable = val;
    }
  }

  private _showDarkness = true;
  public get showDarkness() { return this._showDarkness; }
  public set showDarkness(val) {
    if (this.showDarkness !== val) {
      this._showDarkness = val;
      this.darknessSprite.renderable = val;
    }
  }

  private _showDrawings = true;
  public get showDrawings() { return this._showDrawings; }
  public set showDrawings(val) {
    if (this.showDrawings !== val) {
      this._showDrawings = val;
      if (this._initialized) this.refreshDocuments();
    }
  }

  private _showNotes = true;
  public get showNotes() { return this._showNotes; }
  public set showNotes(val) {
    if (this.showNotes !== val) {
      this._showNotes = val;
      if (this._initialized) this.refreshDocuments();
    }
  }

  private _showGrid = true;
  public get showGrid() { return this._showGrid; }
  public set showGrid(val) {
    if (this.showGrid !== val) {
      this._showGrid = val;
      this.gridMesh.renderable = val;
      this.refreshGrid();
    }
  }

  public readonly weatherContainer = new PIXI.Container();

  private _antiAliasing = true;
  public get antiAliasing() { return this._antiAliasing; }
  public set antiAliasing(val) {
    if (this.antiAliasing !== val) {
      this._antiAliasing = val;
      const sprites = Object.values(this.sprites);
      sprites.forEach(sprite => {
        sprite.texture.baseTexture.setStyle(val ? 1 : 0, val ? 2 : 0);
      })
    }
  }

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

  private shouldProcessDocument(doc: SceneDocument): boolean {
    if (doc instanceof DrawingDocument && !this.showDrawings) return false;
    if (doc instanceof NoteDocument && !this.showNotes) return false;

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

  private setBgTexture(texture: PIXI.Texture) {
    if (!this.scene || !this.bgImageSprite) return;

    const oldTexture = this.bgImageSprite.texture;
    this.bgImageSprite.texture = texture;
    if (oldTexture) oldTexture.destroy();


    this.bgImageSprite.width = this.scene.width!;
    this.bgImageSprite.height = this.scene.height!;

    this.bgImageSprite.visible = true;
    this.bgImageSprite.zIndex = -10000;

  }

  private drawBackgroundImage() {
    try {
      if (!this.scene) return;

      if (this.scene.background.src) {
        const texture = PIXI.Texture.from(this.scene.background.src);
        if (!texture.baseTexture.valid) {
          texture.baseTexture.once("loaded", () => {
            this.setBgTexture(texture);
          });
        } else {
          this.setBgTexture(texture);
        }
      } else {
        this.bgImageSprite.visible = false;
      }
    } catch (err) {
      logError(err as Error);
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

  private refreshGrid() {
    if (this.gridMesh && canvas?.grid && canvas?.dimensions) {
      this.gridMesh.initialize({
        type: canvas.grid.type,
        width: canvas.dimensions.width,
        height: canvas.dimensions.height,
        size: canvas.dimensions.size,
        thickness: canvas.grid.thickness,
        color: canvas.grid.color,
        alpha: canvas.grid.alpha
      })
    }
  }

  private sceneUpdated(delta?: DeepPartial<Scene>) {
    try {
      if (!this.scene || !this.active) return;
      if (typeof delta?.backgroundColor !== "undefined") this.drawBackgroundColor();
      if (typeof delta?.background?.src !== "undefined") this.drawBackgroundImage();
      if (typeof delta?.foreground !== "undefined") this.drawForegroundImage();

      if (typeof delta?.environment?.darknessLevel !== "undefined") {
        this.darknessSprite.alpha = delta.environment.darknessLevel * .8;
        this.darknessSprite.width = this.scene.width ?? 0;
        this.darknessSprite.height = this.scene.height ?? 0;
      }

      if (typeof delta?.weather !== "undefined") {
        this._weatherHandler.scene = this.scene;
        this._weatherHandler.initializeWeather();
      }
      this.refreshGrid();
    } catch (err) {
      logError(err as Error);
    }
  }

  private sortElements() {
    try {
      if (!this.scene) return;
      const elements = [
        ...this.scene.tokens.contents,
        ...this.scene.tiles.contents,
        ...this.scene.drawings.contents,
        ...this.scene.notes.contents
      ]
      // log("Elements");
      // console.table(elements.map(element => ({ name: element.name, type: element.documentName, elevation: element.elevation, sort: element.sort })));
      const sorted = elements.sort((a, b) => {
        // Notes come above everything
        if (a instanceof NoteDocument && !(b instanceof NoteDocument)) return -1;
        else if (!(a instanceof NoteDocument) && b instanceof NoteDocument) return 1;

        // Then Information-type drawings
        if (a instanceof DrawingDocument && b instanceof DrawingDocument) {
          const a1 = a as unknown as { interface: boolean };
          const b1 = b as unknown as { interface: boolean };
          if (a1.interface && !b1.interface) return -1;
          if (!a1.interface && b1.interface) return 1;

          if (a1.interface && b1.interface) {
            if (a.elevation !== b.elevation) return b.elevation - a.elevation;
            return a.sort - b.sort;
          }
        }

        // Sort by elevation
        if (a.elevation !== b.elevation) return b.elevation - a.elevation;

        // Within the same elevation, tokens go at the top, then tiles, then drawings
        if (a instanceof TokenDocument && !(b instanceof TokenDocument)) return -1;
        if (!(a instanceof TokenDocument && b instanceof TokenDocument)) return 1;

        if (a instanceof TileDocument && b instanceof DrawingDocument) return -1;
        if (a instanceof DrawingDocument && b instanceof TileDocument) return 1;

        // They are the same type of thing at the same elevation.  Sort by their sort property
        return b.sort - a.sort;
      }).reverse();
      // log("Sorted:");
      // console.table(elements.map(element => ({ name: element.name, type: element.documentName, elevation: element.elevation, sort: element.sort })));
      sorted.forEach((item, i) => {
        const sprite = this.getSprite(item);
        if (sprite) sprite.zIndex = i;
      })
    } catch (err) {
      logError(err as Error);
    }
  }

  private initializeScene() {
    try {
      this._initialized = false;
      if (!this.scene) return;
      if (!this.active) return;

      this.refreshDocuments();


      this.sceneUpdated(this.scene);
      this._initialized = true;
    } catch (err) {
      logError(err as Error);
    }
  }

  private refreshDocuments() {
    if (!this.active || !this.scene) return;
    // Clean out old sprites
    const entries = Object.entries(this.sprites);
    entries.forEach(([uuid, sprite]) => {
      sprite.destroy();
      delete this.sprites[uuid];
    });

    // Add tokens and tiles
    this.scene.tokens.forEach(doc => { this.documentAdded(doc); });
    this.scene.tiles.forEach(doc => { this.documentAdded(doc); });
    this.scene.drawings.forEach(doc => { this.documentAdded(doc); });
    this.scene.notes.forEach(doc => { this.documentAdded(doc); });
  }

  private createTileTokenTexture(doc: TileDocument | TokenDocument): PIXI.Texture | undefined {
    if (!this.shouldProcessDocument(doc)) return;
    if (!doc.texture.src) return;

    const texture = PIXI.Texture.from(doc.texture.src);
    // Ensure that a video texture is playing and loops
    if (texture.baseTexture.resource instanceof PIXI.VideoResource)
      game.video?.play(texture.baseTexture.resource.source, { loop: true });

    if (!this.antiAliasing) texture.baseTexture.setStyle(0, 0);
    return texture;
  }

  private createTileTokenSprite(doc: TileDocument | TokenDocument): PIXI.Sprite | undefined {
    const texture = this.createTileTokenTexture(doc);
    if (!texture) return;
    return new PIXI.Sprite(texture);
  }

  private createNoteTexture(doc: NoteDocument): PIXI.Texture | undefined {
    if (!this.shouldProcessDocument(doc)) return;
    if (!(doc.texture.src)) return;

    const iconTexture = PIXI.Texture.from(doc.texture.src);

    // Delay until icon texture is loaded
    if (!(iconTexture.valid))
      iconTexture.baseTexture.once("loaded", () => { this.documentUpdated(doc, { texture: { src: doc.texture.src } }); });


    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const s = (canvas?.dimensions as any)?.uiScale as number ?? 1;

    const rect = [-2 * s, -2 * s, doc.iconSize + (4 * s), doc.iconSize + (4 * s)];

    const sprite = new PIXI.Sprite();


    const flags = getNoteFlags(doc);
    if (flags.showBG) {
      const bg = sprite.addChild(new PIXI.Graphics());
      bg.name = "bg";
      bg.beginFill(0x000000, 0.4);
      bg.lineStyle(2 * s, 0x000000, 1.0);
      bg.drawRoundedRect(rect[0], rect[1], rect[2], rect[3], 5 * s);
      bg.endFill();
    }

    const icon = sprite.addChild(new PIXI.Sprite(iconTexture));
    icon.tint = doc.texture.tint ?? 0xffffff;
    icon.width = icon.height = doc.iconSize;
    icon.name = "icon"

    const texture = canvas.app?.renderer.generateTexture(sprite);
    if (!this.antiAliasing && texture) texture.baseTexture.setStyle(0, 0);
    return texture;
  }

  private createNoteSprite(doc: NoteDocument): PIXI.Sprite | undefined {
    const texture = this.createNoteTexture(doc);
    if (!texture) return;

    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.x = doc.texture.anchorX ?? 0.5;
    sprite.anchor.y = doc.texture.anchorY ?? 0.5;

    return sprite;
  }

  private createDrawingTexture(doc: DrawingDocument): PIXI.Texture | undefined {
    const graphics = new PIXI.Graphics();

    graphics.clear();
    // Set lineStyle
    graphics.lineStyle({
      width: doc.strokeWidth,
      alpha: doc.strokeAlpha,
      color: doc.strokeColor
    });

    // Begin texture fill
    const fillStyle: Record<string, unknown> = {
      color: doc.fillColor,
      alpha: doc.fillAlpha
    };

    if (doc.fillType === CONST.DRAWING_FILL_TYPES.PATTERN && doc.texture) {
      const texture = PIXI.Texture.from(doc.texture);
      if (!texture.valid) {
        texture.baseTexture.once("loaded", () => {
          this.documentUpdated(doc);
        });
        return;
      }

      fillStyle.texture = texture;
    } else if (!doc.fillType) {
      fillStyle.alpha = 0;
    }

    // if (doc.fillType === CONST.DRAWING_FILL_TYPES.PATTERN && doc.texture) fillStyle.texture = doc.texture;
    // else if (!doc.fillType) fillStyle.alpha = 0;

    graphics.beginTextureFill(fillStyle);



    switch (doc.shape.type) {
      case Drawing.SHAPE_TYPES.CIRCLE: {
        break;
      }
      case Drawing.SHAPE_TYPES.ELLIPSE: {
        graphics.drawEllipse(
          (doc.shape.width ?? 0) / 2,
          (doc.shape.height ?? 0) / 2,
          (doc.shape.width ?? 0) / 2,
          (doc.shape.height ?? 0) / 2
        )
        break;
      }
      case Drawing.SHAPE_TYPES.POLYGON: {
        const isClosed = doc.fillType || (doc.shape.points.slice(0, 2).equals(doc.shape.points.slice(-2)));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        if (isClosed) graphics.drawSmoothedPolygon(doc.shape.points as any, (doc.bezierFactor ?? 0) * 2);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        else graphics.drawSmoothedPath(doc.shape.points as any, (doc.bezierFactor ?? 0) * 2);
        break;
      }
      case Drawing.SHAPE_TYPES.RECTANGLE: {
        graphics.drawRect(
          0, 0,
          (doc.shape.width ?? 0) / 2,
          (doc.shape.height ?? 0) / 2
        );
        break;
      }
    }

    graphics.endFill();

    const texture = canvas?.app?.renderer.generateTexture(graphics);
    if (texture && !this.antiAliasing) texture.baseTexture.setStyle(0, 0);
    return texture;
  }

  private updateDrawingText(doc: DrawingDocument) {
    const sprite = this.getSprite(doc);
    if (!sprite) return;

    if (doc.text) {
      const text = sprite.children.find(item => item instanceof PreciseText) ?? new PreciseText(doc.text);
      text.alpha = doc.textAlpha;
      const { fontSize, fontFamily, textColor } = doc;
      const stroke = Math.max(Math.round((fontSize ?? 0) / 32), 2);
      const textStyle = PreciseText.getTextStyle({
        fontFamily: fontFamily ?? CONFIG.defaultFontFamily,
        fontSize: (fontSize ?? 32) * (1 / sprite.scale.x),
        fill: textColor,
        strokeThickness: stroke,
        dropShadowBlur: Math.max(Math.round((fontSize ?? 0) / 16), 2),
        align: "center",
        wordWrap: true,
        wordWrapWidth: doc.shape.width ?? 0,
        padding: stroke * 4
      });
      text.style = textStyle;
      text.anchor.x = text.anchor.y = 0.5;

      sprite.addChild(text);

    } else {
      const text = sprite.children.find(item => item instanceof PreciseText);
      if (text) text.destroy();
    }
  }

  private updateNoteText(doc: NoteDocument) {
    const sprite = this.getSprite(doc);
    if (!sprite) return;

    const flags = getNoteFlags(doc);

    const text = sprite.children.find(child => child instanceof PreciseText) ?? sprite.addChild(new PreciseText());

    text.name = "label"
    text.text = doc.text ?? "";
    text.anchor.set(0.5, 1);
    // text.scale.set(5, 5);
    text.style = CONFIG.canvasTextStyle;
    text.y = sprite.height;

    // // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    // const s = (canvas?.dimensions as any)?.uiScale as number ?? 1;
    // text.position.set(doc.iconSize / 2, -12 * s);
    text.renderable = flags.showLabel;
  }

  private createDrawingSprite(doc: DrawingDocument): PIXI.Sprite | undefined {
    const texture = this.createDrawingTexture(doc);
    if (texture) {
      const sprite = new PIXI.Sprite(texture);
      return sprite;
    }
  }

  private canSeeNote(note: NoteDocument, user?: User): boolean {
    const actualUser = user ?? game.user;
    if (!(actualUser instanceof User)) return false;

    // If they're a GM, always show this
    if (actualUser.isGM) return true;

    const flags = getNoteFlags(note);
    return flags.show;
  }

  private documentAdded(doc: SceneDocument) {
    try {
      if (!this.shouldProcessDocument(doc)) return;

      // Create sprite

      let sprite: PIXI.Sprite | undefined = undefined;
      if (doc instanceof DrawingDocument)
        sprite = this.createDrawingSprite(doc);
      else if (doc instanceof TileDocument || doc instanceof TokenDocument)
        sprite = this.createTileTokenSprite(doc);
      else if (doc instanceof NoteDocument)
        sprite = this.createNoteSprite(doc);

      if (!sprite) return;

      sprite.name = doc.name ?? doc.uuid;
      this.sprites[doc.uuid] = sprite;
      this.container.addChild(sprite);
      this.documentUpdated(doc, {});
    } catch (err) {
      logError(err as Error);
    }
  }

  private documentUpdated<t extends SceneDocument>(doc: t, delta?: DeepPartial<t>): void {
    try {
      if (!this.shouldProcessDocument(doc)) return;
      const sprite = this.getSprite(doc);
      if (!sprite) return;



      if (doc instanceof TileDocument || doc instanceof TokenDocument) {
        if (typeof (delta as DeepPartial<TileDocument> | DeepPartial<TokenDocument>)?.texture?.src === "string") {
          // Texture was changed
          const texture = this.createTileTokenTexture(doc);
          if (texture) {
            const oldTexture = sprite.texture;
            sprite.texture = texture;
            if (oldTexture) oldTexture.destroy();
          }
        }

        const actualDelta = delta as DeepPartial<TileDocument> | DeepPartial<TokenDocument> | undefined;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        sprite.tint = actualDelta?.texture?.tint as any ?? (doc.texture?.tint ?? "#FFFFFF");

        const scaleX = actualDelta?.texture?.scaleX ?? doc.texture?.scaleX ?? 1;
        const scaleY = actualDelta?.texture?.scaleY ?? doc.texture?.scaleY ?? 1;

        if (scaleX < 0 && sprite.scale.x > 0) sprite.scale.x *= -1;
        else if (scaleX > 0 && sprite.scale.x < 0) sprite.scale.x *= -1;

        if (scaleY < 0 && sprite.scale.y > 0) sprite.scale.y *= -1;
        else if (scaleY > 0 && sprite.scale.y < 0) sprite.scale.y *= -1;

        sprite.alpha = actualDelta?.alpha ?? doc.alpha;


      } else if (doc instanceof DrawingDocument) {
        const texture = this.createDrawingTexture(doc);
        if (texture) {
          const oldTexture = sprite.texture;
          sprite.texture = texture;
          if (oldTexture) oldTexture.destroy();
        }

        sprite.height = doc.shape.height ?? 0;
        sprite.width = doc.shape.width ?? 0;

        this.updateDrawingText(doc);
      } else if (doc instanceof NoteDocument) {
        const texture = this.createNoteTexture(doc);
        if (texture) {
          const oldTexture = sprite.texture;
          sprite.texture = texture;
          oldTexture.destroy();
        }
        sprite.renderable = this.canSeeNote(doc);
        this.updateNoteText(doc);
      }

      sprite.x = (typeof delta?.x === "number" ? delta.x : doc.x) - this.scene!.dimensions.sceneX;
      sprite.y = (typeof delta?.y === "number" ? delta.y : doc.y) - this.scene!.dimensions.sceneY;
      sprite.zIndex = (typeof delta?.sort === "number" ? delta.sort : doc.sort);

      const gridSize = this.scene!.grid.size;   // Our shoudlProcessDocument call earlier ensures scene is not null

      if (doc instanceof TileDocument || doc instanceof TokenDocument || doc instanceof DrawingDocument) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        sprite.renderable = !((delta as any)?.hidden ?? doc.hidden);
      }

      if (doc instanceof TokenDocument) {
        sprite.width = ((typeof (delta as DeepPartial<TokenDocument>)?.width === "number" ? (delta as DeepPartial<TokenDocument>)?.width ?? 0 : doc.width) ?? 1) * gridSize;
        sprite.height = ((typeof (delta as DeepPartial<TokenDocument>)?.height === "number" ? (delta as DeepPartial<TokenDocument>)?.height ?? 0 : doc.height) ?? 1) * gridSize;
      } else if (doc instanceof TileDocument) {
        sprite.width = (delta as DeepPartial<TileDocument>)?.width ?? doc.width;
        sprite.height = (delta as DeepPartial<TileDocument>)?.height ?? doc.height;
      } else if (doc instanceof NoteDocument) {
        sprite.width = sprite.height = (delta as DeepPartial<NoteDocument>)?.iconSize ?? doc.iconSize;
        sprite.renderable = this.canSeeNote(doc);
      }


      if (doc instanceof TokenDocument || doc instanceof TileDocument || doc instanceof DrawingDocument) {
        sprite.anchor.x = sprite.anchor.y = 0.5;
        sprite.x += sprite.width * sprite.anchor.x;
        sprite.y += sprite.height * sprite.anchor.y;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        sprite.angle = (delta as any)?.rotation ?? doc.rotation;

      }

      this.darknessSprite.width = this.scene?.width ?? 0;
      this.darknessSprite.height = this.scene?.height ?? 0;

      this.sortElements();
    } catch (err) {
      logError(err as Error);
    }
  }
  private documentRemoved(doc: SceneDocument) {
    if (!this.shouldProcessDocument(doc)) return;

    const sprite = this.getSprite(doc);
    // Destroy sprite
    if (sprite instanceof PIXI.DisplayObject) {
      if (!sprite.destroyed) sprite.destroy();
      delete this.sprites[doc.uuid];
    }
  }

  constructor(protected readonly container: PIXI.Container) {
    this._weatherHandler = new WeatherHandler(this);
    this.container.sortableChildren = true;

    this.bgColorSprite = new PIXI.Sprite();
    this.fgImageSprite = new PIXI.Sprite();
    this.bgImageSprite = new PIXI.Sprite();

    this.darknessSprite = new PIXI.Sprite(PIXI.Texture.from(`modules/${__MODULE_ID__}/assets/white.webp`));
    this.darknessSprite.tint = 0x000000;
    this.darknessSprite.alpha = 0;
    this.darknessSprite.x = 0;
    this.darknessSprite.y = 0;
    this.darknessSprite.width = this.scene?.width ?? 0;
    this.darknessSprite.height = this.scene?.height ?? 0;
    this.darknessSprite.zIndex = 100000

    this.bgColorSprite.name = "Scene BG Color";
    this.fgImageSprite.name = "Scene FG Image";
    this.bgImageSprite.name = "Scene BG Image";
    this.darknessSprite.name = "Scene Darkness Level";
    this.weatherContainer.name = "Scene Weather Effects";

    this.container.addChild(this.bgColorSprite);
    this.container.addChild(this.bgImageSprite);
    this.container.addChild(this.fgImageSprite);

    this.weatherContainer.zIndex = 50000;
    this.container.addChild(this.weatherContainer);

    this.container.addChild(this.darknessSprite);

    if (canvas?.grid && canvas?.dimensions) {
      this.gridMesh = new GridMesh(GridShader);
      this.container.addChild(this.gridMesh);
      this.gridMesh.zIndex = 1000000;
      this.refreshGrid();
    }

    // Set up some hooks
    Hooks.on("updateScene", (scene: Scene, delta: DeepPartial<Scene>) => { if (this.active && scene === this.scene) this.sceneUpdated(delta); });
    Hooks.on("createToken", (token: TokenDocument) => { this.documentAdded(token); });
    Hooks.on("deleteToken", (token: TokenDocument) => { this.documentRemoved(token); });
    Hooks.on("updateToken", (token: TokenDocument, delta: DeepPartial<TokenDocument>) => { this.documentUpdated(token, delta); });

    Hooks.on("createTile", (tile: TileDocument) => { this.documentAdded(tile); });
    Hooks.on("deleteTile", (tile: TileDocument) => { this.documentRemoved(tile); });
    Hooks.on("updateTile", (tile: TileDocument, delta: DeepPartial<TileDocument>) => { this.documentUpdated(tile, delta); });

    Hooks.on("createDrawing", (drawing: DrawingDocument) => { this.documentAdded(drawing); });
    Hooks.on("deleteDrawing", (drawing: DrawingDocument) => { this.documentRemoved(drawing); });
    Hooks.on("updateDrawing", (drawing: DrawingDocument, delta: DeepPartial<DrawingDocument>) => { this.documentUpdated(drawing, delta); });

    Hooks.on("createNote", (note: NoteDocument) => { this.documentAdded(note); });
    Hooks.on("updateNote", (note: NoteDocument, delta: DeepPartial<NoteDocument>) => { this.documentUpdated(note, delta); });
    Hooks.on("deleteNote", (note: NoteDocument) => { this.documentRemoved(note); });
  }
}