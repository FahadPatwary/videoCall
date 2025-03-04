/**
 * Service for handling media streams
 */
class MediaStreamService {
  private localStream: MediaStream | null = null;

  /**
   * Get local media stream
   * @param video Whether to include video
   * @param audio Whether to include audio
   * @returns Media stream
   */
  async getLocalStream(video: boolean, audio: boolean): Promise<MediaStream> {
    try {
      // If we already have a stream, stop it first
      if (this.localStream) {
        this.stopLocalStream();
      }

      // Define constraints with specific settings for better compatibility
      const constraints: MediaStreamConstraints = {
        video: video
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
          : false,
        audio: audio
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : false,
      };

      // Try to get the stream with the specified constraints
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        return this.localStream;
      } catch (error) {
        console.warn(
          "Failed with ideal constraints, trying minimal constraints:",
          error
        );

        // If that fails, try with minimal constraints
        const minimalConstraints: MediaStreamConstraints = {
          video: video ? true : false,
          audio: audio ? true : false,
        };

        this.localStream = await navigator.mediaDevices.getUserMedia(
          minimalConstraints
        );
        return this.localStream;
      }
    } catch (error) {
      console.error("Error getting local stream:", error);
      throw new Error(
        `Could not access media devices: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Stop local stream
   */
  stopLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (error) {
          console.error("Error stopping track:", error);
        }
      });
      this.localStream = null;
    }
  }

  /**
   * Toggle video
   * @param enabled Whether video should be enabled
   * @returns Whether the operation was successful
   */
  toggleVideo(enabled: boolean): boolean {
    if (!this.localStream) return false;

    try {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = enabled;
      });
      return true;
    } catch (error) {
      console.error("Error toggling video:", error);
      return false;
    }
  }

  /**
   * Toggle audio
   * @param enabled Whether audio should be enabled
   * @returns Whether the operation was successful
   */
  toggleAudio(enabled: boolean): boolean {
    if (!this.localStream) return false;

    try {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = enabled;
      });
      return true;
    } catch (error) {
      console.error("Error toggling audio:", error);
      return false;
    }
  }

  /**
   * Check if the browser supports WebRTC
   * @returns Whether WebRTC is supported
   */
  isWebRTCSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.RTCPeerConnection
    );
  }
}

export const mediaStreamService = new MediaStreamService();
