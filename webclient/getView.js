//TODO: use a websocket to get the boardstate every turn from the server,
//also ooo we should totally allow spectator connections for anyone
window.onload = function () {
  const ws = new WebSocket("ws://localhost:8080");
  const renderLocation = document.querySelector("#world");
  createSkeleton(238, 70, renderLocation);

  ws.onopen = function () {
    ws.send(`{"intent":"spectate"}`);
  };

  ws.onmessage = function (message) {
    const world = JSON.parse(message.data);
    render(world, renderLocation);
  };
};

function render(world, location) {
  Object.keys(world).forEach((x) => {
    Object.keys(world[x]).forEach((y) => {
      let place = world[x][y];
      let numX = parseInt(x);
      let numY = parseInt(y);
      changeBG(numX, numY, location, place.color);
      if (place.agent) {
        changeText(numX, numY, location, place.agent.char);
        changeFG(numX, numY, location, place.agent.color);
      } else {
        changeText(numX, numY, location, " ");
        changeFG(numX, numY, location, "white");
      }
    });
  });
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

function changeText(x, y, container, to) {
  container.children[y].children[x].innerText = to;
}
function changeFG(x, y, container, to) {
  container.children[y].children[x].style.color = to;
}
function changeBG(x, y, container, to) {
  container.children[y].children[x].style.backgroundColor = to;
}
