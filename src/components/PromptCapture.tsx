import React, { useEffect, useState } from "react";

interface CapturedPrompt {
  id: number;
  text: string;
  url: string;
  title: string;
  timestamp: string;
  domain: string;
  autoDetected?: boolean;
}

declare global {
  interface Window {
    Main?: {
      on: (channel: string, callback: (data: CapturedPrompt) => void) => void;
      capturePrompt: (
        promptData: CapturedPrompt,
      ) => Promise<{ success: boolean; id: number }>;
      injectContentScript: () => Promise<{ success: boolean }>;
    };
    electronAPI?: {
      capturePrompt: (
        promptData: CapturedPrompt,
      ) => Promise<{ success: boolean; id: number }>;
      closeOverlay: () => Promise<{ success: boolean }>;
      showOverlay: () => Promise<{ success: boolean }>;
    };
  }
}

const PromptCapture: React.FC = () => {
  const [capturedPrompts, setCapturedPrompts] = useState<CapturedPrompt[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Listen for captured prompts from the main process
    if (window.Main) {
      window.Main.on("prompt-captured", (promptData: CapturedPrompt) => {
        setCapturedPrompts((prev) => [promptData, ...prev]);
      });
    }

    // Also listen for prompts captured via the global shortcut
    const handlePromptCaptured = (event: any, promptData: CapturedPrompt) => {
      setCapturedPrompts((prev) => [promptData, ...prev]);
    };

    if (window.ipcRenderer) {
      window.ipcRenderer.on("prompt-captured", handlePromptCaptured);
    }

    // Cleanup
    return () => {
      if (window.ipcRenderer) {
        window.ipcRenderer.removeListener(
          "prompt-captured",
          handlePromptCaptured,
        );
      }
    };
  }, []);

  const activateGlobalCapture = async () => {
    if (window.Main) {
      try {
        await window.Main.injectContentScript();
        setIsActive(true);
        console.log("Global prompt capture activated!");
      } catch (error) {
        console.error("Failed to activate global capture:", error);
      }
    }
  };

  const showOverlay = async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.showOverlay();
        console.log("Overlay window shown!");
      } catch (error) {
        console.error("Failed to show overlay:", error);
      }
    }
  };

  const testLocalCapture = () => {
    const testPrompt: CapturedPrompt = {
      id: Date.now(),
      text: "This is a test prompt captured from the local application",
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      domain: window.location.hostname,
    };

    if (window.Main) {
      window.Main.capturePrompt(testPrompt);
      setCapturedPrompts((prev) => [testPrompt, ...prev]);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">
          Prompt Capture System
        </h2>

        <div className="mb-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              How to use:
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>
                • <strong>Highlight & Capture:</strong> Highlight text anywhere,
                then press Cmd+Shift+P to auto-save it
              </li>
              <li>
                • <strong>Automatic copying:</strong> No need to manually copy -
                the app does it for you
              </li>
              <li>
                • <strong>Works everywhere:</strong> Any app, browser, document,
                PDF, etc.
              </li>
              <li>
                • <strong>Visual feedback:</strong> You'll get a notification
                when text is captured
              </li>
              <li>
                • <strong>Auto-capture:</strong> Prompts are automatically
                captured on AI websites like Claude, Gemini, ChatGPT when
                browsing in the app
              </li>
            </ul>
          </div>

          <div className="flex space-x-4 flex-wrap gap-2">
            <button
              onClick={showOverlay}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded transition-colors font-semibold"
            >
              🎯 Show Global Capture Overlay
            </button>

            <button
              onClick={activateGlobalCapture}
              className={`px-4 py-2 rounded transition-colors ${
                isActive
                  ? "bg-green-500 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              {isActive ? "Global Capture Active" : "Activate Global Capture"}
            </button>

            <button
              onClick={testLocalCapture}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
            >
              Test Local Capture
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4 dark:text-white">
            Captured Prompts ({capturedPrompts.length})
          </h3>

          {capturedPrompts.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 text-center py-8">
              No prompts captured yet. Try highlighting some text and using the
              capture feature!
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {capturedPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="border dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium">{prompt.domain}</span>
                      {prompt.autoDetected && (
                        <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded">
                          Auto-detected
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(prompt.timestamp).toLocaleString()}
                    </div>
                  </div>

                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                    {prompt.title}
                  </div>

                  <div className="text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 p-3 rounded border-l-4 border-blue-500">
                    {prompt.text}
                  </div>

                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Source:{" "}
                    <a
                      href={prompt.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {prompt.url}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptCapture;
