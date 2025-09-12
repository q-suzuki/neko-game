// 猫のデータ定義（11種類）
const CAT_DATA = [
    {
        id: 1,
        name: '子猫',
        emoji: '🐱',
        image: 'assets/cats/cat1.png',
        radius: 18,
        color: '#FFE4B5',
        score: 1,
        weight: 4  // 出現頻度の重み
    },
    {
        id: 2,
        name: '普通猫',
        emoji: '😺',
        image: 'assets/cats/cat2.png',
        radius: 24,
        color: '#FFDAB9',
        score: 3,
        weight: 3
    },
    {
        id: 3,
        name: 'ふっくら猫',
        emoji: '😸',
        image: 'assets/cats/cat3.png',
        radius: 32,
        color: '#FFD700',
        score: 6,
        weight: 3
    },
    {
        id: 4,
        name: 'まるまる猫',
        emoji: '😹',
        image: 'assets/cats/cat4.png',
        radius: 40,
        color: '#FFA500',
        score: 10,
        weight: 2
    },
    {
        id: 5,
        name: 'でっぷり猫',
        emoji: '😻',
        image: 'assets/cats/cat5.png',
        radius: 50,
        color: '#FF8C00',
        score: 15,
        weight: 2
    },
    {
        id: 6,
        name: 'どっしり猫',
        emoji: '🙀',
        image: 'assets/cats/cat6.png',
        radius: 62,
        color: '#FF6347',
        score: 21,
        weight: 0  // 合体でのみ出現
    },
    {
        id: 7,
        name: '巨大猫',
        emoji: '😾',
        image: 'assets/cats/cat7.png',
        radius: 76,
        color: '#FF4500',
        score: 28,
        weight: 0  // 合体でのみ出現
    },
    {
        id: 8,
        name: '超巨大猫',
        emoji: '😿',
        image: 'assets/cats/cat8.png',
        radius: 92,
        color: '#DC143C',
        score: 36,
        weight: 0  // 合体でのみ出現
    },
    {
        id: 9,
        name: '究極猫',
        emoji: '🐈',
        image: 'assets/cats/cat9.png',
        radius: 110,
        color: '#8B0000',
        score: 45,
        weight: 0  // 合体でのみ出現
    },
    {
        id: 10,
        name: '神秘猫',
        emoji: '🐈‍⬛',
        image: 'assets/cats/cat10.png',
        radius: 130,
        color: '#4B0082',
        score: 55,
        weight: 0  // 合体でのみ出現
    },
    {
        id: 11,
        name: '伝説猫',
        emoji: '🦁',
        image: 'assets/cats/cat11.png',
        radius: 152,
        color: '#FFD700',
        score: 100,
        weight: 0  // 合体でのみ出現
    }
];

// 次に落とす猫を選択する関数（難易度対応）
function getRandomDropCat(maxLevel = 5) {
    // weight > 0 かつ maxLevel以下の猫のみ選択可能
    const droppableCats = CAT_DATA.filter(cat => cat.weight > 0 && cat.id <= maxLevel);
    
    // 重み付き確率で選択
    const totalWeight = droppableCats.reduce((sum, cat) => sum + cat.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const cat of droppableCats) {
        random -= cat.weight;
        if (random <= 0) {
            return {...cat};  // コピーを返す
        }
    }
    
    return {...droppableCats[0]};  // フォールバック
}

// 猫のレベルから次のレベルの猫を取得
function getNextLevelCat(currentId) {
    if (currentId >= CAT_DATA.length) {
        return null;  // 最大レベル
    }
    return {...CAT_DATA[currentId]};  // 次のレベルの猫（IDは1ベースなので、そのままインデックスとして使える）
}

// 猫のIDからデータを取得
function getCatById(id) {
    return CAT_DATA.find(cat => cat.id === id) || CAT_DATA[0];
}

// 合体時のエフェクト用データ
const MERGE_EFFECTS = {
    particleCount: 8,
    particleSpeed: 3,
    particleLifetime: 500,  // ミリ秒
    scaleAnimation: 1.3,
    animationDuration: 200  // ミリ秒
};