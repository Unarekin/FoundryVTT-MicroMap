export const MapModes = ["image", "scene"] as const;
export type MapMode = typeof MapModes[number];

export const MapShapes = ["rectangle", "circle", "diamond", "mask"] as const;
export type MapShape = typeof MapShapes[number];

export const MapPositions = ["bottomLeft", "bottomRight", "topLeft", "topRight"] as const;
export type MapPosition = typeof MapPositions[number];

export interface OverlaySettings {
  file: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
  visible: boolean;
}