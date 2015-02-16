// TODO don't hardcode renderer dimensions
var stage = new PIXI.Stage(0),
    renderer = new PIXI.autoDetectRenderer(640, 320);

document.getElementById("game").appendChild(renderer.view);

var map,
    player,
    viewport = new PIXI.DisplayObjectContainer();

stage.addChild(viewport);

loadGame(onAssetsLoaded);

function onAssetsLoaded(levelData) {
  cacheTiles(PIXI.TextureCache["images/tiles.png"], "tiles", 64, 64);

  map = [];

  // TODO add viewport support
  // TODO don't assume 1 layer
  var layerData = levelData.layers[0].data,
      stageX = 0,
      stageY = 0,
      layerIdx = 0;
  for (var i = 0; i < levelData.height; ++i) {
    stageX = 0;
    map[i] = [];
    for (var j = 0; j < levelData.width; ++j) {
      var tileId = layerData[layerIdx++],
          sprite = PIXI.Sprite.fromFrame("tiles-" + tileId);

      // TODO don't assume 1 tileset
      // TODO map data and tilesets seem to be off-by-one
      var tileProps = levelData.tilesets[0].tileproperties[tileId - 1];
      if (tileProps) {
        deepCopy(sprite, tileProps);
      }

      sprite.position.x = stageX;
      sprite.position.y = stageY;
      viewport.addChild(sprite);
      map[i][j] = sprite;

      stageX += levelData.tilewidth;
    }

    stageY += levelData.tileheight;
  }

  // Draw the player
  player = PIXI.Sprite.fromFrame("images/player.png");
  player.anchor.x = 0.5;
  player.anchor.y = 0.5;
  player.position.x = 160;
  player.position.y = 160;
  viewport.addChild(player);

  gameLoop();
}

function gameLoop() {
  handleInput();
  movePlayer();

  renderer.render(stage);
  requestAnimationFrame(gameLoop);
}

var BASE_VELOCITY = 3,
    LEFT = 37,
    UP = 38,
    RIGHT = 39,
    DOWN = 40;
function handleInput() {
  player.position.vx = 0;
  player.position.vy = 0;

  if (key.isPressed(UP)) {
    player.position.vy = -BASE_VELOCITY;
  }
  if (key.isPressed(DOWN)) {
    player.position.vy = BASE_VELOCITY;
  }
  if (key.isPressed(LEFT)) {
    player.position.vx = -BASE_VELOCITY;
  }
  if (key.isPressed(RIGHT)) {
    player.position.vx = BASE_VELOCITY;
  }
}

function movePlayer() {
  var currentTile = map[Math.floor(player.position.y / 64)][Math.floor(player.position.x / 64)];

  var vyCorners = getCorners(player, 0, player.position.vy);
  if (player.position.vy < 0) {
    if (vyCorners.topLeft.walkable && vyCorners.topRight.walkable) {
      player.position.y += player.position.vy;
    } else {
      player.position.y = Math.floor(currentTile.y + player.height / 2);
    }
  }
  if (player.position.vy > 0) {
    if (vyCorners.botLeft.walkable && vyCorners.botRight.walkable) {
      player.position.y += player.position.vy;
    } else {
      player.position.y = Math.floor(currentTile.y + 64 - player.height / 2);
    }
  }

  var vxCorners = getCorners(player, player.position.vx, 0);
  if (player.position.vx < 0) {
    if (vxCorners.topLeft.walkable && vxCorners.botLeft.walkable) {
      player.position.x += player.position.vx;
    } else {
      player.position.x = Math.floor(currentTile.x + player.width / 2);
    }
  }
  if (player.position.vx > 0) {
    if (vxCorners.topRight.walkable && vxCorners.botRight.walkable) {
      player.position.x += player.position.vx;
    } else {
      player.position.x = Math.floor(currentTile.x + 64 - player.width / 2);
    }
  }

  viewport.position.x = renderer.view.width / 2 - player.position.x;
  viewport.position.y = renderer.view.height / 2 - player.position.y;
}

function getCorners(obj, vx, vy) {
  // TODO don't hardcode tile size
  var top = Math.floor((player.y + vy - player.height / 2) / 64),
      bot = Math.floor((player.y + vy - 1 + player.height / 2) / 64),
      left = Math.floor((player.x + vx - player.width / 2) / 64),
      right = Math.floor((player.x + vx - 1 + player.width / 2) / 64);

  return {
    topLeft: map[top][left],
    topRight: map[top][right],
    botLeft: map[bot][left],
    botRight: map[bot][right]
  };
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
  var levelData,
      pending = 2;

  function onDone() {
    if (!--pending) {
      cb(levelData);
    }
  }

  fetchJson("map/level1.json", function(json) {
    levelData = json;
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

function deepCopy(target, src) {
  Object.keys(src).forEach(function(k) {
    var elem = src[k];
    if (Array.isArray(elem)) {
      target[k] = deepCopy([], elem);
    } else if (typeof elem === "object") {
      target[k] = deepCopy({}, elem);
    } else {
      target[k] = src[k];
    }
  });
  return target;
}
