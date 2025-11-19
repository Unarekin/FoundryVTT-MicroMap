import { LocalizedError } from "errors";
import { MiniatureMapCanvasGroup } from "MiniatureMapCanvasGroup";
import { MiniMap } from "MiniMap";
import { DeepPartial, DefaultNoteFlags, NoteFlags, SceneFlags, MapPosition, MapShape, MapMode } from "types";

let gameReadyPromise: Promise<void> | undefined = undefined;

/**
 * Retrieves the game, ensuring it is ready.
 * @returns 
 */
export async function getGame(): Promise<ReadyGame> {
  if (game?.ready) return game;
  gameReadyPromise ??= new Promise(resolve => {
    Hooks.once("ready", () => { resolve(); });
  });

  await gameReadyPromise;
  return game as unknown as ReadyGame;
}

export function getMiniMap(): MiniMap | undefined {
  const group = canvas?.stage?.getChildByName("MiniatureMapCanvasGroup");
  if (!(group instanceof MiniatureMapCanvasGroup)) return;

  return group.miniMap;
}

export function localize(key: string, subs?: Record<string, string>): string {
  if (game?.i18n) return game.i18n.format(key, subs);
  else return key;
}


export async function nineSliceScale(source: PIXI.TextureSource, width: number, height: number, left: number, right: number, top: number, bottom: number): Promise<HTMLCanvasElement> {
  if (!canvas?.app?.renderer) throw new LocalizedError("NOTINITIALIZED");

  const output = document.createElement("canvas");
  const ctx = output.getContext("2d");
  if (!ctx) throw new LocalizedError("NOTINITIALIZED");

  const sprite = PIXI.Sprite.from(source);

  // Ensure texture is loaded
  if (!sprite.texture.valid) await new Promise(resolve => { sprite.texture.baseTexture.once("loaded", resolve); });

  const sourceCanvas = canvas.app.renderer.extract.canvas(sprite) as HTMLCanvasElement;

  output.width = width;
  output.height = height;


  // Top row
  ctx.drawImage(sourceCanvas, 0, 0, left, top, 0, 0, left, top);
  ctx.drawImage(sourceCanvas, left, 0, sprite.width - left - right, top, left, 0, width - left - right, top);
  ctx.drawImage(sourceCanvas, sprite.width - right, 0, right, top, width - right, 0, right, top);

  // Middle row
  ctx.drawImage(sourceCanvas, 0, top, left, sprite.height - top - bottom, 0, top, left, height - top - bottom);
  ctx.drawImage(sourceCanvas, left, top, sprite.width - left - right, sprite.height - top - bottom, left, top, width - left - right, height - top - bottom);
  ctx.drawImage(sourceCanvas, sprite.width - right, top, right, sprite.height - top - bottom, width - right, top, right, height - top - bottom);

  // Bottom row
  ctx.drawImage(sourceCanvas, 0, sprite.height - bottom, left, bottom, 0, height - bottom, left, bottom);
  ctx.drawImage(sourceCanvas, left, sprite.height - bottom, sprite.width - left - right, bottom, left, height - bottom, width - right - left, bottom);
  ctx.drawImage(sourceCanvas, sprite.width - right, sprite.height - bottom, right, bottom, width - right, height - bottom, right, bottom);

  return output;
}

export function getNoteFlags(note: NoteDocument): NoteFlags {
  const flags = foundry.utils.deepClone(DefaultNoteFlags);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const setFlags = (note.flags as any)["micro-map"] as Partial<NoteFlags>;
  if (typeof setFlags?.show === "boolean") flags.show = setFlags.show;
  if (typeof setFlags?.showBG === "boolean") flags.showBG = setFlags.showBG;
  if (typeof setFlags?.showLabel === "boolean") flags.showLabel = setFlags.showLabel;
  return flags;
}

export function defaultSceneFlags(): SceneFlags {
  return {
    override: false,
    show: game?.settings?.get(__MODULE_ID__, "enable") ?? false,
    width: game?.settings?.get(__MODULE_ID__, "width") ?? 256,
    height: game?.settings?.get(__MODULE_ID__, "height") ?? 256,
    mode: (game?.settings?.get(__MODULE_ID__, "mode") ?? "image") as MapMode,
    image: game?.settings?.get(__MODULE_ID__, "image") ?? "",
    scene: game?.settings?.get(__MODULE_ID__, "scene") ?? "",
    canvasData: {
      width: 0,
      height: 0,
      colorSpace: "srgb",
      data: []
    },
    position: (game?.settings?.get(__MODULE_ID__, "position") ?? "bottomright") as MapPosition,
    bgColor: game?.settings?.get(__MODULE_ID__, "bgColor") ?? "#000000",
    padX: game?.settings?.get(__MODULE_ID__, "padX") ?? 0,
    padY: game?.settings?.get(__MODULE_ID__, "padY") ?? 0,
    shape: (game?.settings?.get(__MODULE_ID__, "shape") ?? "square") as MapShape,
    mask: game?.settings?.get(__MODULE_ID__, "mask") ?? "",
    showWeather: game?.settings?.get(__MODULE_ID__, "showWeather") ?? true,
    showDarkness: game?.settings?.get(__MODULE_ID__, "showDarkness") ?? true,
    showDrawings: game?.settings?.get(__MODULE_ID__, "showDrawings") ?? true,
    showNotes: game?.settings?.get(__MODULE_ID__, "showNotes") ?? true,
    showGrid: game?.settings?.get(__MODULE_ID__, "showGrid") ?? true,
    overlaySettings: game?.settings?.get(__MODULE_ID__, "overlaySettings") ?? {
      visible: false,
      file: "",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    }
  };
}

export function getSceneFlags(scene: Scene): SceneFlags {
  const flags = defaultSceneFlags();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const setFlags = (scene.flags as any)["micro-map"] as DeepPartial<SceneFlags>;

  foundry.utils.mergeObject(flags, setFlags);
  return flags;
}

export function getEffectiveFlagsForScene(scene?: Scene): SceneFlags {
  const defaultFlags = defaultSceneFlags();
  if (scene) {
    const sceneFlags = getSceneFlags(scene);
    return sceneFlags.override ? sceneFlags : defaultFlags;
  } else {
    return defaultFlags;
  }

}


export function downloadJSON(json: object, name?: string) {
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
  const objUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objUrl;
  if (name) link.download = name.endsWith(".json") ? name : `${name}.json`;
  else link.download = "";
  link.click();
  URL.revokeObjectURL(objUrl);
}

export function uploadJSON<t = any>(): Promise<t> {
  return new Promise<t>((resolve, reject) => {
    const file = document.createElement("input");
    file.setAttribute("type", "file");
    file.setAttribute("accept", "application/json");
    file.onchange = e => {
      const file = (e.currentTarget as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new LocalizedError("NOFILE"));
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        if (!e.target?.result) throw new LocalizedError("NOFILE");
        if (typeof e.target.result === "string") resolve(JSON.parse(e.target.result) as t);
      }
      reader.readAsText(file);
    }
    file.onerror = (event, source, line, col, error) => {
      if (error) reject(error);
      else reject(new Error(typeof event === "string" ? event : typeof undefined));
    }

    file.click();
  });
}