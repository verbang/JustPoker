import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { roomService } from './room.service';
import { CreateRoomRequest, JoinRoomRequest, Room } from '../../../../shared/types/room.types';

const router = Router();

// Create room
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nickname, initialChips, password, actionTimeoutEnabled }: CreateRoomRequest = req.body;

    if (!nickname || !Number.isInteger(initialChips) || initialChips <= 0) {
      return res.status(400).json({ error: '缺少必填参数' });
    }

    if (password && (!/^\d{4}$/.test(password))) {
      return res.status(400).json({ error: '密码必须为4位数字' });
    }

    // Generate unique userId using uuid
    const userId = uuidv4();
    const room = await roomService.createRoom(userId, {
      nickname,
      initialChips,
      password,
      actionTimeoutEnabled: actionTimeoutEnabled ?? false,
    });
    if (!room) {
      return res.status(503).json({ error: '房间已满，请稍后再试！' });
    }

    res.json({
      roomCode: room.roomCode,
      roomId: room.id,
      userId,
      actionTimeoutEnabled: room.actionTimeoutEnabled,
    });
  } catch (error) {
    res.status(500).json({ error: '创建房间失败' });
  }
});

// Join room
router.post('/:roomCode/join', async (req: Request, res: Response) => {
  try {
    const { roomCode } = req.params;
    const { nickname, chips, password }: JoinRoomRequest = req.body;

    if (!nickname || !Number.isInteger(chips) || chips <= 0) {
      return res.status(400).json({ error: '缺少必填参数' });
    }

    const room = roomService.getRoom(roomCode);
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }

    if (roomService.hasNickname(roomCode, nickname)) {
      return res.status(409).json({ error: '昵称重复' });
    }

    if (!roomService.isPasswordValid(roomCode, password)) {
      return res.status(403).json({ error: '房间密码错误' });
    }

    if (roomService.isRoomFull(roomCode)) {
      return res.status(403).json({ error: '房间已满！' });
    }

    // Generate unique userId for the joining player
    const userId = uuidv4();
    const player = await roomService.joinRoom(roomCode, userId, nickname, chips, password);

    if (!player) {
      return res.status(403).json({ error: '加入房间失败' });
    }

    res.json({
      userId: player.userId,
      nickname: player.nickname,
      status: player.status,
    });
  } catch (error) {
    res.status(500).json({ error: '加入房间失败' });
  }
});

// Get room info
router.get('/:roomCode', (req: Request, res: Response) => {
  try {
    const { roomCode } = req.params;
    const room = roomService.getRoom(roomCode);

    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
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
      actionTimeoutEnabled: room.actionTimeoutEnabled,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };

    res.json({
      room: roomWithoutPassword,
      players,
    });
  } catch (error) {
    res.status(500).json({ error: '获取房间信息失败' });
  }
});

export default router;
