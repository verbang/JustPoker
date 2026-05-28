-- JustPoker 数据库表结构

-- 房间表
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(10) UNIQUE NOT NULL,
  host_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  small_blind INTEGER DEFAULT 5,
  big_blind INTEGER DEFAULT 10,
  initial_chips INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 房间玩家表
CREATE TABLE IF NOT EXISTS room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  seat_number INTEGER,
  chips INTEGER DEFAULT 100,
  status VARCHAR(20) DEFAULT 'joined',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 游戏记录表
CREATE TABLE IF NOT EXISTS game_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  winner_id VARCHAR(255),
  winning_hand VARCHAR(100),
  pot INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_user_id ON room_players(user_id);
