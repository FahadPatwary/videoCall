import { useState } from "react";
import useWebRTCSupport from "../utils/useWebRTCSupport";

// Define the component props
interface ConnectionSetupProps {
  onInitiateCall: () => void;
  onJoinCall: (connectionCode: string) => void;
  connectionCode?: string;
}

const ConnectionSetup = ({
  onInitiateCall,
  onJoinCall,
  connectionCode,
}: ConnectionSetupProps) => {
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);

  // Check WebRTC support
  const webRTCSupport = useWebRTCSupport();

  // Handle initiating a new call
  const handleInitiateCall = () => {
    onInitiateCall();
  };

  // Handle joining an existing call
  const handleJoinCall = () => {
    if (inputCode.trim()) {
      onJoinCall(inputCode.trim());
    }
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

  // If WebRTC is not supported, show error
  if (!webRTCSupport.isSupported) {
    return (
      <div className="browser-support-error">
        <h2>Browser Not Supported</h2>
        <p>{webRTCSupport.errorMessage}</p>
        <p>Please use a modern browser like Chrome, Firefox, or Safari.</p>
      </div>
    );
  }

  // Show warning if camera or microphone is missing
  const showDeviceWarning =
    webRTCSupport.isSupported &&
    (!webRTCSupport.hasCamera || !webRTCSupport.hasMicrophone);

  return (
    <div className="connection-setup">
      {showDeviceWarning && webRTCSupport.errorMessage && (
        <div className="device-warning">
          <p>{webRTCSupport.errorMessage}</p>
        </div>
      )}

      <div className="setup-section">
        <h2>Start a New Call</h2>
        <p>
          Create a new encrypted video call and share the connection code with
          someone.
        </p>
        <button className="primary-btn" onClick={handleInitiateCall}>
          Start New Call
        </button>
      </div>

      <div className="setup-divider">
        <span>OR</span>
      </div>

      <div className="setup-section">
        <h2>Join Existing Call</h2>
        <p>
          Enter the connection code shared with you to join an encrypted call.
        </p>
        <div className="input-group">
          <input
            type="text"
            placeholder="Paste connection code here"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
          />
          <button
            className="primary-btn"
            onClick={handleJoinCall}
            disabled={!inputCode.trim()}
          >
            Join Call
          </button>
        </div>
      </div>

      {/* Connection code display is now shown in the header */}
      {connectionCode && (
        <div className="security-note-container">
          <p className="security-note">
            <strong>Security Note:</strong> The connection code contains your
            encryption key. Only share it with the person you want to call.
          </p>
        </div>
      )}
    </div>
  );
};

export default ConnectionSetup;
