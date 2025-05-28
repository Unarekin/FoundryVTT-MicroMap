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