# Word Warrior (单词战士)

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Version](https://img.shields.io/badge/version-0.0.0-green.svg)

**Word Warrior** 是一款将 **RPG 角色扮演元素** 与 **英语学习** 深度结合的 Web 应用程序。玩家通过完成各种英语专项训练（听力、口语、阅读、写作、词汇）来提升角色的属性（ATK、DEF、HP、EXP），并在实时或模拟的 PvP 对战中利用这些属性击败对手。

---

## 🌟 核心理念 (Core Concepts)

- **学习即修行**：将枯燥的题目练习包装成“试炼”、“磨炼”和“工坊”。
- **属性映射系统**：
  - **Vocab (词汇) / Writing (写作)** -> **ATK (攻击力)**
  - **Listening (听力) / Grammar (语法)** -> **DEF (防御力)**
  - **Reading (阅读)** -> **HP (生命值)**
  - **Speaking (口语)** -> **EXP (经验值)**
- **实时对战**：通过 Supabase Realtime 实现玩家间的同步答题竞技。

---

## 🚀 功能特性 (Features)

### 🎮 核心玩法 (Gameplay)
1.  **Vocab Training (词汇训练)**：通过单词卡片和测验赚取 Gold 和提升 ATK。
2.  **Scholar Path (学习之路)**：
    -   **Listening (听力磨炼)**：通过音频任务提升 DEF。
    -   **Reading (阅读试炼)**：阅读长篇文章并回答理解问题以提升 HP。
    -   **Writing (写作工坊)**：利用 AI (Gemini/OpenRouter) 进行作文多维度评分，提升 ATK。
    -   **Speaking (口语修行)**：包含 AI 评估与自由对话 (Free Talking) 模式，获取大量 EXP。
3.  **Battle Arena (竞技场)**：
    -   **Word Blitz (单词闪击战)**：快速英选汉，挑战反应速度。
    -   **Grammar Tactics (语法阵地战)**：语法填空防御游戏。
    -   **AI Fallback**：若匹配不到对手，自动转为 AI 对战模式。

### 🛡️ 角色与社交
- **RPG 属性**：等级、EXP、HP、ATK、DEF、暴击率。
- **商店与自定义**：消耗 Gold 购买武器、防具，并自定义外观（皮肤、发色）。
- **社交系统**：排行榜（段位与词汇量）及成就勋章。

---

## 🛠️ 技术栈 (Tech Stack)

- **Frontend**: React 19, Vite, TypeScript
- **Game Engine**: Phaser (用于战斗场景)
- **Styling**: Vanilla CSS, Framer Motion (动画)
- **Backend & Database**: Supabase (PostgreSQL, Auth, Realtime)
- **AI Services**: 
  - Google Gemini API (`@google/genai`) - 用于内容生成与 TTS。
  - OpenRouter API (`@openrouter/sdk`) - 用于写作评估。

---

## 🏁 以此开始 (Getting Started)

### 前置准备 (Prerequisites)
- Node.js (v18+)
- npm 或 yarn
- 一个 Supabase 项目
- Google Gemini 和 OpenRouter 的 API Key

### 安装步骤 (Installation)

1.  **克隆仓库**
    ```bash
    git clone https://github.com/your-username/word-warrior.git
    cd word-warrior
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **环境配置**
    基于 `.env.local.example` 创建根目录下的 `.env.local` 文件：
    
    ```env
    # Gemini API Configuration
    GEMINI_API_KEY=your_gemini_api_key

    # Supabase Configuration
    SUPABASE_URL=https://your-project.supabase.co
    SUPABASE_ANON_KEY=your_supabase_anon_key

    # OpenRouter API Configuration (Note: VITE_ prefix required)
    VITE_OPENROUTER_API_KEY=your_openrouter_api_key
    ```

4.  **启动开发服务器**
    ```bash
    npm run dev
    ```

---

## 📂 项目结构 (Project Structure)

- **/src**
  - **App.tsx**: 根组件与路由逻辑。
  - **components/**: UI 模块 (Auth, Warrior, Training modes, BattleArena)。
  - **services/**: API 交互 (Database, PvP, Gemini)。
  - **contexts/**: 全局状态管理。
  - **constants.tsx**: 配置中心与 Mock 数据。

---

## 📄 许可证 (License)

本项目采用 MIT License。
