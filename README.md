# Word Warrior (单词战士)

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Version](https://img.shields.io/badge/version-0.0.0-green.svg)

**Word Warrior** is a Web application that deeply integrates **RPG elements** with **English learning**. Players improve their character's attributes (ATK, DEF, HP, EXP) by completing various English training tasks (Listening, Speaking, Reading, Writing, Vocabulary) and compete with opponents in real-time or simulated PvP battles using these attributes.

**Word Warrior (单词战士)** 是一款将 **RPG 角色扮演元素** 与 **英语学习** 深度结合的 Web 应用程序。玩家通过完成各种英语专项训练（听、说、读、写、词汇）来提升角色的属性（攻击力、防御力、生命值、经验值），并在实时或模拟的 PvP 对战中利用这些属性击败对手。

---

## 🌟 Core Concepts / 核心理念

- **Learning as Training / 学习即修行**: Exercises are wrapped as "Trials", "Training", and "Workshops".
- **Attribute Mapping / 属性映射**:
  - **Vocab/Writing** -> **ATK (攻击力)**
  - **Listening/Grammar** -> **DEF (防御力)**
  - **Reading** -> **HP (生命值)**
  - **Speaking** -> **EXP (经验值)**
- **Real-time Battle / 实时对战**: Synchronous competitive quizzes via Supabase Realtime.

---

## 🚀 Features / 功能特性

### 🎮 Gameplay / 核心玩法
1.  **Vocab Training (词汇训练)**: Flashcards and Quizzes to earn Gold and ATK.
2.  **Scholar Path (学习之路)**:
    -   **Listening (听力磨炼)**: Audio tasks to boost DEF.
    -   **Reading (阅读试炼)**: Articles & comprehension questions to boost HP.
    -   **Writing (写作工坊)**: AI-powered grading (Gemini/OpenRouter) to boost ATK.
    -   **Speaking (口语修行)**: AI Assessment & Free Talking to gain EXP.
3.  **Battle Arena (竞技场)**:
    -   **Word Blitz (单词闪击战)**: Fast-paced definition matching.
    -   **Grammar Tactics (语法阵地战)**: Fill-in-the-blanks defense game.
    -   **AI Fallback**: Auto-match with AI if no opponent is found.

### 🛡️ Character & Social / 角色与社交
- **RPG Stats**: Level, EXP, HP, ATK, DEF, Crit Rate.
- **Shop & Customization**: Buy weapons/armor and customize appearance (Skin, Hair).
- **Social**: Leaderboards (Rank & Vocab) and Achievements.

---

## 🛠️ Tech Stack / 技术栈

- **Frontend**: React 19, Vite, TypeScript
- **Game Engine**: Phaser (for battle scenes)
- **Styling**: Vanilla CSS, Framer Motion (Animations)
- **Backend & Database**: Supabase (PostgreSQL, Auth, Realtime)
- **AI Services**: 
  - Google Gemini API (`@google/genai`) - For content generation & TTS.
  - OpenRouter API (`@openrouter/sdk`) - For writing assessment.

---

## 🏁 Getting Started /以此开始

### Prerequisites / 前置准备
- Node.js (v18+)
- npm or yarn
- A Supabase project
- API Keys for Google Gemini and OpenRouter

### Installation / 安装

1.  **Clone the repository / 克隆仓库**
    ```bash
    git clone https://github.com/your-username/word-warrior.git
    cd word-warrior
    ```

2.  **Install dependencies / 安装依赖**
    ```bash
    npm install
    ```

3.  **Environment Setup / 环境配置**
    Create a `.env.local` file in the root directory based on `.env.local.example`:
    
    复制 `.env.local.example` 为 `.env.local` 并填入以下配置：

    ```env
    # Gemini API Configuration
    GEMINI_API_KEY=your_gemini_api_key

    # Supabase Configuration
    SUPABASE_URL=https://your-project.supabase.co
    SUPABASE_ANON_KEY=your_supabase_anon_key

    # OpenRouter API Configuration (Note: VITE_ prefix required)
    VITE_OPENROUTER_API_KEY=your_openrouter_api_key
    ```

4.  **Run Development Server / 启动开发服务器**
    ```bash
    npm run dev
    ```

---

## 📂 Project Structure / 项目结构

- **/src**
  - **App.tsx**: Main component & routing.
  - **components/**: UI modules (Auth, Warrior, Training modes, BattleArena).
  - **services/**: API interactions (Database, PvP, Gemini).
  - **contexts/**: Global state management.
  - **constants.tsx**: Configuration & Mock data.

---

## 📄 License

This project is licensed under the MIT License.
