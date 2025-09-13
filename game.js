// 難易度設定
const DIFFICULTY_SETTINGS = {
    easy: {
        name: 'かんたん',
        // 判定ラインは全難易度で固定（下の DANGER_LINE_PX を使用）
        dropCooldown: 300,
        gravity: 0.8,
        maxDropLevel: 3,          // ドロッププール（かんたんモードは3種類）
        maxAllowedLevel: 8,       // 出現可能（合体含む）な最大レベル
        // 推奨ドロップ重み（Lv1–3）
        dropWeights: { 1: 6, 2: 4, 3: 2 }
    },
    normal: {
        name: 'ふつう',
        dropCooldown: 300,
        gravity: 0.8,
        maxDropLevel: 4,
        maxAllowedLevel: 9,
        // 推奨ドロップ重み（Lv1–4）
        dropWeights: { 1: 6, 2: 4, 3: 3, 4: 2 }
    },
    hard: {
        name: 'むずかしい',
        dropCooldown: 300,
        gravity: 0.8,
        maxDropLevel: 5,
        maxAllowedLevel: 10,
        // 推奨ドロップ重み（Lv1–5）
        dropWeights: { 1: 6, 2: 4, 3: 3, 4: 2, 5: 1 }
    },
    paradise: {
        name: 'ねこパラダイス',
        dropCooldown: 300,
        gravity: 0.8,
        // Lv6 はデフォ重みが 0 のため 5 に統一
        maxDropLevel: 5,
        maxAllowedLevel: 11,
        // 推奨ドロップ重み（Lv1–5）
        dropWeights: { 1: 8, 2: 5, 3: 3, 4: 2, 5: 1 }
    }
};

// 描画と境界の見た目安定用の定数
const RENDER_OUTLINE_WIDTH = 2;     // 円の外周ストローク幅(px)
const RENDER_INNER_PADDING = 0;     // 視覚ギャップを最小化しつつ内側ストローク
const EDGE_VISUAL_INSET = 2;        // 見た目上の内側余白（壁のボーダー考慮）
const DANGER_EPS = 0.5;             // 危険ライン判定の微小誤差吸収
const SETTLE_REQUIRED_MS = 100;     // ライン上での連続静止必要時間
const DANGER_LINE_PX = 100;         // 全難易度で統一する判定ライン（px）

