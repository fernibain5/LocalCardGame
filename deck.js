const createDeck = () => {
  const deck = [];
  const suits = ["Diamantes", "Picas", "Treboles", "Corazones"];
  const ranks = [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "T",
    "J",
    "Q",
    "K",
    "A",
  ];

  for (let suit of suits) {
    for (let rank of ranks) {
      let id = rank + suit[0];
      deck.push({ suit, rank, id });
    }
  }

  // Shuffle the deck using the Fisher-Yates shuffle algorithm
  for (let i = deck.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

module.exports = createDeck;
