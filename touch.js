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
        
        // タッチイベントの設定
        this.setupEventListeners();

        // マウス環境では起動時から中央に表示
        if (this.isMouseLike) {
            this.setX(this.canvas.width / 2);
            this.showDropLine();
        }
    }
    
    setupEventListeners() {
        // タッチ開始
        this.canvas.addEventListener('touchstart', (e) => {
            if (!this.isEnabled) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.dropX = touch.clientX - rect.left;
            this.setX(this.dropX);
            this.showDropLine();
        });
        
        // タッチ移動
        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.isEnabled) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.dropX = touch.clientX - rect.left;
            this.setX(this.dropX);
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
            
            const rect = this.canvas.getBoundingClientRect();
            this.dropX = e.clientX - rect.left;
            this.setX(this.dropX);
        });
        
        // マウス環境ではクリック無しでも追従して表示
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isEnabled) return;
            if (!this.isMouseLike) return;
            const rect = this.canvas.getBoundingClientRect();
            this.dropX = e.clientX - rect.left;
            this.setX(this.dropX);
            this.showDropLine();
        });

        this.canvas.addEventListener('mouseenter', () => {
            if (!this.isEnabled) return;
            if (!this.isMouseLike) return;
            // 直近位置があればそこに表示、なければ中央
            const x = this.lastX != null ? this.lastX : this.canvas.width / 2;
            this.setX(x);
            this.showDropLine();
        });
        this.canvas.addEventListener('mouseleave', () => {
            if (!this.isMouseLike) return;
            this.hideDropLine();
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (!this.isEnabled || this.dropX === null) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            this.onDrop(x);
            this.dropX = null;
            // マウス環境ではラインは残す
            if (!this.isMouseLike) this.hideDropLine();
        });
        
        // クリックでも落とせるように
        this.canvas.addEventListener('click', (e) => {
            if (!this.isEnabled) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            this.onDrop(x);
        });
    }
    
    updateDropLine(x) {
        if (!this.dropLine) return;
        const canvasRect = this.canvas.getBoundingClientRect();
        const containerRect = this.dropLine.parentElement.getBoundingClientRect();
        const relativeX = x + canvasRect.left - containerRect.left;
        this.dropLine.style.left = `${relativeX}px`;

        // 線の長さを計算（上端→最初の猫 or 底）
        let targetY = null;
        if (typeof this.getObstacleY === 'function') {
            try {
                targetY = this.getObstacleY(x);
            } catch (e) {
                targetY = null;
            }
        }
        const height = Math.max(0, (targetY != null ? targetY : this.canvas.height));
        this.dropLine.style.top = '0px';
        this.dropLine.style.height = `${height}px`;
    }

    setX(x) {
        // キャンバス幅にクランプ
        const clamped = Math.max(0, Math.min(this.canvas.width, x));
        this.lastX = clamped;
        this.updateDropLine(clamped);
    }

    onResize() {
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
