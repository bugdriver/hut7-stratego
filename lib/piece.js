const pieceRanks = {
  flag: 0,
  bomb: 11,
  scout: 2,
  marshal: 10,
  spy: 1,
  sergeant: 4,
  colonel: 8,
  general: 9,
  lieutenant: 5,
  captain: 6,
  major: 7,
  miner: 3
};

const isDeltaOne = function(start, target) {
  return start === target + 1 || start === target - 1;
};

const isTargetAdjacent = function([fromX, fromY], [toX, toY]) {
  const validCoords =
    fromX === toX ? [fromY, toY] : fromY === toY ? [fromX, toX] : false;
  return validCoords && isDeltaOne(...validCoords);
};

class Piece {
  constructor(name, position) {
    this.name = name;
    this.position = position;
    this.isAlive = true;
    this.rank = pieceRanks[name];
    this.isMobile = true;
  }

  kill() {
    this.isAlive = false;
  }

  getStatus() {
    return {
      name: this.name,
      position: this.position.slice(),
      rank: this.rank
    };
  }

  isMovePossible(target) {
    return this.isMobile && isTargetAdjacent(this.position, target);
  }

  move(newPosition) {
    this.position = newPosition;
    return this.position.slice();
  }

  isSpecialAttack(defenderPieceName) {
    return defenderPieceName === this.attackException;
  }

  getAttackStatus(defenderPieceName) {
    const attackerRank = this.rank;
    const defenderRank = pieceRanks[defenderPieceName];
    if (this.isSpecialAttack(defenderPieceName)) {
      return 'won';
    }

    if (attackerRank === defenderRank) {
      return 'draw';
    }

    return defenderRank < attackerRank ? 'won' : 'lost';
  }
}

class Scout extends Piece {
  constructor(name, position) {
    super(name, position);
  }

  isMovePossible(target) {
    const [fromX, fromY] = this.position;
    const [toX, toY] = target;
    return this.isMobile && (fromX === toX || fromY === toY);
  }
}

class Spy extends Piece {
  constructor(name, position) {
    super(name, position);
    this.attackException = 'marshal';
  }
}

class Miner extends Piece {
  constructor(name, position) {
    super(name, position);
    this.attackException = 'bomb';
  }
}

class StablePiece extends Piece {
  constructor(name, position) {
    super(name, position);
    this.allowedMoves = [];
    this.isMobile = false;
  }
}

const createPiece = function(name, position) {
  const inheritanceLookup = new Map([
    [['bomb', 'flag'], StablePiece],
    [['scout'], Scout],
    [['miner'], Miner],
    [['spy'], Spy],
    [['marshal', 'general'], Piece]
  ]);
  let pieceConstructor;

  inheritanceLookup.forEach((constructor, pieceGroup) => {
    if (pieceGroup.includes(name)) {
      pieceConstructor = constructor;
    }
  });

  return new pieceConstructor(name, position);
};

module.exports = { Piece, StablePiece, Scout, createPiece };
