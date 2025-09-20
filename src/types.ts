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

export interface MapView {
  x: number,
  y: number,
  zoom: number
}

export type IsObject<T> = T extends Readonly<Record<string, any>>
  ? T extends AnyArray | AnyFunction
  ? false
  : true
  : false;


/**
 * Recursively sets keys of an object to optional. Used primarily for update methods
 * @internal
 */
export type DeepPartial<T> = T extends unknown
  ? IsObject<T> extends true
  ? {
    [P in keyof T]?: DeepPartial<T[P]>;
  }
  : T
  : T;

export type AnyArray = readonly unknown[];
export type AnyFunction = (arg0: never, ...args: never[]) => unknown;


export interface NoteFlags {
  show: boolean;
  showBG: boolean;
  showLabel: boolean;
}

export const DefaultNoteFlags: NoteFlags = {
  show: false,
  showBG: true,
  showLabel: false
}