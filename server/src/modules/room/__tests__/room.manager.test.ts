import { RoomManager } from '../room.manager';

describe('RoomManager', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  test('should create a room', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    expect(room.roomCode).toMatch(/^\d{2}$/);
    expect(room.hostId).toBe('host1');
    expect(room.initialChips).toBe(100);
  });

  test('should generate unique room codes', () => {
    const room1 = manager.createRoom('host1', 'Host1', 100);
    const room2 = manager.createRoom('host2', 'Host2', 100);
    expect(room1.roomCode).not.toBe(room2.roomCode);
  });

  test('should join a room', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    const player = manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    expect(player).toBeDefined();
    expect(player?.nickname).toBe('Player1');
    expect(player?.status).toBe('joined');
  });

  test('should return null for invalid room code', () => {
    const player = manager.joinRoom('99', 'user1', 'Player1', 100);
    expect(player).toBeNull();
  });

  test('should select a seat', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    // Seat 1 is taken by host, select seat 2
    const result = manager.selectSeat(room.roomCode, 'user1', 2);
    expect(result).toBe(true);
  });

  test('should not select occupied seat', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    // Host is auto-seated at seat 1
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.joinRoom(room.roomCode, 'user2', 'Player2', 100);
    manager.selectSeat(room.roomCode, 'user1', 2);
    // Seat 2 is now occupied by user1
    const result = manager.selectSeat(room.roomCode, 'user2', 2);
    expect(result).toBe(false);
  });

  test('should leave a room', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.selectSeat(room.roomCode, 'user1', 1);
    const result = manager.leaveRoom(room.roomCode, 'user1');
    expect(result).toBe(true);
  });

  test('should get room players', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.joinRoom(room.roomCode, 'user2', 'Player2', 200);
    const players = manager.getRoomPlayers(room.roomCode);
    expect(players).toHaveLength(3); // host + 2 joined players
  });

  test('should handle rebuy', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.selectSeat(room.roomCode, 'user1', 1);
    const result = manager.rebuy(room.roomCode, 'user1', 200);
    expect(result).toBe(true);
  });

  test('should ready a seated player', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.selectSeat(room.roomCode, 'user1', 2);
    const result = manager.readyPlayer(room.roomCode, 'user1');
    expect(result).toBe(true);
    const player = manager.getRoomPlayers(room.roomCode).find(p => p.userId === 'user1');
    expect(player?.status).toBe('ready');
  });

  test('should not ready a non-seated player', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    // user1 is 'joined', not 'seated'
    const result = manager.readyPlayer(room.roomCode, 'user1');
    expect(result).toBe(false);
  });

  test('should detect when all seated players are ready', () => {
    const room = manager.createRoom('host1', 'Host', 100);
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
    const room = manager.createRoom('host1', 'Host', 100);
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.selectSeat(room.roomCode, 'user1', 2);
    manager.readyPlayer(room.roomCode, 'host1');
    manager.readyPlayer(room.roomCode, 'user1');

    const seated = manager.getSeatedPlayers(room.roomCode);
    // Both host (ready) and user1 (ready) should be included
    expect(seated).toHaveLength(2);
  });
});
