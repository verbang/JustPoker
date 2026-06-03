import { RoomManager } from '../room.manager';

describe('RoomManager', () => {
  let manager: RoomManager;

  function createTestRoom(hostId = 'host1', hostNickname = 'Host') {
    const room = manager.createRoom(hostId, hostNickname, 100);
    if (!room) throw new Error('测试房间创建失败');
    return room;
  }

  beforeEach(() => {
    manager = new RoomManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  test('should create a room', () => {
    const room = createTestRoom();
    expect(room.roomCode).toMatch(/^\d{2}$/);
    expect(room.hostId).toBe('host1');
    expect(room.initialChips).toBe(100);
  });

  test('should generate unique room codes', () => {
    const room1 = createTestRoom('host1', 'Host1');
    const room2 = createTestRoom('host2', 'Host2');
    expect(room1.roomCode).not.toBe(room2.roomCode);
  });

  test('should join a room', () => {
    const room = createTestRoom();
    const player = manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    expect(player).toBeDefined();
    expect(player?.nickname).toBe('Player1');
    expect(player?.status).toBe('joined');
  });

  test('should return null for invalid room code', () => {
    const player = manager.joinRoom('99', 'user1', 'Player1', 100);
    expect(player).toBeNull();
  });

  test('should reject duplicate nickname in the same room', () => {
    const room = createTestRoom();
    const player = manager.joinRoom(room.roomCode, 'user1', 'Host', 100);

    expect(player).toBeNull();
    expect(manager.hasNickname(room.roomCode, 'Host')).toBe(true);
  });

  test('should validate room password', () => {
    const room = manager.createRoom('host1', 'Host', 100, '1234');
    if (!room) throw new Error('测试房间创建失败');

    expect(manager.isPasswordValid(room.roomCode, '1234')).toBe(true);
    expect(manager.isPasswordValid(room.roomCode, '0000')).toBe(false);
  });

  test('should create rooms with action timeout disabled by default', () => {
    const room = createTestRoom();

    expect(room.actionTimeoutEnabled).toBe(false);
  });

  test('should create rooms with action timeout enabled when requested', () => {
    const room = manager.createRoom('host1', 'Host', 100, undefined, true);
    if (!room) throw new Error('测试房间创建失败');

    expect(room.actionTimeoutEnabled).toBe(true);
  });

  test('should select a seat', () => {
    const room = createTestRoom();
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    // Seat 1 is taken by host, select seat 2
    const result = manager.selectSeat(room.roomCode, 'user1', 2);
    expect(result).toBe(true);
  });

  test('should not select occupied seat', () => {
    const room = createTestRoom();
    // Host is auto-seated at seat 1
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.joinRoom(room.roomCode, 'user2', 'Player2', 100);
    manager.selectSeat(room.roomCode, 'user1', 2);
    // Seat 2 is now occupied by user1
    const result = manager.selectSeat(room.roomCode, 'user2', 2);
    expect(result).toBe(false);
  });

  test('should reject invalid seat number', () => {
    const room = createTestRoom();

    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    expect(manager.selectSeat(room.roomCode, 'user1', 0)).toBe(false);
    expect(manager.selectSeat(room.roomCode, 'user1', 11)).toBe(false);
  });

  test('should leave a room', () => {
    const room = createTestRoom();
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.selectSeat(room.roomCode, 'user1', 1);
    const result = manager.leaveRoom(room.roomCode, 'user1');
    expect(result).toBe(true);
  });

  test('should get room players', () => {
    const room = createTestRoom();
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.joinRoom(room.roomCode, 'user2', 'Player2', 200);
    const players = manager.getRoomPlayers(room.roomCode);
    expect(players).toHaveLength(3); // host + 2 joined players
  });

  test('should handle rebuy', () => {
    const room = createTestRoom();
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.selectSeat(room.roomCode, 'user1', 1);
    const result = manager.rebuy(room.roomCode, 'user1', 200);
    expect(result).toBe(true);
  });

  test('should reject invalid rebuy amount', () => {
    const room = createTestRoom();

    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    expect(manager.rebuy(room.roomCode, 'user1', 0)).toBe(false);
    expect(manager.rebuy(room.roomCode, 'user1', -100)).toBe(false);
  });

  test('should ready a seated player', () => {
    const room = createTestRoom();
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.selectSeat(room.roomCode, 'user1', 2);
    const result = manager.readyPlayer(room.roomCode, 'user1');
    expect(result).toBe(true);
    const player = manager.getRoomPlayers(room.roomCode).find(p => p.userId === 'user1');
    expect(player?.status).toBe('ready');
  });

  test('should not ready a non-seated player', () => {
    const room = createTestRoom();
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    // user1 is 'joined', not 'seated'
    const result = manager.readyPlayer(room.roomCode, 'user1');
    expect(result).toBe(false);
  });

  test('should detect when all seated players are ready', () => {
    const room = createTestRoom();
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.selectSeat(room.roomCode, 'user1', 2);

    // Not ready yet
    expect(manager.allSeatedPlayersReady(room.roomCode)).toBe(false);

    // Host ready
    manager.readyPlayer(room.roomCode, 'host1');
    // Still not ready (user1 is seated but not ready)
    expect(manager.allSeatedPlayersReady(room.roomCode)).toBe(false);

    // User1 ready
    manager.readyPlayer(room.roomCode, 'user1');
    // Now all seated players (both ready) are ready
    expect(manager.allSeatedPlayersReady(room.roomCode)).toBe(true);
  });

  test('should get seated and ready players', () => {
    const room = createTestRoom();
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.selectSeat(room.roomCode, 'user1', 2);
    manager.readyPlayer(room.roomCode, 'host1');
    manager.readyPlayer(room.roomCode, 'user1');

    const seated = manager.getSeatedPlayers(room.roomCode);
    // Both host (ready) and user1 (ready) should be included
    expect(seated).toHaveLength(2);
  });

  test('should return null when all room codes are occupied', () => {
    for (let i = 0; i < 90; i++) {
      const room = manager.createRoom(`host${i}`, `Host${i}`, 100);
      expect(room).not.toBeNull();
    }

    expect(manager.createRoom('overflow', 'Overflow', 100)).toBeNull();
  });

  test('should transfer host to next seat player', () => {
    const room = createTestRoom('host1', 'Host');
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.joinRoom(room.roomCode, 'user2', 'Player2', 100);
    manager.selectSeat(room.roomCode, 'user1', 2);
    manager.selectSeat(room.roomCode, 'user2', 3);

    // Host is at seat 1, should transfer to user1 at seat 2
    const newHostId = manager.transferHost(room.roomCode, 'host1');
    expect(newHostId).toBe('user1');

    // Verify room's hostId is updated
    const updatedRoom = manager.getRoom(room.roomCode);
    expect(updatedRoom?.hostId).toBe('user1');
  });

  test('should transfer host to smallest seat if no higher seat exists', () => {
    const room = createTestRoom('host1', 'Host');
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.selectSeat(room.roomCode, 'user1', 3);

    // Host is at seat 1, user1 is at seat 3
    // No seat > 1 except 3, so should transfer to user1
    const newHostId = manager.transferHost(room.roomCode, 'host1');
    expect(newHostId).toBe('user1');
  });

  test('should return null when transferring host with no other players', () => {
    const room = createTestRoom('host1', 'Host');

    const newHostId = manager.transferHost(room.roomCode, 'host1');
    expect(newHostId).toBeNull();
  });

  test('should reset all players to seated status', () => {
    const room = createTestRoom('host1', 'Host');
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.joinRoom(room.roomCode, 'user2', 'Player2', 100);
    manager.selectSeat(room.roomCode, 'user1', 2);
    manager.selectSeat(room.roomCode, 'user2', 3);

    // Ready all players
    manager.readyPlayer(room.roomCode, 'host1');
    manager.readyPlayer(room.roomCode, 'user1');
    manager.readyPlayer(room.roomCode, 'user2');

    // Verify all are ready
    let players = manager.getRoomPlayers(room.roomCode);
    expect(players.filter(p => p.status === 'ready')).toHaveLength(3);

    // Reset all to seated
    manager.resetAllPlayersToSeated(room.roomCode);

    // Verify all are seated
    players = manager.getRoomPlayers(room.roomCode);
    expect(players.filter(p => p.status === 'seated')).toHaveLength(3);
    expect(players.filter(p => p.status === 'ready')).toHaveLength(0);
  });
});
