import { RoomPlayer } from '../../../../../shared/types/room.types';
import { CatchMidGameState } from '../../../../../shared/types/catch-mid.types';
import { CatchMidEngine } from '../catch-mid.engine';

const createRoomPlayer = (index: number, chips = 100): RoomPlayer => ({
  id: `rp-${index}`,
  roomId: 'room-1',
  userId: `user-${index}`,
  nickname: `玩家${index}`,
  seatNumber: index,
  chips,
  status: 'ready',
  joinedAt: new Date()
});

const selectFirstTwo = (engine: CatchMidEngine, state: CatchMidGameState, userId: string): CatchMidGameState => {
  const player = state.players.find(item => item.userId === userId);
  if (!player) throw new Error('测试玩家不存在');
  return engine.selectCards(state, userId, player.cards.slice(0, 2).map(card => `${card.suit}-${card.rank}`));
};

const resolveSelectionRound = (engine: CatchMidEngine, state: CatchMidGameState): CatchMidGameState => {
  let nextState = state;
  for (const player of state.players) {
    nextState = selectFirstTwo(engine, nextState, player.userId);
    nextState = engine.confirmSelection(nextState, player.userId);
  }
  return nextState;
};

const advanceToRound = (engine: CatchMidEngine, state: CatchMidGameState, round: number): CatchMidGameState => {
  let nextState = state;
  while (nextState.round < round) {
    nextState = resolveSelectionRound(engine, nextState);
    for (const player of nextState.players) {
      nextState = engine.confirmContinueAfterRoundResult(nextState, player.userId);
    }
  }
  return nextState;
};

