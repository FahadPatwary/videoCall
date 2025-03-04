import { useEffect, useRef, useState } from "react";
import { encryptionService } from "../utils/encryption";
import { mediaStreamService } from "../utils/mediaStream";
import { ConnectionData, peerConnectionService } from "../utils/peerConnection";
import useWebRTCSupport from "../utils/useWebRTCSupport";

// Define the component props
interface VideoCallProps {
  isInitiator: boolean;
  onConnectionCode?: (code: string) => void;
  connectionCode?: string;
}

const VideoCall = ({
  isInitiator,
  onConnectionCode,
  connectionCode,
}: VideoCallProps) => {
  // State variables
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [encryptionStatus, setEncryptionStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);

  // Check WebRTC support
  const webRTCSupport = useWebRTCSupport();

  // Refs for video elements
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Ref to track initialization status
  const isInitializedRef = useRef(false);

  // Initialize the call
  useEffect(() => {
    // If WebRTC is not supported, show error
    if (!webRTCSupport.isSupported) {
      setError(
        webRTCSupport.errorMessage || "WebRTC is not supported in your browser"
      );
      return;
    }

    // If already initialized, don't initialize again
    if (isInitializedRef.current) {
      return;
    }

    const initializeCall = async () => {
      try {
        setIsConnecting(true);

        // Get local media stream with fallback options
        let localStream;
        try {
          // Try with both video and audio first
          localStream = await mediaStreamService.getLocalStream(
            webRTCSupport.hasCamera && isVideoEnabled,
            webRTCSupport.hasMicrophone && isAudioEnabled
          );
        } catch (mediaError) {
          console.warn(
            "Failed to get media with both video and audio:",
            mediaError
          );

          // Try with only audio if video failed
          if (webRTCSupport.hasMicrophone) {
            try {
              localStream = await mediaStreamService.getLocalStream(
                false,
                true
              );
              setIsVideoEnabled(false);
              console.log("Fallback: Using audio only");
            } catch (audioError) {
              console.error("Failed to get audio-only stream:", audioError);
              throw new Error(
                "Could not access your camera or microphone. Please check your permissions."
              );
            }
          } else {
            throw new Error(
              "No available media devices. Please connect a camera or microphone."
            );
          }
        }

        // Set local video
        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
        }

        // Initialize peer connection
        peerConnectionService.initializePeer(localStream, isInitiator);
        isInitializedRef.current = true;

        // Set up event listeners
        peerConnectionService.onSignal((data: ConnectionData) => {
          // Convert connection data to a shareable string
          const connectionString = btoa(JSON.stringify(data));
          if (onConnectionCode) {
            onConnectionCode(connectionString);
          }
        });

        peerConnectionService.onConnect(() => {
          setIsConnected(true);
          setIsConnecting(false);
          setRetryCount(0); // Reset retry count on successful connection

          // Update encryption status
          const key = encryptionService.getEncryptionKey();
          if (key) {
            const fingerprint = encryptionService.getKeyFingerprint();
            setEncryptionStatus(`Secure (Key: ${fingerprint})`);
          } else {
            setEncryptionStatus("Not encrypted");
          }
        });

        peerConnectionService.onStream((stream: MediaStream) => {
          // Set remote video
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
        });

        peerConnectionService.onError((err: Error) => {
          console.error("Connection error in component:", err);

          // Handle specific WebRTC errors
          if (
            err.message.includes("getUserMedia") ||
            err.message.includes("Permission denied") ||
            err.message.includes("NotAllowedError")
          ) {
            setError(
              "Camera or microphone access denied. Please check your browser permissions."
            );
          } else if (err.message.includes("RTCPeerConnection")) {
            // If we've already retried a few times, show a more permanent error
            if (retryCount >= 2) {
              setError(`WebRTC connection failed: ${err.message}`);
            } else {
              // Otherwise, try to reinitialize
              setRetryCount((prev) => prev + 1);
              setError("Connection failed. Retrying...");

              // Clean up and try again after a short delay
              setTimeout(() => {
                if (isInitializedRef.current) {
                  peerConnectionService.closePeer();
                  isInitializedRef.current = false;
                  setError("");
                  // The next render will trigger initialization again
                }
              }, 2000);
            }
          } else {
            setError(`Connection error: ${err.message}`);
          }

          setIsConnecting(false);
        });

        // Handle connection closure
        peerConnectionService.onClose(() => {
          console.log("Connection closed, updating UI");
          if (isConnected) {
            setIsConnected(false);
            setError("Connection closed. The other person may have left the call.");
          }
        });

        // If we have a connection code and we're not the initiator, process it
        if (connectionCode && !isInitiator) {
          processConnectionCode(connectionCode);
        }

        setIsConnecting(false);
      } catch (err) {
        console.error("Failed to initialize call:", err);
        setError(
          `Failed to initialize call: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
        setIsConnecting(false);
        isInitializedRef.current = false;
      }
    };

    initializeCall();

    // Clean up on unmount
    return () => {
      if (isInitializedRef.current) {
        peerConnectionService.closePeer();
        mediaStreamService.stopLocalStream();
        isInitializedRef.current = false;
      }
    };
  }, [isInitiator, webRTCSupport.isSupported, retryCount]);

  // Process connection code when it changes
  useEffect(() => {
    if (
      connectionCode &&
      !isInitiator &&
      !isConnected &&
      !isConnecting &&
      isInitializedRef.current
    ) {
      processConnectionCode(connectionCode);
    }
  }, [connectionCode, isInitiator, isConnected, isConnecting]);

  // Process the connection code
  const processConnectionCode = (code: string) => {
    try {
      setIsConnecting(true);
      const decodedData = JSON.parse(atob(code)) as ConnectionData;
      peerConnectionService.processConnectionData(decodedData);
    } catch (err) {
      console.error("Invalid connection code:", err);
      setError(
        `Invalid connection code: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      setIsConnecting(false);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    const newState = !isVideoEnabled;
    if (mediaStreamService.toggleVideo(newState)) {
      setIsVideoEnabled(newState);
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    const newState = !isAudioEnabled;
    if (mediaStreamService.toggleAudio(newState)) {
      setIsAudioEnabled(newState);
    }
  };

  // End the call
  const endCall = () => {
    if (isInitializedRef.current) {
      peerConnectionService.closePeer();
      mediaStreamService.stopLocalStream();
      isInitializedRef.current = false;
    }
    setIsConnected(false);
    setIsConnecting(false);
    window.location.reload(); // Reload the page to reset the state
  };

  // Retry connection
  const retryConnection = () => {
    if (isInitializedRef.current) {
      peerConnectionService.closePeer();
      isInitializedRef.current = false;
    }
    setError("");
    setRetryCount(0);
    setIsConnecting(false);
    setIsConnected(false);
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

  return (
    <div className="video-call-container">
      <div className="video-grid">
        <div className="video-item local-video">
          <video ref={localVideoRef} autoPlay muted playsInline />
          <div className="video-label">You</div>
        </div>

        {isConnected && (
          <div className="video-item remote-video">
            <video ref={remoteVideoRef} autoPlay playsInline />
            <div className="video-label">Remote User</div>
          </div>
        )}
      </div>

      <div className="controls">
        <button
          className={`control-btn ${isVideoEnabled ? "active" : "inactive"}`}
          onClick={toggleVideo}
          disabled={!webRTCSupport.hasCamera}
        >
          {isVideoEnabled ? "Disable Video" : "Enable Video"}
        </button>

        <button
          className={`control-btn ${isAudioEnabled ? "active" : "inactive"}`}
          onClick={toggleAudio}
          disabled={!webRTCSupport.hasMicrophone}
        >
          {isAudioEnabled ? "Mute" : "Unmute"}
        </button>

        <button className="control-btn end-call" onClick={endCall}>
          End Call
        </button>
      </div>

      {encryptionStatus && (
        <div className="encryption-status">Encryption: {encryptionStatus}</div>
      )}

      {error && (
        <div className="error-message">
          {error}
          {error.includes("failed") && (
            <button className="retry-btn" onClick={retryConnection}>
              Retry Connection
            </button>
          )}
        </div>
      )}

      {isConnecting && !isConnected && (
        <div className="connecting-message">Connecting...</div>
      )}
    </div>
  );
};

export default VideoCall;
