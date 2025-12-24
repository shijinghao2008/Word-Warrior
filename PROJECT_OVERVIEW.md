# Word Warrior 项目概览描述文件

## 1. 整体项目描述
**Word Warrior (单词战士)** 是一款将 **RPG 角色扮演元素** 与 **英语学习** 深度结合的 Web 应用程序。玩家通过完成各种英语专项训练（听、说、读、写、词汇）来提升角色的属性（攻击力、防御力、生命值、暴击率），并在实时或模拟的 PvP 对战中利用这些属性击败对手。

### 核心设计理念
- **学习即修行**：将枯燥的题目练习包装成“试炼”、“磨炼”和“工坊”。
- **属性映射系统**：
    - **词汇/写作** -> 提升 **攻击力 (ATK)**
    - **听力/语法** -> 提升 **防御力 (DEF)**
    - **阅读** -> 提升 **生命值 (HP)**
    - **口语** -> 获取 **经验值 (EXP)**
- **实时对战**：通过 Supabase Realtime 实现玩家间的同步答题竞技。

---

## 2. 系统详细功能与模块划分

### A. 核心玩法 (Gameplay)
1.  **词汇训练 (Vocab Training)**:
    -   **卡片模式**：使用滑动卡片展示单词、音标及释义，支持左右滑切换。
    -   **测验模式**：批次测验，根据正确率结算金币和 ATK 提升。
2.  **学习之路 (Scholar Path)**:
    -   **听力磨炼**：音频播放 + 题目选择，提升 DEF。
    -   **阅读试炼**：长篇文章阅读 + 多选题，提升 HP。包含题目间自动平滑滚动及文章置顶重置功能。
    -   **写作工坊**：AI 辅助批改（Gemini API），提供多维度评分与建议，提升 ATK。
    -   **口语修行**：包含 **AI 评估** 与 **自由对话** 两种模式，获取大量 EXP。
3.  **竞技场 (Battle Arena)**:
    -   **单词闪击战 (Blitz)**：快速英选汉，强调响应速度。
    -   **语法阵地战 (Tactics)**：语法填空，防御属性可抵挡伤害。
    -   **AI 降级匹配**：匹配超过 10 秒自动转为本地 AI 对战模式。

### B. 角色养成与社交
-   **角色属性**：等级、经验、HP/MaxHP、ATK、DEF、暴击率。
-   **装备商店**：消耗金币购买武器、防具，实时改变战斗场景中的角色形象。
-   **外观自定义**：调整皮肤、头发颜色及肤色。
-   **成就系统**：根据学习进度（掌握词数、登录天数等）解锁勋章。
-   **排行榜**：积分制段位排行及词汇量排行。

---

## 3. 文件管理与目录结构

### `/src` (核心配置)
-   `App.tsx`: 根组件，负责主路由分发、用户状态同步及全局经验结算逻辑。
-   `constants.tsx`: 静态配置中心（初始属性、导航配置、训练模式元数据、Mock 数据）。
-   `types.ts`: 全局 TypeScript 类型与接口定义。

### `/components` (UI 模块)
-   `/Auth`: 处理登录、注册、加载及权限校验。
-   `/Warrior`: `BattleScene.tsx` (Phaser 风格动画) 与 `WarriorPreview.tsx`。
-   `/reading`, `/writing`, `/listening`, `/oral`: 各项专项训练的业务 UI 及其子组件。
-   `BattleArena.tsx`: 战斗逻辑核心，处理 WebSocket (Realtime) 状态机。

### `/services` (数据与 API 交互)
-   `databaseService.ts`: 基础数据库 CRUD 及单词学习算法。
-   `pvpService.ts` / `grammarPvpService.ts`: 对战房间管理、匹配逻辑及答题上报。
-   `geminiService.ts`: AI 能力核心（批改、解析、口语评估、TTS）。
-   `authService.ts`: 基于 Supabase Auth 的身份管理。

---

## 4. 数据库结构 (Supabase/PostgreSQL)

