const LOG_ICON = "🗺️";

export function log(...args: unknown[]) {
  console.log(LOG_ICON, __MODULE_TITLE__, "|", ...args);
}

export function logError(err: Error) {
  ui.notifications?.error(err.message, { localize: true, console: false });
  console.error(err);
}

export function logInfo(message: string, ...addl: unknown[]) {
  ui.notifications?.info(message, { localize: true, console: false });
  console.info(LOG_ICON, __MODULE_TITLE__, "|", message, ...addl);
}

export function logImage(url: string, width = 256, height = 256) {
  const image = new Image();

  image.onload = function () {
    const style = [
      `font-size: 1px`,
      `padding-left: ${width}px`,
      `padding-bottom: ${height}px`,
      // `padding: ${this.height / 100 * size}px ${this.width / 100 * size}px`,
      `background: url(${url}) no-repeat`,
      `background-size:contain`,
      `border:1px solid black`,
      `max-width: 512px`
    ].join(";")
    console.log('%c ', style);
  }

  image.src = url;
}

export function logTexture(texture: PIXI.Texture) {
  const renderTexture = PIXI.RenderTexture.create({ width: texture.width, height: texture.height });
  const sprite = PIXI.Sprite.from(texture);
  canvas?.app?.renderer.render(sprite, { renderTexture });

  const ratio = 512 / Math.max(texture.width, texture.height);
  const width = texture.width > texture.height ? 512 : texture.width * ratio;
  const height = texture.height > texture.width ? 512 : texture.height * ratio;

  canvas?.app?.renderer.extract.base64(renderTexture)
    .then(base64 => {
      logImage(base64, width, height);
    }).catch(console.error);
}