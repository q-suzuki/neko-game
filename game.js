// 難易度設定
const DIFFICULTY_SETTINGS = {
    easy: {
        name: '簡単',
        dangerLinePercent: 0.10,  // 画面の10%（上＝スペース多い）
        dangerLineMin: 80,         // 最小80px
        dropCooldown: 300,         // 短い待機時間
        gravity: 0.6,              // 統一した落下速度
        maxDropLevel: 3            // Lv3までの猫が落ちる
    },
    normal: {
        name: '普通',
        dangerLinePercent: 0.15,  // 画面の15%（中間）
        dangerLineMin: 100,        // 最小100px
        dropCooldown: 500,         // 標準待機時間
        gravity: 0.6,              // 統一した落下速度
        maxDropLevel: 5            // Lv5までの猫が落ちる
    },
    hard: {
        name: '難しい',
        dangerLinePercent: 0.25,  // 画面の25%（下＝スペース少ない）
        dangerLineMin: 150,        // 最小150px
        dropCooldown: 700,         // 長い待機時間
        gravity: 0.6,              // 統一した落下速度
        maxDropLevel: 5            // Lv5までの猫が落ちる
    }
};

// ゲームのメインロジック
class CatDropGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
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
        this.nextCatPreview = document.getElementById('next-cat-preview');
        this.gameOverScreen = document.getElementById('game-over');
        this.startScreen = document.getElementById('start-screen');
        
        // タッチコントローラーの初期化
        this.touchController = new TouchController(this.canvas, (x) => this.dropCat(x));
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        // キャンバスサイズの設定
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // 画像を読み込む
        this.loadImages().then(() => {
            this.imagesLoaded = true;
            // 次の猫を準備
            this.prepareNextCat();
        }).catch(error => {
            console.warn('画像の読み込みに失敗しました。絵文字を使用します。', error);
            // 画像なしでも動作するようにする
            this.imagesLoaded = false;
            this.prepareNextCat();
        });
        
        // ゲームループ開始
        this.startGameLoop();
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
        this.walls.bottom = Bodies.rectangle(
            this.canvas.width / 2,
            this.canvas.height + thickness / 2,
            this.canvas.width + thickness * 2,
            thickness,
            { isStatic: true, label: 'wall' }
        );
        
        this.walls.left = Bodies.rectangle(
            -thickness / 2,
            this.canvas.height / 2,
            thickness,
            this.canvas.height,
            { isStatic: true, label: 'wall' }
        );
        
        this.walls.right = Bodies.rectangle(
            this.canvas.width + thickness / 2,
            this.canvas.height / 2,
            thickness,
            this.canvas.height,
            { isStatic: true, label: 'wall' }
        );
        
        // 壁を世界に追加
        World.add(this.world, [this.walls.bottom, this.walls.left, this.walls.right]);
    }
    
    prepareNextCat() {
        const difficulty = DIFFICULTY_SETTINGS[this.difficulty];
        this.nextCat = getRandomDropCat(difficulty.maxDropLevel);
        this.updateNextCatPreview();
    }
    
    updateNextCatPreview() {
        if (this.nextCatPreview && this.nextCat) {
            this.nextCatPreview.innerHTML = this.nextCat.emoji;
            this.nextCatPreview.style.backgroundColor = this.nextCat.color;
        }
    }
    
    dropCat(x) {
        if (!this.canDrop || this.gameOver || !this.nextCat) return;
        
        const { Bodies, World } = Matter;
        
        // 猫の物理ボディを作成
        const cat = Bodies.circle(x, 10, this.nextCat.radius, {  // 上部から落下
            restitution: 0.2,  // 弾性（跳ねすぎ防止）
            friction: 0.5,      // 摩擦
            density: 0.001,     // 密度
            label: 'cat',
            catData: this.nextCat
        });
        
        // 世界に追加
        World.add(this.world, cat);
        this.droppingCats.push(cat);
        
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
            
            // 両方が猫かチェック
            if (bodyA.label === 'cat' && bodyB.label === 'cat') {
                const catDataA = bodyA.catData;
                const catDataB = bodyB.catData;
                
                // 同じレベルの猫かチェック
                if (catDataA && catDataB && catDataA.id === catDataB.id) {
                    if (catDataA.id < CAT_DATA.length) {
                        // 通常の合体
                        this.mergeCats(bodyA, bodyB);
                    } else if (catDataA.id === CAT_DATA.length) {
                        // 最大レベル同士の特別処理
                        this.mergeMaxLevelCats(bodyA, bodyB);
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
            restitution: 0.2,  // 合体後も跳ねすぎ防止
            friction: 0.5,
            density: 0.001,
            label: 'cat',
            catData: nextCat
        });
        
        // 世界に追加
        World.add(this.world, newCat);
        this.droppingCats.push(newCat);
        
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
        
        // 大量ボーナススコア
        this.addScore(100);
        
        // 特別なエフェクト
        this.showMaxLevelMergeEffect(x, y);
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
    }
    
    checkGameOver() {
        // 危険ラインの高さ（難易度に応じて調整）
        const difficulty = DIFFICULTY_SETTINGS[this.difficulty];
        const dangerLine = Math.max(difficulty.dangerLineMin, this.canvas.height * difficulty.dangerLinePercent);
        
        for (const cat of this.droppingCats) {
            // 速度が低い（ほぼ静止している）猫のみチェック
            const isSettled = Math.abs(cat.velocity.y) < 2;
            if (isSettled && cat.position.y - cat.circleRadius < dangerLine) {
                this.endGame();
                return;
            }
        }
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
                
                // 描画
                this.render();
                
                requestAnimationFrame(gameLoop);
            }
        };
        
        gameLoop();
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
            const catData = cat.catData;
            
            // 画像がある場合は画像を描画、なければ絵文字
            const catImage = this.catImages[catData.id];
            
            if (catImage && this.imagesLoaded) {
                // 画像を円形にクリッピングして描画
                this.ctx.save();
                
                // 円形クリッピングパスを作成
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, Math.PI * 2);
                this.ctx.clip();
                
                // 回転を適用（物理演算の角度に合わせる）
                this.ctx.translate(x, y);
                this.ctx.rotate(cat.angle);
                
                // 画像を描画（中心を原点に）
                const imageSize = radius * 2;
                this.ctx.drawImage(
                    catImage,
                    -radius,
                    -radius,
                    imageSize,
                    imageSize
                );
                
                this.ctx.restore();
                
                // 輪郭を描画
                this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, Math.PI * 2);
                this.ctx.stroke();
            } else {
                // 画像がない場合は絵文字で代替
                // 円を描画
                this.ctx.fillStyle = catData.color;
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 輪郭
                this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                
                // 絵文字を描画
                this.ctx.font = `${radius * 1.5}px sans-serif`;
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
        
        // 危険ラインの位置を更新（CSSも更新）
        const dangerLineElement = document.getElementById('danger-line');
        if (dangerLineElement) {
            dangerLineElement.style.top = `${settings.dangerLineMin}px`;
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
            // 最初からボタンを表示
            document.getElementById('reset-btn').style.display = 'block';
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