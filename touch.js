// タッチ操作管理
class TouchController {
    constructor(canvas, onDrop, getObstacleY) {
        this.canvas = canvas;
        this.onDrop = onDrop;
        this.getObstacleY = getObstacleY || null;
        this.dropX = null;
        this.lastX = null;
        this.isEnabled = true;
        this.dropLine = document.getElementById('drop-line');
        this.isMouseLike = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        
        // スムージング用の内部状態
        this.animLeft = null;     // コンテナ座標系(px)
        this.animHeight = null;   // コンテナ座標系(px)
        this.rafId = null;
        
        // レイアウトキャッシュ（頻繁な reflow を避ける）
        this.canvasOffsetX = 0;   // コンテナ左端からキャンバス左端までのオフセット
        this.pxScaleY = 1;        // キャンバス→コンテナの高さスケール
        this.updateLayoutCache();
        
        // タッチイベントの設定
        this.setupEventListeners();

        // 初期位置（中央）にセットして表示
        this.setX(this.canvas.width / 2);
        this.showDropLine();
    }
    
    setupEventListeners() {
        // タッチ開始（タップ位置で即時表示・固定）
        this.canvas.addEventListener('touchstart', (e) => {
            if (!this.isEnabled) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.dropX = touch.clientX - rect.left;
            this.setX(this.dropX, true); // 追従せず、即時その場所
            this.showDropLine();
        });
        
        // タッチ移動（指に追従して更新）
        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.isEnabled) return;
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.dropX = touch.clientX - rect.left;
            this.setX(this.dropX, true); // タッチは即時反映
        });
        
        // タッチ終了
        this.canvas.addEventListener('touchend', (e) => {
            if (!this.isEnabled || this.dropX === null) return;
            e.preventDefault();
            
            // 猫を落とす
            this.onDrop(this.dropX);
            this.dropX = null;
            this.hideDropLine();
        });
        
        // マウスイベント（デバッグ用）
        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.isEnabled) return;
            this.dropX = e.offsetX;
            this.setX(this.dropX);
        });
        
        // PC等のポインタ環境ではカーソル追従して表示
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isEnabled) return;
            this.dropX = e.offsetX;
            this.setX(this.dropX);
            this.showDropLine();
        });

        this.canvas.addEventListener('mouseenter', () => {
            if (!this.isEnabled) return;
            // 直近位置があればそこに表示、なければ中央
            const x = this.lastX != null ? this.lastX : this.canvas.width / 2;
            this.setX(x);
            this.showDropLine();
        });
        this.canvas.addEventListener('mouseleave', () => {
            this.hideDropLine();
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (!this.isEnabled || this.dropX === null) return;
            const x = e.offsetX;
            this.onDrop(x);
            this.dropX = null;
            // マウス環境ではラインは残す
            if (!this.isMouseLike) this.hideDropLine();
        });
        
        // クリックでも落とせるように
        this.canvas.addEventListener('click', (e) => {
            if (!this.isEnabled) return;
            const x = e.offsetX;
            this.onDrop(x);
        });
    }
    
    updateLayoutCache() {
        if (!this.dropLine) return;
        const canvasRect = this.canvas.getBoundingClientRect();
        const containerRect = this.dropLine.parentElement.getBoundingClientRect();
        this.canvasOffsetX = canvasRect.left - containerRect.left;
        this.pxScaleY = containerRect.height > 0 ? (containerRect.height / canvasRect.height) : 1;
    }

    setX(x, immediate = false) {
        // キャンバス幅にクランプ
        const clamped = Math.max(0, Math.min(this.canvas.width, x));
        this.lastX = clamped;
        if (immediate && this.dropLine) {
            // 目標値を即時反映（タッチ用）
            const targetLeft = this.canvasOffsetX + clamped;
            let targetY = null;
            if (typeof this.getObstacleY === 'function') {
                try { targetY = this.getObstacleY(clamped); } catch (_) { targetY = null; }
            }
            const destHeight = Math.max(0, (targetY != null ? targetY : this.canvas.height) * this.pxScaleY);
            this.animLeft = targetLeft;
            this.animHeight = destHeight;
            this.dropLine.style.left = `${targetLeft}px`;
            this.dropLine.style.top = '0px';
            this.dropLine.style.height = `${destHeight}px`;
        } else {
            this.requestTick();
        }
    }

    onResize() {
        // レイアウトキャッシュを更新
        this.updateLayoutCache();
        // 再計算: 直近位置があればそこ、なければ中央
        const x = this.lastX != null ? this.lastX : this.canvas.width / 2;
        this.setX(x);
    }

    showDropLine() {
        if (this.dropLine) this.dropLine.style.opacity = '1';
    }
    
    hideDropLine() {
        if (this.dropLine) {
            this.dropLine.style.opacity = '0';
        }
    }
    
    enable() {
        this.isEnabled = true;
    }
    
    disable() {
        this.isEnabled = false;
        this.hideDropLine();
    }

    requestTick() {
        if (!this.dropLine) return;
        if (this.rafId != null) return;
        this.rafId = requestAnimationFrame(() => this.animate());
    }

    animate() {
        this.rafId = null;
        if (!this.dropLine) return;

        // 目標位置・高さを計算（キャンバス座標 → コンテナ座標）
        const xCanvas = this.lastX != null ? this.lastX : this.canvas.width / 2;
        const targetLeft = this.canvasOffsetX + xCanvas;

        let targetY = null;
        if (typeof this.getObstacleY === 'function') {
            try { targetY = this.getObstacleY(xCanvas); } catch (_) { targetY = null; }
        }
        const destHeight = Math.max(0, (targetY != null ? targetY : this.canvas.height) * this.pxScaleY);

        // 初期値が未設定なら一度で追従（ジャンプ防止）
        if (this.animLeft == null) this.animLeft = targetLeft;
        if (this.animHeight == null) this.animHeight = destHeight;

        // LERP で滑らかに追従
        const SMOOTH = 0.35; // 0..1 大きいほど追従が速い
        this.animLeft += (targetLeft - this.animLeft) * SMOOTH;
        this.animHeight += (destHeight - this.animHeight) * SMOOTH;

        // DOM 反映
        this.dropLine.style.left = `${this.animLeft}px`;
        this.dropLine.style.top = '0px';
        this.dropLine.style.height = `${this.animHeight}px`;

        // 続行判定（十分近づくまでアニメーション）
        const cont = Math.abs(targetLeft - this.animLeft) > 0.4 || Math.abs(destHeight - this.animHeight) > 0.6;
        if (cont) this.requestTick();
    }
}

// タッチ操作のユーティリティ関数
function preventDefaultTouches() {
    // スクロールやズームを防ぐ
    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('#game-container')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // ダブルタップによるズームを防ぐ
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // ピンチズームを防ぐ
    document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
    });
}
