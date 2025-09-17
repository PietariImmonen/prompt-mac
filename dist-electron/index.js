"use strict";
var path = require("path");
var electron = require("electron");
var isDev = require("electron-is-dev");
function _interopDefaultLegacy(e) {
  return e && typeof e === "object" && "default" in e ? e : { "default": e };
}
var isDev__default = /* @__PURE__ */ _interopDefaultLegacy(isDev);
const height = 600;
const width = 800;
async function captureFromClipboard() {
  try {
    const originalClipboard = electron.clipboard.readText();
    if (process.platform === "darwin") {
      const { execSync } = require("child_process");
      try {
        execSync(`osascript -e 'tell application "System Events" to keystroke "c" using command down'`);
        await new Promise((resolve) => setTimeout(resolve, 150));
        const clipboardText = electron.clipboard.readText();
        if (clipboardText && clipboardText !== originalClipboard && clipboardText.trim().length > 5) {
          const promptData = {
            text: clipboardText.trim(),
            url: "External Application",
            title: "Auto-captured Text",
            timestamp: new Date().toISOString(),
            domain: "external",
            autoDetected: false
          };
          console.log("Captured prompt from selected text:", promptData);
          const allWindows = electron.BrowserWindow.getAllWindows();
          allWindows.forEach((window) => {
            window.webContents.send("prompt-captured", promptData);
          });
          showCaptureNotification(promptData.text);
          return promptData;
        } else if (originalClipboard && originalClipboard.trim().length > 5) {
          const promptData = {
            text: originalClipboard.trim(),
            url: "External Application",
            title: "Clipboard Content",
            timestamp: new Date().toISOString(),
            domain: "external",
            autoDetected: false
          };
          console.log("Captured prompt from existing clipboard:", promptData);
          const allWindows = electron.BrowserWindow.getAllWindows();
          allWindows.forEach((window) => {
            window.webContents.send("prompt-captured", promptData);
          });
          showCaptureNotification(promptData.text);
          return promptData;
        } else {
          console.log("No text selected. Please highlight some text first.");
          showInstructionNotification();
          return null;
        }
      } catch (applescriptError) {
        console.error("AppleScript execution failed:", applescriptError);
        showPermissionNotification();
        const clipboardText = electron.clipboard.readText();
        if (clipboardText && clipboardText.trim().length > 5) {
          const promptData = {
            text: clipboardText.trim(),
            url: "External Application",
            title: "Clipboard Fallback",
            timestamp: new Date().toISOString(),
            domain: "external",
            autoDetected: false
          };
          console.log("Captured prompt from clipboard (fallback):", promptData);
          const allWindows = electron.BrowserWindow.getAllWindows();
          allWindows.forEach((window) => {
            window.webContents.send("prompt-captured", promptData);
          });
          showCaptureNotification(promptData.text);
          return promptData;
        }
        showInstructionNotification();
        return null;
      }
    } else {
      const clipboardText = electron.clipboard.readText();
      if (clipboardText && clipboardText.trim().length > 5) {
        const promptData = {
          text: clipboardText.trim(),
          url: "External Application",
          title: "Clipboard Capture",
          timestamp: new Date().toISOString(),
          domain: "external",
          autoDetected: false
        };
        console.log("Captured prompt from clipboard:", promptData);
        const allWindows = electron.BrowserWindow.getAllWindows();
        allWindows.forEach((window) => {
          window.webContents.send("prompt-captured", promptData);
        });
        showCaptureNotification(promptData.text);
        return promptData;
      } else {
        showInstructionNotification();
        return null;
      }
    }
  } catch (error) {
    console.error("Error during text capture:", error);
    showInstructionNotification();
    return null;
  }
}
function showCaptureNotification(text) {
  const { Notification } = require("electron");
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: "Prompt Captured!",
      body: `"${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`
    });
    notification.show();
  }
}
function showPermissionNotification() {
  const { Notification } = require("electron");
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: "Enable Auto-Copy Feature",
      body: "Go to System Preferences \u2192 Security & Privacy \u2192 Accessibility and add this app to enable automatic text copying"
    });
    notification.show();
  }
}
function showInstructionNotification() {
  const { Notification } = require("electron");
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: "Prompt Capture",
      body: "Copy text first (Cmd+C), then press Cmd+Shift+P to save it. Or enable Accessibility permissions for auto-copy."
    });
    notification.show();
  }
}
async function injectContentScriptIntoWindow(window) {
  try {
    await window.webContents.executeJavaScript(`
      // Inject our prompt capture functionality
      if (!window.promptCaptureInjected) {
        window.promptCaptureInjected = true;
        
        // Create the content script functionality
        ${getContentScriptCode()}
      }
    `);
  } catch (error) {
    console.error("Failed to inject content script:", error);
  }
}
function getContentScriptCode() {
  return `
    let isCaptureModeActive = false;
    let captureOverlay = null;
    let selectedText = '';
    
    // Listen for capture activation from global shortcut
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        e.stopPropagation();
        activateCaptureMode();
      }
      
      // Escape to cancel capture mode
      if (e.key === 'Escape' && isCaptureModeActive) {
        deactivateCaptureMode();
      }
    });
    
    function activateCaptureMode() {
      if (isCaptureModeActive) return;
      
      isCaptureModeActive = true;
      document.body.style.cursor = 'crosshair';
      createCaptureOverlay();
      
      // Show notification
      showNotification('Prompt Capture Mode Active - Select text to capture');
    }
    
    function deactivateCaptureMode() {
      if (!isCaptureModeActive) return;
      
      isCaptureModeActive = false;
      document.body.style.cursor = 'default';
      removeCaptureOverlay();
      hideNotification();
    }
    
    function toggleCaptureMode() {
      if (isCaptureModeActive) {
        deactivateCaptureMode();
      } else {
        activateCaptureMode();
      }
    }
    
    function createCaptureOverlay() {
      // Create overlay for selection
      captureOverlay = document.createElement('div');
      captureOverlay.style.cssText = \`
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        pointer-events: none;
        background: rgba(0, 123, 255, 0.05);
        border: 2px dashed rgba(0, 123, 255, 0.3);
        box-sizing: border-box;
      \`;
      document.body.appendChild(captureOverlay);
      
      // Add text selection listener
      document.addEventListener('mouseup', handleTextSelection);
      document.addEventListener('selectstart', handleTextSelection);
    }
    
    function showNotification(message) {
      // Remove existing notification
      const existing = document.querySelector('.prompt-capture-notification');
      if (existing) existing.remove();
      
      const notification = document.createElement('div');
      notification.className = 'prompt-capture-notification';
      notification.style.cssText = \`
        position: fixed;
        top: 20px;
        right: 20px;
        background: #007bff;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 10002;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease-out;
      \`;
      
      // Add CSS animation
      if (!document.querySelector('#prompt-capture-styles')) {
        const style = document.createElement('style');
        style.id = 'prompt-capture-styles';
        style.textContent = \`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
        \`;
        document.head.appendChild(style);
      }
      
      notification.textContent = message;
      document.body.appendChild(notification);
    }
    
    function hideNotification() {
      const notification = document.querySelector('.prompt-capture-notification');
      if (notification) {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (notification.parentNode) notification.remove();
        }, 300);
      }
    }
    
    function removeCaptureOverlay() {
      if (captureOverlay) {
        document.body.removeChild(captureOverlay);
        captureOverlay = null;
      }
      document.removeEventListener('mouseup', handleTextSelection);
    }
    
    function handleTextSelection(e) {
      if (!isCaptureModeActive) return;
      
      // Small delay to ensure selection is complete
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (text.length > 5) { // Minimum text length
          selectedText = text;
          showSaveDot(e.clientX, e.clientY);
        }
      }, 100);
    }
    
    function showSaveDot(x, y) {
      // Remove any existing dot
      const existingDot = document.querySelector('.prompt-save-dot');
      if (existingDot) existingDot.remove();
      
      // Ensure coordinates are within viewport
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 60;
      const adjustedX = Math.min(Math.max(x + 10, 10), maxX);
      const adjustedY = Math.min(Math.max(y - 30, 10), maxY);
      
      // Create save button container
      const container = document.createElement('div');
      container.className = 'prompt-save-dot';
      container.style.cssText = \`
        position: fixed;
        left: \${adjustedX}px;
        top: \${adjustedY}px;
        z-index: 10001;
        pointer-events: auto;
        animation: popIn 0.3s ease-out;
      \`;
      
      // Create the save button
      const button = document.createElement('button');
      button.style.cssText = \`
        background: #007bff;
        color: white;
        border: none;
        border-radius: 20px;
        padding: 8px 16px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
        transition: all 0.2s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        min-width: 80px;
      \`;
      button.textContent = '\u{1F4BE} Save';
      
      // Add CSS for pop-in animation
      if (!document.querySelector('#prompt-save-styles')) {
        const style = document.createElement('style');
        style.id = 'prompt-save-styles';
        style.textContent = \`
          @keyframes popIn {
            0% { transform: scale(0); opacity: 0; }
            70% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
        \`;
        document.head.appendChild(style);
      }
      
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.05)';
        button.style.background = '#0056b3';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
        button.style.background = '#007bff';
      });
      
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        savePrompt();
        container.remove();
        deactivateCaptureMode();
        showNotification('Prompt saved successfully!');
        setTimeout(hideNotification, 2000);
      });
      
      container.appendChild(button);
      document.body.appendChild(container);
      
      // Auto-remove dot after 15 seconds
      setTimeout(() => {
        if (container.parentNode) container.remove();
      }, 15000);
    }
    
    function savePrompt() {
      const promptData = {
        text: selectedText,
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        domain: window.location.hostname
      };
      
      // Send to Electron main process
      if (window.electronAPI) {
        window.electronAPI.capturePrompt(promptData);
      } else {
        console.log('Captured prompt:', promptData);
      }
    }
    
    // Auto-detect AI websites and capture prompts
    function detectAIWebsites() {
      const aiDomains = ['claude.ai', 'gemini.google.com', 'chat.openai.com', 'bard.google.com'];
      const currentDomain = window.location.hostname;
      
      if (aiDomains.some(domain => currentDomain.includes(domain))) {
        // Auto-capture prompts on AI websites
        observePromptSubmissions();
      }
    }
    
    function observePromptSubmissions() {
      // Look for common prompt input patterns
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            // Look for new message elements that might contain prompts
            const newNodes = Array.from(mutation.addedNodes);
            newNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                checkForPromptContent(node);
              }
            });
          }
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    
    function checkForPromptContent(element) {
      // Look for user message patterns in AI chat interfaces
      const userMessageSelectors = [
        '[data-testid*="user"]',
        '.user-message',
        '[role="user"]',
        '.human-message'
      ];
      
      userMessageSelectors.forEach(selector => {
        const messages = element.querySelectorAll ? element.querySelectorAll(selector) : [];
        messages.forEach(msg => {
          const text = msg.textContent || msg.innerText;
          if (text && text.trim().length > 10) {
            const promptData = {
              text: text.trim(),
              url: window.location.href,
              title: document.title,
              timestamp: new Date().toISOString(),
              domain: window.location.hostname,
              autoDetected: true
            };
            
            if (window.electronAPI) {
              window.electronAPI.capturePrompt(promptData);
            } else {
              console.log('Auto-captured prompt:', promptData);
            }
          }
        });
      });
    }
    
    // Initialize
    detectAIWebsites();
  `;
}
function createWindow() {
  const window = new electron.BrowserWindow({
    width,
    height,
    frame: false,
    show: true,
    resizable: true,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true
    }
  });
  window.webContents.setWindowOpenHandler(() => {
    return { action: "allow" };
  });
  const port = process.env.PORT || 3e3;
  const url = isDev__default["default"] ? `http://localhost:${port}` : path.join(__dirname, "../dist-vite/index.html");
  if (isDev__default["default"]) {
    window == null ? void 0 : window.loadURL(url);
  } else {
    window == null ? void 0 : window.loadFile(url);
  }
  electron.ipcMain.on("minimize", () => {
    window.isMinimized() ? window.restore() : window.minimize();
  });
  electron.ipcMain.on("maximize", () => {
    window.isMaximized() ? window.restore() : window.maximize();
  });
  electron.ipcMain.on("close", () => {
    window.close();
  });
  electron.nativeTheme.themeSource = "dark";
  electron.globalShortcut.register("CommandOrControl+Shift+P", () => {
    console.log("Global shortcut triggered - capturing clipboard");
    captureFromClipboard();
  });
  window.webContents.on("did-finish-load", () => {
    injectContentScriptIntoWindow(window);
  });
  window.webContents.on("did-navigate", () => {
    injectContentScriptIntoWindow(window);
  });
  return window;
}
let overlayWindow = null;
function createOverlayWindow() {
  overlayWindow = new electron.BrowserWindow({
    width: 500,
    height: 250,
    frame: false,
    show: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    }
  });
  const overlayHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, rgba(0, 123, 255, 0.95), rgba(0, 86, 179, 0.95));
      color: white;
      padding: 25px;
      border-radius: 15px;
      backdrop-filter: blur(10px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    
    .close-btn {
      position: absolute;
      top: 15px;
      right: 15px;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    .title {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 15px;
      text-align: center;
    }
    
    .instructions {
      font-size: 14px;
      margin-bottom: 20px;
      text-align: center;
      opacity: 0.95;
      line-height: 1.5;
    }
    
    .capture-area {
      background: rgba(255, 255, 255, 0.15);
      border: 2px dashed rgba(255, 255, 255, 0.4);
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      cursor: text;
      transition: all 0.3s ease;
      min-height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .capture-area:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.6);
    }
    
    .capture-area:focus {
      outline: none;
      background: rgba(255, 255, 255, 0.25);
      border-color: rgba(255, 255, 255, 0.8);
    }
  </style>
</head>
<body>
  <button class="close-btn" onclick="closeOverlay()">&times;</button>
  
  <div class="title">\u{1F3AF} Prompt Capture</div>
  
  <div class="instructions">
    Select text anywhere on your screen, copy it (Cmd+C/Ctrl+C),<br>
    then paste it below to save
  </div>
  
  <div class="capture-area" 
       contenteditable="true" 
       id="captureArea"
       placeholder="Paste captured text here (Cmd+V)">
    Click here and paste your text...
  </div>
  
  <script>
    const captureArea = document.getElementById('captureArea');
    let hasContent = false;
    
    function closeOverlay() {
      if (window.electronAPI) {
        window.electronAPI.closeOverlay();
      }
    }
    
    // Handle paste events
    captureArea.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      
      if (text && text.trim().length > 5) {
        hasContent = true;
        captureArea.innerHTML = '<div style="color: #90EE90; font-weight: bold;">\u2713 Text captured successfully!</div>';
        captureArea.style.background = 'rgba(144, 238, 144, 0.2)';
        captureArea.style.borderColor = 'rgba(144, 238, 144, 0.6)';
        
        // Send to main process
        if (window.electronAPI) {
          window.electronAPI.capturePrompt({
            text: text.trim(),
            url: 'External Application',
            title: 'Clipboard Capture',
            timestamp: new Date().toISOString(),
            domain: 'external',
            autoDetected: false
          });
        }
        
        // Auto-close after success
        setTimeout(() => {
          closeOverlay();
        }, 1500);
      }
    });
    
    // Focus and select all on click
    captureArea.addEventListener('click', () => {
      if (!hasContent) {
        captureArea.innerHTML = '';
      }
      captureArea.focus();
    });
    
    // Auto-focus when window opens
    setTimeout(() => {
      captureArea.focus();
    }, 100);
  <\/script>
