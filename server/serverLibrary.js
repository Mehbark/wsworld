const WebSocketServer = require("ws").Server;
const fs = require("fs");

function randInt(min, max) {
  if (!max) {
    max = min;
    min = 0;
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class WsWorldServer {
  constructor(
    options = {
      port: 8080,
      worldPath: "privateData/world.json",
      agentsPath: "privateData/agents.json",
      worldWidth: 200,
      worldHeight: 200,
      defaultBgColor: "white",
      defaultFgColor: "black",
    }
  ) {
    this.defaultOptions = {
      port: 8080,
      worldPath: "privateData/world.json",
      agentsPath: "privateData/agents.json",
      worldWidth: 200,
      worldHeight: 200,
      defaultBgColor: "white",
      defaultFgColor: "black",
    };
    this.options = options;
    Object.keys(this.defaultOptions).forEach((key) => {
      this.options[key] = this.default(key);
    });
    Object.keys(this.options).forEach((key) => {
      this[key] = this.options[key];
    });

    const server = this;
    this.wss = new WebSocketServer({ port: this.options.port });
    try {
      const world = fs.readFileSync(this.worldPath, "utf8");
      server.world = JSON.parse(world);
    } catch (err) {
      throw err;
    }
    try {
      const agents = fs.readFileSync(this.agentsPath, "utf8");
      server.agents = JSON.parse(agents);
    } catch (err) {
      throw err;
    }

    this.wss.on("connection", function connection(ws) {
      ws.on("message", function incoming(message) {
        server.handleRequest(message, ws);
      });

      ws.on("close", function close() {
        this.agent.connected = false;
        server.saveAgents();
        server.getWorldPosition(agent.x, agent.y).connected = false;
        server.saveWorld();
      });
    });
  }

  default(property) {
    if (this.options[property] !== undefined) {
      return this.options[property];
    }
    return this.defaultOptions[property];
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
      this.agentInteraction(message, ws);
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

  signUp(
    ws,
    username,
    password,
    initialChar = "@",
    initialColor = this.defaultFgColor
  ) {
    if (username.length > 20) {
      this.invalidProperty(ws, "username", "20 or less characters");
      return;
    }
    if (password.length > 50) {
      this.invalidProperty(ws, "password", "50 or less characters");
      return;
      //Very optimistic of me to think this will be a problem but
    }
    if (username in this.agents) {
      this.clientActionFailure(ws, "Username already taken");
      return;
    }
    if (initialChar.length !== 1) {
      this.invalidProperty(ws, "initialChar", "a single character");
      return;
    }
    if (initialColor.length > 20) {
      this.invalidProperty(ws, "initialColor", "20 or less characters");
    }

    var agentX = randInt(this.worldWidth);
    var agentY = randInt(this.worldHieght);
    while (!this.positionEmpty(agentX, agentY)) {
      agentX = randInt(this.worldWidth);
      agentY = randInt(this.worldHieght);
    }
    this.agents[username] = {
      username: username,
      password: password,
      char: initialChar,
      color: initialColor,
      x: agentX,
      y: agentY,
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
    } else if (this.agents[username].password !== password) {
      this.clientActionFailure(ws, "Incorrect password");
    } else {
      ws.agent = this.agents[username];
      ws.agentConnected = true;
      ws.agent.connected = true;
      this.clientActionSuccess(ws, "Successfully signed in");
      this.saveAgents();
    }
  }

  // WORLD STUFF //
  agentInteraction(message, ws) {
    console.log(`${ws.agent.username} requests ${message.intent}`);
    switch (message.intent) {
      case "get_pos":
        if (
          this.checkProperties(ws, message, ["x", "y"], ["number", "number"])
        ) {
          this.agentGetWorldPos(ws, message.x, message.y);
        }
        break;
      case "move":
        if (this.checkProperties(ws, message, ["direction"], ["string"])) {
          switch (message.direction) {
            case "up":
              this.moveAgent(ws, ws.agent.x, ws.agent.y - 1, ws.agent);
              break;
            case "down":
              this.moveAgent(ws, ws.agent.x, ws.agent.y + 1, ws.agent);
              break;
            case "left":
              this.moveAgent(ws, ws.agent.x - 1, ws.agent.y, ws.agent);
              break;
            case "right":
              this.moveAgent(ws, ws.agent.x + 1, ws.agent.y, ws.agent);
              break;
            default:
              ws.propertyError(
                ws,
                "direction",
                "either up, down, left, or right"
              );
          }
        }
    }
  }

  getWorldPosition(x, y) {
    if (x >= this.worldWidth || x < 0 || y >= this.worldHeight || y < 0) {
      return false;
    }
    if (this.world[x] === undefined) {
      let newColumn = {};
      newColumn[y] = { x: x, y: y, agent: false, color: this.defaultBgColor };
      this.world[x] = newColumn;
      this.saveWorld();
      return this.world[x][y];
    }
    if (this.world[x][y] === undefined) {
      this.world[x][y] = {
        x: x,
        y: y,
        agent: false,
        color: this.defaultBgColor,
      };
      this.saveWorld();
      return this.world[x][y];
    }
    return this.world[x][y];
  }

  agentGetWorldPos(ws, x, y) {
    let pos = this.getWorldPosition(x, y);
    if (pos) {
      this.clientActionSuccess(ws, pos);
      return;
    }
    this.clientActionFailure(ws, "Out of bounds");
  }

  positionEmpty(x, y) {
    if (0 < x >= this.worldWidth || 0 < y >= this.worldHeight) {
      return false;
    }
    if (this.world[x] === undefined) {
      return true;
    }
    if (this.world[x][y] === undefined || this.world[x][y].agent === false) {
      return true;
    }
    //idc about whatever fancy stuff you could easily do, this is easy to parse
    //there was a spelling mistake for a minute that was an actual mistake sorry
  }

  moveAgent(ws, x, y, agent) {
    if (this.positionEmpty(x, y)) {
      let newPos = this.getWorldPosition(x, y);
      let oldPos = this.getWorldPosition(agent.x, agent.y);
      oldPos.agent = false;
      newPos.agent = {
        username: agent.username,
        char: agent.char,
        color: agent.color,
        connected: agent.connected,
      };

      agent.x = x;
      agent.y = y;
      this.saveAgents();
      this.saveWorld();
      this.clientActionSuccess(ws, this.getWorldPosition(x, y));
      return;
    }
    this.clientActionFailure(ws, "Cannot move there");
  }
}

exports.WsWorldServer = WsWorldServer;
