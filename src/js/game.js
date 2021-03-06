// TODO don't hardcode renderer dimensions
var stage = new PIXI.Stage(0),
    renderer = new PIXI.autoDetectRenderer(640, 320);

document.getElementById("game").appendChild(renderer.view);

var map,
    player,
    viewport = new PIXI.DisplayObjectContainer(),
    win = false;

stage.addChild(viewport);

var controllerUp = false,
    controllerDown = false,
    controllerLeft = false,
    controllerRight = false;

if (navigator.userAgent.match(/iPhone/)) {
  GameController.init({
    left: {
      dpad: {
        up: {
          touchStart: function() {
            controllerUp = true;
          },
          touchEnd: function() {
            controllerUp = false;
          }
        },
        down: {
          touchStart: function() {
            controllerDown = true;
          },
          touchEnd: function() {
            controllerDown = false;
          }
        },
        left: {
          touchStart: function() {
            controllerLeft = true;
          },
          touchEnd: function() {
            controllerLeft = false;
          }
        },
        right: {
          touchStart: function() {
            controllerRight = true;
          },
          touchEnd: function() {
            controllerRight = false;
          }
        }
      }
    },
    right: {
      type: "none"
    }
  });
}

loadGame(onAssetsLoaded);

function onAssetsLoaded(levelData) {
  cacheTiles(PIXI.TextureCache["images/tiles.png"], "tiles", 32, 32);

  map = [];

  // TODO add viewport support
  // TODO don't assume 1 layer
  var layerData = levelData.layers[0].data,
      stageX = 0,
      stageY = 16,
      layerIdx = 0;
  for (var i = 0; i < levelData.height; ++i) {
    stageX = 16;
    map[i] = [];
    for (var j = 0; j < levelData.width; ++j) {
      var tileData = layerData[layerIdx++],
          tileId = stripRotation(tileData),
          sprite = PIXI.Sprite.fromFrame("tiles-" + tileId);

      sprite.anchor.x = sprite.anchor.y = 0.5;
      rotateSprite(sprite, tileData);

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

  var playerSpawn = levelData.layers[1].objects[0];
  player.position.x = Math.floor(playerSpawn.x);
  player.position.y = Math.floor(playerSpawn.y);
  viewport.addChild(player);

  gameLoop();
}

var FLIP_HORIZ_BIT = 0x80000000,
    FLIP_VERT_BIT =  0x40000000,
    FLIP_DIAG_BIT =  0x20000000,
    NO_ROT_MASK =    0x1FFFFFFF;

function stripRotation(tileData) {
  return tileData & NO_ROT_MASK;
}

function rotateSprite(sprite, tileData) {
  if (tileData & FLIP_DIAG_BIT) {
    sprite.rotation = -Math.PI / 2;
    sprite.scale.y = -1;
  }
  if ((tileData & FLIP_HORIZ_BIT)) {
    sprite.scale.x *= -1;
  }
  if (tileData & FLIP_VERT_BIT) {
    sprite.scale.y *= -1;
  }
}

function gameLoop() {
  handleInput();
  movePlayer();

  if (win) {
    stage.removeChild(viewport);
    var text = new PIXI.Text("You Won!", { font: "80px Arial", fill: "#86c351" });
    text.anchor.x = 0.5;
    text.anchor.y = 0.5;
    text.position.x = renderer.view.width / 2;
    text.position.y = renderer.view.height / 2;
    stage.addChild(text);
  }

  renderer.render(stage);

  if (!win) {
    requestAnimationFrame(gameLoop);
  }
}

var BASE_VELOCITY = 3,
    LEFT = 37,
    UP = 38,
    RIGHT = 39,
    DOWN = 40;
function handleInput() {
  player.position.vx = 0;
  player.position.vy = 0;

  var up = key.isPressed(UP) || controllerUp,
      down = key.isPressed(DOWN) || controllerDown,
      left = key.isPressed(LEFT) || controllerLeft,
      right = key.isPressed(RIGHT) || controllerRight;

  if (up && !down) {
    player.position.vy = -BASE_VELOCITY;
  }
  if (down && !up) {
    player.position.vy = BASE_VELOCITY;
  }
  if (left && !right) {
    player.position.vx = -BASE_VELOCITY;
  }
  if (right && !left) {
    player.position.vx = BASE_VELOCITY;
  }
}

function movePlayer() {
  var currentTile = map[Math.floor(player.position.y / 32)][Math.floor(player.position.x / 32)];

  var vyCorners = getCorners(player, 0, player.position.vy);
  if (player.position.vy < 0) {
    if (vyCorners.topLeft.walkable && vyCorners.topRight.walkable) {
      player.position.y += player.position.vy;
    } else {
      player.position.y = Math.floor(currentTile.y - 16 + player.height / 2);
    }
  }
  if (player.position.vy > 0) {
    if (vyCorners.botLeft.walkable && vyCorners.botRight.walkable) {
      player.position.y += player.position.vy;
    } else {
      player.position.y = Math.floor(currentTile.y + 16 - player.height / 2);
    }
  }

  var vxCorners = getCorners(player, player.position.vx, 0);
  if (player.position.vx < 0) {
    if (vxCorners.topLeft.walkable && vxCorners.botLeft.walkable) {
      player.position.x += player.position.vx;
    } else {
      player.position.x = Math.floor(currentTile.x - 16 + player.width / 2);
    }
  }
  if (player.position.vx > 0) {
    if (vxCorners.topRight.walkable && vxCorners.botRight.walkable) {
      player.position.x += player.position.vx;
    } else {
      player.position.x = Math.floor(currentTile.x + 16 - player.width / 2);
    }
  }

  viewport.position.x = renderer.view.width / 2 - player.position.x;
  viewport.position.y = renderer.view.height / 2 - player.position.y;

  // TODO don't duplicate this code (see above)
  var newTile = map[Math.floor(player.position.y / 32)][Math.floor(player.position.x / 32)];
  if (newTile.win) {
    win = true;
  }
}

function getCorners(obj, vx, vy) {
  // TODO don't hardcode tile size
  var top = Math.floor((player.y + vy - player.height / 2) / 32),
      bot = Math.floor((player.y + vy - 1 + player.height / 2) / 32),
      left = Math.floor((player.x + vx - player.width / 2) / 32),
      right = Math.floor((player.x + vx - 1 + player.width / 2) / 32);

  return {
    topLeft: map[top][left],
    topRight: map[top][right],
    botLeft: map[bot][left],
    botRight: map[bot][right]
  };
}

function cacheTiles(texture, baseName, frameWidth, frameHeight) {
  var cols = Math.floor((texture.width + 4) / (frameWidth + 4)),
      rows = Math.floor((texture.height + 4) / (frameHeight + 4)),
      nextId = 1, // NOTE: tiled starts with 1-based ids
      baseTexture = texture.baseTexture;

  for (var i = 0; i < rows; ++i) {
    for (var j = 0; j < cols; ++j) {
      var options = {
        x: j * (frameWidth + 4),
        y: i * (frameHeight + 4),
        width: frameWidth,
        height: frameHeight
      };
      PIXI.TextureCache[baseName + "-" + nextId++] = new PIXI.Texture(baseTexture, options);
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
