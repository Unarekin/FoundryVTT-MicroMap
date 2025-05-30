/**
 * Attempts to determine a {@link Scene}
 * @param arg 
 * @returns 
 */
export function coerceScene(arg: unknown): Scene | undefined {
  if (arg instanceof Scene) return arg;
  if (typeof arg === "string") {
    let scene: unknown = fromUuidSync(arg as any);
    if (scene instanceof Scene) return scene;
    if (!game.scenes) return;
    scene = game.scenes.get(arg);
    if (scene instanceof Scene) return scene;
    scene = game.scenes.getName(arg);
    if (scene instanceof Scene) return scene;
  }
}