import { MiniMap } from "MiniMap";
import { MapView } from "types";
import { getMiniMap } from "utils";

let socket: any = null;

Hooks.once("socketlib.ready", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  socket = socketlib.registerModule(__MODULE_ID__);


  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  socket.register("synchronizeView", (view: MapView) => {
    const map = getMiniMap();
    if (map instanceof MiniMap) map.view = view;
  })
});

export async function synchronizeView() {
  if (!socket) return;
  const map = getMiniMap();
  if (!(map instanceof MiniMap)) return;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  await socket.executeForOthers("synchronizeView", map.view);
}