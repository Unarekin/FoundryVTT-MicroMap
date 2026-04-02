import { MiniMap } from "MiniMap";
import { NoteFlags, SceneFlags, OverlaySettings, MapPosition, MapMode, MapMarkerConfig, CanvasData, MapView } from "types";

declare module '*.scss';

declare global {
  declare const __DEV__: boolean;
  declare const __MODULE_TITLE__: string;
  // declare const __MODULE_ID__: string;
  const __MODULE_ID__ = "micro-map";
  declare const __MODULE_VERSION__: string;

  declare const socketlib: any;

  declare interface Game {
    MicroMap: {
      map: MiniMap
    }
  }
}

declare module "fvtt-types/configuration" {
  interface SettingConfig {
    "micro-map.enable": boolean;
    "micro-map.show": boolean;
    "micro-map.unlockPlayers": boolean;
    "micro-map.lockGMView": boolean;
    "micro-map.mode": MapMode;
    "micro-map.image": string;
    "micro-map.scene": string;
    "micro-map.position": MapPosition;
    "micro-map.bgColor": string;
    "micro-map.width": number;
    "micro-map.height": number;
    "micro-map.shape": MapShape;
    "micro-map.mask": string;
    "micro-map.overlaySettings": OverlaySettings;
    "micro-map.view": MapView;
    "micro-map.padX": number;
    "micro-map.padY": number;
    "micro-map.disableAntiAliasing": boolean;
    "micro-map.markers": MapMarkerConfig[];
    "micro-map.showWeather": boolean;
    "micro-map.showDarkness": boolean;
    "micro-map.showDrawings": boolean;
    "micro-map.showNotes": boolean;
    "micro-map.showGrid": boolean;
    "micro-map.canvasData": CanvasData;
    "micro-map.lockGMView": boolean;
  }

  interface FlagConfig {
    Scene: {
      [__MODULE_ID__]: SceneFlags;
    },
    Note: {
      [__MODULE_ID__]: NoteFlags;
    }
  }
}