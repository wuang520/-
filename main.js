const { app, BrowserWindow, screen, globalShortcut } = require('electron');
const path = require('path');

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
let mainWindow;
let mousePositionInterval; // 定时器，用于轮询鼠标位置

function createWindow() {
    // 获取主显示器的真实尺寸（包含整个屏幕）
    const display = screen.getPrimaryDisplay();
    const { width, height } = display.size;

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        x: 0,
        y: 0,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        focusable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false
        }
    });

    // 启用 Windows 系统的鼠标穿透（点击穿透，但移动事件仍可通过轮询获取）
    if (process.platform === 'win32') {
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
    }

    mainWindow.loadFile('index.html');

    // 监听屏幕尺寸变化，保持窗口全屏
    screen.on('display-metrics-changed', () => {
        const newDisplay = screen.getPrimaryDisplay();
        const { width, height } = newDisplay.size;
        mainWindow.setBounds({ x: 0, y: 0, width: width, height: height });
        mainWindow.webContents.send('screen-resize', width, height);
    });

    // 🔥 启动鼠标位置轮询（60fps）
    startMousePolling();

    // 窗口关闭时清理定时器
    mainWindow.on('closed', () => {
        if (mousePositionInterval) {
            clearInterval(mousePositionInterval);
            mousePositionInterval = null;
        }
        mainWindow = null;
    });
}

// 轮询鼠标绝对坐标并发送给渲染进程
function startMousePolling() {
    if (mousePositionInterval) clearInterval(mousePositionInterval);
    mousePositionInterval = setInterval(() => {
        if (!mainWindow) return;
        const { x, y } = screen.getCursorScreenPoint();
        mainWindow.webContents.send('mouse-position', x, y);
    }, 1000 / 60); // 约 16ms 一帧，60fps
}

app.whenReady().then(() => {
    createWindow();

    // 注册退出快捷键：Ctrl + Alt + X
    globalShortcut.register('Ctrl+Alt+X', () => {
        app.quit();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});