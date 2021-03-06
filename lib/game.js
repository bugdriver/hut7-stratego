const { Player } = require('./player');

const getPossiblePositions = function(
  { min, max },
  { fixed, variant },
  fixedValue
) {
  const container = [];

  for (let variable = min; variable <= max; ++variable) {
    const holder = [];
    holder[fixed] = fixedValue;
    holder[variant] = variable;
    container.push(holder);
  }

  return container;
};

const generateAddresses = function(from, to) {
  let fixed = 0;
  let variant = 1;

  if (from[variant] === to[variant]) {
    ++fixed;
    --variant;
  }

  const min = Math.min(from[variant], to[variant]);
  const max = Math.max(from[variant], to[variant]);
  const positions = getPossiblePositions(
    { min, max },
    { fixed, variant },
    from[fixed]
  );

  return positions.slice(1, -1).map(coordinate => coordinate.join('_'));
};

const areCoordinatesNonDiagonal = function([fromX, fromY], [toX, toY]) {
  return fromX === toX || fromY === toY;
};

const areCoordinatesWithinRange = function(from, to) {
  return from
    .concat(to)
    .every(coordinate => coordinate >= 0 && coordinate < 10);
};

const areCoordinatesOk = function(from, to) {
  return (
    areCoordinatesWithinRange(from, to) && areCoordinatesNonDiagonal(from, to)
  );
};

const getAllSoldiers = function(player) {
  const playerArmy = player.getStatus().army.map(piece => {
    const { name, position } = piece.getStatus();
    return { name, position };
  });
  return playerArmy;
};

const countPieces = function(container, piece) {
  const { individualPieceInfo } = container;
  ++container.totalPieceCount;
  if (Object.keys(individualPieceInfo).includes(piece.name)) {
    ++individualPieceInfo[piece.name];
  } else {
    container.individualPieceInfo[piece.name] = 1;
  }
  return container;
};

const validatePiecesCount = function(actualSetup, expectedSetup) {
  const expectedPieces = Object.keys(expectedSetup);
  const actualPieces = Object.keys(actualSetup);
  return actualPieces.every(piece => {
    return (
      expectedPieces.includes(piece) &&
      actualSetup[piece] === expectedSetup[piece]
    );
  });
};

const getPiecesCount = function(pieceInfo) {
  return pieceInfo.reduce(countPieces, {
    totalPieceCount: 0,
    individualPieceInfo: {}
  });
};

const validateSetup = function(pieceInfo, expectedSetup) {
  const { individualPieceInfo, totalPieceCount } = getPiecesCount(pieceInfo);
  if (totalPieceCount !== 10) {
    return false;
  }
  return validatePiecesCount(individualPieceInfo, expectedSetup);
};

const createBattleField = function(numberOfRows, numberOfColumns) {
  const lakePosition = ['2_4', '3_4', '2_5', '3_5', '6_4', '7_4', '6_5', '7_5'];
  const battleField = {};
  for (let row = 0; row < numberOfRows; row++) {
    for (let column = 0; column < numberOfColumns; column++) {
      const position = `${row}_${column}`;
      battleField[position] = undefined;
      if (lakePosition.includes(position)) {
        battleField[position] = { name: 'lake' };
      }
    }
  }
  return battleField;
};

const killPiece = function(unit, position) {
  this.battleField[position.join('_')] = undefined;
  this.getPlayer(unit).killPiece(position);
};

class Game {
  constructor(gameId, player) {
    this.id = gameId;
    this.players = [player];
    this.setupDone = false;
    this.gamePieces = {
      flag: 1,
      bomb: 2,
      marshal: 1,
      miner: 2,
      scout: 2,
      general: 1,
      spy: 1
    };
  }

  initBattleField(rows = 10, columns = 10) {
    this.battleField = createBattleField(rows, columns);
  }

  updateBattleField(from, to) {
    const previousPosition = from.join('_');
    const currentPosition = to.join('_');
    this.battleField[currentPosition] = this.battleField[previousPosition];
    this.battleField[previousPosition] = undefined;
    return currentPosition;
  }

