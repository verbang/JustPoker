## ADDED Requirements

### Requirement: 横屏模式下游戏桌面顶部对齐
在横屏模式下，游戏桌面的左侧区域（牌桌、玩家、手牌）和右侧区域（表情面板、比分板、牌型参考）SHALL 顶部对齐。

#### Scenario: 左右两列顶部对齐
- **WHEN** 用户使用横屏模式查看游戏桌面
- **THEN** 左侧 `.table-zone` 和右侧 `.control-zone` SHALL 顶部对齐

#### Scenario: 右侧内容展开时左侧位置不变
- **WHEN** 用户在横屏模式下展开比分板或牌型参考面板
- **THEN** 左侧牌桌 SHALL 保持顶部位置，不随右侧内容展开而下移

#### Scenario: 竖屏模式不受影响
- **WHEN** 用户使用竖屏模式查看游戏桌面
- **THEN** 布局 SHALL 保持原有行为，不受横屏模式修改的影响
