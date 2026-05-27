// Socket 事件名称
export const SOCKET_EVENTS = {
  // 客户端 → 服务器
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  SELECT_SEAT: 'select-seat',
  PLAYER_READY: 'player-ready',
  PLAYER_ACTION: 'player-action',
  SEND_EMOJI: 'send-emoji',
  REBUY: 'rebuy',
  TIP_PLAYER: 'tip-player',

  // 服务器 → 客户端
  ROOM_UPDATE: 'room-update',
  COUNTDOWN_START: 'countdown-start',
  GAME_START: 'game-start',
  GAME_UPDATE: 'game-update',
  GAME_OVER: 'game-over',
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  NEW_EMOJI: 'new-emoji',
  ERROR: 'error',
  REBUY_REQUIRED: 'rebuy-required',
  TIP_RECEIVED: 'tip-received',
} as const;
