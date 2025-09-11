// タッチ操作管理
class TouchController {
    constructor(canvas, onDrop) {
        this.canvas = canvas;
        this.onDrop = onDrop;
        this.dropX = null;
        this.isEnabled = true;
        this.dropLine = document.getElementById('drop-line');
        
        // タッチイベントの設定
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // タッチ開始
        this.canvas.addEventListener('touchstart', (e) => {
            if (!this.isEnabled) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.dropX = touch.clientX - rect.left;
            this.updateDropLine(this.dropX);
        });
        
        // タッチ移動
        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.isEnabled) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.dropX = touch.clientX - rect.left;
            this.updateDropLine(this.dropX);
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
            this.updateDropLine(this.dropX);
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isEnabled || !e.buttons) return;
            
            const rect = this.canvas.getBoundingClientRect();
            this.dropX = e.clientX - rect.left;
            this.updateDropLine(this.dropX);
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (!this.isEnabled || this.dropX === null) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            this.onDrop(x);
            this.dropX = null;
            this.hideDropLine();
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
        if (this.dropLine) {
            const canvasRect = this.canvas.getBoundingClientRect();
            const containerRect = this.dropLine.parentElement.getBoundingClientRect();
            const relativeX = x + canvasRect.left - containerRect.left;
            this.dropLine.style.left = `${relativeX}px`;
            this.dropLine.style.opacity = '1';
        }
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