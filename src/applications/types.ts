
export interface OverlaySettingsRenderContext extends foundry.applications.api.ApplicationV2.RenderContext {
  file: string;
  left: number;
  right: number;
  top: number;
  bottom: number;

  buttons: foundry.applications.api.ApplicationV2.FormFooterButton[];
}