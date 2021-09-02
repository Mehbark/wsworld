const WebSocketServer = require("ws").Server;
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

class WsWorldServer {
  constructor(
    port = 8080,
    worldPath = "privateData/world.json",
    agentsPath = "privateData/agents.json"
  ) {
    const server = this;
    this.wss = new WebSocketServer({ port: port });
    try {
      const world = fs.readFileSync(worldPath, "utf8");
      server.world = JSON.parse(world);
    } catch (err) {
      throw err;
    }
    try {
      const agents = fs.readFileSync(agentsPath, "utf8");
      server.agents = JSON.parse(agents);
    } catch (err) {
      throw err;
    }
    this.worldPath = worldPath;
    this.agentsPath = agentsPath;

    this.wss.on("connection", function connection(ws) {
      ws.on("message", function incoming(message) {
        server.handleRequest(message, ws);
      });
    });
  }

  saveObject(object, path) {
    fs.writeFile(path, JSON.stringify(object), (err) => {
      if (err) {
        throw err;
      }
    });
  }

  saveAgents() {
    this.saveObject(this.agents, this.agentsPath);
  }

  saveWorld() {
    this.saveObject(this.world, this.worldPath);
  }

  intentError(ws) {
    ws.send("Failed to parse intent");
  }

  JSONError(ws) {
    ws.send("Failed to parse JSON");
  }

  invalidPropertiesError(ws, missingProperties) {
    ws.send("Missing or invalid properties: " + missingProperties.join(", "));
  }

  jsError(ws, error) {
    console.error(error);
  }

  handleRequest(message, ws) {
    try {
      message = JSON.parse(message);
    } catch (err) {
      this.JSONError(ws);
    }
    switch (message.intent) {
      case "sign_up":
        if (
          typeof message.username !== "string" ||
          typeof message.password !== "string"
        ) {
          this.invalidPropertiesError(ws, ["username", "password"]);
          break;
        }
        this.signUp(
          ws,
          message.username,
          message.password,
          message.initialChar,
          message.initialColor
        );
        break;
      default:
        this.intentError(ws);
    }
  }

  signUp(ws, username, password, initialChar = "@", initialColor = "black") {
    let uuid = uuidv4();
    this.agents[uuid] = {
      username: username,
      password: password,
      char: initialChar,
      color: initialColor,
    };
    this.agents.count++;
    this.saveAgents();
    ws.send(uuid);
  }
}

exports.WsWorldServer = WsWorldServer;
