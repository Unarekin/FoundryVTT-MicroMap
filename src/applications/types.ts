import { MapMarkerConfig } from "types";

export interface OverlaySettingsRenderContext extends foundry.applications.api.ApplicationV2.RenderContext {
  file: string;
  left: number;
  right: number;
  top: number;
  bottom: number;

  buttons: foundry.applications.api.ApplicationV2.FormFooterButton[];
}

export interface MapMarkerRenderContext extends foundry.applications.api.ApplicationV2.RenderContext {
  marker: MapMarkerConfig;
  idPrefix: string;
  buttons: foundry.applications.api.ApplicationV2.FormFooterButton[];
}

export interface MapMarkerSettingsRenderContext extends foundry.applications.api.ApplicationV2.RenderContext {
  buttons: foundry.applications.api.ApplicationV2.FormFooterButton[];
  markers: MapMarkerConfig[];
}