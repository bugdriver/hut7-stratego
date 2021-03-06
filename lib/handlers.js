const { games } = require('./games');

const dummySetupData = {
  unit: 'blue',
  piecesInfo: [
    { position: '9_9', name: 'flag' },
    { position: '6_6', name: 'scout' },
    { position: '9_8', name: 'bomb' },
    { position: '8_9', name: 'bomb' },
    { position: '4_6', name: 'miner' },
    { position: '9_7', name: 'marshal' },
    { position: '7_9', name: 'miner' },
    { position: '7_6', name: 'general' },
    { position: '9_3', name: 'spy' },
    { position: '8_2', name: 'scout' }
  ]
};

const getCoordinate = function(position) {
  return position.split('_').map(coordinate => +coordinate);
};

const hostGame = function(req, res) {
  const playerName = req.body.playerName;
  const gameId = games.createNewGame(playerName);
  res.cookie('gameId', gameId);
  res.cookie('unit', 'red');
  res.redirect('/setup');
};

const hasFields = (...fields) => {
  return (req, res, next) => {
    if (fields.every(field => field in req.body)) {
      return next();
    }
    res.sendStatus(400);
  };
};

const getArmy = function(req, res) {
  const { unit, gameId } = req.cookies;
  if (unit && gameId) {
    res.json(games.getArmy(gameId, unit));
    return;
  }
  res.sendStatus(404);
};

const movePiece = function(req, res) {
  const { sourceTileId, targetTileId } = req.body;
  const { unit, gameId } = req.cookies;
  const isMoveSuccessful = games.movePiece(
    gameId,
    unit,
    getCoordinate(sourceTileId),
    getCoordinate(targetTileId)
  );
  if (isMoveSuccessful) {
    res.json({ action: 'move', sourceTileId, targetTileId });
    return;
  }
  res.sendStatus(400);
};

const attack = function(req, res) {
  const attackStatus = ['won', 'lost', 'draw'];
  const { sourceTileId, targetTileId, unit } = req.body;
  const gameId = req.cookies.gameId;
  const status = games.attack(
    gameId,
    unit,
    getCoordinate(sourceTileId),
    getCoordinate(targetTileId)
  );

  if (attackStatus.includes(status)) {
    res.json({
      action: 'attack',
      sourceTileId,
      targetTileId,
      status
    });
    return;
  }

  res.sendStatus(400);
};

const join = function(req, res) {
  const { playerName, gameId } = req.body;
  if (games.isGameFull(gameId)) {
    res.render('join', { errorMsg: 'Game has been started' });
    return;
  }
  if (!games.addPlayerInGame(gameId, playerName)) {
    res.render('join', { errorMsg: 'Game does not exist' });
    return;
  }
  res.cookie('gameId', gameId);
  res.cookie('unit', 'blue');
  res.redirect('/setup');
};

const setup = function(req, res) {
  const { gameId } = req.cookies;
  if (!games.getGame(gameId)) {
    res.redirect('/');
    return;
  }
  if (games.isGameFull(gameId)) {
    res.render('setup');
    return;
  }
  res.render('waiting', { gameId });
};

const serveHostPage = function(req, res) {
  res.render('host');
};

const serveJoinPage = function(req, res) {
  res.render('join');
};

const areAllPlayersJoined = function(req, res) {
  const { gameId } = req.cookies;
  const isGameFull = games.isGameFull(gameId);
  if (isGameFull) {
    res.json({ playerJoined: true });
    return;
  }
  res.json({ playerJoined: false });
};

const setupData = function(req, res) {
  const { gameId, unit } = req.cookies;
  const piecesInfo = req.body.piecesInfo;
  const isBattleFieldArranged = games.arrangeBattleField(
    gameId,
    unit,
    piecesInfo
  );

  if (!isBattleFieldArranged) {
    res.sendStatus(400).end();
    return;
  }

  if (unit === 'blue') {
    dummySetupData.unit = 'red';
  }

  games.arrangeBattleField(
    gameId,
    dummySetupData.unit,
    dummySetupData.piecesInfo
  );

  res
    .json({ page: 'game' })
    .status(200)
    .end();
};

const gamePage = function(req, res) {
  const { gameId } = req.cookies;

  if (!games.getGame(gameId)) {
    res.redirect('/');
    return;
  }

  if (games.isSetupDone(gameId)) {
    res.render('game');
    return;
  }

  res.redirect('/setup');
};

module.exports = {
  hasFields,
  hostGame,
  getArmy,
  movePiece,
  join,
  setup,
  serveHostPage,
  serveJoinPage,
  areAllPlayersJoined,
  attack,
  setupData,
  gamePage
};
