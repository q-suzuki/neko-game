/**
 * 猫のデータ定義（11種類）
 * @file cats.js - Cat data definitions and utility functions
 */

// 表示・物理半径のスケール
const CAT_RADIUS_SCALE = 1.00;

// 猫データの検証用定数
const MIN_CAT_RADIUS = 10;
const MAX_CAT_RADIUS = 200;
const MIN_CAT_SCORE = 0;
const MAX_CAT_WEIGHT = 10;
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

/**
 * スケール適用した猫データを返す（コピー）
 * @param {Object} cat - 元の猫データ
 * @returns {Object|null} スケール適用済みの猫データのコピー
 */
function toScaledCat(cat) {
    if (!cat || typeof cat !== 'object') {
        console.warn('Invalid cat data provided to toScaledCat:', cat);
        return null;
    }

    // 半径の妥当性チェック
    if (typeof cat.radius !== 'number' || cat.radius < MIN_CAT_RADIUS || cat.radius > MAX_CAT_RADIUS) {
        console.warn('Invalid cat radius:', cat.radius);
        return { ...cat, radius: MIN_CAT_RADIUS };
    }

    const scaledRadius = Math.round(cat.radius * CAT_RADIUS_SCALE);
    return { ...cat, radius: scaledRadius };
}

/**
 * 次に落とす猫を選択する関数（難易度ごとの重み上書きに対応）
 * @param {number} maxLevel - 選択可能な最大レベル
 * @param {Object|null} weightsOverride - 重みの上書き設定
 * @returns {Object|null} ランダム選択された猫データ
 */
function getRandomDropCat(maxLevel = 5, weightsOverride = null) {
    // id が maxLevel 以下、かつ（上書き重み > 0 または 既定重み > 0）の猫のみ対象
    const droppableCats = CAT_DATA.filter(cat => {
        if (cat.id > maxLevel) return false;
        const w = weightsOverride && typeof weightsOverride[cat.id] === 'number'
            ? weightsOverride[cat.id]
            : cat.weight;
        return w > 0;
    });

    if (droppableCats.length === 0) {
        // 何らかの理由で候補がない場合は、従来条件でフォールバック
        const fallback = CAT_DATA.filter(cat => cat.weight > 0 && cat.id <= maxLevel);
        return toScaledCat(fallback[0] || CAT_DATA[0]);
    }

    // 重み合計を算出（上書き重みがあればそちらを使用）
    const totalWeight = droppableCats.reduce((sum, cat) => {
        const w = weightsOverride && typeof weightsOverride[cat.id] === 'number'
            ? weightsOverride[cat.id]
            : cat.weight;
        return sum + w;
    }, 0);

    // totalWeight が 0 なら既定重みで再計算
    const effectiveTotal = totalWeight > 0
        ? totalWeight
        : droppableCats.reduce((sum, cat) => sum + cat.weight, 0);

    let random = Math.random() * effectiveTotal;
    for (const cat of droppableCats) {
        const w = (weightsOverride && typeof weightsOverride[cat.id] === 'number')
            ? weightsOverride[cat.id]
            : cat.weight;
        const useW = (totalWeight > 0) ? w : cat.weight;
        random -= useW;
        if (random <= 0) {
            return toScaledCat(cat);  // スケール済みコピーを返す
        }
    }

    return toScaledCat(droppableCats[0]);  // フォールバック
}

/**
 * 猫のレベルから次のレベルの猫を取得
 * @param {number} currentId - 現在の猫のID
 * @returns {Object|null} 次のレベルの猫データまたはnull（最大レベルの場合）
 */
function getNextLevelCat(currentId) {
    if (typeof currentId !== 'number' || currentId < 1) {
        console.warn('Invalid currentId provided to getNextLevelCat:', currentId);
        return null;
    }

    if (currentId >= CAT_DATA.length) {
        return null;  // 最大レベル
    }

    const nextCat = CAT_DATA[currentId]; // 次のレベルの猫（IDは1ベース）
    if (!nextCat) {
        console.warn('Cat data not found for ID:', currentId + 1);
        return null;
    }

    return toScaledCat(nextCat);
}

/**
 * 猫のIDからデータを取得
 * @param {number} id - 猫のID
 * @returns {Object} 指定されたIDの猫データ（見つからない場合はデフォルト）
 */
function getCatById(id) {
    if (typeof id !== 'number' || id < 1) {
        console.warn('Invalid id provided to getCatById:', id);
        return toScaledCat(CAT_DATA[0]);
    }

    const found = CAT_DATA.find(cat => cat.id === id);
    if (!found) {
        console.warn('Cat not found for ID:', id, 'returning default');
        return toScaledCat(CAT_DATA[0]);
    }

    return toScaledCat(found);
}

// 合体時のエフェクト用データ
const MERGE_EFFECTS = {
    particleCount: 8,
    particleSpeed: 3,
    particleLifetime: 500,  // ミリ秒
    scaleAnimation: 1.3,
    animationDuration: 200  // ミリ秒
};
