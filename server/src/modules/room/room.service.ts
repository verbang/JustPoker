import { RoomManager } from './room.manager';
import { Room, RoomPlayer, CreateRoomRequest, JoinRoomRequest } from '@shared/types/room.types';
import { database } from '../../services/database.service';
import { logger } from '../../utils/logger';

export class RoomService {
  private roomManager: RoomManager;

  constructor() {
    this.roomManager = new RoomManager();
  }

  async createRoom(hostId: string, request: CreateRoomRequest): Promise<Room> {
    const room = this.roomManager.createRoom(hostId, request.nickname, request.initialChips);

    // Save to database if available
    await database.insert('rooms', {
      id: room.id,
      room_code: room.roomCode,
      host_id: room.hostId,
      status: room.status,
      small_blind: room.smallBlind,
      big_blind: room.bigBlind,
      initial_chips: room.initialChips,
    });

    logger.info(`Room created: ${room.roomCode}`);
    return room;
  }

  async joinRoom(request: JoinRoomRequest): Promise<RoomPlayer | null> {
    const player = this.roomManager.joinRoom(
      request.roomCode,
      request.nickname, // Using nickname as userId for simplicity
      request.nickname,
      request.chips
    );

    if (player) {
      logger.info(`Player ${request.nickname} joined room ${request.roomCode}`);
    }

    return player;
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

  getSeatedPlayers(roomCode: string): RoomPlayer[] {
    return this.roomManager.getSeatedPlayers(roomCode);
  }

  rebuy(roomCode: string, userId: string, amount: number): boolean {
    return this.roomManager.rebuy(roomCode, userId, amount);
  }

  getRoomManager(): RoomManager {
    return this.roomManager;
  }
}

export const roomService = new RoomService();
