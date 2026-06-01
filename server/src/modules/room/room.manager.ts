import { v4 as uuidv4 } from 'uuid';
import { Room, RoomPlayer, PlayerStatus } from '../../../../shared/types/room.types';
import { MAX_SEATS } from '../../../../shared/constants/game.constants';
import { logger } from '../../utils/logger';

// 空房间清理间隔（5分钟）
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
// 房间无玩家后多久清理（2分钟）
const EMPTY_ROOM_THRESHOLD_MS = 2 * 60 * 1000;
const ROOM_CODE_MIN = 10;
const ROOM_CODE_MAX = 99;

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private roomPlayers: Map<string, Map<string, RoomPlayer>> = new Map();
  private roomLastActivity: Map<string, number> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private onRoomDeleted: ((roomCode: string) => void) | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * 启动定时清理空房间的定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupEmptyRooms();
    }, CLEANUP_INTERVAL_MS);

    logger.info('空房间清理定时器已启动');
  }

  /**
   * 清理空房间
   */
  private cleanupEmptyRooms(): void {
    const now = Date.now();
    const roomsToDelete: string[] = [];

    for (const [roomCode, players] of this.roomPlayers.entries()) {
      if (players.size === 0) {
        const lastActivity = this.roomLastActivity.get(roomCode) || 0;
        if (now - lastActivity > EMPTY_ROOM_THRESHOLD_MS) {
          roomsToDelete.push(roomCode);
        }
      }
    }

    // 删除空房间，并通知外部清理关联资源
    for (const roomCode of roomsToDelete) {
      this.rooms.delete(roomCode);
      this.roomPlayers.delete(roomCode);
      this.roomLastActivity.delete(roomCode);
      logger.info(`已清理空房间: ${roomCode}`);

      if (this.onRoomDeleted) {
        this.onRoomDeleted(roomCode);
      }
    }

    if (roomsToDelete.length > 0) {
      logger.info(`本次清理了 ${roomsToDelete.length} 个空房间`);
    }
  }

  /**
   * 更新房间活动时间
   */
  private updateRoomActivity(roomCode: string): void {
    this.roomLastActivity.set(roomCode, Date.now());
  }

  createRoom(
    hostId: string,
    hostNickname: string,
    initialChips: number,
    password?: string,
    actionTimeoutEnabled = false
  ): Room | null {
    const roomCode = this.generateRoomCode();
    if (!roomCode) return null;

    const room: Room = {
      id: uuidv4(),
      roomCode,
      hostId,
      status: 'waiting',
      smallBlind: 5,
      bigBlind: 10,
      initialChips,
      actionTimeoutEnabled,
      password: password || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rooms.set(roomCode, room);
    const players = new Map<string, RoomPlayer>();
    this.roomPlayers.set(roomCode, players);
    this.updateRoomActivity(roomCode);

    // Add host as first player, directly seated at position 1
    const hostPlayer: RoomPlayer = {
      id: uuidv4(),
      roomId: room.id,
      userId: hostId,
      nickname: hostNickname,
      seatNumber: 1,
      chips: initialChips,
      status: 'seated',
      joinedAt: new Date(),
    };
    players.set(hostId, hostPlayer);

    return room;
  }

  joinRoom(roomCode: string, userId: string, nickname: string, chips: number, password?: string): RoomPlayer | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    if (!Number.isInteger(chips) || chips <= 0) return null;

    // Verify password if room has one
    if (room.password && room.password !== password) {
      return null;
    }

    const players = this.roomPlayers.get(roomCode)!;

    // Check if nickname exists
    if (this.hasNickname(roomCode, nickname)) {
      return null; // Nickname already exists
    }

    const player: RoomPlayer = {
      id: uuidv4(),
      roomId: room.id,
      userId,
      nickname,
      seatNumber: null,
      chips,
      status: 'joined',
      joinedAt: new Date(),
    };

    players.set(userId, player);
    this.updateRoomActivity(roomCode);
    return player;
  }

  hasNickname(roomCode: string, nickname: string): boolean {
    const players = this.roomPlayers.get(roomCode);
    if (!players) return false;

    const normalizedNickname = nickname.trim();
    return Array.from(players.values()).some(player => player.nickname.trim() === normalizedNickname);
  }

  isPasswordValid(roomCode: string, password?: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    return !room.password || room.password === password;
  }

  /**
   * 检查房间是否已满员（所有座位都被占用）
   */
  isRoomFull(roomCode: string): boolean {
    const players = this.roomPlayers.get(roomCode);
    if (!players) return false;

    const seatedCount = Array.from(players.values()).filter(p => p.seatNumber !== null).length;
    return seatedCount >= MAX_SEATS;
  }

  selectSeat(roomCode: string, userId: string, seatNumber: number): boolean {
    const players = this.roomPlayers.get(roomCode);
    if (!players) return false;
    if (!Number.isInteger(seatNumber) || seatNumber < 1 || seatNumber > MAX_SEATS) return false;

    // Check if seat is occupied
    for (const player of players.values()) {
      if (player.seatNumber === seatNumber) {
        return false;
      }
    }

    const player = players.get(userId);
    if (!player) return false;

    player.seatNumber = seatNumber;
    player.status = 'seated';
    return true;
  }

  leaveRoom(roomCode: string, userId: string): boolean {
    const players = this.roomPlayers.get(roomCode);
    if (!players) return false;

    const result = players.delete(userId);
    if (result) {
      this.updateRoomActivity(roomCode);
    }
    return result;
  }

  getRoom(roomCode: string): Room | null {
    return this.rooms.get(roomCode) || null;
  }

  getRoomPlayers(roomCode: string): RoomPlayer[] {
    const players = this.roomPlayers.get(roomCode);
    if (!players) return [];
    return Array.from(players.values());
  }

  getSeatedPlayers(roomCode: string): RoomPlayer[] {
    return this.getRoomPlayers(roomCode)
      .filter(p => p.status === 'seated' || p.status === 'ready' || p.status === 'playing')
      .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));
  }

  readyPlayer(roomCode: string, userId: string): boolean {
    const players = this.roomPlayers.get(roomCode);
    if (!players) return false;

    const player = players.get(userId);
    if (!player || player.status !== 'seated') return false;

    player.status = 'ready';
    return true;
  }

  /**
   * Check if all seated players are ready (ready to start the game).
   * Returns true if there are ≥2 players and all seated players have status 'ready'.
   */
  allSeatedPlayersReady(roomCode: string): boolean {
    const players = this.getRoomPlayers(roomCode);
    const seatedPlayers = players.filter(p => p.status === 'seated');
    const readyPlayers = players.filter(p => p.status === 'ready');

    // Must have at least 2 ready players, and no one still seated (not yet ready)
    return readyPlayers.length >= 2 && seatedPlayers.length === 0;
  }

  rebuy(roomCode: string, userId: string, amount: number): boolean {
    const players = this.roomPlayers.get(roomCode);
    if (!players) return false;
    if (!Number.isInteger(amount) || amount <= 0) return false;

    const player = players.get(userId);
    if (!player) return false;

    player.chips += amount;
    player.status = 'seated';
    return true;
  }

  updatePlayerStatus(roomCode: string, userId: string, status: PlayerStatus): void {
    const players = this.roomPlayers.get(roomCode);
    if (!players) return;

    const player = players.get(userId);
    if (player) {
      player.status = status;
    }
  }

  private generateRoomCode(): string | null {
    const capacity = ROOM_CODE_MAX - ROOM_CODE_MIN + 1;
    if (this.rooms.size >= capacity) return null;

    let code: string;
    do {
      code = Math.floor(ROOM_CODE_MIN + Math.random() * capacity).toString();
    } while (this.rooms.has(code));
    return code;
  }

  /**
   * 停止清理定时器（用于优雅关闭）
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      logger.info('空房间清理定时器已停止');
    }
  }

  /**
   * 注册房间删除回调。
   * 当清理定时器删除空房间时，会调用此回调通知外部（如 SocketService）同步清理关联资源。
   */
  setOnRoomDeleted(callback: (roomCode: string) => void): void {
    this.onRoomDeleted = callback;
  }
}
