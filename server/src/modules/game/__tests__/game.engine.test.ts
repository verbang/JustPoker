import { GameEngine } from '../game.engine';
import { Card, GamePlayer, GameState } from '../../../../../shared/types/game.types';

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

  test('should rotate dealer from previous dealer seat', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1 }),
      createPlayer({ userId: '2', seatNumber: 2 }),
      createPlayer({ userId: '3', seatNumber: 3 }),
    ];
    const state = engine.startGame('room1', players, 5, 10, 1);
    expect(state.players[state.dealerIndex].seatNumber).toBe(2);
    expect(state.players[state.smallBlindIndex].seatNumber).toBe(3);
    expect(state.players[state.bigBlindIndex].seatNumber).toBe(1);
  });

  test('should wrap dealer when previous dealer was highest seat', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1 }),
      createPlayer({ userId: '2', seatNumber: 2 }),
      createPlayer({ userId: '3', seatNumber: 3 }),
    ];
    const state = engine.startGame('room1', players, 5, 10, 3);
    expect(state.players[state.dealerIndex].seatNumber).toBe(1);
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

  test('should deal hole cards one at a time from dealer left in multi-way hand', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1 }),
      createPlayer({ userId: '2', seatNumber: 2 }),
      createPlayer({ userId: '3', seatNumber: 3 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);

    expect(state.players[1].cards[0]).not.toEqual(state.players[1].cards[1]);
    expect(state.players[1].cards).toHaveLength(2);
    expect(state.players[2].cards).toHaveLength(2);
    expect(state.players[0].cards).toHaveLength(2);
  });

  test('should deal first heads-up hole card to big blind', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1 }),
      createPlayer({ userId: '2', seatNumber: 2 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);

    expect(state.players[state.bigBlindIndex].cards).toHaveLength(2);
    expect(state.players[state.dealerIndex].cards).toHaveLength(2);
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
      createPlayer({ userId: '1', seatNumber: 1 }),
      createPlayer({ userId: '2', seatNumber: 2 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);
    // Player 1 (small blind) calls to 10
    const result = engine.playerAction(state, '1', 'call');
    expect(result.players[0].bet).toBe(10);
    expect(result.players[0].chips).toBe(990);
  });

  test('should turn short call into all-in without negative chips', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 8 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 1000 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);
    const result = engine.playerAction(state, '1', 'call');
    expect(result.players[0].bet).toBe(8);
    expect(result.players[0].chips).toBe(0);
    expect(result.players[0].status).toBe('all_in');
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

  test('should handle bet action when no current bet exists', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 995 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 990 }),
    ];
    let state = engine.startGame('room1', players, 5, 10);

    state = engine.playerAction(state, '1', 'call');
    state = engine.playerAction(state, '2', 'check');
    const result = engine.playerAction(state, '2', 'bet', 10);

    expect(result.currentBet).toBe(10);
    expect(result.players[1].bet).toBe(10);
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

  test('should reject raise below minimum raise', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1 }),
      createPlayer({ userId: '2', seatNumber: 2 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);
    expect(() => engine.playerAction(state, '1', 'raise', 15)).toThrow('minimum raise');
  });

  test('should not reopen action for incomplete all-in raise', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 15 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 100 }),
      createPlayer({ userId: '3', seatNumber: 3, chips: 100 }),
    ];
    let state = engine.startGame('room1', players, 5, 10);
    state = engine.playerAction(state, '1', 'all_in');

    expect(state.currentBet).toBe(15);
    expect(state.minRaise).toBe(10);

    state = engine.playerAction(state, '2', 'call');
    state = engine.playerAction(state, '3', 'call');
    expect(state.phase).toBe('flop');
  });

  test('should lock previous callers from raising after incomplete all-in raise', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 100 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 100 }),
      createPlayer({ userId: '3', seatNumber: 3, chips: 100 }),
    ];
    let state = engine.startGame('room1', players, 5, 10);
    state = engine.playerAction(state, '1', 'raise', 30);
    state = engine.playerAction(state, '2', 'call');
    state = {
      ...state,
      players: state.players.map(p => p.userId === '3' ? { ...p, chips: 25 } : p),
    };
    state = engine.playerAction(state, '3', 'all_in');

    expect(state.currentBet).toBe(35);
    expect(state.minRaise).toBe(20);
    expect(state.minRaiseTo).toBe(50);
    expect(() => engine.playerAction(state, '1', 'raise', 55)).toThrow('Cannot raise');
  });

  test('should allow unacted player to raise from last full raise amount after incomplete all-in', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 100 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 100 }),
      createPlayer({ userId: '3', seatNumber: 3, chips: 100 }),
      createPlayer({ userId: '4', seatNumber: 4, chips: 100 }),
    ];
    let state = engine.startGame('room1', players, 5, 10);
    state = engine.playerAction(state, '4', 'raise', 30);
    state = {
      ...state,
      players: state.players.map(p => p.userId === '1' ? { ...p, chips: 35 } : p),
    };
    state = engine.playerAction(state, '1', 'all_in');

    expect(state.currentBet).toBe(35);
    expect(state.minRaiseTo).toBe(50);

    const result = engine.playerAction(state, '2', 'raise', 50);
    expect(result.currentBet).toBe(50);
    expect(result.minRaise).toBe(20);
    expect(result.minRaiseTo).toBe(70);
  });

  test('should post short blinds as all-in without negative chips', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 100 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 3 }),
      createPlayer({ userId: '3', seatNumber: 3, chips: 7 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);
    expect(state.players[1].bet).toBe(3);
    expect(state.players[1].chips).toBe(0);
    expect(state.players[1].status).toBe('all_in');
    expect(state.players[2].bet).toBe(7);
    expect(state.players[2].chips).toBe(0);
    expect(state.players[2].status).toBe('all_in');
    expect(state.pot).toBe(10);
  });

  test('should not require all-in blinds to act before progressing', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 100 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 3 }),
      createPlayer({ userId: '3', seatNumber: 3, chips: 7 }),
    ];
    let state = engine.startGame('room1', players, 5, 10);
    state = engine.playerAction(state, '1', 'call');

    expect(state.phase).toBe('flop');
  });

  test('should skip heads-up small blind when blind post makes them all-in', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 5 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 100 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);

    expect(state.players[state.smallBlindIndex].status).toBe('all_in');
    expect(state.players[state.currentPlayerIndex].userId).toBe('2');
    expect(state.players[state.currentPlayerIndex].status).toBe('playing');
  });

  test('should run out board immediately when all players are all-in from blinds', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 5 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 10 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);

    expect(state.status).toBe('finished');
    expect(state.phase).toBe('river');
    expect(state.communityCards).toHaveLength(5);
    expect(state.winnerId).toBeDefined();
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

  test('should burn one card before each community street', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 995 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 990 }),
    ];
    let state = engine.startGame('room1', players, 5, 10);

    state = engine.playerAction(state, '1', 'call');
    state = engine.playerAction(state, '2', 'check');
    state = engine.playerAction(state, '2', 'check');
    state = engine.playerAction(state, '1', 'check');
    state = engine.playerAction(state, '2', 'check');
    state = engine.playerAction(state, '1', 'check');

    const visibleCardCount = state.players.reduce((count, player) => count + player.cards.length, 0) +
      state.communityCards.length;
    expect(state.phase).toBe('river');
    expect(visibleCardCount).toBe(9);
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
    state = engine.playerAction(state, '2', 'check');
    state = engine.playerAction(state, '1', 'check');

    expect(state.phase).toBe('turn');
    expect(state.communityCards).toHaveLength(4);
  });

  test('should let big blind act first after flop in heads-up', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1 }),
      createPlayer({ userId: '2', seatNumber: 2 }),
    ];
    let state = engine.startGame('room1', players, 5, 10);
    state = engine.playerAction(state, '1', 'call');
    state = engine.playerAction(state, '2', 'check');

    expect(state.phase).toBe('flop');
    expect(state.players[state.currentPlayerIndex].userId).toBe('2');
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
    state = engine.playerAction(state, '2', 'check');
    state = engine.playerAction(state, '1', 'check');

    // Turn
    state = engine.playerAction(state, '2', 'check');
    state = engine.playerAction(state, '1', 'check');

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
    state = engine.playerAction(state, '2', 'check');
    state = engine.playerAction(state, '1', 'check');
    state = engine.playerAction(state, '2', 'check');
    state = engine.playerAction(state, '1', 'check');
    state = engine.playerAction(state, '2', 'check');
    state = engine.playerAction(state, '1', 'check');

    expect(state.status).toBe('finished');
    expect(state.winnerId).toBeDefined();
  });

  test('should expose all winner ids for tied showdown', () => {
    const communityCards: Card[] = [
      { suit: 'hearts', rank: 'A' },
      { suit: 'clubs', rank: 'K' },
      { suit: 'diamonds', rank: 'Q' },
      { suit: 'spades', rank: 'J' },
      { suit: 'clubs', rank: '9' },
    ];
    const state: GameState = {
      id: 'game1',
      roomId: 'room1',
      phase: 'river',
      pot: 20,
      communityCards,
      currentPlayerIndex: 0,
      dealerIndex: 0,
      smallBlindIndex: 0,
      bigBlindIndex: 1,
      currentBet: 0,
      minRaise: 10,
      minRaiseTo: 10,
      status: 'playing',
      sidePots: [],
      players: [
        createPlayer({
          userId: '1',
          chips: 0,
          totalBet: 10,
          cards: [
            { suit: 'hearts', rank: '2' },
            { suit: 'diamonds', rank: '3' },
          ],
        }),
        createPlayer({
          userId: '2',
          chips: 0,
          totalBet: 10,
          cards: [
            { suit: 'clubs', rank: '2' },
            { suit: 'spades', rank: '3' },
          ],
        }),
      ],
    };

    const afterFirstCheck = engine.playerAction(state, '1', 'check');
    const result = engine.playerAction(afterFirstCheck, '2', 'check');
    expect(result.status).toBe('finished');
    expect(result.winnerIds).toEqual(['2', '1']);
    expect(result.players.find(p => p.userId === '1')?.chips).toBe(10);
    expect(result.players.find(p => p.userId === '2')?.chips).toBe(10);
  });

  test('should distribute side pots to each pot winner independently', () => {
    const communityCards: Card[] = [
      { suit: 'hearts', rank: '2' },
      { suit: 'clubs', rank: '7' },
      { suit: 'diamonds', rank: '9' },
      { suit: 'spades', rank: 'J' },
      { suit: 'clubs', rank: 'Q' },
    ];
    const state: GameState = {
      id: 'game1',
      roomId: 'room1',
      phase: 'river',
      pot: 300,
      communityCards,
      currentPlayerIndex: 0,
      dealerIndex: 0,
      smallBlindIndex: 1,
      bigBlindIndex: 2,
      currentBet: 0,
      minRaise: 10,
      minRaiseTo: 10,
      status: 'playing',
      sidePots: [],
      players: [
        createPlayer({
          userId: '1',
          chips: 0,
          totalBet: 50,
          status: 'all_in',
          cards: [
            { suit: 'hearts', rank: 'A' },
            { suit: 'diamonds', rank: 'A' },
          ],
        }),
        createPlayer({
          userId: '2',
          chips: 0,
          totalBet: 100,
          status: 'all_in',
          cards: [
            { suit: 'hearts', rank: 'K' },
            { suit: 'diamonds', rank: 'K' },
          ],
        }),
        createPlayer({
          userId: '3',
          chips: 0,
          totalBet: 100,
          status: 'all_in',
          cards: [
            { suit: 'hearts', rank: '3' },
            { suit: 'diamonds', rank: '3' },
          ],
        }),
      ],
    };

    const result = engine.playerAction(state, '1', 'check');

    expect(result.status).toBe('finished');
    expect(result.players.find(p => p.userId === '1')?.chips).toBe(150);
    expect(result.players.find(p => p.userId === '2')?.chips).toBe(100);
    expect(result.players.find(p => p.userId === '3')?.chips).toBe(0);
  });

  test('should award folded player excess chips to eligible showdown players', () => {
    const communityCards: Card[] = [
      { suit: 'hearts', rank: '2' },
      { suit: 'clubs', rank: '7' },
      { suit: 'diamonds', rank: '9' },
      { suit: 'spades', rank: 'J' },
      { suit: 'clubs', rank: 'Q' },
    ];
    const state: GameState = {
      id: 'game1',
      roomId: 'room1',
      phase: 'river',
      pot: 200,
      communityCards,
      currentPlayerIndex: 1,
      dealerIndex: 0,
      smallBlindIndex: 1,
      bigBlindIndex: 2,
      currentBet: 0,
      minRaise: 10,
      minRaiseTo: 10,
      status: 'playing',
      sidePots: [],
      players: [
        createPlayer({
          userId: '1',
          chips: 0,
          totalBet: 100,
          status: 'folded',
          cards: [
            { suit: 'hearts', rank: 'A' },
            { suit: 'diamonds', rank: 'A' },
          ],
        }),
        createPlayer({
          userId: '2',
          chips: 0,
          totalBet: 50,
          status: 'all_in',
          cards: [
            { suit: 'hearts', rank: 'K' },
            { suit: 'diamonds', rank: 'K' },
          ],
        }),
        createPlayer({
          userId: '3',
          chips: 0,
          totalBet: 50,
          status: 'all_in',
          cards: [
            { suit: 'hearts', rank: '3' },
            { suit: 'diamonds', rank: '3' },
          ],
        }),
      ],
    };

    const result = engine.playerAction(state, '2', 'check');

    expect(result.status).toBe('finished');
    expect(result.players.find(p => p.userId === '1')?.chips).toBe(0);
    expect(result.players.find(p => p.userId === '2')?.chips).toBe(200);
    expect(result.players.find(p => p.userId === '3')?.chips).toBe(0);
  });

  test('should force fold a disconnected player outside their turn', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1 }),
      createPlayer({ userId: '2', seatNumber: 2 }),
      createPlayer({ userId: '3', seatNumber: 3 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);
    const result = engine.forceFold(state, '2');
    expect(result.players[1].status).toBe('folded');
    expect(result.currentPlayerIndex).toBe(state.currentPlayerIndex);
  });

  test('should skip out players when moving to next action', () => {
    const state: GameState = {
      id: 'test',
      roomId: 'room1',
      phase: 'flop',
      pot: 30,
      communityCards: [
        { suit: 'hearts', rank: '2' },
        { suit: 'diamonds', rank: '7' },
        { suit: 'clubs', rank: 'J' },
      ],
      currentPlayerIndex: 0,
      dealerIndex: 2,
      smallBlindIndex: 0,
      bigBlindIndex: 1,
      currentBet: 0,
      minRaise: 10,
      minRaiseTo: 10,
      sidePots: [],
      status: 'playing',
      players: [
        createPlayer({ userId: '1', seatNumber: 1, bet: 0 }),
        createPlayer({ userId: '2', seatNumber: 2, status: 'out', bet: 0 }),
        createPlayer({ userId: '3', seatNumber: 3, bet: 0 }),
      ],
    };

    const result = engine.playerAction(state, '1', 'check');

    expect(result.status).toBe('playing');
    expect(result.currentPlayerIndex).toBe(2);
  });

  test('应在玩家全下后实时填充 sidePots', () => {
    // players 数组索引决定座位：index 0→dealer, index 1→SB, index 2→BB
    // 行动顺序 preflop：index 0(dealer) → index 1(SB) → index 2(BB)
    // Player 2(SB) 仅 7 筹码，SB 5 + call 2 → 全下 7 < BB 10，产生边池
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 200 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 7 }),
      createPlayer({ userId: '3', seatNumber: 3, chips: 200 }),
    ];
    let state = engine.startGame('room1', players, 5, 10);

    // Player 1 (dealer) calls
    state = engine.playerAction(state, '1', 'call');
    // Player 2 (SB) calls → all-in（SB 5 + call 2 = 7）
    state = engine.playerAction(state, '2', 'call');
    expect(state.players.find(p => p.userId === '2')!.status).toBe('all_in');
    // 此时 sidePots 应已填充（Player 2 短码全下，边池 = (10-7)*2 = 6）
    expect(state.sidePots.length).toBeGreaterThanOrEqual(1);
    const sidePotsTotal = state.sidePots.reduce((sum, sp) => sum + sp.amount, 0);
    expect(sidePotsTotal).toBeGreaterThan(0);
  });

  test('阶段切换后 sidePots 应保持正确', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 200 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 7 }),
      createPlayer({ userId: '3', seatNumber: 3, chips: 200 }),
    ];
    let state = engine.startGame('room1', players, 5, 10);

    // preflop: 1(dealer) calls, 2(SB) calls all-in, 3(BB) checks → flop
    state = engine.playerAction(state, '1', 'call');
    state = engine.playerAction(state, '2', 'call');
    state = engine.playerAction(state, '3', 'check');

    expect(state.phase).toBe('flop');
    expect(state.sidePots.length).toBeGreaterThanOrEqual(1);
    const sidePotsTotal = state.sidePots.reduce((sum, sp) => sum + sp.amount, 0);
    expect(sidePotsTotal).toBeGreaterThan(0);
  });
});