### 核心数据表
1.  **`profiles`**: 用户资料（Username, Admin 权限）。
2.  **`user_stats`**: 核心数值。字段包括：`level`, `exp`, `atk`, `def`, `hp`, `max_hp`, `rank`, `rank_points`, `gold`, `mastered_words_count`。
3.  **`mastered_words`**: 用户已掌握单词的唯一记录表。
4.  **`achievements`**: 记录已解锁的成就 ID。
5.  **`words`**: 全量词库，包含音标、释义、词频 (frq) 等信息。

### 业务与对战表
1.  **`reading_materials` / `listening_materials`**: 存放训练文本、题目 JSON 及音频 URL。
2.  **`user_writings` / `user_readings`**: 记录专项训练的提交内容、分数及反馈。
3.  **`pvp_word_blitz_rooms` / `pvp_grammar_rooms`**: 对战房间状态同步表（HP、进度、胜负结果）。

---

## 5. 详细逻辑函数清单

### 全局逻辑 (`App.tsx`)
-   `handleGainExp(exp, statType, word)`: 计算经验获取、处理升级逻辑及属性成长。
-   `renderContent()`: 主页面路由切换逻辑。

### 数据库服务 (`databaseService.ts`)
-   `getUserStats / updateUserStats`: 角色属性的拉取与持久化。
-   `getBatchWords / markWordProgress`: 单词获取策略（排除已掌握）及学习进度标记。
-   `addMasteredWord`: 记录词汇掌握并触发计数器 RPC。
-   `getLeaderboard / getWordLeaderboard`: 获取排行数据。

### 对战服务 (`pvpService.ts` 系列)
-   `findWordBlitzMatch / findGrammarMatch`: 发起匹配请求 (RPC)。
-   `submitWordBlitzAnswer / submitGrammarAnswer`: 答题同步与伤害结算。
-   `checkWordBlitzMatchStatus`: 匹配成功后的轮询兜底逻辑。
-   `abandonWordBlitzMatch / claimWordBlitzVictory`: 处理玩家退出与异常胜负判定。
-   `getMatchHistory`: 聚合查询对战战绩列表。

### AI 与专项服务 (`geminiService.ts` 系列)
-   `gradeWriting`: 写作 AI 多维度评分。
-   `getExplanation`: 题目深度中文解析生成。
-   `assessSpeakingWithAI`: 评估发音、流畅度及内容。
-   `completeListening / completeReading`: 提交训练结果，验证首次完美通过并分发阶段性大奖。其中阅读模块支持答题后自动触发奖励结算。
-   `synthesizeSpeech`: 文本转音频流 (TTS)。

---

## 6. 最近更新与问题修复 (Recent Updates)

### 2025-12-24 UX 与稳定性增强
- **身份验证升级**:
    - 增加了 **GitHub 与 Google OAuth 登录** 支持，用户可以直接通过第三方账号授权进入游戏。
- **AI 批改能力强化**:
    - 将 **写作工坊** 的底座模型切换至 OpenRouter 的 `bytedance-seed/seed-1.6-flash`。
    - 开启了 **推理能力 (Reasoning)**，使 AI 能够针对学术英语写作提供更深度的逻辑分析与修辞建议。
- **阅读理解体验优化**:
    - 实现了答题后的 **自动平滑滚动**，用户选择选项后自动定位到下一题。
    - 增加了文章切换时的 **强制置顶逻辑**，确保进入新文章时视图位于顶部。
    - 在答题回顾底部增加了“返回列表”与“下一篇”导航按钮。
    - 简化了奖励领取流程，点击“全部提交”后自动处理 XP/金币结算。
- **数据库稳定性修复**:
    - 修复了 `user_readings` 表因缺少 `UPDATE` 策略导致的“Failed to save progress”错误（相关脚本：`database/fix_reading_policy.sql`）。
    - 增强了 `readingService` 的错误捕捉与日志详细度。

---

## 7. AI 接口调用详解 (OpenRouter & Gemini)

### A. OpenRouter API 使用情况
- **调用位置**: `services/speakingAssessmentService.ts`
- **应用场景**: 
    - **口语修行 - AI评估**。用于对玩家录制的语音进行发音、流利度、词汇和内容的综合评分。
    - **写作工坊 - AI批改**。在 `gradeWriting` 中使用 `bytedance-seed/seed-1.6-flash` 模型对作文进行多维度评分及反馈。
