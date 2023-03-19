import { Client } from "./client.mjs";

export class MessageBus {
  constructor() {
    this.clients = new Set();
  }
  addClient(client) {
    this.clients.add(client);
  }
  removeClient(client) {
    this.clients.delete(client);
  }
  broadcast(message) {
    console.log(
      "broadcasting message",
      message,
      " to ",
      this.clients.size,
      " clients"
    );
    for (const client of this.clients) {
      client.send(message);
    }
  }
}
