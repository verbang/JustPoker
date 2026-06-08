import { CatchMidCard } from '../../../../shared/types/catch-mid.types';
import { Rank, Suit } from '../../../../shared/types/game.types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export class CatchMidDeck {
  private cards: CatchMidCard[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push({ suit, rank, isWild: false });
      }
    }
    this.cards.push({ suit: 'joker', rank: 'small_joker', isWild: true });
    this.cards.push({ suit: 'joker', rank: 'big_joker', isWild: true });
  }

  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(): CatchMidCard | null {
    return this.cards.pop() || null;
  }

  dealMultiple(count: number): CatchMidCard[] {
    if (count < 0) {
      throw new Error('Deal count cannot be negative');
    }
    if (count > this.cards.length) {
      throw new Error('Not enough cards in deck');
    }
    if (count === 0) {
      return [];
    }
    return this.cards.splice(-count, count);
  }

  remaining(): number {
    return this.cards.length;
  }

  getAll(): CatchMidCard[] {
    return [...this.cards];
  }
}