- **调用方式**: 
    - 使用原生 `fetch` 或 `@openrouter/sdk`。
    - 认证方式：通过环境变量 `VITE_OPENROUTER_API_KEY`。
    - 模型：`google/gemini-2.5-flash` (口语) 和 `bytedance-seed/seed-1.6-flash` (写作)。
    - 交互细节：
        - 写作批改开启了 `reasoning: { enabled: true }`，利用 Seed 模型的推理能力提供更深度的批改反馈。
        - 强制要求 AI 以 JSON 结构返回评分数据。

### B. Gemini API (原生 SDK) 使用情况
- **调用位置**: `services/geminiService.ts` 和 `services/liveService.ts`
- **应用场景**:
    - **写作批改**：在 `gradeWriting` 中对作文进行评分。
    - **深度解析**：在 `getExplanation` 中生成错题解析。
    - **动态出题**：在 `generateQuiz` / `generateListeningQuiz` 中实时生成阅读或听力材料。
    - **语音合成 (TTS)**：在 `synthesizeSpeech` 中将文字转为语音。
    - **实时对话 (Free Talking)**：在 `liveService.ts` 中实现实时双向语音流式交互。
- **调用方式**:
    - 使用 `@google/genai` 官方 SDK。
    - 认证方式：使用 `process.env.API_KEY`。
    - **标准生成 (`generateContent`)**: 用于批改、解析和出题。配置 `responseMimeType: "application/json"` 并定义 `responseSchema` 以确保输出结构化。
    - **实时连接 (`live.connect`)**: 用于口语练习。通过 WebSocket 连接 `gemini-2.5-flash-native-audio-preview-12-2025` 模型，实现低延迟的语音输入/输出流。

### 2025-12-24 系统核心逻辑与实时性深度优化
- **词汇训练 (Vocab Training) 算法与体验升级**:
    - **SRS-lite 算法改进**: 答错的单词不再进入 12 小时冷却期，并会在下一组练习中被 **优先推送**，确保薄弱环节得到即时强化。
    - **全生命周期管理**: 实现了学习进度的 **本地持久化 (localStorage)**。用户在背单词过程中切换页面或刷新，系统能瞬间恢复当前进度。修复了多账号登录时的 Session 覆盖漏洞。
    - **视觉效果更新**: 重新设计了单组单词完成后的 **结算 UI**，引入了弹簧动画、光晕效果及更精细的数值展示卡片。
- **竞技场 (Battle Arena) 稳定性与难度调整**:
    - **难度等级提升**: 单词闪击战 (Word Blitz) 现在只推送 **柯林斯 4-5 星级** 的核心高频词汇，大幅提升对战挑战性。
    - **AI 对战智能化**: 
        - 弃用了 Mock 数据，AI 现在使用数据库真实题库（单局 20 题并支持循环）。
        - 修复了 AI 战斗结算页面意外消失的 Bug，并为 AI 胜利增加了模拟奖励结算展示。
    - **UI 鲁棒性增强**:
        - 修复了选项中 `\n` 字符的渲染问题，支持真实换行。
        - 增加了长文本自动截断逻辑，防止超长释义破坏布局。
        - 固定了选项卡片高度，确保不同文本长度下 UI 依然整齐。
    - **匹配流程优化**: 修复了点击“取消匹配”后后台 AI 计时器未清除导致的异常跳转问题。
- **金币系统 (Gold System) 实时化改造**:
    - **底层架构重构**: 金币同步逻辑从“本地优先”转向 **“数据库权威实时订阅”**。利用 Supabase Realtime 实现多端金币数值毫秒级同步。
    - **原子性操作**: 所有金币变动（购买、奖励、解锁）均通过后端 **RPC 函数 (`increment_user_gold`)** 原子化执行，彻底杜绝了并发扣费或数值回滚漏洞。
    - **数据完整性**: 在全局 `App` 自动存档逻辑中排除了金币字段，防止旧的本地快照覆盖最新的在线账户余额。

---
*更新日期: 2025-12-24*

