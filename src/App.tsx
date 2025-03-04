import { useState } from "react";
import "./App.css";
import ConnectionSetup from "./components/ConnectionSetup";
import ErrorBoundary from "./components/ErrorBoundary";
import VideoCall from "./components/VideoCall";

function App() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);
  const [connectionCode, setConnectionCode] = useState<string | undefined>(
    undefined
  );
  const [joinCode, setJoinCode] = useState<string | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const [showFullCode, setShowFullCode] = useState(false);

  // Handle initiating a new call
  const handleInitiateCall = () => {
    setIsInitiator(true);
    setIsCallActive(true);
  };

  // Handle joining an existing call
  const handleJoinCall = (code: string) => {
    setIsInitiator(false);
    setJoinCode(code);
    setIsCallActive(true);
  };

  // Handle receiving a connection code
  const handleConnectionCode = (code: string) => {
    setConnectionCode(code);
  };

  // Handle ending the call
  const handleEndCall = () => {
    setIsCallActive(false);
    setConnectionCode(undefined);
    setJoinCode(undefined);
    setShowFullCode(false);
  };
  
  // Copy connection code to clipboard
  const copyCodeToClipboard = () => {
    if (connectionCode) {
      navigator.clipboard
        .writeText(connectionCode)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          console.error("Failed to copy code:", err);
        });
    }
  };
  
  // Toggle showing full connection code
  const toggleShowFullCode = () => {
    setShowFullCode(!showFullCode);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Secure P2P Video Call</h1>
        <p className="app-description">
          End-to-end encrypted video calls without a central server
        </p>
        
        {isCallActive && isInitiator && connectionCode && (
          <div className="header-connection-code">
            <div className="code-label">Connection Code:</div>
            <div className="header-code-container">
              <div className="code-text-truncated">
                {connectionCode.length > 30 
                  ? `${connectionCode.substring(0, 30)}...` 
                  : connectionCode}
              </div>
              <button className="view-btn" onClick={toggleShowFullCode}>
                View
              </button>
              <button className="copy-btn" onClick={copyCodeToClipboard}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="app-main">
        <ErrorBoundary>
          {!isCallActive ? (
            <ConnectionSetup
              onInitiateCall={handleInitiateCall}
              onJoinCall={handleJoinCall}
              connectionCode={connectionCode}
            />
          ) : (
            <VideoCall
              isInitiator={isInitiator}
              onConnectionCode={handleConnectionCode}
              connectionCode={joinCode}
            />
          )}
        </ErrorBoundary>
      </main>

      <footer className="app-footer">
        <p>
          This application uses WebRTC for peer-to-peer connections and AES-256
          for end-to-end encryption. No data is stored on any server.
        </p>
        {isCallActive && (
          <button className="secondary-btn" onClick={handleEndCall}>
            End Call & Return to Home
          </button>
        )}
      </footer>
      
      {/* Modal for full connection code */}
      {showFullCode && connectionCode && (
        <div className="modal-overlay" onClick={toggleShowFullCode}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Your Connection Code</h3>
            <p>Share this code with the person you want to call:</p>
            <div className="modal-code-container">
              <div className="modal-code-text">{connectionCode}</div>
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={copyCodeToClipboard}>
                {copied ? "Copied!" : "Copy Code"}
              </button>
              <button className="secondary-btn" onClick={toggleShowFullCode}>
                Close
              </button>
            </div>
            <p className="security-note">
              <strong>Security Note:</strong> This code contains your encryption
              key. Only share it with the person you want to call.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
