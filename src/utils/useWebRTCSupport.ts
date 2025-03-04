import { useEffect, useState } from "react";

interface WebRTCSupport {
  isSupported: boolean;
  hasCamera: boolean;
  hasMicrophone: boolean;
  errorMessage: string | null;
}

/**
 * Custom hook to check WebRTC support in the browser
 * @returns Object containing support status and error message if any
 */
export function useWebRTCSupport(): WebRTCSupport {
  const [support, setSupport] = useState<WebRTCSupport>({
    isSupported: true, // Default to true to avoid flickering
    hasCamera: true,
    hasMicrophone: true,
    errorMessage: null,
  });

  useEffect(() => {
    // Check if browser supports WebRTC
    const checkWebRTCSupport = async () => {
      try {
        // Check for basic WebRTC support
        const hasRTCPeerConnection = "RTCPeerConnection" in window;
        const hasUserMedia = !!(
          navigator.mediaDevices && navigator.mediaDevices.getUserMedia
        );

        if (!hasRTCPeerConnection || !hasUserMedia) {
          setSupport({
            isSupported: false,
            hasCamera: false,
            hasMicrophone: false,
            errorMessage:
              "Your browser does not support WebRTC. Please use a modern browser like Chrome, Firefox, or Safari.",
          });
          return;
        }

        // Try to access media devices to check permissions
        try {
          // First, enumerate devices to check what's available
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasVideoInput = devices.some(
            (device) => device.kind === "videoinput"
          );
          const hasAudioInput = devices.some(
            (device) => device.kind === "audioinput"
          );

          // If we can't determine device availability from enumeration (e.g., due to permissions),
          // we'll try to request access directly
          if (
            devices.length === 0 ||
            (devices.every((device) => !device.label) &&
              (hasVideoInput || hasAudioInput))
          ) {
            // Try to request camera and microphone access
            try {
              const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
              });

              // Stop all tracks immediately after checking
              stream.getTracks().forEach((track) => track.stop());

              setSupport({
                isSupported: true,
                hasCamera: true,
                hasMicrophone: true,
                errorMessage: null,
              });
              return;
            } catch (err) {
              console.log("Media access error:", err);
              // Continue with device enumeration results
            }
          }

          if (!hasVideoInput && !hasAudioInput) {
            setSupport({
              isSupported: true,
              hasCamera: false,
              hasMicrophone: false,
              errorMessage:
                "No camera or microphone detected. Please connect a camera and microphone to use this application.",
            });
          } else if (!hasVideoInput) {
            setSupport({
              isSupported: true,
              hasCamera: false,
              hasMicrophone: true,
              errorMessage:
                "No camera detected. You can still join with audio only.",
            });
          } else if (!hasAudioInput) {
            setSupport({
              isSupported: true,
              hasCamera: true,
              hasMicrophone: false,
              errorMessage:
                "No microphone detected. You can still join with video only.",
            });
          } else {
            setSupport({
              isSupported: true,
              hasCamera: true,
              hasMicrophone: true,
              errorMessage: null,
            });
          }
        } catch (error) {
          console.error("Error checking media devices:", error);

          // If we can't access device info, assume devices are available
          // but warn about permissions
          setSupport({
            isSupported: true,
            hasCamera: true,
            hasMicrophone: true,
            errorMessage:
              "Unable to verify camera and microphone access. You may need to grant permissions when prompted.",
          });
        }
      } catch (error) {
        console.error("Error checking WebRTC support:", error);
        setSupport({
          isSupported: false,
          hasCamera: false,
          hasMicrophone: false,
          errorMessage:
            "Error checking WebRTC support. Please try a different browser.",
        });
      }
    };

    checkWebRTCSupport();
  }, []);

  return support;
}

export default useWebRTCSupport;