  getId() {
    return this.id;
  }

  getStatus() {
    return {
      id: this.id,
      players: this.players.slice(),
      battleField: this.battleField
    };
  }

  getArmy(unit) {
    const opponents = { blue: 'red', red: 'blue' };
    const player = this.getPlayer(unit);
    const opponentPlayer = this.getPlayer(opponents[unit]);
    const playerArmy = getAllSoldiers(player);
    const opponentArmy = getAllSoldiers(opponentPlayer);
    if (unit === 'red') {
      return { redArmy: playerArmy, blueArmy: opponentArmy };
    }
    return { redArmy: opponentArmy, blueArmy: playerArmy };
  }

  addPlayer(player) {
    if (player instanceof Player) {
      return this.players.push(player);
    }
    return this.players.length;
  }

  getPlayer(unit) {
    return this.players.find(player => player.getStatus().unit === unit);
  }

  arrangeBattleField(unit, setupData) {
    const setupValidation =
      ['red', 'blue'].includes(unit) &&
      validateSetup(setupData, this.gamePieces);

    if (setupValidation) {
      const player = this.getPlayer(unit);
      setupData.forEach(({ name, position }) => {
        const piecePosition = position.split('_').map(coords => +coords);
        player.addPiece(name, piecePosition);
        this.battleField[position] = player.getPieceStatus(piecePosition);
      });

      this.finishedSetup();
    }

    return setupValidation;
  }

  hasObstacle(from, to) {
    const battleFieldAddresses = generateAddresses(from, to);
    return battleFieldAddresses.every(address => !this.battleField[address]);
  }

  isValidPiece(unit, position) {
    const piece = this.battleField[position.join('_')];
    return piece && piece.unit === unit;
  }

  isValidMove(unit, currentPosition, targetPosition) {
    return (
      areCoordinatesOk(currentPosition, targetPosition) &&
      this.isValidPiece(unit, currentPosition) &&
      this.hasObstacle(currentPosition, targetPosition) &&
      !this.battleField[targetPosition.join('_')]
    );
  }

  movePiece(unit, from, to) {
    const player = this.getPlayer(unit);
    const isMovementDone =
      player && this.isValidMove(unit, from, to) && player.movePiece(from, to);
    if (isMovementDone) {
      this.updateBattleField(from, to);
    }
    return isMovementDone;
  }

  doAttackOperation(unit, attacker, defender, status) {
    const opponentUnit = { red: 'blue', blue: 'red' }[unit];
    const killOpponent = killPiece.bind(this, opponentUnit, defender);
    const killSelf = killPiece.bind(this, unit, attacker);
    const moveSelf = this.movePiece.bind(this, unit, attacker, defender);

    const operationLookup = {
      draw: [killOpponent, killSelf],
      won: [killOpponent, moveSelf],
      lost: [killSelf],
      unsuccessful: []
    };

    operationLookup[status].forEach(operation => operation());
  }

  isValidAttack(unit, attackerPosition, defenderPosition) {
    return (
      areCoordinatesOk(attackerPosition, defenderPosition) &&
      this.isValidPiece(unit, attackerPosition) &&
      this.hasObstacle(attackerPosition, defenderPosition) &&
      this.battleField[defenderPosition.join('_')].unit !== unit
    );
  }

  attack(unit, from, to) {
    const player = this.getPlayer(unit);

    if (!player || !this.isValidAttack(unit, from, to)) {
      return 'unsuccessful';
    }

    const defenderPieceName = this.battleField[to.join('_')].name;
    const status = player.getAttackStatus(from, defenderPieceName);
    this.doAttackOperation(unit, from, to, status);

    return status;
  }

  isFull() {
    return this.players.length === 2;
  }

  finishedSetup() {
    this.setupDone = true;
  }

  isSetupDone() {
    return this.setupDone;
  }
}

module.exports = { Game };
