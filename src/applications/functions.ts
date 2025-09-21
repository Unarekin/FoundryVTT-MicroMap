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

export async function confirm(title: string, content: string): Promise<boolean> {
  return foundry.applications.api.DialogV2.confirm({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    window: ({ title } as any),
    content
  }) as Promise<boolean>;
}