describe('CatchMidEngine', () => {
  test('应启动 3 人局并完成初始发牌', () => {
    const engine = new CatchMidEngine();
    const state = engine.startGame('room-1', [1, 2, 3].map(index => createRoomPlayer(index)));

    expect(state.phase).toBe('selecting');
    expect(state.round).toBe(1);
    expect(state.players).toHaveLength(3);
    expect(state.players.every(player => player.cards.length === 5)).toBe(true);
    expect(state.communityCards).toHaveLength(4);
    expect(state.communityCards.slice(0, 3).every(card => card.visible)).toBe(true);
    expect(state.communityCards[3].visible).toBe(false);
    expect(state.deckRemaining).toBe(31);
  });

  test('初始发牌时每张公共牌前应烧掉一张牌', () => {
    const engine = new CatchMidEngine();
    // 3 人局：54 - 15(手牌) - 4(公共牌) - 4(烧牌) = 31
    const state3 = engine.startGame('room-1', [1, 2, 3].map(index => createRoomPlayer(index)));
    expect(state3.deckRemaining).toBe(31);

    // 4 人局：54 - 20(手牌) - 4(公共牌) - 4(烧牌) = 26
    const engine2 = new CatchMidEngine();
    const state4 = engine2.startGame('room-1', [1, 2, 3, 4].map(index => createRoomPlayer(index)));
    expect(state4.deckRemaining).toBe(26);
  });

  test('2 人或 5 人不能开局', () => {
    const engine = new CatchMidEngine();

    expect(() => engine.startGame('room-1', [1, 2].map(index => createRoomPlayer(index)))).toThrow('Catch Mid requires 3 to 4 players');
    expect(() => engine.startGame('room-1', [1, 2, 3, 4, 5].map(index => createRoomPlayer(index)))).toThrow('Catch Mid requires 3 to 4 players');
  });

  test('Round 1 所有人确认后应结算且暂不补牌', () => {
    const engine = new CatchMidEngine();
    const initialState = engine.startGame('room-1', [1, 2, 3].map(index => createRoomPlayer(index)));
    const resultState = resolveSelectionRound(engine, initialState);

    expect(resultState.phase).toBe('round_result');
    expect(resultState.lastRoundResult?.round).toBe(1);
    expect(resultState.lastRoundResult?.selections).toHaveLength(3);
    expect(resultState.players.every(player => player.cards.length === 3)).toBe(true);
    expect(resultState.discardPile).toHaveLength(7);
    expect(resultState.deckRemaining).toBe(31);
  });

  test('Round 1 全员点击继续后才补牌并进入 Round 2', () => {
    const engine = new CatchMidEngine();
    let state = engine.startGame('room-1', [1, 2, 3].map(index => createRoomPlayer(index)));
    state = resolveSelectionRound(engine, state);

    state = engine.confirmContinueAfterRoundResult(state, 'user-1');
    expect(state.phase).toBe('round_result');
    expect(state.players.find(player => player.userId === 'user-1')?.confirmed).toBe(true);
    expect(state.players.every(player => player.cards.length === 3)).toBe(true);

    state = engine.confirmContinueAfterRoundResult(state, 'user-2');
    state = engine.confirmContinueAfterRoundResult(state, 'user-3');

    expect(state.phase).toBe('selecting');
    expect(state.round).toBe(2);
    expect(state.lastRoundResult).toBeUndefined();
    expect(state.players.every(player => player.cards.length === 5)).toBe(true);
    expect(state.deckRemaining).toBe(25);
  });

  test('Round 4 应揭示暗牌且不补牌', () => {
    const engine = new CatchMidEngine();
    const initialState = engine.startGame('room-1', [1, 2, 3].map(index => createRoomPlayer(index)));
    const round4State = advanceToRound(engine, initialState, 4);
    const resultState = resolveSelectionRound(engine, round4State);

    expect(resultState.phase).toBe('round_result');
    expect(resultState.round).toBe(4);
    expect(resultState.communityCards[3].visible).toBe(true);
    expect(resultState.players.every(player => player.cards.length === 3)).toBe(true);
  });

  test('Round 4 后进入确认亮牌，全部确认后自动完成 Round 5', () => {
    const engine = new CatchMidEngine();
    let state = engine.startGame('room-1', [1, 2, 3].map(index => createRoomPlayer(index)));
    state = advanceToRound(engine, state, 4);
    state = resolveSelectionRound(engine, state);
    for (const player of state.players) {
      state = engine.confirmContinueAfterRoundResult(state, player.userId);
    }

    expect(state.phase).toBe('confirm_reveal');

    for (const player of state.players) {
      state = engine.confirmReveal(state, player.userId);
    }

    expect(['finished', 'game_over', 'game_draw']).toContain(state.phase);
    expect(state.round).toBe(5);
    expect(state.lastRoundResult?.round).toBe(5);
    expect(state.players.every(player => player.cards.length === 0)).toBe(true);
  });

  test('选牌阶段自动托管会选择前两张手牌并参与结算', () => {
    const engine = new CatchMidEngine();
    let state = engine.startGame('room-1', [1, 2, 3].map(index => createRoomPlayer(index)));

    state = engine.autoConfirmCurrentPhase(state, 'user-1');
    const player = state.players.find(item => item.userId === 'user-1');

    expect(player?.selectedCardIds).toHaveLength(2);
    expect(player?.confirmed).toBe(true);

    state = selectFirstTwo(engine, state, 'user-2');
    state = engine.confirmSelection(state, 'user-2');
    state = selectFirstTwo(engine, state, 'user-3');
    state = engine.confirmSelection(state, 'user-3');

    expect(state.phase).toBe('round_result');
    expect(state.lastRoundResult?.selections.map(selection => selection.userId)).toContain('user-1');
  });

  test('亮牌确认阶段自动托管会替玩家确认并在全员确认后进入 Round 5 结算', () => {
    const engine = new CatchMidEngine();
    let state = engine.startGame('room-1', [1, 2, 3].map(index => createRoomPlayer(index)));
    state = advanceToRound(engine, state, 4);
    state = resolveSelectionRound(engine, state);
    for (const player of state.players) {
      state = engine.confirmContinueAfterRoundResult(state, player.userId);
    }

    state = engine.autoConfirmCurrentPhase(state, 'user-1');
    expect(state.players.find(player => player.userId === 'user-1')?.revealConfirmed).toBe(true);
    expect(state.phase).toBe('confirm_reveal');

    state = engine.confirmReveal(state, 'user-2');
    state = engine.confirmReveal(state, 'user-3');

    expect(['finished', 'game_over', 'game_draw']).toContain(state.phase);
    expect(state.round).toBe(5);
  });

  test('完整 5 轮后应标记筹码小于等于 0 的玩家出局并生成排名', () => {
    const engine = new CatchMidEngine();
    let state = engine.startGame('room-1', [
      createRoomPlayer(1, 100),
      createRoomPlayer(2, 100),
      createRoomPlayer(3, 1)
    ]);

    state = advanceToRound(engine, state, 4);
    state = resolveSelectionRound(engine, state);
    for (const player of state.players) {
      state = engine.confirmContinueAfterRoundResult(state, player.userId);
    }
    for (const player of state.players) {
      state = engine.confirmReveal(state, player.userId);
    }
    const finishedState = state;

    expect(['finished', 'game_over', 'game_draw']).toContain(finishedState.phase);
    expect(finishedState.finalRanking).toHaveLength(3);
    expect(finishedState.players.filter(player => player.status === 'out').map(player => player.userId)).toEqual(finishedState.eliminatedPlayerIds);
  });
});
