// TODO don't hardcode renderer dimensions
var stage = new PIXI.Stage(0),
    renderer = new PIXI.autoDetectRenderer(640, 320);

document.getElementById("game").appendChild(renderer.view);

var level,
    player;

loadGame(onAssetsLoaded);

function onAssetsLoaded() {
  cacheTiles(PIXI.TextureCache["images/tiles.png"], "tiles", 64, 64);

  // TODO add viewport support
  // For now just render the whole map...
  var map = level.layers[0].data,
      stageX = 0,
      stageY = 0,
      mapIdx = 0;
  for (var i = 0; i < level.height; ++i) {
    stageX = 0;
    for (var j = 0; j < level.width; ++j) {
      var sprite = PIXI.Sprite.fromFrame("tiles-" + map[mapIdx++]);
      sprite.position.x = stageX;
      sprite.position.y = stageY;
      stage.addChild(sprite);

      stageX += level.tilewidth;
    }

    stageY += level.tileheight;
  }

  // Draw the player
  player = PIXI.Sprite.fromFrame("images/player.png");
  player.anchor.x = 0.5;
  player.anchor.y = 0.5;
  player.position.x = 160;
  player.position.y = 160;
  stage.addChild(player);

  gameLoop();
}

function gameLoop() {
  handleInput();
  movePlayer();

  renderer.render(stage);
  requestAnimationFrame(gameLoop);
}

var LEFT = 37,
    UP = 38,
    RIGHT = 39,
    DOWN = 40;
function handleInput() {
  player.position.vx = 0;
  player.position.vy = 0;
  if (key.isPressed(UP)) player.position.vy = -2;
  if (key.isPressed(DOWN)) player.position.vy = 2;
  if (key.isPressed(LEFT)) player.position.vx = -2;
  if (key.isPressed(RIGHT)) player.position.vx = 2;
}

function movePlayer() {
  player.position.x += player.position.vx;
  player.position.y += player.position.vy;
}

function cacheTiles(texture, baseName, frameWidth, frameHeight) {
  var cols = Math.floor(texture.width / frameWidth),
      rows = Math.floor(texture.height / frameHeight),
      nextId = 1, // NOTE: tiled starts with 1-based ids
      baseTexture = texture.baseTexture;

  for (var i = 0; i < rows; ++i) {
    for (var j = 0; j < cols; ++j) {
      PIXI.TextureCache[baseName + "-" + nextId++] = new PIXI.Texture(baseTexture, {
        x: j * frameWidth,
        y: i * frameHeight,
        width: frameWidth,
        height: frameHeight
      });
    }
  }
}

function loadGame(cb) {
  var pending = 2;

  function onDone() {
    if (!--pending) {
      cb();
    }
  }

  fetchJson("map/level1.json", function(json) {
    level = json;
    onDone();
  });

  var assetLoader = new PIXI.AssetLoader([
    "images/player.png",
    "images/tiles.png"
  ]);
  assetLoader.on("onComplete", onDone);
  assetLoader.load();
}

function fetchJson(url, cb) {
  fetch(url, function(data) {
    cb(JSON.parse(data));
  });
}

function fetch(url, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url);
  xhr.addEventListener("load", function() {
    if (xhr.status !== 200) {
      console.error("Non 200 response for: " + url + ". Status: " + xhr.status);
    }
    cb(xhr.response);
  });
  xhr.send();
}
