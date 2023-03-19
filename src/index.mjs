export { Broadcaster } from "./broadcaster.mjs";
export { BroadcasterManager } from "./broadcasterManager.mjs";

export default {
  async fetch(request, env, context) {
    return handleRequest(request, env);
  },
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.split("/").filter(Boolean);

  if (path[0] === "ws") {
    if (request.headers.get("upgrade") === "websocket") {
      const requestId = newRequestId();

      // Get a suitable Broadcaster
      const broadcasterManagerId =
        env.BROADCASTER_MANAGER_NAMESPACE.idFromName("main");
      const broadcasterManager =
        env.BROADCASTER_MANAGER_NAMESPACE.get(broadcasterManagerId);
      const suitableBroadcasterResponse = await broadcasterManager.fetch(
        new Request("http://internal/getSuitableBroadcaster", {
          method: "POST",
          body: JSON.stringify({ maxClientsPerBroadcaster: 512 }),
        })
      );
      let { broadcasterId } = await suitableBroadcasterResponse.json();
      broadcasterId = env.BROADCASTER_NAMESPACE.idFromString(broadcasterId);
      const broadcaster = env.BROADCASTER_NAMESPACE.get(broadcasterId);

      // Add the new client to the Broadcaster
      const addClientResponse = await broadcaster.fetch(
        new Request("http://internal/addClient", {
          method: "POST",
          body: JSON.stringify({ requestId }),
        })
      );

      // addClientResponse contains the WebSocket connection
      return new Response(null, {
        status: 101,
        webSocket: addClientResponse.webSocket,
      });
    }
  }

  return new Response("Not found", { status: 404 });
}

function newRequestId() {
  return Math.random().toString(36).slice(2);
}
