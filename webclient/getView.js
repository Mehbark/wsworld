//TODO: use a websocket to get the boardstate every turn from the server,
//also ooo we should totally allow spectator connections for anyone
window.onload = function () {
  const ws = new WebSocket("ws://localhost:8080");
  const renderLocation = document.querySelector("#world");
  createSkeleton(1000, 1000, renderLocation);

  ws.onopen = function () {
    ws.send(`{"intent":"spectate"}`);
  };

  ws.onmessage = function (message) {
    console.log(message);
    const world = JSON.parse(message.data);
    render(message.data, renderLocation);
  };
};

function render(world, location) {
  location.innerText = world;
}

function createSkeleton(width, height, container) {
  for (let _ = 0; _ < height; _++) {
    const line = document.createElement("pre");
    for (let _ = 0; _ < width; _++) {
      const space = document.createElement("a");
      space.textContent = " ";
      line.appendChild(space);
    }
    container.appendChild(line);
  }
}
