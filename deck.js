// Create an array to represent the deck of cards
const deck = [];

// Create an array of suits and ranks to use in creating the deck
const suits = ["Diamantes", "Picas", "Treboles", "Corazones"];
const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];

// Use nested loops to create the deck, with one loop for the suits and one for the ranks
for (let suit of suits) {
  for (let rank of ranks) {
    let id = rank + suit[0];
    deck.push({ suit, rank, id });
  }
}

// Shufle the deck
for (let i = deck.length - 1; i > 0; i--) {
  let j = Math.floor(Math.random() * (i + 1));
  [deck[i], deck[j]] = [deck[j], deck[i]];
}

module.exports = deck;