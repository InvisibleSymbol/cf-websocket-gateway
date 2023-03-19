import { MessageBus } from "./messageBus.mjs";
import { Client } from "./client.mjs";

export class Broadcaster {
  constructor(state, env) {
    this.clients = new Map();
    this.originSocket = null;
    this.env = env;
    this.messageBus = new MessageBus();
  }

  async fetch(request) {
    const { method, pathname } = getRequestDetails(request);

    if (method === "POST") {
      if (pathname === "/addClient") {
        const { requestId } = await request.json();

        let [client, server] = Object.values(new WebSocketPair());

        let client_instance = new Client(server);

        console.log("adding client", requestId);

        // Store the WebSocket connection as state in the Durable Object
        this.clients.set(requestId, client_instance);

        // add client to the message bus
        this.messageBus.addClient(client_instance);

        // Handle WebSocket close event
        server.addEventListener("close", async () => {
          // Remove the client from the Broadcaster
          await this.removeClient(requestId);
        });

        // handle unexpected close
        server.addEventListener("error", async () => {
          // Remove the client from the Broadcaster
          await this.removeClient(requestId);
        });

        if (!this.originSocket) {
          await this.connectToOrigin();
        }

        return new Response(null, {
          status: 101,
          webSocket: client,
        });
      } else if (pathname === "/removeClient") {
        const { requestId } = await request.json();
        await this.removeClient(requestId);
        return new Response(null, { status: 200 });
      } else if (pathname === "/getConnectedClients") {
        return this.getConnectedClients();
      }
    }

    return new Response("Not found", { status: 404 });
  }

  async connectToOrigin() {
    this.originSocket = new WebSocket(this.env.ORIGIN_URL);
    this.originSocket.addEventListener("open", () => {
      this.originSocket.addEventListener("message", (event) => {
        console.time("broadcast"); // start the timer
        this.messageBus.broadcast(event.data);
        console.timeEnd("broadcast"); // start the timer
      });
    });
  }

  async removeClient(requestId) {
    console.log(
      "Removing client",
      requestId,
      "(connected clients:",
      this.clients.size - 1,
      ")"
    );
    // remove client from the message bus
    this.messageBus.removeClient(this.clients.get(requestId));
    this.clients.delete(requestId);
    // no clients left? close the connection to the origin
    if (this.clients.size === 0) {
      this.originSocket.close();
      this.originSocket = null;
    }
    return new Response(null, { status: 200 });
  }
  async getConnectedClients() {
    console.log("getConnectedClients", this.clients.size);
    return new Response(
      JSON.stringify({ connectedClients: this.clients.size }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}

function getRequestDetails(request) {
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;
  return { method, pathname };
}
