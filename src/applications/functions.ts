import { MapMode, MapPosition, MapShape } from "types";

const POSITION_SELECT: Record<MapPosition, string> = {
  bottomLeft: "MINIMAP.SETTINGS.POSITION.BOTTOMLEFT",
  bottomRight: "MINIMAP.SETTINGS.POSITION.BOTTOMRIGHT",
  topLeft: "MINIMAP.SETTINGS.POSITION.TOPLEFT",
  topRight: "MINIMAP.SETTINGS.POSITION.TOPRIGHT"
}

const MODE_SELECT: Record<MapMode, string> = {
  image: "Image",
  scene: "DOCUMENT.Scene"
};

const SHAPE_SELECT: Record<MapShape, string> = {
  rectangle: "MINIMAP.SETTINGS.SHAPE.RECTANGLE",
  circle: "MINIMAP.SETTINGS.SHAPE.CIRCLE",
  diamond: "MINIMAP.SETTINGS.SHAPE.DIAMOND",
  mask: "MINIMAP.SETTINGS.SHAPE.MASK"
}

export function sceneConfigSelectOptions(): Record<string, Record<string, string>> {
  return {
    positionSelect: POSITION_SELECT,
    modeSelect: MODE_SELECT,
    shapeSelect: SHAPE_SELECT,
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