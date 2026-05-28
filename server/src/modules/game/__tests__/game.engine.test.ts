import { GameEngine } from '../game.engine';
import { GamePlayer, GameState } from '../../../../../shared/types/game.types';

describe('GameEngine', () => {
  let engine: GameEngine;

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

  beforeEach(() => {
    engine = new GameEngine();
  });

  test('should start a new game', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1 }),
      createPlayer({ userId: '2', seatNumber: 2 }),
      createPlayer({ userId: '3', seatNumber: 3 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);
    expect(state.status).toBe('playing');
    expect(state.phase).toBe('preflop');
    expect(state.pot).toBe(15); // 5 + 10
    expect(state.players).toHaveLength(3);
  });

  test('should deal hole cards', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1 }),
      createPlayer({ userId: '2', seatNumber: 2 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);
    state.players.forEach(player => {
      expect(player.cards).toHaveLength(2);
    });
  });

  test('should handle fold action', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1 }),
      createPlayer({ userId: '2', seatNumber: 2 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);
    const result = engine.playerAction(state, '1', 'fold');
    expect(result.players[0].status).toBe('folded');
  });

  test('should handle call action', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 995 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 990 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);
    // Player 1 (small blind) calls to 10
    const result = engine.playerAction(state, '1', 'call');
    expect(result.players[0].bet).toBe(10);
    expect(result.players[0].chips).toBe(990);
  });

  test('should handle raise action', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 995 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 990 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);
    // Player 1 raises to 50
    const result = engine.playerAction(state, '1', 'raise', 50);
    expect(result.players[0].bet).toBe(50);
    expect(result.currentBet).toBe(50);
  });

  test('should handle all-in action', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 100 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 1000 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);
    const result = engine.playerAction(state, '1', 'all_in');
    expect(result.players[0].bet).toBe(100);
    expect(result.players[0].chips).toBe(0);
    expect(result.players[0].status).toBe('all_in');
  });

  test('should progress to flop', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 995 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 990 }),
    ];
    let state = engine.startGame('room1', players, 5, 10);

    // Both players call
    state = engine.playerAction(state, '1', 'call');
    state = engine.playerAction(state, '2', 'check');

    expect(state.phase).toBe('flop');
    expect(state.communityCards).toHaveLength(3);
  });

  test('should progress to turn', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 995 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 990 }),
    ];
    let state = engine.startGame('room1', players, 5, 10);

    // Preflop
    state = engine.playerAction(state, '1', 'call');
    state = engine.playerAction(state, '2', 'check');

    // Flop
    state = engine.playerAction(state, '1', 'check');
    state = engine.playerAction(state, '2', 'check');

    expect(state.phase).toBe('turn');
    expect(state.communityCards).toHaveLength(4);
  });

  test('should progress to river', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 995 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 990 }),
    ];
    let state = engine.startGame('room1', players, 5, 10);

    // Preflop
    state = engine.playerAction(state, '1', 'call');
    state = engine.playerAction(state, '2', 'check');

    // Flop
    state = engine.playerAction(state, '1', 'check');
    state = engine.playerAction(state, '2', 'check');

    // Turn
    state = engine.playerAction(state, '1', 'check');
    state = engine.playerAction(state, '2', 'check');

    expect(state.phase).toBe('river');
    expect(state.communityCards).toHaveLength(5);
  });

  test('should determine winner at showdown', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 995 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 990 }),
    ];
    let state = engine.startGame('room1', players, 5, 10);

    // Play through all rounds
    state = engine.playerAction(state, '1', 'call');
    state = engine.playerAction(state, '2', 'check');
    state = engine.playerAction(state, '1', 'check');
    state = engine.playerAction(state, '2', 'check');
    state = engine.playerAction(state, '1', 'check');
    state = engine.playerAction(state, '2', 'check');
    state = engine.playerAction(state, '1', 'check');
    state = engine.playerAction(state, '2', 'check');

    expect(state.status).toBe('finished');
    expect(state.winnerId).toBeDefined();
  });
});
