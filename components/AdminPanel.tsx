
import React, { useState } from 'react';
import { Users, Database, ShieldAlert, Edit2, Trash2, Plus, Settings, ChevronDown, Check, User, GraduationCap, Palette, Layout, LogOut } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import ListeningManager from './admin/ListeningManager';

interface AdminPanelProps {
  onUpdateStats: (newStats: any) => void;
}

// AVATARS constant removed


const AdminPanel: React.FC<AdminPanelProps> = ({ onUpdateStats }) => {
  const {
    themeMode, toggleTheme, setThemeMode,
    primaryColor,
    avatar, setAvatar,
    grade, setGrade,
    getColorClass
  } = useTheme();

  const { signOut } = useAuth();

  const [isAdminExpanded, setIsAdminExpanded] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'content' | 'listening'>('users');

  const users = [
    { id: '1', email: 'player@example.com', level: 12, rank: '白银' },
    { id: '2', email: 'warrior@duel.net', level: 45, rank: '最强王者' },
    { id: '3', email: 'newbie@school.cn', level: 1, rank: '青铜' },
  ];

  return (
    <div className="space-y-8 pb-32">
      <div className="flex items-center gap-2 mb-2">
        <Settings size={18} className="text-slate-400" />
        <h2 className="text-[12px] font-black uppercase tracking-widest text-slate-500">系统设置 (Settings)</h2>
      </div>

      {/* 1. Basic Profile Settings */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold dark:text-white text-slate-800 flex items-center gap-2">
          <User size={16} /> 个人形象
        </h3>
        <div className="bg-white dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col items-center gap-4">
            <div className={`w-24 h-24 rounded-full ${getColorClass('bg', 100)} flex items-center justify-center overflow-hidden border-4 ${getColorClass('border', 200)} relative group`}>
              {avatar.startsWith('data:image') || avatar.startsWith('http') ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">{avatar}</span>
              )}

              {/* Overlay for upload hint */}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => document.getElementById('avatar-upload')?.click()}>
                <Edit2 className="text-white" size={24} />
              </div>
            </div>

            <div className="flex gap-3">
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setAvatar(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <button
                onClick={() => document.getElementById('avatar-upload')?.click()}
                className={`px-4 py-2 rounded-xl text-sm font-bold text-white ${getColorClass('bg', 600)} hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-${primaryColor}-500/30`}
              >
                上传头像 (Upload)
              </button>
              <button
                onClick={() => setAvatar('🧙‍♂️')} // Reset to default
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                重置 (Reset)
              </button>
            </div>
            <p className="text-[10px] text-slate-400">支持 JPG, PNG. 建议尺寸 200x200.</p>
          </div>
        </div>
      </section>

      {/* 2. Grade & Appearance Settings (Combined for compactness) */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold dark:text-white text-slate-800 flex items-center gap-2">
          <Settings size={16} /> 偏好设置
        </h3>
        <div className="bg-white dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">

          {/* Grade Selector */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block"><GraduationCap size={12} className="inline mr-1" /> 学年 (Grade)</span>
            <select
              value={grade}
              onChange={(e) => setGrade(parseInt(e.target.value))}
              className={`w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-none outline-none font-bold text-sm text-slate-700 dark:text-slate-200 focus:ring-2 ${getColorClass('text', 500).replace('text-', 'ring-')}`}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                <option key={g} value={g}>{['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'][g - 1]}年级 (Grade {g})</option>
              ))}
            </select>
          </div>



          {/* Dark Mode Toggle */}


          {/* Logout Button */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50">
            <button
              onClick={signOut}
              className="w-full p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest"
            >
              <LogOut size={16} /> 退出登录 (Sign Out)
            </button>
          </div>

        </div>
      </section>



      {/* 4. Developer Admin (Collapsed) */}
      < section className="pt-8" >
        <button
          onClick={() => setIsAdminExpanded(!isAdminExpanded)}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <span className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert size={14} /> 开发者管理中心
          </span>
          <ChevronDown size={16} className={`transition-transform duration-300 ${isAdminExpanded ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isAdminExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-6">
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 text-sm">
                  <button
                    onClick={() => setActiveAdminTab('users')}
                    className={`flex-1 py-1.5 rounded-md transition-all text-xs font-bold ${activeAdminTab === 'users' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400'}`}
                  >
                    用户管理
                  </button>
                  <button
                    onClick={() => setActiveAdminTab('content')}
                    className={`flex-1 py-1.5 rounded-md transition-all text-xs font-bold ${activeAdminTab === 'content' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400'}`}
                  >
                    内容管理
                  </button>
                  <button
                    onClick={() => setActiveAdminTab('listening')}
                    className={`flex-1 py-1.5 rounded-md transition-all text-xs font-bold ${activeAdminTab === 'listening' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400'}`}
                  >
                    听力管理
                  </button>
                </div>

                <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {activeAdminTab === 'users' ? (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-200 dark:bg-slate-900/50 text-xs font-mono text-slate-500 uppercase">
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">LVL</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                        {users.map(u => (
                          <tr key={u.id} className="text-sm dark:text-slate-300">
                            <td className="px-4 py-3">
                              <div className="font-bold text-xs">{u.email}</div>
                              <div className="text-[10px] opacity-50">{u.id}</div>
                            </td>
                            <td className="px-4 py-3">{u.level}</td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => onUpdateStats({ level: 99, atk: 999 })} className="p-1 hover:text-indigo-500"><Edit2 size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : activeAdminTab === 'content' ? (
                    <div className="p-8 text-center space-y-4">
                      <Database size={32} className="text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-400">管理题库 (CMS)</p>
                      <button className={`px-4 py-2 rounded-lg text-xs font-bold text-white ${getColorClass('bg', 600)}`}>
                        Add Set
                      </button>
                    </div>
                  ) : (
                    <div className="p-4">
                      <ListeningManager />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section >
    </div >
  );
};

export default AdminPanel;
