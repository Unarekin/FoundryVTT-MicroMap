import { LocalizedError } from "errors";
import { MiniMap } from "MiniMap";
import { DeepPartial, SocketMessage, SyncSocketMessage } from "types";
import { getMiniMap } from "utils";

const SOCKET_IDENTIFIER = `module.${__MODULE_ID__}`;

Hooks.once("ready", () => {
  if (!game.socket) throw new LocalizedError("SOCKETNOTINITIALIZED");

  game.socket.on(SOCKET_IDENTIFIER, (message: SocketMessage) => {
    if (!message.users?.includes((game.user as User).id ?? "")) return;
    switch (message.type) {
      case "sync": {
        const msg = message as unknown as SyncSocketMessage;
        const map = getMiniMap();
        if (map instanceof MiniMap) map.view = msg.view;
        break;
      }

    }
  })
});

export function synchronizeView() {
  if (!game.socket) throw new LocalizedError("SOCKETNOTINITIALIZED");
  const map = getMiniMap();
  if (!(map instanceof MiniMap)) return;
  const msg = createMessage<SyncSocketMessage>({
    type: "sync",
    view: map.view,
    users: game.users?.filter(user => user.active).map(user => user.id) ?? []
  });
  game.socket.emit(SOCKET_IDENTIFIER, msg);
}

function createMessage<t extends SocketMessage = SocketMessage>(message: Required<Pick<t, "type" | "users">> & DeepPartial<Omit<t, "id">>): t {
  return {
    id: foundry.utils.randomID(),
    timestamp: Date.now(),
    sender: game.user?.id ?? "",
    ...message
  } as t;
}
