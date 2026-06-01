import { RoomManager } from './room.manager';
import { Room, RoomPlayer, CreateRoomRequest, JoinRoomRequest } from '../../../../shared/types/room.types';
import { database } from '../../services/database.service';
import { logger } from '../../utils/logger';

export class RoomService {
  private roomManager: RoomManager;

  constructor() {
    this.roomManager = new RoomManager();
  }

  async createRoom(hostId: string, request: CreateRoomRequest): Promise<Room | null> {
    const room = this.roomManager.createRoom(
      hostId,
      request.nickname,
      request.initialChips,
      request.password,
      request.actionTimeoutEnabled ?? false
    );
    if (!room) return null;

    // Save to database if available
    await database.insert('rooms', {
      id: room.id,
      room_code: room.roomCode,
      host_id: room.hostId,
      status: room.status,
      small_blind: room.smallBlind,
      big_blind: room.bigBlind,
      initial_chips: room.initialChips,
      action_timeout_enabled: room.actionTimeoutEnabled,
    });

    logger.info(`Room created: ${room.roomCode}`);
    return room;
  }

  async joinRoom(roomCode: string, userId: string, nickname: string, chips: number, password?: string): Promise<RoomPlayer | null> {
    const player = this.roomManager.joinRoom(roomCode, userId, nickname, chips, password);

    if (player) {
      logger.info(`Player ${nickname} joined room ${roomCode}`);
    }

    return player;
  }

  isRoomFull(roomCode: string): boolean {
    return this.roomManager.isRoomFull(roomCode);
  }

  selectSeat(roomCode: string, userId: string, seatNumber: number): boolean {
    return this.roomManager.selectSeat(roomCode, userId, seatNumber);
  }

  leaveRoom(roomCode: string, userId: string): boolean {
    return this.roomManager.leaveRoom(roomCode, userId);
  }

  getRoom(roomCode: string): Room | null {
    return this.roomManager.getRoom(roomCode);
  }

  getRoomPlayers(roomCode: string): RoomPlayer[] {
    return this.roomManager.getRoomPlayers(roomCode);
  }

  hasNickname(roomCode: string, nickname: string): boolean {
    return this.roomManager.hasNickname(roomCode, nickname);
  }

  isPasswordValid(roomCode: string, password?: string): boolean {
    return this.roomManager.isPasswordValid(roomCode, password);
  }

  getSeatedPlayers(roomCode: string): RoomPlayer[] {
    return this.roomManager.getSeatedPlayers(roomCode);
  }

  rebuy(roomCode: string, userId: string, amount: number): boolean {
    return this.roomManager.rebuy(roomCode, userId, amount);
  }

  readyPlayer(roomCode: string, userId: string): boolean {
    return this.roomManager.readyPlayer(roomCode, userId);
  }

  allSeatedPlayersReady(roomCode: string): boolean {
    return this.roomManager.allSeatedPlayersReady(roomCode);
  }

  getRoomManager(): RoomManager {
    return this.roomManager;
  }

  /**
   * 停止房间管理器的清理定时器（用于优雅关闭）
   */
  destroy(): void {
    this.roomManager.destroy();
  }
}

export const roomService = new RoomService();