</body>
</html>
  `;
  overlayWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(overlayHTML));
  overlayWindow.on("closed", () => {
    overlayWindow = null;
  });
  return overlayWindow;
}
electron.app.whenReady().then(() => {
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0)
      createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  electron.globalShortcut.unregisterAll();
  if (process.platform !== "darwin")
    electron.app.quit();
});
electron.app.on("will-quit", () => {
  electron.globalShortcut.unregisterAll();
});
electron.ipcMain.on("message", (event, message) => {
  console.log(message);
  setTimeout(() => event.sender.send("message", "common.hiElectron"), 500);
});
electron.ipcMain.handle("capture-prompt", async (_event, promptData) => {
  console.log("Captured prompt:", promptData);
  return { success: true, id: Date.now() };
});
electron.ipcMain.handle("inject-content-script", async () => {
  const focusedWindow = electron.BrowserWindow.getFocusedWindow();
  if (!focusedWindow)
    return { success: false };
  try {
    await focusedWindow.webContents.executeJavaScript(`
      // Inject our prompt capture functionality
      if (!window.promptCaptureInjected) {
        window.promptCaptureInjected = true;
        
        // Create the content script functionality
        ${getContentScriptCode()}
      }
    `);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to inject content script:", error);
    return { success: false, error: errorMessage };
  }
});
electron.ipcMain.handle("close-overlay", async () => {
  if (overlayWindow) {
    overlayWindow.hide();
  }
  return { success: true };
});
electron.ipcMain.handle("show-overlay", async () => {
  if (!overlayWindow) {
    createOverlayWindow();
  }
  if (overlayWindow) {
    overlayWindow.show();
    overlayWindow.center();
    overlayWindow.focus();
  }
  return { success: true };
});
//# sourceMappingURL=index.js.map
