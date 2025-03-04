# Secure P2P Video Call

A one-to-one encrypted video calling application that operates without a central server. This application uses a peer-to-peer (P2P) architecture where clients connect directly to each other using WebRTC.

## Features

- **End-to-End Encryption**: All video and audio streams are encrypted using AES-256.
- **No Central Server**: Connections are established directly between peers.
- **Secure Key Exchange**: Encryption keys are generated and exchanged client-side.
- **Manual Signaling**: Connection details are shared via a shareable code.
- **NAT Traversal**: Uses STUN servers for NAT traversal.
- **Simple UI**: Easy-to-use interface with video/audio controls.

## Architecture Overview

### P2P Connection Process

1. **Initiator** creates a new call and generates an encryption key.
2. **Initiator** generates a WebRTC offer containing connection details and the encryption key.
3. **Initiator** shares the connection code with the other user.
4. **Receiver** enters the connection code to join the call.
5. **Receiver** processes the WebRTC offer and encryption key.
6. **Receiver** generates a WebRTC answer and sends it back to the initiator.
7. **Connection** is established directly between the two peers.
8. **Media streams** are encrypted end-to-end using the shared key.

### Security Considerations

- All encryption happens client-side using AES-256.
- No data is stored on any server.
- Connection codes contain encryption keys and should only be shared securely.
- Users can verify the encryption key fingerprint to ensure secure communication.

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/secure-p2p-video-call.git
   cd secure-p2p-video-call
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the development server:

   ```
   npm run dev
   ```

4. Open the application in your browser:
   ```
   http://localhost:5173
   ```

### How to Use

#### Starting a New Call

1. Click on "Start New Call".
2. Allow access to your camera and microphone when prompted.
3. Share the generated connection code with the person you want to call.

#### Joining an Existing Call

1. Receive a connection code from someone who started a call.
2. Enter the code in the "Join Existing Call" section.
3. Click "Join Call".
4. Allow access to your camera and microphone when prompted.

#### During the Call

- Use the "Disable Video" button to turn your camera on/off.
- Use the "Mute" button to turn your microphone on/off.
- Use the "End Call" button to terminate the connection.
- Check the encryption status to verify the connection is secure.

## Technical Details

### Technologies Used

- **React**: Frontend framework
- **TypeScript**: Type-safe JavaScript
- **WebRTC**: Peer-to-peer communication
- **simple-peer**: WebRTC abstraction library
- **crypto-js**: Encryption library

### Key Components

- **EncryptionService**: Handles AES-256 encryption and key management.
- **PeerConnectionService**: Manages WebRTC peer connections.
- **MediaStreamService**: Handles video and audio streams.
- **VideoCall**: Main component for the video call interface.
- **ConnectionSetup**: Component for setting up the connection.

## Limitations and Future Improvements

- Currently limited to one-to-one calls.
- No persistent identity management.
- Relies on manual exchange of connection codes.
- No fallback mechanism if direct P2P connection fails.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- WebRTC for enabling peer-to-peer communication.
- simple-peer for simplifying WebRTC implementation.
- crypto-js for providing encryption capabilities.
