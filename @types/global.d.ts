declare const __DEV__: boolean;
declare const __MODULE_TITLE__: string;
declare const __MODULE_ID__: string;
declare const __MODULE_VERSION__: string;

declare module '*.scss';

declare global {
  namespace ClientSettings {



    interface Values {
      "miniature-map.show": boolean;
      "miniature-map.position": "bottomLeft" | "bottomRight" | "topLeft" | "topRight";
      "miniature-map.shape": "rectangle" | "circle" | "diamond" | "mask";
      "miniature-map.mask": string;
      "miniature-map.overlay": string;
    }
  }


}
