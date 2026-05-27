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
    const result = manager.selectSeat(room.roomCode, 'user1', 1);
    expect(result).toBe(true);
  });

  test('should not select occupied seat', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.selectSeat(room.roomCode, 'user1', 1);
    manager.joinRoom(room.roomCode, 'user2', 'Player2', 100);
    const result = manager.selectSeat(room.roomCode, 'user2', 1);
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
});
