import { MiniatureMapCanvasGroup } from "MiniatureMapCanvasGroup";
import { MiniMap } from "MiniMap";

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

export function debounce<t extends (...args: unknown[]) => unknown>(func: t, delay = 300): (...args: Parameters<t>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<t>) => {
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, delay);
  }
}