import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import AppBar from "./AppBar";

import SwitchDarkMode from "./SwitchDarkMode";
import SelectLanguage from "./SelectLanguage";
import { useAuth } from "./context/AuthContext";
import AuthForm from "./components/AuthForm";
import UserProfile from "./components/UserProfile";
import PromptCapture from "./components/PromptCapture";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  console.log(window.ipcRenderer);

  const [isOpen, setOpen] = useState(false);
  const [isSent, setSent] = useState(false);
  const [fromMain, setFromMain] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  const handleToggle = () => {
    if (isOpen) {
      setOpen(false);
      setSent(false);
    } else {
      setOpen(true);
      setFromMain(null);
    }
  };
  const sendMessageToElectron = () => {
    if (window.Main) {
      window.Main.sendMessage(t("common.helloElectron"));
    } else {
      setFromMain(t("common.helloBrowser"));
    }
    setSent(true);
  };

  useEffect(() => {
    window.Main.removeLoading();
  }, []);

  useEffect(() => {
    if (isSent && window.Main)
      window.Main.on("message", (message: string) => {
        setFromMain(message);
      });
  }, [fromMain, isSent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {window.Main && (
        <div className="flex-none">
          <AppBar />
        </div>
      )}
      <div className="flex-auto">
        <div className="ml-4 mr-4 mt-4 flex items-center justify-between">
          <SwitchDarkMode />
          <SelectLanguage />
        </div>

        {!user ? (
          <div className="flex flex-col justify-center items-center h-full pt-16 space-y-6">
            <h1 className="text-3xl dark:text-gray-200 mb-8">
              Vite + React + Typescript + Electron + Supabase
            </h1>
            <AuthForm
              mode={authMode}
              onToggleMode={() =>
                setAuthMode(authMode === "signin" ? "signup" : "signin")
              }
            />
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center h-full pt-16 space-y-6">
            <h1 className="text-3xl dark:text-gray-200 mb-8">
              Vite + React + Typescript + Electron + Supabase
            </h1>

            <ProtectedRoute>
              <UserProfile />
              <PromptCapture />
            </ProtectedRoute>

            <div className="mt-8 space-y-4">
              <button
                className="bg-yellow-400 py-2 px-4 rounded focus:outline-none shadow hover:bg-yellow-200 dark:text-black"
                onClick={handleToggle}
              >
                {t("common.clickMe")}
              </button>
              {isOpen && (
                <div className="flex flex-col space-y-4 items-center">
                  <div className="flex space-x-3">
                    <h1 className="text-xl dark:text-gray-50">
                      {t("common.welcome")}
                    </h1>
                    <button
                      onClick={sendMessageToElectron}
                      className=" bg-green-400 rounded px-4 py-0 focus:outline-none hover:bg-green-300 dark:text-black"
                    >
                      {t("common.send")}
                    </button>
                  </div>
                  {isSent && (
                    <div>
                      <h4 className="dark:text-green-500 text-green-600">
                        {t("common.messageSent")}
                      </h4>
                    </div>
                  )}
                  {fromMain && (
                    <div>
                      {" "}
                      <h4 className="dark:text-yellow-200 text-yellow-800">
                        {t(fromMain)}
                      </h4>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
