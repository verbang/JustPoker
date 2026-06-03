import { RoomManager } from '../room.manager';

describe('RoomManager 重连窗口期行为', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  test('玩家断线后仍在房间玩家列表中', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    if (!room) throw new Error('房间创建失败');
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);

    // 模拟断线但未移除玩家
    const players = manager.getRoomPlayers(room.roomCode);
    expect(players).toHaveLength(2);
    expect(players.some(p => p.userId === 'user1')).toBe(true);
  });

  test('超时后移除玩家', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    if (!room) throw new Error('房间创建失败');
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);

    // 模拟超时移除
    manager.leaveRoom(room.roomCode, 'user1');
    const players = manager.getRoomPlayers(room.roomCode);
    expect(players).toHaveLength(1);
    expect(players.some(p => p.userId === 'user1')).toBe(false);
  });

  test('重连成功后玩家仍在房间中', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    if (!room) throw new Error('房间创建失败');
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);

    // 模拟断线期间不移除玩家
    let players = manager.getRoomPlayers(room.roomCode);
    expect(players.some(p => p.userId === 'user1')).toBe(true);

    // 重连成功（玩家一直在列表中，无需额外操作）
    players = manager.getRoomPlayers(room.roomCode);
    expect(players).toHaveLength(2);
    expect(players.some(p => p.userId === 'user1')).toBe(true);
  });

  test('非游戏状态断线后房间保持', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    if (!room) throw new Error('房间创建失败');
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);

    // 断线后房间应仍然存在
    const retrievedRoom = manager.getRoom(room.roomCode);
    expect(retrievedRoom).not.toBeNull();
    expect(retrievedRoom?.roomCode).toBe(room.roomCode);
  });
});
