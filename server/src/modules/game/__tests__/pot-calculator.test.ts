import { PotCalculator } from '../pot-calculator';
import { GamePlayer } from '../../../../../shared/types/game.types';

describe('PotCalculator', () => {
  const createPlayer = (overrides: Partial<GamePlayer> = {}): GamePlayer => ({
    userId: '1',
    nickname: 'Player',
    seatNumber: 1,
    chips: 1000,
    bet: 0,
    totalBet: 0,
    cards: [],
    status: 'playing',
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    ...overrides
  });

  test('should calculate simple pot', () => {
    const players = [
      createPlayer({ userId: '1', totalBet: 100 }),
      createPlayer({ userId: '2', totalBet: 100 }),
      createPlayer({ userId: '3', totalBet: 100 }),
    ];
    const result = PotCalculator.calculatePots(players);
    expect(result.mainPot).toBe(300);
    expect(result.mainPotEligiblePlayerIds).toEqual(['1', '2', '3']);
    expect(result.sidePots).toHaveLength(0);
  });

  test('should calculate side pot with all-in', () => {
    const players = [
      createPlayer({ userId: '1', totalBet: 50, status: 'all_in' }),
      createPlayer({ userId: '2', totalBet: 100 }),
      createPlayer({ userId: '3', totalBet: 100 }),
    ];
    const result = PotCalculator.calculatePots(players);
    expect(result.mainPot).toBe(150); // 50 * 3
    expect(result.mainPotEligiblePlayerIds).toEqual(['1', '2', '3']);
    expect(result.sidePots).toHaveLength(1);
    expect(result.sidePots[0].amount).toBe(100); // 50 * 2
    expect(result.sidePots[0].eligiblePlayerIds).toEqual(['2', '3']);
  });

  test('should calculate multiple side pots', () => {
    const players = [
      createPlayer({ userId: '1', totalBet: 50, status: 'all_in' }),
      createPlayer({ userId: '2', totalBet: 100, status: 'all_in' }),
      createPlayer({ userId: '3', totalBet: 200 }),
    ];
    const result = PotCalculator.calculatePots(players);
    expect(result.mainPot).toBe(150); // 50 * 3
    expect(result.mainPotEligiblePlayerIds).toEqual(['1', '2', '3']);
    expect(result.sidePots).toHaveLength(2);
    expect(result.sidePots[0].amount).toBe(100); // 50 * 2
    expect(result.sidePots[0].eligiblePlayerIds).toEqual(['2', '3']);
    expect(result.sidePots[1].amount).toBe(100); // 100 * 1
    expect(result.sidePots[1].eligiblePlayerIds).toEqual(['3']);
  });

  test('should handle folded players', () => {
    const players = [
      createPlayer({ userId: '1', totalBet: 100, status: 'folded' }),
      createPlayer({ userId: '2', totalBet: 100 }),
      createPlayer({ userId: '3', totalBet: 100 }),
    ];
    const result = PotCalculator.calculatePots(players);
    expect(result.mainPot).toBe(300);
    expect(result.mainPotEligiblePlayerIds).toEqual(['2', '3']);
  });

  test('should keep folded chips in pots but exclude folded players from eligibility', () => {
    const players = [
      createPlayer({ userId: '1', totalBet: 100, status: 'folded' }),
      createPlayer({ userId: '2', totalBet: 50, status: 'all_in' }),
      createPlayer({ userId: '3', totalBet: 50, status: 'all_in' }),
    ];
    const result = PotCalculator.calculatePots(players);

    expect(result.mainPot).toBe(200);
    expect(result.mainPotEligiblePlayerIds).toEqual(['2', '3']);
    expect(result.sidePots).toHaveLength(0);
  });

  test('should distribute winnings to single winner', () => {
    const pots = [{ amount: 200, eligiblePlayerIds: ['1', '2'] }];
    const winnerIds = ['1'];
    const result = PotCalculator.distributeWinnings(pots, winnerIds);
    expect(result.get('1')).toBe(200);
    expect(result.get('2')).toBeUndefined();
  });

  test('should split pot between tied winners', () => {
    const pots = [{ amount: 200, eligiblePlayerIds: ['1', '2'] }];
    const winnerIds = ['1', '2'];
    const result = PotCalculator.distributeWinnings(pots, winnerIds);
    expect(result.get('1')).toBe(100);
    expect(result.get('2')).toBe(100);
  });

  test('should handle odd chip distribution', () => {
    const pots = [{ amount: 100, eligiblePlayerIds: ['1', '2', '3'] }];
    const winnerIds = ['1', '2', '3'];
    const result = PotCalculator.distributeWinnings(pots, winnerIds);
    // 100 / 3 = 33.33, so 33 each with 1 remainder
    expect(result.get('1')).toBe(34); // First player gets extra chip
    expect(result.get('2')).toBe(33);
    expect(result.get('3')).toBe(33);
  });
});
