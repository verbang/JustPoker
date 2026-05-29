import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { roomService } from './room.service';
import { CreateRoomRequest, JoinRoomRequest, Room } from '../../../../shared/types/room.types';

const router = Router();

// Create room
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nickname, initialChips, password }: CreateRoomRequest = req.body;

    if (!nickname || !Number.isInteger(initialChips) || initialChips <= 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password && (!/^\d{4}$/.test(password))) {
      return res.status(400).json({ error: 'Password must be 4 digits' });
    }

    // Generate unique userId using uuid
    const userId = uuidv4();
    const room = await roomService.createRoom(userId, { nickname, initialChips, password });
    if (!room) {
      return res.status(503).json({ error: '房间已满，请稍后再试！' });
    }

    res.json({
      roomCode: room.roomCode,
      roomId: room.id,
      userId,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Join room
router.post('/:roomCode/join', async (req: Request, res: Response) => {
  try {
    const { roomCode } = req.params;
    const { nickname, chips, password }: JoinRoomRequest = req.body;

    if (!nickname || !Number.isInteger(chips) || chips <= 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate unique userId for the joining player
    const userId = uuidv4();
    const player = await roomService.joinRoom(roomCode, userId, nickname, chips, password);

    if (!player) {
      return res.status(404).json({ error: 'Room not found, wrong password, or nickname exists' });
    }

    res.json({
      userId: player.userId,
      nickname: player.nickname,
      status: player.status,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Get room info
router.get('/:roomCode', (req: Request, res: Response) => {
  try {
    const { roomCode } = req.params;
    const room = roomService.getRoom(roomCode);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const players = roomService.getRoomPlayers(roomCode);

    // Don't expose password to client
    const roomWithoutPassword: Omit<Room, 'password'> = {
      id: room.id,
      roomCode: room.roomCode,
      hostId: room.hostId,
      status: room.status,
      smallBlind: room.smallBlind,
      bigBlind: room.bigBlind,
      initialChips: room.initialChips,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };

    res.json({
      room: roomWithoutPassword,
      players,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get room info' });
  }
});

export default router;
