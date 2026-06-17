const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20;

const COLORS = [
    '#FF6B6B', // 紅色 (I)
    '#4ECDC4', // 青色 (O)
    '#45B7D1', // 淺藍 (T)
    '#FFA07A', // 橙色 (S)
    '#98D8C8', // 綠色 (Z)
    '#F7DC6F', // 黃色 (L)
    '#BB8FCE'  // 紫色 (J)
];

// 俄羅斯方塊形狀定義
const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    L: [[1, 0], [1, 0], [1, 1]],
    J: [[0, 1], [0, 1], [1, 1]]
};

const SHAPE_NAMES = Object.keys(SHAPES);

class Tetris {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.currentPiece = null;
        this.nextPiece = null;
        this.dropCounter = 0;
        this.speedLevel = 5; // 1-10，預設5
        this.lastGameLoopTime = Date.now();
        this.animationFrameId = null;
        
        this.setupEventListeners();
        this.generateNextPiece();
        this.spawnNewPiece();
    }
    
    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('resumeBtn').addEventListener('click', () => this.resume());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        
        // 速度滑塊控制
        document.getElementById('speedSlider').addEventListener('input', (e) => this.updateSpeed(e));
        
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }
    
    updateSpeed(e) {
        // 速度值 1-10，其中 1 是最慢，10 是最快
        this.speedLevel = parseInt(e.target.value);
        document.getElementById('speedValue').textContent = this.speedLevel;
        console.log('Speed set to:', this.speedLevel, 'Drop interval:', this.getDropInterval());
    }
    
    getDropInterval() {
        // 速度計算：
        // 速度 1: 2000ms (最慢)
        // 速度 2: 1750ms
        // 速度 3: 1500ms
        // 速度 4: 1250ms
        // 速度 5: 1000ms (中等)
        // 速度 6: 800ms
        // 速度 7: 600ms
        // 速度 8: 400ms
        // 速度 9: 250ms
        // 速度 10: 100ms (最快)
        const speedMap = {
            1: 2000,
            2: 1750,
            3: 1500,
            4: 1250,
            5: 1000,
            6: 800,
            7: 600,
            8: 400,
            9: 250,
            10: 100
        };
        return speedMap[this.speedLevel] || 1000;
    }
    
    start() {
        if (!this.gameRunning) {
            this.gameRunning = true;
            this.gamePaused = false;
            this.lastGameLoopTime = Date.now();
            document.getElementById('startBtn').disabled = true;
            document.getElementById('pauseBtn').disabled = false;
            document.getElementById('resumeBtn').disabled = true;
            document.getElementById('speedSlider').disabled = false;
            this.gameLoop();
        }
    }
    
    pause() {
        this.gamePaused = true;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('resumeBtn').disabled = false;
    }
    
    resume() {
        this.gamePaused = false;
        this.lastGameLoopTime = Date.now(); // 重置時間以避免時間跳躍
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('resumeBtn').disabled = true;
        this.gameLoop();
    }
    
    reset() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        this.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.dropCounter = 0;
        this.speedLevel = 5;
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('resumeBtn').disabled = true;
        document.getElementById('speedSlider').disabled = false;
        document.getElementById('speedSlider').value = 5;
        document.getElementById('speedValue').textContent = '5';
        document.getElementById('score').textContent = '0';
        document.getElementById('level').textContent = '1';
        document.getElementById('lines').textContent = '0';
        
        this.generateNextPiece();
        this.spawnNewPiece();
        this.draw();
    }
    
    generateNextPiece() {
        const shapeName = SHAPE_NAMES[Math.floor(Math.random() * SHAPE_NAMES.length)];
        const colorIndex = SHAPE_NAMES.indexOf(shapeName);
        this.nextPiece = {
            shape: SHAPES[shapeName],
            x: 0,
            y: 0,
            color: COLORS[colorIndex]
        };
    }
    
    spawnNewPiece() {
        this.currentPiece = this.nextPiece;
        this.currentPiece.x = Math.floor(COLS / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
        this.currentPiece.y = 0;
        this.generateNextPiece();
        
        // 檢查遊戲是否結束
        if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.shape)) {
            this.gameOver();
        }
    }
    
    handleKeyDown(e) {
        if (!this.gameRunning || this.gamePaused || !this.currentPiece) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.movePiece(-1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.movePiece(1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.rotatePiece();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.dropPiece();
                break;
            case ' ':
                e.preventDefault();
                this.hardDrop();
                break;
        }
    }
    
    movePiece(direction) {
        const newX = this.currentPiece.x + direction;
        if (!this.checkCollision(newX, this.currentPiece.y, this.currentPiece.shape)) {
            this.currentPiece.x = newX;
        }
    }
    
    rotatePiece() {
        const rotated = this.rotate(this.currentPiece.shape);
        if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y, rotated)) {
            this.currentPiece.shape = rotated;
        }
    }
    
    rotate(shape) {
        const rotated = [];
        for (let i = 0; i < shape[0].length; i++) {
            rotated[i] = [];
            for (let j = shape.length - 1; j >= 0; j--) {
                rotated[i].push(shape[j][i]);
            }
        }
        return rotated;
    }
    
    dropPiece() {
        if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
            this.currentPiece.y++;
        } else {
            this.lockPiece();
        }
    }
    
    hardDrop() {
        while (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
            this.currentPiece.y++;
        }
        this.lockPiece();
    }
    
    checkCollision(x, y, shape) {
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] === 1) {
                    const newX = x + col;
                    const newY = y + row;
                    
                    if (newX < 0 || newX >= COLS || newY >= ROWS) {
                        return true;
                    }
                    
                    if (newY >= 0 && this.board[newY][newX] !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    lockPiece() {
        // 將當前方塊放到棋盤上
        for (let row = 0; row < this.currentPiece.shape.length; row++) {
            for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                if (this.currentPiece.shape[row][col] === 1) {
                    const boardX = this.currentPiece.x + col;
                    const boardY = this.currentPiece.y + row;
                    
                    if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                        this.board[boardY][boardX] = this.currentPiece.color;
                    }
                }
            }
        }
        
        // 檢查是否有完整的行
        this.clearLines();
        
        // 生成新方塊
        this.spawnNewPiece();
    }
    
    clearLines() {
        let linesCleared = 0;
        
        for (let row = ROWS - 1; row >= 0; row--) {
            if (this.board[row].every(cell => cell !== 0)) {
                this.board.splice(row, 1);
                this.board.unshift(Array(COLS).fill(0));
                linesCleared++;
                row++; // 重新檢查該行
            }
        }
        
        if (linesCleared > 0) {
            this.updateScore(linesCleared);
        }
    }
    
    updateScore(linesCleared) {
        const points = [0, 40, 100, 300, 1200]; // 1, 2, 3, 4行的得分
        this.score += points[linesCleared] * this.level;
        this.lines += linesCleared;
        this.level = Math.floor(this.lines / 10) + 1;
        
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }
    
    gameOver() {
        this.gameRunning = false;
        this.gamePaused = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('resumeBtn').disabled = true;
        alert(`遊戲結束！\n最終分數: ${this.score}\n等級: ${this.level}`);
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
        const now = Date.now();
        const delta = now - this.lastGameLoopTime;
        
        if (!this.gamePaused) {
            this.dropCounter += delta;
            
            const currentDropInterval = this.getDropInterval();
            
            if (this.dropCounter >= currentDropInterval) {
                this.dropCounter = 0;
                this.dropPiece();
            }
        }
        
        this.draw();
        this.lastGameLoopTime = now;
        
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }
    
    draw() {
        // 清空遊戲區域
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 繪製棋盤上的方塊
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (this.board[row][col] !== 0) {
                    this.drawBlock(this.ctx, col, row, this.board[row][col]);
                }
            }
        }
        
        // 繪製當前方塊
        if (this.currentPiece) {
            this.drawCurrentPiece();
        }
        
        // 繪製下一個方塊預覽
        this.drawNextPiece();
    }
    
    drawBlock(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
    
    drawCurrentPiece() {
        for (let row = 0; row < this.currentPiece.shape.length; row++) {
            for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                if (this.currentPiece.shape[row][col] === 1) {
                    this.drawBlock(
                        this.ctx,
                        this.currentPiece.x + col,
                        this.currentPiece.y + row,
                        this.currentPiece.color
                    );
                }
            }
        }
    }
    
    drawNextPiece() {
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        this.nextCtx.fillStyle = '#f5f5f5';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        const offsetX = (this.nextCanvas.width - this.nextPiece.shape[0].length * 15) / 2;
        const offsetY = (this.nextCanvas.height - this.nextPiece.shape.length * 15) / 2;
        
        for (let row = 0; row < this.nextPiece.shape.length; row++) {
            for (let col = 0; col < this.nextPiece.shape[row].length; col++) {
                if (this.nextPiece.shape[row][col] === 1) {
                    this.nextCtx.fillStyle = this.nextPiece.color;
                    this.nextCtx.fillRect(
                        offsetX + col * 15,
                        offsetY + row * 15,
                        15,
                        15
                    );
                    
                    this.nextCtx.strokeStyle = '#000';
                    this.nextCtx.lineWidth = 1;
                    this.nextCtx.strokeRect(
                        offsetX + col * 15,
                        offsetY + row * 15,
                        15,
                        15
                    );
                }
            }
        }
    }
}

// 初始化遊戲
const game = new Tetris();
game.draw();
