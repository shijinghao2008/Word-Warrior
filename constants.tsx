
import React from 'react';
import { Swords, Zap, PenTool, LayoutGrid, Settings, BookOpen, Mic2, Headphones, Trophy, ShieldCheck, Flame, Target, Award, Crown, Sun, Calendar, Scroll, Medal, Star } from 'lucide-react';
import { Rank } from './types';

export const calculateKP = (stats: { atk: number; def: number; hp: number; level: number }, gearBonus: { atk: number; def: number; hp: number } = { atk: 0, def: 0, hp: 0 }) => {
  const totalAtk = stats.atk + gearBonus.atk;
  const totalDef = stats.def + gearBonus.def;
  const totalHp = stats.hp + gearBonus.hp;
  
  return (totalAtk * 10) + (totalDef * 15) + (totalHp * 2) + (stats.level * 100);
};

export const KP_RANKS = [
  { name: '见习学徒', label: 'Novice', min: 0, max: 2000, color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-400' },
  { name: '青铜笔杆', label: 'Bronze', min: 2001, max: 5000, color: 'text-amber-700', bg: 'bg-amber-700/10', border: 'border-amber-700' },
  { name: '白银卷轴', label: 'Silver', min: 5001, max: 10000, color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-300' },
  { name: '黄金羽毛', label: 'Gold', min: 10001, max: 20000, color: 'text-yellow-600', bg: 'bg-yellow-500/10', border: 'border-yellow-500' },
  { name: '钻石圣贤', min: 20001, max: 50000, color: 'text-purple-600', bg: 'bg-purple-500/10', border: 'border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' },
  { name: '单词武神', label: 'Legend', min: 50001, max: Infinity, color: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-600 shadow-[0_0_15px_rgba(239,68,68,0.6)]' },
];

export const getKPRank = (kp: number) => {
  return KP_RANKS.find(r => kp >= r.min && kp <= r.max) || KP_RANKS[0];
};

export const INITIAL_STATS = {
  level: 1,
  exp: 0,
  atk: 10,
  def: 10,
  crit: 0.05,
  hp: 100,
  maxHp: 100,
  rank: Rank.BRONZE,
  rankPoints: 120,
  winStreak: 0,
  masteredWordsCount: 0,
  loginDays: 1,
};

export const NAVIGATION = [
  { name: '主控室', icon: <LayoutGrid size={20} />, id: 'dashboard' },
  { name: '排行榜', icon: <Trophy size={20} />, id: 'leaderboard' },
  { name: '管理端', icon: <Settings size={20} />, id: 'admin' },
];

export const TRAINING_MODES = [
  { id: 'vocab', name: '词汇训练', icon: <Swords size={20} />, desc: 'Swipable Cards', stat: 'ATK' },
  { id: 'listening', name: '听力磨炼', icon: <Headphones size={20} />, desc: 'Audio Quiz', stat: 'DEF' },
  { id: 'oral', name: '口语修行', icon: <Mic2 size={20} />, desc: 'AI Coaching', stat: 'EXP' },
  { id: 'reading', name: '阅读试炼', icon: <BookOpen size={20} />, desc: 'Comprehension', stat: 'HP' },
  { id: 'writing', name: '写作工坊', icon: <PenTool size={20} />, desc: 'AI Grading', stat: 'ATK' },
];

export const PVP_MODES = [
  {
    id: 'pvp_blitz',
    name: '单词闪击战',
    description: '拼手速！英选汉，伤害结算：ATK × 1.5。',
    icon: <Zap size={24} className="text-white" />,
    color: 'from-yellow-500/80 to-orange-500/80 border-yellow-500/50',
    mechanic: 'Speed-based Burst'
  },
  {
    id: 'pvp_tactics',
    name: '语法阵地战',
    description: '拼正确率！DEF 抵挡伤害，免疫暴击。',
    icon: <ShieldCheck size={24} className="text-white" />,
    color: 'from-cyan-500/80 to-blue-500/80 border-cyan-500/50',
    mechanic: 'Defensive Strategy'
  },

];

export const ACHIEVEMENTS = [
  // Word Count Milestones
  {
    id: 'word_1',
    title: '初出茅庐',
    desc: '累计掌握 1 个单词',
    icon: <Scroll size={24} />,
    color: 'text-slate-500',
    bg: 'bg-slate-500/10 border-slate-500',
    condition: (stats: any) => stats.masteredWordsCount >= 1
  },
  {
    id: 'word_10',
    title: '知识学徒',
    desc: '累计掌握 10 个单词',
    icon: <BookOpen size={24} />,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 border-blue-500',
    condition: (stats: any) => stats.masteredWordsCount >= 10
  },
  {
    id: 'word_100',
    title: '博学智者',
    desc: '累计掌握 100 个单词',
    icon: <Zap size={24} />,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10 border-indigo-500',
    condition: (stats: any) => stats.masteredWordsCount >= 100
  },
  {
    id: 'word_1000',
    title: '万词王',
    desc: '累计掌握 1000 个单词',
    icon: <Crown size={24} />,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 border-amber-500',
    condition: (stats: any) => stats.masteredWordsCount >= 1000
  },

  // Login/Consistency
  {
    id: 'streak_3',
    title: '三日之约',
    desc: '连续登录学习 3 天',
    icon: <Sun size={24} />,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10 border-orange-500',
    condition: (stats: any) => stats.loginDays >= 3 // Simplified for demo
  },
  {
    id: 'streak_7',
    title: '持之以恒',
    desc: '连续登录学习 7 天',
    icon: <Calendar size={24} />,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 border-emerald-500',
    condition: (stats: any) => stats.loginDays >= 7
  },
  {
    id: 'perfect_month',
    title: '月度守护者',
    desc: '单一月份内全勤打卡',
    icon: <ShieldCheck size={24} />,
    color: 'text-fuchsia-500',
    bg: 'bg-fuchsia-500/10 border-fuchsia-500',
    condition: (stats: any) => stats.loginDays >= 30
  },

  // Level Milestones
  {
    id: 'lvl_5',
    title: '战士觉醒',
    desc: '达到等级 5',
    icon: <Swords size={24} />,
    color: 'text-red-500',
    bg: 'bg-red-500/10 border-red-500',
    condition: (stats: any) => stats.level >= 5
  },
  {
    id: 'lvl_20',
    title: '英雄领域',
    desc: '达到等级 20',
    icon: <Medal size={24} />,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10 border-purple-500',
    condition: (stats: any) => stats.level >= 20
  },

  // Performance
  {
    id: 'streak_win_10',
    title: '势不可挡',
    desc: '获得 10 连胜',
    icon: <Flame size={24} />,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10 border-rose-500',
    condition: (stats: any) => stats.winStreak >= 10
  },
  {
    id: 'high_accuracy',
    title: '精准打击',
    desc: '单次学习正确率 100%',
    icon: <Target size={24} />,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10 border-cyan-500',
    condition: (stats: any) => stats.exp > 500 // Mock condition
  }
];

export const MOCK_VOCAB_CARDS = [
  { word: 'Pragmatic', chinese: '务实的', definition: 'Dealing with things sensibly and realistically.', options: ['务实的', '幻想的', '快速的', '沉重的'], correctAnswer: '务实的' },
  { word: 'Inevitably', chinese: '不可避免地', definition: 'As is certain to happen; unavoidably.', options: ['偶尔地', '突然地', '不可避免地', '悄悄地'], correctAnswer: '不可避免地' },
  { word: 'Enthusiastic', chinese: '热情的', definition: 'Having or showing intense and eager enjoyment.', options: ['热情的', '冷淡的', '焦虑的', '疲惫的'], correctAnswer: '热情的' },
  { word: 'Compromise', chinese: '妥协', definition: 'An agreement reached by each side making concessions.', options: ['坚持', '妥协', '进攻', '逃避'], correctAnswer: '妥协' },
];

export const MOCK_GRAMMAR_QUESTIONS = [
  {
    prompt: "If I ______ you, I would take the job immediately.",
    options: ["am", "was", "were", "be"],
    correctAnswer: "were",
    type: "grammar"
  },
  {
    prompt: "She is one of the students who ______ always on time.",
    options: ["is", "are", "was", "be"],
    correctAnswer: "are",
    type: "grammar"
  },
  {
    prompt: "By this time next year, I ______ my master's degree.",
    options: ["will finish", "will have finished", "finish", "finished"],
    correctAnswer: "will have finished",
    type: "grammar"
  },
  {
    prompt: "I wish I ______ to the party last night.",
    options: ["go", "went", "had gone", "would go"],
    correctAnswer: "had gone",
    type: "grammar"
  }
];



export const MOCK_QUESTIONS = [
  {
    id: 'q1',
    type: 'reading',
    prompt: '[Passage] Mastering a new language requires persistence and practice. It opens doors to different cultures and ways of thinking. [Question] What is required to master a new language according to the text?',
    options: ['Persistence and practice', 'Only reading books', 'Living abroad', 'Watching movies'],
    correctAnswer: 'Persistence and practice',
    explanation: '文中第一句提到 "persistence and practice"。',
    difficulty: 2,
  },
  ...MOCK_GRAMMAR_QUESTIONS.map((q, idx) => ({ ...q, id: `g${idx}`, difficulty: 1 }))
];

export const SHOP_ITEMS: import('./types').ShopItem[] = [
  // Weapons
  {
    id: 'wpn_wood_sword',
    name: '训练木剑',
    type: 'weapon',
    price: 50,
    statBonus: { atk: 2 },
    description: '一把简单的木剑，适合新手。',
    assetKey: 'weapon_wood'
  },
  {
    id: 'wpn_iron_sword',
    name: '精铁长剑',
    type: 'weapon',
    price: 200,
    statBonus: { atk: 5 },
    description: '铁匠精心打造的长剑，锋利无比。',
    assetKey: 'weapon_iron'
  },
  {
    id: 'wpn_flame_blade',
    name: '火焰之刃',
    type: 'weapon',
    price: 1000,
    statBonus: { atk: 15, crit: 0.05 },
    description: '蕴含火焰魔力的魔法剑。',
    assetKey: 'weapon_fire'
  },
  // Armor
  {
    id: 'arm_leather',
    name: '皮甲',
    type: 'armor',
    price: 50,
    statBonus: { def: 2, hp: 10 },
    description: '轻便的皮甲，提供基础防护。',
    assetKey: 'armor_leather'
  },
  {
    id: 'arm_iron',
    name: '铁甲',
    type: 'armor',
    price: 250,
    statBonus: { def: 8, hp: 50 },
    description: '坚固的铁甲，此时你感觉自己是个真正的战士。',
    assetKey: 'armor_iron'
  },
  {
    id: 'arm_golden',
    name: '黄金战甲',
    type: 'armor',
    price: 2000,
    statBonus: { def: 20, hp: 200 },
    description: '闪耀着金光的传说盔甲。',
    assetKey: 'armor_gold'
  }
];
