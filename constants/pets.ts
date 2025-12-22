
export type PetRarity = 'white' | 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'colorful';

export interface PetScale {
    rarity: PetRarity;
    probability: number; // percentage, e.g. 59.89
    color: string;
    shadow: string;
}

export const RARITY_CONFIG: Record<PetRarity, PetScale> = {
    white: { rarity: 'white', probability: 59.89, color: 'text-slate-400', shadow: 'shadow-slate-400/50' },
    green: { rarity: 'green', probability: 24, color: 'text-emerald-400', shadow: 'shadow-emerald-400/50' },
    blue: { rarity: 'blue', probability: 10, color: 'text-blue-400', shadow: 'shadow-blue-400/50' },
    purple: { rarity: 'purple', probability: 5, color: 'text-purple-400', shadow: 'shadow-purple-400/50' },
    orange: { rarity: 'orange', probability: 1, color: 'text-orange-400', shadow: 'shadow-orange-400/50' },
    red: { rarity: 'red', probability: 0.1, color: 'text-red-500', shadow: 'shadow-red-500/50' },
    colorful: { rarity: 'colorful', probability: 0.01, color: 'text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500', shadow: 'shadow-pink-500/50' },
};

export interface PetDefinition {
    id: string; // we'll use a string id derived from name for static list
    name: string;
    rarity: PetRarity;
    description: string;
}

export const PETS_DATA: PetDefinition[] = [
    // White
    { id: 'w1', name: '小团', rarity: 'white', description: '普通的小生物' },
    { id: 'w2', name: '毛毛', rarity: 'white', description: '毛茸茸的' },
    { id: 'w3', name: '豆豆', rarity: 'white', description: '像豆子一样' },
    { id: 'w4', name: '皮皮', rarity: 'white', description: '调皮捣蛋' },
    { id: 'w5', name: '灰尾', rarity: 'white', description: '尾巴是灰色的' },
    { id: 'w6', name: '圆圆', rarity: 'white', description: '圆滚滚的' },
    { id: 'w7', name: '小爪', rarity: 'white', description: '爪子很小' },
    { id: 'w8', name: '米米', rarity: 'white', description: '喜欢吃米' },
    { id: 'w9', name: '阿呆', rarity: 'white', description: '呆呆的' },

    // Green
    { id: 'g1', name: '风爪', rarity: 'green', description: '行动如风' },
    { id: 'g2', name: '林牙', rarity: 'green', description: '森林的利牙' },
    { id: 'g3', name: '跳跳', rarity: 'green', description: '喜欢跳跃' },
    { id: 'g4', name: '青尾', rarity: 'green', description: '青色的尾巴' },
    { id: 'g5', name: '草影', rarity: 'green', description: '隐藏在草丛中' },
    { id: 'g6', name: '咕噜', rarity: 'green', description: '发出咕噜声' },
    { id: 'g7', name: '森森', rarity: 'green', description: '来自深森' },
    { id: 'g8', name: '迅爪', rarity: 'green', description: '攻击迅速' },
    { id: 'g9', name: '轻羽', rarity: 'green', description: '轻如鸿毛' },

    // Blue
    { id: 'b1', name: '冰牙', rarity: 'blue', description: '寒冰之牙' },
    { id: 'b2', name: '雷尾', rarity: 'blue', description: '尾巴带电' },
    { id: 'b3', name: '夜瞳', rarity: 'blue', description: '夜视能力' },
    { id: 'b4', name: '影爪', rarity: 'blue', description: '影子般的攻击' },
    { id: 'b5', name: '星步', rarity: 'blue', description: '踏星而行' },
    { id: 'b6', name: '霜毛', rarity: 'blue', description: '霜冻皮毛' },
    { id: 'b7', name: '月痕', rarity: 'blue', description: '月亮的印记' },
    { id: 'b8', name: '风影', rarity: 'blue', description: '风中之影' },
    { id: 'b9', name: '蓝焰', rarity: 'blue', description: '蓝色火焰' },

    // Purple
    { id: 'p1', name: '幽影兽', rarity: 'purple', description: '幽暗的影子' },
    { id: 'p2', name: '紫电灵', rarity: 'purple', description: '紫色的闪电' },
    { id: 'p3', name: '暗月爪', rarity: 'purple', description: '暗月下的利爪' },
    { id: 'p4', name: '虚空行者', rarity: 'purple', description: '穿梭虚空' },
    { id: 'p5', name: '星魂兽', rarity: 'purple', description: '星辰之魂' },
    { id: 'p6', name: '梦魇尾', rarity: 'purple', description: '梦魇的尾巴' },
    { id: 'p7', name: '夜幕守卫', rarity: 'purple', description: '守护黑夜' },
    { id: 'p8', name: '灵纹兽', rarity: 'purple', description: '神秘纹路' },
    { id: 'p9', name: '深渊低语', rarity: 'purple', description: '来自深渊的声音' },

    // Orange
    { id: 'o1', name: '烈阳圣兽', rarity: 'orange', description: '如烈阳般耀眼' },
    { id: 'o2', name: '天穹之牙', rarity: 'orange', description: '撕裂天穹' },
    { id: 'o3', name: '不灭炎灵', rarity: 'orange', description: '永不熄灭的火焰' },
    { id: 'o4', name: '雷霆王裔', rarity: 'orange', description: '雷霆之王的后裔' },
    { id: 'o5', name: '远古守兽', rarity: 'orange', description: '守护远古秘密' },
    { id: 'o6', name: '星界巡游者', rarity: 'orange', description: '巡游星界' },
    { id: 'o7', name: '苍穹裁决', rarity: 'orange', description: '苍穹的裁决者' },

    // Red
    { id: 'r1', name: '灭世魔宠', rarity: 'red', description: '拥有灭世之力' },
    { id: 'r2', name: '混沌之主', rarity: 'red', description: '混沌的主宰' },
    { id: 'r3', name: '永燃神焰', rarity: 'red', description: '永远燃烧的神焰' },
    { id: 'r4', name: '天灾支配者', rarity: 'red', description: '支配天灾' },
    { id: 'r5', name: '终焉守望', rarity: 'red', description: '守望终焉' },

    // Colorful
    { id: 'c1', name: '创世之灵', rarity: 'colorful', description: '创世的灵光' },
    { id: 'c2', name: '万界共鸣', rarity: 'colorful', description: '与万界共鸣' },
    { id: 'c3', name: '命运原初兽', rarity: 'colorful', description: '命运的原初' },
];
