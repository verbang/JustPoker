import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { roomService } from './room.service';
import { CreateRoomRequest, JoinRoomRequest, Room, GameType } from '../../../../shared/types/room.types';
import { DEFAULT_GAME_TYPE, GAME_TYPES, NICKNAME_MIN_LENGTH, NICKNAME_MAX_LENGTH, NICKNAME_REGEX } from '../../../../shared/constants/game.constants';

const router = Router();

// 昵称验证函数
function validateNickname(nickname: string): string | null {
  if (!nickname || nickname.length < NICKNAME_MIN_LENGTH) {
    return `昵称至少${NICKNAME_MIN_LENGTH}个字符`;
  }
  if (nickname.length > NICKNAME_MAX_LENGTH) {
    return `昵称最多${NICKNAME_MAX_LENGTH}个字符`;
  }
  if (!NICKNAME_REGEX.test(nickname)) {
    return '昵称仅支持中文、英文、数字';
  }
  return null;
}

function normalizeGameType(gameType: unknown): GameType | null {
  if (gameType === undefined || gameType === null || gameType === '') {
    return DEFAULT_GAME_TYPE;
  }
  return GAME_TYPES.includes(gameType as GameType) ? gameType as GameType : null;
}

// Create room
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nickname, initialChips, password, actionTimeoutEnabled, gameType }: CreateRoomRequest = req.body;

    if (!nickname || !Number.isInteger(initialChips) || initialChips <= 0) {
      return res.status(400).json({ error: '缺少必填参数' });
    }

    const nicknameError = validateNickname(nickname);
    if (nicknameError) {
      return res.status(400).json({ error: nicknameError });
    }

    if (password && (!/^\d{4}$/.test(password))) {
      return res.status(400).json({ error: '密码必须为4位数字' });
    }

    const normalizedGameType = normalizeGameType(gameType);
    if (!normalizedGameType) {
      return res.status(400).json({ error: '游戏类型无效' });
    }

    // Generate unique userId using uuid
    const userId = uuidv4();
    const room = await roomService.createRoom(userId, {
      nickname,
      initialChips,
      gameType: normalizedGameType,
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
      gameType: room.gameType,
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
    const { nickname, password }: JoinRoomRequest = req.body;

    if (!nickname) {
      return res.status(400).json({ error: '缺少必填参数' });
    }

    const nicknameError = validateNickname(nickname);
    if (nicknameError) {
      return res.status(400).json({ error: nicknameError });
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
    const player = await roomService.joinRoom(roomCode, userId, nickname, password);

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
      gameType: room.gameType,
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
