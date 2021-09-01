const WebSocket = require("ws").WebSocket;

class Agent {
  constructor(url) {
    this.serverConnection = WebSocket(url);
  }
  test(message) {
    this.serverConnection.send(message);
  }
}

let test = new Agent("ws://localhost:8080");
test.test("Hello, world!");