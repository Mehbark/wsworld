//TODO: use a websocket to get the boardstate every turn from the server,
//also ooo we should totally allow spectator connections for anyone
window.onload = function () {
  const ws = new WebSocket("ws://localhost:8080");
  const renderLocation = document.querySelector("pre");

  ws.onopen = function () {
    ws.send(`{"intent":"spectate"}`);
  };

  ws.onmessage = function(message) {
    console.log(message);
    const world = JSON.parse(message.data);
    render(message.data, renderLocation);
  };
};

function render(world, location) {
  location.innerText = world;
}
