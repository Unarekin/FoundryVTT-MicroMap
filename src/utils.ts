import { LocalizedError } from "errors";
import { MiniatureMapCanvasGroup } from "MiniatureMapCanvasGroup";
import { MiniMap } from "MiniMap";
import { DefaultNoteFlags, NoteFlags } from "types";

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