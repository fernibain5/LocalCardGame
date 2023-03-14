function compareHands(hand1, hand2) {
  let hand1Type = getHandType(hand1);
  let hand2Type = getHandType(hand2);

  if (hand1Type > hand2Type) {
    return "Win";
  } else if (hand1Type < hand2Type) {
    return "Lose";
  } else {
    let hand1TieBreaker = getTieBreaker(hand1, hand1Type);
    let hand2TieBreaker = getTieBreaker(hand2, hand2Type);
    for (let i = 0; i < hand1TieBreaker.length; i++) {
      if (hand1TieBreaker[i] > hand2TieBreaker[i]) {
        return "Win";
      } else if (hand1TieBreaker[i] < hand2TieBreaker[i]) {
        return "Lose";
      }
    }
    return "Tie";
  }
}
function convertListToInt(pokerHand) {
  let pokerHands = pokerHand.map((card) => {
    switch (card) {
      case "T":
        return 10;
      case "J":
        return 11;
      case "Q":
        return 12;
      case "K":
        return 13;
      case "A":
        return 14;
      default:
        return Number(card);
    }
  });
  return pokerHands;
}

function isRoyalFlush(hand) {
  let values = hand.map((card) => card.rank);
  if (
    isFlush(hand) &&
    isStraight(hand) &&
    values.includes(10) &&
    values.includes("A")
  ) {
    return true;
  }
  return false;
}

function isStraightFlush(hand) {
  return isFlush(hand) && isStraight(hand);
}

function isFourOfAKind(hand) {
  let values = hand.map((card) => card.rank);
  let counts = {};
  values.forEach((value) => {
    if (counts[value]) {
      counts[value]++;
    } else {
      counts[value] = 1;
    }
  });
  for (let value in counts) {
    if (counts[value] === 4) {
      return true;
    }
  }
  return false;
}

function isFullHouse(hand) {
  let values = hand.map((card) => card.rank);
  let counts = {};
  values.forEach((value) => {
    if (counts[value]) {
      counts[value]++;
    } else {
      counts[value] = 1;
    }
  });
  let three = false;
  let two = false;
  for (let value in counts) {
    if (counts[value] === 3) {
      three = true;
    } else if (counts[value] === 2) {
      two = true;
    }
  }
  return three && two;
}

function isFlush(hand) {
  let suits = hand.map((card) => card["suit"]);
  return new Set(suits).size === 1;
}

function isStraight(hand) {
  let ranks = hand.map((card) => card.rank);
  let values = convertListToInt(ranks);
  values.sort((a, b) => a - b);
  if (values === [2, 3, 4, 5, 14]) return true;
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] + 1 !== values[i + 1]) {
      return false;
    }
  }
  return true;
}

function isThreeOfAKind(hand) {
  let values = hand.map((card) => card.rank);
  let counts = {};
  values.forEach((value) => {
    if (counts[value]) {
      counts[value]++;
    } else {
      counts[value] = 1;
    }
  });
  for (let value in counts) {
    if (counts[value] === 3) {
      return true;
    }
  }
  return false;
}

function isTwoPairs(hand) {
  let ranks = hand.map((card) => card.rank);
  let rankCount = {};
  for (let i = 0; i < ranks.length; i++) {
    if (rankCount[ranks[i]]) {
      rankCount[ranks[i]]++;
    } else {
      rankCount[ranks[i]] = 1;
    }
  }
  let pairs = 0;
  for (let rank in rankCount) {
    if (rankCount[rank] === 2) {
      pairs++;
    }
  }
  return pairs === 2;
}

function isOnePair(hand) {
  let ranks = hand.map((card) => card.rank);
  let rankCount = {};
  for (let i = 0; i < ranks.length; i++) {
    if (rankCount[ranks[i]]) {
      rankCount[ranks[i]]++;
    } else {
      rankCount[ranks[i]] = 1;
    }
  }
  let pairs = 0;
  for (let rank in rankCount) {
    if (rankCount[rank] === 2) {
      pairs++;
    }
  }
  return pairs === 1;
}

function getHandType(hand) {
  if (isRoyalFlush(hand)) {
    return 10;
  } else if (isStraightFlush(hand)) {
    return 9;
  } else if (isFourOfAKind(hand)) {
    return 8;
  } else if (isFullHouse(hand)) {
    return 7;
  } else if (isFlush(hand)) {
    return 6;
  } else if (isStraight(hand)) {
    return 5;
  } else if (isThreeOfAKind(hand)) {
    return 4;
  } else if (isTwoPairs(hand)) {
    return 3;
  } else if (isOnePair(hand)) {
    return 2;
  } else {
    return 1;
  }
}

function getHandType(hand) {
  if (isRoyalFlush(hand)) {
    return 10;
  } else if (isStraightFlush(hand)) {
    return 9;
  } else if (isFourOfAKind(hand)) {
    return 8;
  } else if (isFullHouse(hand)) {
    return 7;
  } else if (isFlush(hand)) {
    return 6;
  } else if (isStraight(hand)) {
    return 5;
  } else if (isThreeOfAKind(hand)) {
    return 4;
  } else if (isTwoPairs(hand)) {
    return 3;
  } else if (isOnePair(hand)) {
    return 2;
  } else {
    return 1;
  }
}

function getTieBreaker(hand, handType) {
  let ranks = hand.map((card) => card.rank);
  let values = convertListToInt(ranks);

  let counts = {};
  values.forEach((value) => {
    if (counts[value]) {
      counts[value]++;
    } else {
      counts[value] = 1;
    }
  });
  if (handType === 10) {
    return [14];
  } else if (handType === 9) {
    return [Math.max(...values)];
  } else if (handType === 8) {
    for (let value in counts) {
      if (counts[value] === 4) {
        return [Number(value)];
      }
    }
  } else if (handType === 7) {
    let three = 0,
      two = 0;
    for (let value in counts) {
      if (counts[value] === 3) {
        three = Number(value);
      } else if (counts[value] === 2) {
        two = Number(value);
      }
    }
    return [three, two];
  } else if (handType === 6) {
    return values.sort((a, b) => b - a);
  } else if (handType === 5) {
    if (values.includes(14) && values.includes(2)) return [0];

    return [Math.max(...values)];
  } else if (handType === 4) {
    let three = 0;
    for (let value in counts) {
      if (counts[value] === 3) {
        three = Number(value);
      }
    }
    return [three];
  } else if (handType === 3) {
    let twoPairs = [];
    let highCard;
    for (let value in counts) {
      if (counts[value] === 2) {
        twoPairs.push(Number(value));
      }
      if (counts[value] === 1) {
        highCard = Number(value);
      }
    }
    twoPairs.sort((a, b) => b - a);
    return [...twoPairs, highCard];
  } else if (handType === 2) {
    let pair;
    let highCards = [];
    for (let value in counts) {
      if (counts[value] === 2) {
        pair = Number(value);
      } else {
        highCards.push(Number(value));
      }
    }
    highCards.sort((a, b) => b - a);

    return [pair, ...highCards];
  } else if (handType === 1) {
    return values.sort((a, b) => b - a);
  }
}

module.exports = compareHands;