// ゲームのメインロジック
class CatDropGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.bestScore = this.loadBestScore(this.difficulty);
        this.gameOver = false;
        this.nextCat = null;
        this.droppingCats = [];
        this.canDrop = true;
        this.difficulty = 'normal';  // デフォルト難易度
        this.dropCooldown = DIFFICULTY_SETTINGS.normal.dropCooldown;
        this.catImages = {}; // 猫画像を格納
        this.imagesLoaded = false;
        
        // Matter.js の初期化
        this.initPhysics();
        
        // UI要素の取得
        this.scoreElement = document.getElementById('score');
        this.bestScoreElement = document.getElementById('best-score');
        this.nextCatPreview = document.getElementById('next-cat-preview');
        this.gameOverScreen = document.getElementById('game-over');
        this.startScreen = document.getElementById('start-screen');

        // 危険ラインの初期位置（全難易度で固定値）
        const initDanger = document.getElementById('danger-line');
        if (initDanger) {
            initDanger.style.top = `${DANGER_LINE_PX}px`;
        }

        // 初期バナー表示
        this.updateDifficultyBanner();
        
        // ベストスコアを表示
        this.updateBestScoreDisplay();
        
        // タッチコントローラーの初期化（ドロップラインの長さ計算を渡す）
        this.touchController = new TouchController(
            this.canvas,
            (x) => this.dropCat(x),
            (x) => this.getDropLineTargetY(x)
        );
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        // キャンバスサイズの設定
        this.resizeCanvas();
        if (this.touchController && this.touchController.onResize) {
            this.touchController.onResize();
        }
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            if (this.touchController && this.touchController.onResize) {
                this.touchController.onResize();
            }
        });
        
        // ローディング画面
        this.loadingScreen = document.getElementById('loading-screen');

        // 画像を読み込む
        this.loadImages().then(() => {
            this.imagesLoaded = true;
            // 次の猫を準備
            this.prepareNextCat();
            this.hideLoading();
        }).catch(error => {
            console.warn('画像の読み込みに失敗しました。絵文字を使用します。', error);
            // 画像なしでも動作するようにする
            this.imagesLoaded = false;
            this.prepareNextCat();
            this.hideLoading();
        });
        
        // ゲームループ開始
        this.startGameLoop();
    }

    hideLoading() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
            this.loadingScreen.setAttribute('aria-busy', 'false');
        }
    }

    // ドロップガイドラインの終点（最初の猫の上端 or 底）を返す
    getDropLineTargetY(x) {
        // x はキャンバス座標（0..canvas.width）
        const width = this.canvas.width;
        const height = this.canvas.height;
        if (x < 0 || x > width) return height;

        let minY = height; // 下端（猫が無ければ底まで）

        for (const cat of this.droppingCats) {
            const cx = cat.position.x;
            const cy = cat.position.y;
            const r = cat.circleRadius;
            const dx = Math.abs(x - cx);
            if (dx <= r) {
                // 垂直線と円の交点（上側）
                const dy = Math.sqrt(r * r - dx * dx);
                const yTop = cy - dy;
                if (yTop >= 0 && yTop < minY) {
                    minY = yTop;
                }
            }
        }
        return minY;
    }
    
    async loadImages() {
        const loadPromises = [];
        
        for (const cat of CAT_DATA) {
            if (cat.image) {
                const promise = new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        this.catImages[cat.id] = img;
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn(`画像の読み込みに失敗: ${cat.image}`);
                        resolve(); // エラーでも続行
                    };
                    img.src = cat.image;
                });
                loadPromises.push(promise);
            }
        }
        
        await Promise.all(loadPromises);
    }
    
    initPhysics() {
        // Matter.js モジュール
        const { Engine, World, Bodies, Body, Events, Render } = Matter;
        
        // エンジンの作成
        this.engine = Engine.create();
        // 安定性重視のチューニング
        this.engine.enableSleeping = true;    // 静止体のスリープを有効化
        // 交差のめり込み軽減（特にモバイルSafari）
        this.engine.positionIterations = 16; // 既定6 → 16（解像度アップ）
        this.engine.velocityIterations = 12; // 既定4 → 12（速度解像度アップ）
        this.engine.constraintIterations = 6; // 既定2 → 6
        this.world = this.engine.world;
        
        // 重力の設定（難易度に応じて調整）
        const difficulty = DIFFICULTY_SETTINGS[this.difficulty];
        this.engine.gravity.y = difficulty.gravity;
        
        // 壁の作成（後でキャンバスサイズに合わせて調整）
        this.walls = {};
        
        // 衝突イベントの設定
        Events.on(this.engine, 'collisionStart', (event) => {
            this.handleCollision(event);
        });
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // 物理エンジンの壁を更新
        this.updateWalls();
    }
    
    updateWalls() {
        const { Bodies, World } = Matter;

        // 既存の壁を削除
        if (this.walls.bottom) World.remove(this.world, this.walls.bottom);
        if (this.walls.left) World.remove(this.world, this.walls.left);
        if (this.walls.right) World.remove(this.world, this.walls.right);

        // 新しい壁を作成
        const thickness = 50;
        // 見た目の内側余白を明示的に確保
        const inset = EDGE_VISUAL_INSET;
        const floorTop = this.canvas.height - inset;
        this.floorTop = floorTop;
        this.walls.bottom = Bodies.rectangle(
            this.canvas.width / 2,
            floorTop + thickness / 2,
            // 左右も inset を考慮して少し内側に（見た目の“壁”と一致させる）
            this.canvas.width - inset * 2 + thickness * 2,
            thickness,
            { isStatic: true, label: 'floor', slop: 0.002 }
        );

        this.walls.left = Bodies.rectangle(
            inset - thickness / 2,
            this.canvas.height / 2,
            thickness,
            this.canvas.height - inset,
            { isStatic: true, label: 'wall', slop: 0.002 }
        );

        this.walls.right = Bodies.rectangle(
            this.canvas.width - inset + thickness / 2,
            this.canvas.height / 2,
            thickness,
            this.canvas.height - inset,
            { isStatic: true, label: 'wall', slop: 0.002 }
        );

        // 壁を世界に追加
        World.add(this.world, [this.walls.bottom, this.walls.left, this.walls.right]);
    }

    // 物理解の後に最終的な床面での"めり込み"を補正（視覚と一致させる）
    enforceFloorClamp() {
        const { Body } = Matter;
        const visualFloorY = this.canvas.height - EDGE_VISUAL_INSET;
        const strokeHalf = RENDER_OUTLINE_WIDTH * 0.5;

        for (const cat of this.droppingCats) {
            const radius = cat.circleRadius;
            // 輪郭線分（stroke の半分）も含めて判定
            const bottomY = cat.position.y + radius + strokeHalf;

            // 猫の底が視覚境界を超えていないかチェック
            if (bottomY > visualFloorY) {
                const overlap = bottomY - visualFloorY;
                // 猫の中心位置を上に移動して視覚境界内に収める
                Body.setPosition(cat, {
                    x: cat.position.x,
                    y: cat.position.y - overlap
                });

                // 下向き速度をリセット（跳ね戻り防止）
                if (cat.velocity.y > 0) {
                    Body.setVelocity(cat, { x: cat.velocity.x, y: 0 });
                }
            }
        }
    }

    // 左右の“めり込み”も視覚的に補正
    enforceSideClamp() {
        const { Body } = Matter;
        const strokeHalf = RENDER_OUTLINE_WIDTH * 0.5;
        const leftBound = EDGE_VISUAL_INSET;
        const rightBound = this.canvas.width - EDGE_VISUAL_INSET;

        for (const cat of this.droppingCats) {
            const radius = cat.circleRadius;
            const leftX = cat.position.x - radius - strokeHalf;
            const rightX = cat.position.x + radius + strokeHalf;

            if (leftX < leftBound) {
                const dx = leftBound - leftX;
                Body.setPosition(cat, { x: cat.position.x + dx, y: cat.position.y });
                if (cat.velocity.x < 0) {
                    Body.setVelocity(cat, { x: 0, y: cat.velocity.y });
                }
            } else if (rightX > rightBound) {
                const dx = rightX - rightBound;
                Body.setPosition(cat, { x: cat.position.x - dx, y: cat.position.y });
                if (cat.velocity.x > 0) {
                    Body.setVelocity(cat, { x: 0, y: cat.velocity.y });
                }
            }
        }
    }
    
    prepareNextCat() {
        const difficulty = DIFFICULTY_SETTINGS[this.difficulty];
        // ドロップは設定上限まで。難易度ごとの重みを使用。
        // “出現可能な最大レベル”は別途マージ処理側で制御。
        this.nextCat = getRandomDropCat(
            difficulty.maxDropLevel,
            difficulty.dropWeights
        );
        this.updateNextCatPreview();
    }
    
    updateNextCatPreview() {
        if (!this.nextCatPreview || !this.nextCat) return;

        const img = this.catImages[this.nextCat.id];
        if (this.imagesLoaded && img) {
            // 画像がある場合は画像を背景に表示
            this.nextCatPreview.textContent = '';
            this.nextCatPreview.style.backgroundImage = `url('${img.src}')`;
            this.nextCatPreview.style.backgroundColor = 'transparent';
            this.nextCatPreview.setAttribute('aria-label', this.nextCat.name || 'next-cat');
        } else {
            // 画像がない場合は絵文字と色で表示
            this.nextCatPreview.style.backgroundImage = 'none';
            this.nextCatPreview.style.backgroundColor = this.nextCat.color;
            this.nextCatPreview.textContent = this.nextCat.emoji;
        }
    }
    
    dropCat(x) {
        if (!this.canDrop || this.gameOver || !this.nextCat) return;
        
        const { Bodies, World } = Matter;
        
        // 猫の物理ボディを作成
        const cat = Bodies.circle(x, 10, this.nextCat.radius, {  // 上部から落下
            // より滑りやすく調整
            restitution: 0.04,
            friction: 0.45,
            frictionStatic: 0.55,
            frictionAir: 0.015,
            // ごく小さな“めり込み”を許容して解像度を安定化
            slop: 0.002,
            density: 0.0014,
            label: 'cat',
            catData: this.nextCat,
            sleepThreshold: 30
        });
        
        // 世界に追加
        World.add(this.world, cat);
        this.droppingCats.push(cat);

        // 危険ライン状態の初期化（上から下へ通過中は即ゲームオーバーしない）
        this.initCatDangerState(cat);
        
        // ドロップクールダウン
        this.canDrop = false;
        this.touchController.disable();
        setTimeout(() => {
            this.canDrop = true;
            this.touchController.enable();
            if (!this.gameOver) {
                this.checkGameOver();
            }
        }, this.dropCooldown);
        
        // 次の猫を準備
        this.prepareNextCat();
    }
    
    handleCollision(event) {
        const { World, Body } = Matter;
        const pairs = event.pairs;
        
        pairs.forEach(pair => {
            const { bodyA, bodyB } = pair;
            
            // grounded 条件の厳格化: 床 or 自分より下にいる猫との接触のみ
            const SUPPORT_EPS = 2;
            if (bodyA && bodyA.label === 'cat' && bodyB) {
                if (bodyB.label === 'floor') {
                    bodyA._grounded = true;
                } else if (bodyB.label === 'cat' && bodyB.position.y > bodyA.position.y + SUPPORT_EPS) {
                    bodyA._grounded = true;
                }
            }
            if (bodyB && bodyB.label === 'cat' && bodyA) {
                if (bodyA.label === 'floor') {
                    bodyB._grounded = true;
                } else if (bodyA.label === 'cat' && bodyA.position.y > bodyB.position.y + SUPPORT_EPS) {
                    bodyB._grounded = true;
                }
            }

            // 両方が猫かチェック
            if (bodyA.label === 'cat' && bodyB.label === 'cat') {
                const catDataA = bodyA.catData;
                const catDataB = bodyB.catData;
                
                // 同じレベルの猫かチェック
                if (catDataA && catDataB && catDataA.id === catDataB.id) {
                    const maxAllowed = DIFFICULTY_SETTINGS[this.difficulty]?.maxAllowedLevel || CAT_DATA.length;
                    if (catDataA.id >= maxAllowed) {
                        // 難易度ごとの“最大レベル”に達したら特別処理（消える＋ボーナス）
                        this.mergeMaxLevelCats(bodyA, bodyB);
                    } else {
                        // まだ上がある場合は通常合体
                        this.mergeCats(bodyA, bodyB);
                    }
                }
            }
        });
    }
    
    mergeCats(bodyA, bodyB) {
        const { Bodies, World, Body } = Matter;
        
        // 次のレベルの猫を取得
        const nextCat = getNextLevelCat(bodyA.catData.id);
        if (!nextCat) return;
        
        // 合体位置の計算（中間地点）
        const x = (bodyA.position.x + bodyB.position.x) / 2;
        const y = (bodyA.position.y + bodyB.position.y) / 2;
        
        // 古い猫を削除
        World.remove(this.world, bodyA);
        World.remove(this.world, bodyB);
        this.droppingCats = this.droppingCats.filter(cat => cat !== bodyA && cat !== bodyB);
        
        // 新しい猫を作成
        const newCat = Bodies.circle(x, y, nextCat.radius, {
            restitution: 0.04,
            friction: 0.45,
            frictionStatic: 0.55,
            frictionAir: 0.015,
            slop: 0.002,
            density: 0.0014,
            label: 'cat',
            catData: nextCat,
            sleepThreshold: 30
        });
        
        // 世界に追加
        World.add(this.world, newCat);
        this.droppingCats.push(newCat);

        // 危険ライン状態の初期化（新規生成直後の状態を基準化）
        this.initCatDangerState(newCat);

        // 近傍の眠っている物体を起こし、重なりを軽減
        this.postMergeSettle(newCat);
        
        // スコア加算
        this.addScore(nextCat.score);
        
        // エフェクト（簡易版）
        this.showMergeEffect(x, y);
    }
    
    mergeMaxLevelCats(bodyA, bodyB) {
        const { World } = Matter;
        
        // 合体位置の計算（中間地点）
        const x = (bodyA.position.x + bodyB.position.x) / 2;
        const y = (bodyA.position.y + bodyB.position.y) / 2;
        
        // 両方の猫を削除
        World.remove(this.world, bodyA);
        World.remove(this.world, bodyB);
        this.droppingCats = this.droppingCats.filter(cat => cat !== bodyA && cat !== bodyB);
        
        // 周囲のボディを起こし、微小な下向き速度を与えて“浮き”を防止
        this.wakeNearbyBodies({ x, y }, 180);

        // 大量ボーナススコア
        this.addScore(100);
        
        // 特別なエフェクト
        this.showMaxLevelMergeEffect(x, y);
    }

    // マージ直後の重なり解消とウェイク
    postMergeSettle(newCat) {
        const { Body } = Matter;
        // 近傍の眠っているボディを起こす
        this.wakeNearbyBodies(newCat.position, newCat.circleRadius + 160);

        // 簡易重なり解消（数回反復）
        const iterations = 3;
        for (let it = 0; it < iterations; it++) {
            for (const other of this.droppingCats) {
                if (other === newCat) continue;
                const dx = other.position.x - newCat.position.x;
                const dy = other.position.y - newCat.position.y;
                let dist = Math.hypot(dx, dy);
                const minDist = (other.circleRadius || 0) + (newCat.circleRadius || 0) + 0.5;
                if (dist === 0) {
                    // 完全に重なっている場合は小さくずらす
                    dist = 0.001;
                }
                if (dist < minDist) {
                    const overlap = minDist - dist;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    // 双方を少しずつ離す（質量保存は気にしない軽微な補正）
                    Body.translate(other, { x: nx * overlap * 0.60, y: ny * overlap * 0.60 });
                    Body.translate(newCat, { x: -nx * overlap * 0.40, y: -ny * overlap * 0.40 });
                }
            }
        }
    }

    // 周囲のボディを起こし、わずかな下向き速度を与える
    wakeNearbyBodies(center, radius) {
        const { Body } = Matter;
        const rsq = radius * radius;
        for (const b of this.droppingCats) {
            const dx = b.position.x - center.x;
            const dy = b.position.y - center.y;
            if (dx * dx + dy * dy <= rsq) {
                if (Matter.Sleeping && typeof Matter.Sleeping.set === 'function') {
                    Matter.Sleeping.set(b, false);
                }
                // わずかに下向きへ（浮遊抑制）
                Body.setVelocity(b, { x: b.velocity.x, y: Math.max(b.velocity.y, 0.15) });
            }
        }
    }
    
    showMergeEffect(x, y) {
        // 簡単な視覚効果（後で改善可能）
        const originalFillStyle = this.ctx.fillStyle;
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 50, 0, Math.PI * 2);
        this.ctx.fill();
        
        setTimeout(() => {
            this.ctx.fillStyle = originalFillStyle;
        }, 100);
    }
    
    showMaxLevelMergeEffect(x, y) {
        // 最大レベル合体の特別なエフェクト
        let radius = 20;
        let opacity = 1;
        const animationDuration = 500; // ミリ秒
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed < animationDuration) {
                // エフェクトのアニメーション
                radius = 20 + (elapsed / animationDuration) * 100;
                opacity = 1 - (elapsed / animationDuration);
                
                // 金色の爆発エフェクト
                this.ctx.save();
                this.ctx.globalAlpha = opacity;
                
                // 外側の円
                this.ctx.strokeStyle = 'gold';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, Math.PI * 2);
                this.ctx.stroke();
                
                // 内側の塗りつぶし
                this.ctx.fillStyle = `rgba(255, 215, 0, ${opacity * 0.3})`;
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius * 0.8, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.restore();
                
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    addScore(points) {
        this.score += points;
        this.scoreElement.textContent = this.score;
        
        // ベストスコア更新チェック
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.saveBestScore(this.difficulty);
            this.updateBestScoreDisplay();
        }
    }
    
    loadBestScore(difficulty = 'normal') {
        const key = `neko-game-best-score-${difficulty}`;
        const saved = localStorage.getItem(key);
        return saved ? parseInt(saved, 10) : 0;
    }
    
    saveBestScore(difficulty = 'normal') {
        const key = `neko-game-best-score-${difficulty}`;
        localStorage.setItem(key, this.bestScore.toString());
    }
    
    updateBestScoreDisplay() {
        if (this.bestScoreElement) {
            this.bestScoreElement.textContent = this.bestScore;
        }
    }
    
    checkGameOver() {
        // CSSの赤線位置と判定ラインを完全一致させる
        const dangerLine = this.getDangerLineY();

        for (const cat of this.droppingCats) {
            // ライン相対位置（円の上端）
            const topY = cat.position.y - cat.circleRadius;
            const aboveNow = topY < (dangerLine - DANGER_EPS);

            // 静止判定（完全静止）：並進速度/角速度がすべて 0
            const isSettled = (cat.velocity.x === 0 &&
                               cat.velocity.y === 0 &&
                               cat.angularVelocity === 0);

            // 生成直後・落下中は grounded=false。何かに触れた後のみ true。
            const grounded = !!cat._grounded;

            // 条件が揃った連続時間を測定（ライン上かつ静止かつ grounded）
            const now = performance && performance.now ? performance.now() : Date.now();
            if (grounded && isSettled && aboveNow) {
                if (cat._lineStillSince == null) {
                    cat._lineStillSince = now;
                }
                if (now - cat._lineStillSince >= SETTLE_REQUIRED_MS) {
                    this.endGame();
                    return;
                }
            } else {
                // いずれかが崩れたらリセット
                cat._lineStillSince = null;
            }
        }
    }

    // ボディの危険ライン状態を初期化
    initCatDangerState(body) {
        const dangerLine = this.getDangerLineY();
        const topY = body.position.y - body.circleRadius;
        body._wasAboveDangerLine = topY < (dangerLine - DANGER_EPS);
        body._crossedUpward = false;
        body._grounded = false;
        body._lineStillSince = null;
    }

    // DOMの赤線(top px)をそのままゲーム判定Yに使う
    getDangerLineY() {
        const el = document.getElementById('danger-line');
        if (el && typeof el.offsetTop === 'number') {
            return el.offsetTop;
        }
        return DANGER_LINE_PX;
    }
    
    endGame() {
        this.gameOver = true;
        this.touchController.disable();
        
        // 最終スコアを表示
        document.getElementById('final-score').textContent = this.score;
        this.gameOverScreen.classList.remove('hidden');
    }
    
    startGameLoop() {
        const { Engine } = Matter;
        
        const gameLoop = () => {
            if (!this.gameOver) {
                // 物理エンジンの更新
                Engine.update(this.engine, 1000 / 60);
                // iPhone向けの手動クランプは無効化（揺れの原因）
                // 転がり減衰を軽く付与（過度な回転→滑りを抑制）
                this.applyRollingDamping();
                // 危険ライン越えの監視（毎フレーム）
                this.checkGameOver();
                
                // 描画
                this.render();
                
                requestAnimationFrame(gameLoop);
            }
        };
        
        gameLoop();
    }

    // 緩やかな回転減衰（転がりやすさを重視して緩和）
    applyRollingDamping() {
        const { Body } = Matter;
        for (const cat of this.droppingCats) {
            // 過度な回転のみを軽く制御（より自然な転がり）
            const linSpeed = Math.hypot(cat.velocity.x, cat.velocity.y);
            if (linSpeed < 1 && Math.abs(cat.angularVelocity) > 0.1) {
                Body.setAngularVelocity(cat, cat.angularVelocity * 0.995);
            }
        }
    }
    
    render() {
        // キャンバスをクリア
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 背景
        this.ctx.fillStyle = '#f8f8f8';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 猫を描画
        this.droppingCats.forEach(cat => {
            const x = cat.position.x;
            const y = cat.position.y;
            const radius = cat.circleRadius;
            const strokeW = RENDER_OUTLINE_WIDTH;
            const drawRadius = Math.max(2, radius - strokeW * 0.5 - RENDER_INNER_PADDING);
            const catData = cat.catData;
            
            // 画像がある場合は画像を描画、なければ絵文字
            const catImage = this.catImages[catData.id];
            
            if (catImage && this.imagesLoaded) {
                // 画像を円形にクリッピングして描画
                this.ctx.save();
                
                // 円形クリッピングパスを作成
                this.ctx.beginPath();
                this.ctx.arc(x, y, drawRadius, 0, Math.PI * 2);
                this.ctx.clip();
                
                // 回転を適用（物理演算の角度に合わせる）
                this.ctx.translate(x, y);
                this.ctx.rotate(cat.angle);
                
                // 画像を描画（中心を原点に）
                const imageSize = drawRadius * 2;
                this.ctx.drawImage(
                    catImage,
                    -drawRadius,
                    -drawRadius,
                    imageSize,
                    imageSize
                );
                
                this.ctx.restore();
                
                // 輪郭を描画
                this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                this.ctx.lineWidth = strokeW;
                this.ctx.beginPath();
                this.ctx.arc(x, y, drawRadius, 0, Math.PI * 2);
                this.ctx.stroke();
            } else {
                // 画像がない場合は絵文字で代替
                // 円を描画
                this.ctx.fillStyle = catData.color;
                this.ctx.beginPath();
                this.ctx.arc(x, y, drawRadius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 輪郭
                this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                this.ctx.lineWidth = strokeW;
                this.ctx.stroke();
                
                // 絵文字を描画
                this.ctx.font = `${drawRadius * 1.5}px sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(catData.emoji, x, y);
            }
        });
    }
    
    setDifficulty(level) {
        this.difficulty = level;
        const settings = DIFFICULTY_SETTINGS[level];
        this.dropCooldown = settings.dropCooldown;

        // 重力を更新
        if (this.engine) {
            this.engine.gravity.y = settings.gravity;
        }

        // 危険ラインの位置を更新（全難易度で固定）
        const dangerLineElement = document.getElementById('danger-line');
        if (dangerLineElement) {
            dangerLineElement.style.top = `${DANGER_LINE_PX}px`;
        }

        // 難易度別のベストスコアを読み込み・表示を更新
        this.bestScore = this.loadBestScore(level);
        this.updateBestScoreDisplay();

        // バナーの難易度表記を更新
        this.updateDifficultyBanner();
    }

    updateDifficultyBanner() {
        const el = document.getElementById('banner-difficulty');
        if (el) {
            const settings = DIFFICULTY_SETTINGS[this.difficulty];
            el.textContent = settings ? settings.name : '';
        }
    }
    
    setupEventListeners() {
        // 難易度ボタン
        const difficultyBtns = document.querySelectorAll('.difficulty-btn');
        difficultyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // アクティブクラスの切り替え
                difficultyBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // 難易度を設定
                const difficulty = btn.dataset.difficulty;
                this.setDifficulty(difficulty);
            });
        });
        
        // スタートボタン
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startScreen.style.display = 'none';
            this.touchController.enable();
            // リセットボタンを表示
            document.getElementById('reset-btn').style.display = 'flex';
        });
        
        // リトライボタン
        document.getElementById('retry-btn').addEventListener('click', () => {
            location.reload();
        });
        
        // 最初からボタン
        document.getElementById('reset-btn').addEventListener('click', () => {
            location.reload();
        });
    }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    preventDefaultTouches();
    const game = new CatDropGame();
});
