export function sceneConfigSelectOptions(): Record<string, Record<string, string>> {
  return {
    positionSelect: {
      "bottomleft": "MINIMAP.SETTINGS.POSITION.BOTTOMLEFT",
      "bottomright": "MINIMAP.SETTINGS.POSITION.BOTTOMRIGHT",
      "topleft": "MINIMAP.SETTINGS.POSITION.TOPLEFT",
      "topright": "MINIMAP.SETTINGS.POSITION.TOPRIGHT"
    },
    modeSelect: {
      "image": "Image",
      "scene": "DOCUMENT.Scene"
    },
    shapeSelect: {
      "rectangle": "MINIMAP.SETTINGS.SHAPE.RECTANGLE",
      "circle": "MINIMAP.SETTINGS.SHAPE.CIRCLE",
      "diamond": "MINIMAP.SETTINGS.SHAPE.DIAMOND",
      "mask": "MINIMAP.SETTINGS.SHAPE.MASK"
    },
    sceneSelect: Object.fromEntries((game?.scenes ?? []).map(scene => [scene.id, scene.name]))
  }
}