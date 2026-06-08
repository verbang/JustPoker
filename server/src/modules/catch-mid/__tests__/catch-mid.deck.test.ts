import { CatchMidDeck } from '../catch-mid.deck';

describe('CatchMidDeck', () => {
  test('应创建包含大小王的 54 张牌组', () => {
    const deck = new CatchMidDeck();
    const cards = deck.getAll();

    expect(cards).toHaveLength(54);
    expect(cards.filter(card => card.isWild)).toHaveLength(2);
    expect(cards.filter(card => card.suit !== 'joker')).toHaveLength(52);
  });

  test('每个普通花色应包含 13 个点数', () => {
    const deck = new CatchMidDeck();
    const cards = deck.getAll();

    for (const suit of ['hearts', 'diamonds', 'clubs', 'spades'] as const) {
      expect(cards.filter(card => card.suit === suit)).toHaveLength(13);
    }
  });

  test('大小王应标记为万能牌，普通牌不标记', () => {
    const deck = new CatchMidDeck();
    const cards = deck.getAll();

    expect(cards.some(card => card.rank === 'small_joker' && card.isWild)).toBe(true);
    expect(cards.some(card => card.rank === 'big_joker' && card.isWild)).toBe(true);
    expect(cards.filter(card => !card.isWild).every(card => card.suit !== 'joker')).toBe(true);
  });

  test('洗牌不应改变牌组内容', () => {
    const deck = new CatchMidDeck();
    deck.shuffle();
    const keys = deck.getAll().map(card => `${card.suit}-${card.rank}`);

    expect(keys).toHaveLength(54);
    expect(new Set(keys).size).toBe(54);
  });

  test('发牌后应扣减剩余牌数', () => {
    const deck = new CatchMidDeck();
    const dealt = deck.dealMultiple(5);

    expect(dealt).toHaveLength(5);
    expect(deck.remaining()).toBe(49);
  });

  test('发 0 张牌应返回空数组且不改变牌库', () => {
    const deck = new CatchMidDeck();

    expect(deck.dealMultiple(0)).toEqual([]);
    expect(deck.remaining()).toBe(54);
  });

  test('牌库不足时应抛出异常', () => {
    const deck = new CatchMidDeck();

    expect(() => deck.dealMultiple(55)).toThrow('Not enough cards in deck');
  });
});
