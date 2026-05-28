import { v4 as uuidv4 } from 'uuid';
import { Room, RoomPlayer, PlayerStatus } from '../../../../shared/types/room.types';
import { MAX_SEATS } from '../../../../shared/constants/game.constants';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private roomPlayers: Map<string, Map<string, RoomPlayer>> = new Map();

  createRoom(hostId: string, hostNickname: string, initialChips: number, password?: string): Room {
    const roomCode = this.generateRoomCode();
    const room: Room = {
      id: uuidv4(),
      roomCode,
      hostId,
      status: 'waiting',
      smallBlind: 5,
      bigBlind: 10,
      initialChips,
      password: password || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rooms.set(roomCode, room);
    const players = new Map<string, RoomPlayer>();
    this.roomPlayers.set(roomCode, players);

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

    // Verify password if room has one
    if (room.password && room.password !== password) {
      return null;
    }

    const players = this.roomPlayers.get(roomCode)!;

    // Check if nickname exists
    for (const player of players.values()) {
      if (player.nickname === nickname) {
        return null; // Nickname already exists
      }
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
    return player;
  }

  selectSeat(roomCode: string, userId: string, seatNumber: number): boolean {
    const players = this.roomPlayers.get(roomCode);
    if (!players) return false;

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

    return players.delete(userId);
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

  private generateRoomCode(): string {
    let code: string;
    do {
      code = Math.floor(10 + Math.random() * 90).toString();
    } while (this.rooms.has(code));
    return code;
  }
}
