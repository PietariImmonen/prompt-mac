"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
/**
 * Using the ipcRenderer directly in the browser through the contextBridge ist not really secure.
 * I advise using the Main/api way !!
 */
electron_1.contextBridge.exposeInMainWorld('ipcRenderer', electron_1.ipcRenderer);
// eslint-disable-next-line no-undef
function domReady(condition = ['complete', 'interactive']) {
    return new Promise((resolve) => {
        if (condition.includes(document.readyState)) {
            resolve(true);
        }
        else {
            document.addEventListener('readystatechange', () => {
                if (condition.includes(document.readyState)) {
                    resolve(true);
                }
            });
        }
    });
}
const safeDOM = {
    append(parent, child) {
        if (!Array.from(parent.children).find((e) => e === child)) {
            return parent.appendChild(child);
        }
        return null;
    },
    remove(parent, child) {
        if (parent && Array.from(parent.children).find((e) => e === child)) {
            return parent.removeChild(child);
        }
        return null;
    }
};
/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
    const styleContent = `
  .sk-chase {
  
  }

  .sk-chase-dot {
      width: 40px;
      height: 40px;
      position: absolute;
      margin: auto;
      animation: sk-chase-dot 2.0s infinite ease-in-out both;
  }

  .sk-chase-dot:before {
    content: '';
    display: block;
    width: 25%;
    height: 25%;
    background-color: #fff;
    border-radius: 100%;
    animation: sk-chase-dot-before 2.0s infinite ease-in-out both; 
  }

  .sk-chase-dot:nth-child(1) { animation-delay: -1.1s; }
  .sk-chase-dot:nth-child(2) { animation-delay: -1.0s; }
  .sk-chase-dot:nth-child(3) { animation-delay: -0.9s; }
  .sk-chase-dot:nth-child(4) { animation-delay: -0.8s; }
  .sk-chase-dot:nth-child(5) { animation-delay: -0.7s; }
  .sk-chase-dot:nth-child(6) { animation-delay: -0.6s; }
  .sk-chase-dot:nth-child(1):before { animation-delay: -1.1s; }
  .sk-chase-dot:nth-child(2):before { animation-delay: -1.0s; }
  .sk-chase-dot:nth-child(3):before { animation-delay: -0.9s; }
  .sk-chase-dot:nth-child(4):before { animation-delay: -0.8s; }
  .sk-chase-dot:nth-child(5):before { animation-delay: -0.7s; }
  .sk-chase-dot:nth-child(6):before { animation-delay: -0.6s; }
  
  @keyframes sk-chase {
    100% { transform: rotate(360deg); } 
  }
  
  @keyframes sk-chase-dot {
    80%, 100% { transform: rotate(360deg); } 
  }

  @keyframes sk-chase-dot-before {
    50% {
      transform: scale(0.4); 
    } 100%, 0% {
      transform: scale(1.0); 
    } 
  }

  .app-loading-wrap {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #282c34;
    z-index: 9;
  }
  `;
    const htmlContent = `
    <div clas="sk-chase">
      <div class="sk-chase-dot"></div>
      <div class="sk-chase-dot"></div>
      <div class="sk-chase-dot"></div>
      <div class="sk-chase-dot"></div>
      <div class="sk-chase-dot"></div>
      <div class="sk-chase-dot"></div>
    </div>
  `;
    const oStyle = document.createElement('style');
    const oDiv = document.createElement('div');
    oStyle.id = 'app-loading-style';
    oStyle.innerHTML = styleContent;
    oDiv.id = 'loading-to-remove';
    oDiv.className = 'app-loading-wrap';
    oDiv.innerHTML = htmlContent;
    return {
        appendLoading() {
            safeDOM.append(document.head, oStyle);
            safeDOM.append(document.body, oDiv);
        },
        removeLoading() {
            safeDOM.remove(document.head, oStyle);
            safeDOM.remove(document.body, oDiv);
        }
    };
}
const { appendLoading, removeLoading } = useLoading();
domReady().then(appendLoading);
const api = {
    /**
     * Here you can expose functions to the renderer process
     * so they can interact with the main (electron) side
     * without security problems.
     *
     * The function below can accessed using `window.Main.sayHello`
     */
    sendMessage: (message) => {
        electron_1.ipcRenderer.send('message', message);
    },
    /**
      Here function for AppBar
     */
    Minimize: () => {
        electron_1.ipcRenderer.send('minimize');
    },
    Maximize: () => {
        electron_1.ipcRenderer.send('maximize');
    },
    Close: () => {
        electron_1.ipcRenderer.send('close');
    },
    removeLoading: () => {
        removeLoading();
    },
    /**
     * Provide an easier way to listen to events
     */
    on: (channel, callback) => {
        electron_1.ipcRenderer.on(channel, (_, data) => callback(data));
    },
    /**
     * Prompt capture functionality
     */
    capturePrompt: (promptData) => {
        return electron_1.ipcRenderer.invoke('capture-prompt', promptData);
    },
    injectContentScript: () => {
        return electron_1.ipcRenderer.invoke('inject-content-script');
    }
};
electron_1.contextBridge.exposeInMainWorld('Main', api);
// Expose a simpler API for external websites
const electronAPI = {
    capturePrompt: (promptData) => {
        return electron_1.ipcRenderer.invoke('capture-prompt', promptData);
    },
    closeOverlay: () => {
        return electron_1.ipcRenderer.invoke('close-overlay');
    },
    showOverlay: () => {
        return electron_1.ipcRenderer.invoke('show-overlay');
    }
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
