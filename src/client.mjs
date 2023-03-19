export class Client {
  constructor(ws) {
    this.processing = false;
    this.messageQueue = [];
    ws.accept();
    this.ws = ws;
  }
  send(message) {
    // push to the queue but limit it to 16 messages
    this.messageQueue.push(message);
    if (this.messageQueue.length > 16) {
      console.warn("dropping message due to queue overflow");
      this.messageQueue.shift();
    }
    this.processQueue();
  }
  async processQueue() {
    if (this.processing || this.messageQueue.length === 0) {
      return;
    }
    this.processing = true;
    const message = this.messageQueue.shift();
    try {
      await this.processMessage(message);
    } catch (error) {
      console.error(`Error processing message: ${error}`);
    }
    this.processing = false;
    this.processQueue();
  }
  async processMessage(message) {
    this.ws.send(message);
  }
}
