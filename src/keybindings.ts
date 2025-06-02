
export function registerKeyBindings() {
  game?.keybindings?.register(__MODULE_ID__, 'toggleMicroMap', {
    name: "MINIMAP.KEYBINDINGS.TOGGLE",
    editable: [
      {
        key: 'KeyM'
      }
    ],
    onDown: () => {
      void game?.settings?.set(__MODULE_ID__, "show", !game.settings.get(__MODULE_ID__, "show"));
    },
    restricted: false,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  })
}
