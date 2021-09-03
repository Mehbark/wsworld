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

      ws.on("close", function close() {
        this.agent.connected = false;
        server.saveAgents();
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
    let responseObject = { success: success, result: result };
    ws.send(JSON.stringify(responseObject));
  }

  clientActionFailure(ws, result) {
    this.agentResponse(ws, false, result);
  }

  clientActionSuccess(ws, result) {
    this.agentResponse(ws, true, result);
  }

  intentError(ws) {
    this.clientActionFailure(ws, "Failed to parse intent");
  }

  JSONError(ws) {
    this.clientActionFailure(ws, "Failed to parse JSON");
  }

  propertiesError(ws, missingOrInvalidProperties) {
    this.clientActionFailure(
      ws,
      false,
      `Missing or invalid properties:: ${missingOrInvalidProperties.join(", ")}`
    );
  }

  propertyError(ws, property, shouldBe) {
    this.clientActionFailure(ws, `"${property}" should be ${shouldBe}`);
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
      return;
    }
    if (ws.agentConnected) {
      agentInteraction(message, ws);
    } else {
      this.signInOrSignUp(message, ws);
    }
    //TODO: spectate mode
  }
  signInOrSignUp(message, ws) {
    switch (message.intent) {
      case "sign_up":
        if (
          this.checkProperties(
            ws,
            message,
            ["username", "password"],
            ["string", "string"],
            ["initialChar", "initialColor"],
            ["string", "string"]
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
        if (
          this.checkProperties(
            ws,
            message,
            ["username", "password"],
            ["string", "string"]
          )
        ) {
          this.signIn(ws, message.username, message.password);
        }
        break;
      default:
        this.intentError(ws);
        break;
    }
  }

  signUp(ws, username, password, initialChar = "@", initialColor = "black") {
    if (username in this.agents) {
      this.clientActionFailure(ws, "Username already taken");
      return;
    }
    if (initialChar.length !== 1) {
      this.invalidProperty(ws, "initialChar", "a single character");
      return;
    }

    this.agents[username] = {
      password: password,
      char: initialChar,
      color: initialColor,
    };
    this.agents.count++;
    this.saveAgents();
    this.clientActionSuccess(ws, "Account successfully created.");
    this.signIn(ws, username, password);
  }

  signIn(ws, username, password) {
    if (!(username in this.agents)) {
      this.agentResponse(ws, false, "Agent with that username not found");
    } else if (this.agents.connected) {
      this.clientActionFailure(ws, "Agent already connected");
    } else if (this.agents[username][password] !== password) {
      this.clientActionFailure(ws, "Incorrect password");
    } else {
      ws.agent = this.agents[username];
      ws.agentConnected = true;
      ws.agent.connected = true;
      this.clientActionSuccess(ws, "Successfully signed in");
      this.saveAgents();
    }
  }
}

exports.WsWorldServer = WsWorldServer;
