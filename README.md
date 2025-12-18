<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Word Warrior (单词大乱斗)

一个结合 RPG 元素的英语学习应用,通过游戏化的方式提升词汇、语法、听力、口语和写作能力。

## 技术栈

- **前端**: React + TypeScript + Vite
- **UI**: Tailwind CSS + Framer Motion
- **AI**: Google Gemini API
- **数据库**: Supabase (PostgreSQL)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件(参考 `.env.local.example`):

```bash
# Gemini API Configuration
# 从 https://ai.google.dev/ 获取
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Configuration  
# 从 https://supabase.com/dashboard 获取
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. 设置 Supabase 数据库

1. 在 [Supabase](https://supabase.com/) 创建新项目
2. 进入 SQL Editor
3. 运行 `database/migration.sql` 中的 SQL 脚本
4. 复制项目的 URL 和 anon key 到 `.env.local`

### 4. 运行应用

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

## 功能特性

### 🎮 学习模式

- **词汇训练**: 卡片式单词学习,滑动记忆
- **听力磨炼**: AI 生成听力题目,语音播放
- **口语修行**: 实时 AI 语音对话评测
- **阅读试炼**: 理解力测试题目
- **写作工坊**: AI 智能评分与反馈

### ⚔️ 对战模式

- **词汇闪击战**: 速度竞赛,英选汉
- **语法阵地战**: 准确率对决
- **咏唱对决**: 实时翻译 PK

### 📊 数据持久化

- 用户等级与经验值
- 属性成长 (ATK/DEF/HP/CRIT)
- 已掌握单词记录
- 排行榜系统
- 成就解锁

## 项目结构

```
Word-Warrior/
├── components/          # React 组件
├── services/           # API 服务层
│   ├── geminiService.ts    # AI 服务
│   ├── liveService.ts      # 实时语音服务  
│   ├── supabaseClient.ts   # Supabase 客户端
│   └── databaseService.ts  # 数据库操作
├── database/           # 数据库迁移脚本
├── constants.tsx       # 常量配置
├── types.ts           # TypeScript 类型定义
└── App.tsx            # 主应用组件
```

## 数据库架构

- `profiles`: 用户档案
- `user_stats`: 用户属性与进度
- `mastered_words`: 已掌握单词
- `achievements`: 成就记录

详见 `database/migration.sql`

## 开发说明

### 测试用户

开发模式下使用固定测试用户 ID: `00000000-0000-0000-0000-000000000001`

数据库迁移脚本会自动创建此测试用户。

### 添加完整认证

如需实现用户注册/登录功能,可集成 Supabase Auth:

```typescript
import { supabase } from './services/supabaseClient';

// 注册
await supabase.auth.signUp({ email, password });

// 登录
await supabase.auth.signInWithPassword({ email, password });
```

## License

MIT
