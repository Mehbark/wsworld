Included functions:
(sub-lists are abstractions)

- `saveObject` - Save an object to a file with `JSON.stringify`
  - `saveAgents` - Save the `agents` object to `agentsPath`
  - `saveWorld` - Save the `world` object to `worldPath`
- `agentResponse` - Format for responding to agents, includes a `success` boolean to allow agents to quickly tell if a request worked out
  - `clientActionFailure` - Send a result with `success` set to `false`
    - `intentError`
    - `JSONError`
    - `propertiesError`
    - `propertyError`
  - `clientActionSuccess` - Send a result with `success` set to `true`
- `jsError` - Should probably get rid of this
- `checkProperties` - Checks properties to make sure they are a specific type, and optional properties if they are used
- `handleRequest` - Chooses whether to check for `"sign_in"` or `"sign_up"` in `message.intent`, or an agent action (not implemented)
- `signInOrSignup` - choose whether to call `signIn` or `signUp`
- `signUp` - Creates an agent with a unique username and a password
- `signIn` - Assigns currently connected websocket an agent, and sets that agent's `connected` property to `true`