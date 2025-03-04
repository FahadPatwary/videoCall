import SimplePeer from "simple-peer";
import { v4 as uuidv4 } from "uuid";
import { encryptionService } from "./encryption";

// Define the structure of connection data
export interface ConnectionData {
  id: string;
  type: "offer" | "answer";
  sdp: string;
  encryptionKey?: string;
}

// Define the structure of ICE candidate data
export interface IceCandidateData {
  id: string;
  candidate: RTCIceCandidate;
}

export class PeerConnectionService {
  private peer: SimplePeer.Instance | null = null;
  private localStream: MediaStream | null = null;
  private connectionId: string = "";
  private iceCandidates: RTCIceCandidate[] = [];
  private isInitialized: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectTimeout: number | null = null;

  // Event callbacks
  private onSignalCallback: ((data: ConnectionData) => void) | null = null;
  private onConnectCallback: (() => void) | null = null;
  private onStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onIceCandidateCallback: ((data: IceCandidateData) => void) | null =
    null;
  private onErrorCallback: ((err: Error) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;

  /**
   * Initialize the peer connection with local media stream
   * @param stream Local media stream
   * @param initiator Whether this peer is the initiator of the connection
   */
  initializePeer(stream: MediaStream, initiator: boolean): void {
    // If already initialized, close the existing peer first
    if (this.isInitialized) {
      this.closePeer();
    }

    try {
      this.localStream = stream;
      this.connectionId = uuidv4();
      this.isInitialized = true;
      this.reconnectAttempts = 0;

      // Configure STUN servers for NAT traversal
      const iceServers = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ];

      // Create the peer connection
      this.peer = new SimplePeer({
        initiator,
        stream,
        trickle: true,
        config: { iceServers },
      });

      // Set up event listeners
      this.peer.on("signal", (data) => {
        // When we have connection data to share
        if (this.onSignalCallback) {
          const connectionData: ConnectionData = {
            id: this.connectionId,
            type: initiator ? "offer" : "answer",
            sdp: JSON.stringify(data),
          };

          // If we're the initiator, include the encryption key
          if (initiator) {
            const key = encryptionService.generateEncryptionKey();
            connectionData.encryptionKey = key;
          }

          this.onSignalCallback(connectionData);
        }
      });

      this.peer.on("connect", () => {
        console.log("Peer connection established");
        // Reset reconnect attempts on successful connection
        this.reconnectAttempts = 0;
        if (this.onConnectCallback) this.onConnectCallback();
      });

      this.peer.on("stream", (remoteStream: MediaStream) => {
        console.log("Received remote stream");
        if (this.onStreamCallback) this.onStreamCallback(remoteStream);
      });

      this.peer.on("error", (err: Error) => {
        console.error("Peer connection error:", err);

        // Handle specific errors
        if (
          err.message.includes("ICE connection failed") ||
          err.message.includes("ICE disconnected")
        ) {
          this.handleConnectionFailure(initiator, stream);
        } else if (this.onErrorCallback) {
          this.onErrorCallback(err);
        }
      });

      this.peer.on("close", () => {
        console.log("Peer connection closed and connecting status");
        this.isInitialized = false;

        // Notify about connection closure
        if (this.onCloseCallback) {
          this.onCloseCallback();
        }
      });
    } catch (error) {
      console.error("Error initializing peer:", error);
      this.isInitialized = false;
      if (this.onErrorCallback) {
        this.onErrorCallback(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  /**
   * Handle connection failures with potential reconnection
   */
  private handleConnectionFailure(
    initiator: boolean,
    stream: MediaStream
  ): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Connection failed. Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} to reconnect...`
      );

      // Clear any existing timeout
      if (this.reconnectTimeout !== null) {
        window.clearTimeout(this.reconnectTimeout);
      }

      // Attempt to reconnect after a delay
      this.reconnectTimeout = window.setTimeout(() => {
        if (this.peer) {
          this.peer.destroy();
          this.peer = null;
        }
        this.isInitialized = false;
        this.initializePeer(stream, initiator);
      }, 2000);
    } else {
      console.error("Maximum reconnection attempts reached");
      if (this.onErrorCallback) {
        this.onErrorCallback(
          new Error("Failed to establish connection after multiple attempts")
        );
      }
    }
  }

  /**
   * Process incoming connection data (offer or answer)
   * @param data Connection data from the remote peer
   */
  processConnectionData(data: ConnectionData): void {
    if (!this.peer) {
      throw new Error("Peer connection not initialized");
    }

    // Set the encryption key if provided
    if (data.encryptionKey) {
      encryptionService.setEncryptionKey(data.encryptionKey);
    }

    try {
      // Process the connection signal
      this.peer.signal(JSON.parse(data.sdp));

      // Apply any stored ICE candidates
      this.iceCandidates.forEach((candidate) => {
        this.peer?.signal({ candidate });
      });
      this.iceCandidates = [];
    } catch (error) {
      console.error("Error processing connection data:", error);
      if (this.onErrorCallback) {
        this.onErrorCallback(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  /**
   * Process incoming ICE candidate
   * @param data ICE candidate data from the remote peer
   */
  processIceCandidate(data: IceCandidateData): void {
    if (this.peer && this.peer.connected) {
      this.peer.signal({ candidate: data.candidate });
    } else {
      // Store the candidate for later if not connected yet
      this.iceCandidates.push(data.candidate);
    }
  }

  /**
   * Close the peer connection
   */
  closePeer(): void {
    // Clear any reconnection timeout
    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (error) {
        console.error("Error destroying peer:", error);
      }
      this.peer = null;
    }

    if (this.localStream) {
      try {
        this.localStream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        console.error("Error stopping tracks:", error);
      }
      this.localStream = null;
    }

    this.isInitialized = false;
    this.iceCandidates = [];
    this.connectionId = "";
    this.reconnectAttempts = 0;
  }

  /**
   * Check if peer is initialized
   * @returns Whether the peer is initialized
   */
  isInitializedPeer(): boolean {
    return this.isInitialized;
  }

  /**
   * Set callback for when connection signal is ready
   * @param callback Function to call with connection data
   */
  onSignal(callback: (data: ConnectionData) => void): void {
    this.onSignalCallback = callback;
  }

  /**
   * Set callback for when connection is established
   * @param callback Function to call when connected
   */
  onConnect(callback: () => void): void {
    this.onConnectCallback = callback;
  }

  /**
   * Set callback for when remote stream is received
   * @param callback Function to call with remote stream
   */
  onStream(callback: (stream: MediaStream) => void): void {
    this.onStreamCallback = callback;
  }

  /**
   * Set callback for when ICE candidate is generated
   * @param callback Function to call with ICE candidate data
   */
  onIceCandidate(callback: (data: IceCandidateData) => void): void {
    this.onIceCandidateCallback = callback;
  }

  /**
   * Set callback for when an error occurs
   * @param callback Function to call with error
   */
  onError(callback: (err: Error) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Set callback for when connection is closed
   * @param callback Function to call when connection closes
   */
  onClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  /**
   * Get the connection ID
   * @returns The connection ID
   */
  getConnectionId(): string {
    return this.connectionId;
  }
}

// Export a singleton instance
export const peerConnectionService = new PeerConnectionService();
