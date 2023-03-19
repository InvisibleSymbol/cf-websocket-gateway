export class BroadcasterManager {
  static INSTANCE_NAME = "BroadcasterManager";

  constructor(state, env) {
    this.lastBroadcasterId = null;
    this.env = env;
  }

  async fetch(request) {
    const { method, pathname } = getRequestDetails(request);

    if (method === "POST" && pathname === "/getSuitableBroadcaster") {
      const { maxClientsPerBroadcaster } = await request.json();
      return this.getSuitableBroadcaster(maxClientsPerBroadcaster);
    }

    return new Response("Not found", { status: 404 });
  }

  async getSuitableBroadcaster(maxClientsPerBroadcaster) {
    console.log("last stored broadcaster id: ", this.lastBroadcasterId);
    if (this.lastBroadcasterId) {
      const lastBroadcaster = await this.env.BROADCASTER_NAMESPACE.get(
        this.env.BROADCASTER_NAMESPACE.idFromString(this.lastBroadcasterId)
      );
      // get the number of connected clients using fetch
      const connectedClientsResponse = await lastBroadcaster.fetch(
        new Request("http://internal/getConnectedClients", {
          method: "POST",
        })
      );
      const { connectedClients } = await connectedClientsResponse.json();
      console.log(
        "last broadcaster (",
        this.lastBroadcasterId,
        ") is bellow max clients (",
        maxClientsPerBroadcaster,
        ")"
      );

      if (connectedClients < maxClientsPerBroadcaster) {
        return new Response(
          JSON.stringify({ broadcasterId: this.lastBroadcasterId }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    const newBroadcaster = await this.env.BROADCASTER_NAMESPACE.newUniqueId();
    this.lastBroadcasterId = newBroadcaster.toString();
    console.log("creating new broadcaster (", this.lastBroadcasterId, ")");
    return new Response(
      JSON.stringify({ broadcasterId: this.lastBroadcasterId }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
function getRequestDetails(request) {
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;
  return { method, pathname };
}
