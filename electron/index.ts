// Native
import { join } from "path";

// Packages
import {
  BrowserWindow,
  app,
  ipcMain,
  IpcMainEvent,
  IpcMainInvokeEvent,
  nativeTheme,
  globalShortcut,
  clipboard,
} from "electron";
import isDev from "electron-is-dev";

const height = 600;
const width = 800;

// Function to capture selected text automatically
async function captureFromClipboard() {
  try {
    // Store current clipboard to restore later
    const originalClipboard = clipboard.readText();

    // Use AppleScript to copy selected text on macOS
    if (process.platform === "darwin") {
      const { execSync } = require("child_process");

      try {
        // Execute Cmd+C using AppleScript
        execSync(
          `osascript -e 'tell application "System Events" to keystroke "c" using command down'`,
        );

        // Wait a moment for clipboard to update
        await new Promise((resolve) => setTimeout(resolve, 150));

        const clipboardText = clipboard.readText();

        // Check if we got new text (different from original)
        if (
          clipboardText &&
          clipboardText !== originalClipboard &&
          clipboardText.trim().length > 5
        ) {
          const promptData = {
            text: clipboardText.trim(),
            url: "External Application",
            title: "Auto-captured Text",
            timestamp: new Date().toISOString(),
            domain: "external",
            autoDetected: false,
          };

          // eslint-disable-next-line no-console
          console.log("Captured prompt from selected text:", promptData);

          // Send captured prompt to any listening windows
          const allWindows = BrowserWindow.getAllWindows();
          allWindows.forEach((window) => {
            window.webContents.send("prompt-captured", promptData);
          });

          // Show a notification that text was captured
          showCaptureNotification(promptData.text);

          return promptData;
        } else if (originalClipboard && originalClipboard.trim().length > 5) {
          // If no new selection, use existing clipboard content
          const promptData = {
            text: originalClipboard.trim(),
            url: "External Application",
            title: "Clipboard Content",
            timestamp: new Date().toISOString(),
            domain: "external",
            autoDetected: false,
          };

          // eslint-disable-next-line no-console
          console.log("Captured prompt from existing clipboard:", promptData);

          // Send captured prompt to any listening windows
          const allWindows = BrowserWindow.getAllWindows();
          allWindows.forEach((window) => {
            window.webContents.send("prompt-captured", promptData);
          });

          showCaptureNotification(promptData.text);
          return promptData;
        } else {
          // eslint-disable-next-line no-console
          console.log("No text selected. Please highlight some text first.");
          showInstructionNotification();
          return null;
        }
      } catch (applescriptError) {
        // eslint-disable-next-line no-console
        console.error("AppleScript execution failed:", applescriptError);

        // Show permission instruction
        showPermissionNotification();

        // Fallback to existing clipboard
        const clipboardText = clipboard.readText();
        if (clipboardText && clipboardText.trim().length > 5) {
          const promptData = {
            text: clipboardText.trim(),
            url: "External Application",
            title: "Clipboard Fallback",
            timestamp: new Date().toISOString(),
            domain: "external",
            autoDetected: false,
          };

          // eslint-disable-next-line no-console
          console.log("Captured prompt from clipboard (fallback):", promptData);

          const allWindows = BrowserWindow.getAllWindows();
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
      // For Windows/Linux, try using clipboard directly
      const clipboardText = clipboard.readText();
      if (clipboardText && clipboardText.trim().length > 5) {
        const promptData = {
          text: clipboardText.trim(),
          url: "External Application",
          title: "Clipboard Capture",
          timestamp: new Date().toISOString(),
          domain: "external",
          autoDetected: false,
        };

        // eslint-disable-next-line no-console
        console.log("Captured prompt from clipboard:", promptData);

        const allWindows = BrowserWindow.getAllWindows();
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
    // eslint-disable-next-line no-console
    console.error("Error during text capture:", error);
    showInstructionNotification();
    return null;
  }
}

// Function to show capture notification
function showCaptureNotification(text: string) {
  const { Notification } = require("electron");

  if (Notification.isSupported()) {
    const notification = new Notification({
      title: "Prompt Captured!",
      body: `"${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`,
    });

    notification.show();
  }
}

// Function to show permission notification
function showPermissionNotification() {
  const { Notification } = require("electron");

  if (Notification.isSupported()) {
    const notification = new Notification({
      title: "Enable Auto-Copy Feature",
      body: "Go to System Preferences → Security & Privacy → Accessibility and add this app to enable automatic text copying",
    });

    notification.show();
  }
}

// Function to show instruction notification
function showInstructionNotification() {
  const { Notification } = require("electron");

  if (Notification.isSupported()) {
    const notification = new Notification({
      title: "Prompt Capture",
      body: "Copy text first (Cmd+C), then press Cmd+Shift+P to save it. Or enable Accessibility permissions for auto-copy.",
    });

    notification.show();
  }
}

// Helper function to inject content script into any window
async function injectContentScriptIntoWindow(window: BrowserWindow) {
  try {
    await window.webContents.executeJavaScript(`
      // Inject our prompt capture functionality
      if (!window.promptCaptureInjected) {
        window.promptCaptureInjected = true;
        
        // Create the content script functionality
        ${getContentScriptCode()}
      }
    `);
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
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
      button.textContent = '💾 Save';
      
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
  // Create the browser window.
  const window = new BrowserWindow({
    width,
    height,
    //  change to false to use AppBar
    frame: false,
    show: true,
    resizable: true,
    fullscreenable: true,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow cross-origin requests for content injection
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
    },
  });

  // Enable web navigation to external sites
  window.webContents.setWindowOpenHandler(() => {
    // Allow opening external URLs in the same window
    return { action: "allow" };
  });

  const port = process.env.PORT || 3001;
  const url = isDev
    ? `http://localhost:${port}`
    : join(__dirname, "../dist-vite/index.html");

  // and load the index.html of the app.
  if (isDev) {
    window?.loadURL(url);
  } else {
    window?.loadFile(url);
  }
  // Open the DevTools.
  // window.webContents.openDevTools();

  // For AppBar
  ipcMain.on("minimize", () => {
    // eslint-disable-next-line no-unused-expressions
    window.isMinimized() ? window.restore() : window.minimize();
    // or alternatively: win.isVisible() ? win.hide() : win.show()
  });
  ipcMain.on("maximize", () => {
    // eslint-disable-next-line no-unused-expressions
    window.isMaximized() ? window.restore() : window.maximize();
  });

  ipcMain.on("close", () => {
    window.close();
  });

  nativeTheme.themeSource = "dark";

  // Register global shortcut for prompt capture
  globalShortcut.register("CommandOrControl+Shift+P", () => {
    // eslint-disable-next-line no-console
    console.log("Global shortcut triggered - capturing clipboard");

    // Automatically capture from clipboard
    captureFromClipboard();
  });

  // Auto-inject content script into all new web pages
  window.webContents.on("did-finish-load", () => {
    injectContentScriptIntoWindow(window);
  });

  window.webContents.on("did-navigate", () => {
    injectContentScriptIntoWindow(window);
  });

  return window;
}

let overlayWindow: BrowserWindow | null = null;

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
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
      preload: join(__dirname, "preload.js"),
    },
  });

  // Create a simple HTML file for the overlay
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
  
  <div class="title">🎯 Prompt Capture</div>
  
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
        captureArea.innerHTML = '<div style="color: #90EE90; font-weight: bold;">✓ Text captured successfully!</div>';
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
  </script>
</body>
</html>
  `;

  overlayWindow.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(overlayHTML),
  );

  overlayWindow.on("closed", () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  // Unregister all global shortcuts
  globalShortcut.unregisterAll();

  if (process.platform !== "darwin") app.quit();
});

// Cleanup shortcuts when app will quit
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// listen the channel `message` and resend the received message to the renderer process
ipcMain.on("message", (event: IpcMainEvent, message: string) => {
  // eslint-disable-next-line no-console
  console.log(message);
  setTimeout(() => event.sender.send("message", "common.hiElectron"), 500);
});

// Handle prompt capture
ipcMain.handle(
  "capture-prompt",
  async (
    _event: IpcMainInvokeEvent,
    promptData: {
      text: string;
      url: string;
      title: string;
      timestamp: string;
      domain: string;
      autoDetected?: boolean;
    },
  ) => {
    // eslint-disable-next-line no-console
    console.log("Captured prompt:", promptData);

    // For now, just log to console as requested
    // Later this can be saved to database/file
    return { success: true, id: Date.now() };
  },
);

// Handle content script injection for external websites
ipcMain.handle("inject-content-script", async () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return { success: false };

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
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("Failed to inject content script:", error);
    return { success: false, error: errorMessage };
  }
});

// Handle overlay window management
ipcMain.handle("close-overlay", async () => {
  if (overlayWindow) {
    overlayWindow.hide();
  }
  return { success: true };
});

ipcMain.handle("show-overlay", async () => {
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
