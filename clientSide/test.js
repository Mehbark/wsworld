const WebSocket = require("ws").WebSocket;

class Agent {
  constructor(url) {
    this.ws = new WebSocket(url);
  }
  test(message) {
    this.ws.send(message);
  }
}

let test = new Agent("ws://localhost:8080");
test.ws.on("open", function open() {
  test.ws.send("Hello, world!");
});