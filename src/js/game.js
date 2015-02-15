// TODO don't hardcode renderer dimensions
var stage = new PIXI.Stage(0),
    renderer = new PIXI.autoDetectRenderer(640, 320);

document.getElementById("game").appendChild(renderer.view);

var level;

loadGame(onAssetsLoaded);

function onAssetsLoaded() {
  cacheTiles(PIXI.TextureCache["images/tiles.png"], "tiles", 64, 64);

  // TODO add viewport support
  // For now just render the whole map...
  var map = level.layers[0].data,
      stageX = 0,
      stageY = 0,
      mapIdx = 0;
  console.log(level);
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

  renderer.render(stage);
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
