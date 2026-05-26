import { Deck } from '../deck';

describe('Deck', () => {
  let deck: Deck;

  beforeEach(() => {
    deck = new Deck();
  });

  test('should create a deck with 52 cards', () => {
    expect(deck.remaining()).toBe(52);
  });

  test('should have all unique cards', () => {
    const cards = deck.getAll();
    const uniqueCards = new Set(cards.map(c => `${c.suit}-${c.rank}`));
    expect(uniqueCards.size).toBe(52);
  });

  test('should shuffle the deck', () => {
    const original = [...deck.getAll()];
    deck.shuffle();
    const shuffled = deck.getAll();
    expect(shuffled).not.toEqual(original);
    expect(shuffled.length).toBe(original.length);
  });

  test('should deal a card', () => {
    const card = deck.deal();
    expect(card).toBeDefined();
    expect(card?.suit).toBeDefined();
    expect(card?.rank).toBeDefined();
    expect(deck.remaining()).toBe(51);
  });

  test('should return null when deck is empty', () => {
    for (let i = 0; i < 52; i++) {
      deck.deal();
    }
    expect(deck.deal()).toBeNull();
    expect(deck.remaining()).toBe(0);
  });

  test('should reset deck to 52 cards', () => {
    deck.deal();
    deck.deal();
    deck.reset();
    expect(deck.remaining()).toBe(52);
  });

  test('should deal multiple cards', () => {
    const cards = deck.dealMultiple(5);
    expect(cards.length).toBe(5);
    expect(deck.remaining()).toBe(47);
  });

  test('should throw error when dealing more than remaining', () => {
    expect(() => deck.dealMultiple(53)).toThrow('Not enough cards in deck');
  });
});
