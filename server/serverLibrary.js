const WebSocketServer = require("ws").Server;
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

  agentResponse(ws, success, result) {
    let responseObject = { result: result };
    responseObject.success = success;
    ws.send(JSON.stringify(responseObject));
  }

  intentError(ws) {
    this.agentResponse(ws, false, "Failed to parse intent");
  }

  JSONError(ws) {
    this.agentResponse(ws, false, "Failed to parse JSON");
  }

  invalidPropertiesError(ws, missingOrInvalidProperties) {
    this.agentResponse(
      ws,
      false,
      "Missing or invalid properties:: " + missingOrInvalidProperties.join(", ")
    );
  }

  jsError(ws, error) {
    console.error(error);
  }

  checkProperties(
    ws,
    message,
    neededProperties,
    expectedTypes,
    optionalProperties,
    optionalExpectedTypes
  ) {
    let missingOrInvalidProperties = [];

    for (let i = 0; i < neededProperties.length; i++) {
      let property = neededProperties[i];
      let expectedType = expectedTypes[i];

      if (
        message[property] === undefined ||
        typeof message[property] !== expectedType
      ) {
        missingOrInvalidProperties.push(`${property}: ${expectedType}`);
      }
    }

    if (optionalProperties) {
      for (let i = 0; i < optionalProperties.length; i++) {
        let property = neededProperties[i];
        let expectedType = optionalExpectedTypes[i];

        if (
          message[property] !== undefined &&
          typeof message[property] !== expectedType
        ) {
          missingOrInvalidProperties.push(`${property}: ${expectedType}`);
        }
      }
    }

    if (missingOrInvalidProperties.length > 0) {
      this.invalidPropertiesError(ws, missingOrInvalidProperties);
      return false;
    } else {
      return true;
    }
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
          this.checkProperties(
            ws,
            message,
            ["username", "password"],
            ["string", "string"],
            ["initialChar"]
          )
        ) {
          this.signUp(
            ws,
            message.username,
            message.password,
            message.initialChar,
            message.initialColor
          );
        }
        break;
      case "sign_in":
        break;
      default:
        this.intentError(ws);
        break;
    }
  }

  signUp(ws, username, password, initialChar = "@", initialColor = "black") {
    if (username in this.agents) {
      this.agentResponse(ws, false, "Username already taken");
      return;
    }
    this.agents[username] = {
      password: password,
      char: initialChar,
      color: initialColor,
    };
    this.agents.count++;
    this.saveAgents();
    this.agentResponse(ws, true, "Account successfully created.");
  }

  signIn(ws, username, password) {
    if (!(username in this.agents)) {
    }
  }
}

exports.WsWorldServer = WsWorldServer;
