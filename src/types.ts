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


export interface SceneFlags {
  override: boolean;
  show: boolean;
  width: number;
  height: number;
  mode: MapMode;
  image?: string;
  scene?: string;
  position: MapPosition;
  bgColor: string;
  padX: number;
  padY: number;
  shape: MapShape;
  mask: string;
  overlaySettings: OverlaySettings;
  showWeather: boolean;
  showDarkness: boolean;
  showDrawings: boolean;
  showNotes: boolean;
}

export const MESSAGE_TYPES = ["sync"] as const;
export type SocketMessageType = typeof MESSAGE_TYPES[number];

export interface SocketMessage {
  id: string;
  type: SocketMessageType;
  timestamp: number;
  sender: string;
  users: string[];
}

export interface SyncSocketMessage extends SocketMessage {
  type: "sync";
  view: MapView;
}

export const LabelAlignments = ["top", "bottom"] as const;
export type LabelAlignment = typeof LabelAlignments[number];

export interface MapMarkerConfig {
  id: string;
  label: string;
  icon: string;
  tint: string;
  showLabel: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  dropShadow: boolean;
  fontFamily: string;
  fontSize: number;
  labelAlign: LabelAlignment;
  fontColor: string;
}