/**
 * VoiceChat - WebRTC voice chat for multiplayer games
 *
 * Uses WebRTC peer connection with signaling through the existing WebSocket server.
 * Provides microphone capture, remote audio playback, mute control,
 * volume adjustment, and speaking detection via AnalyserNode.
 */

export class VoiceChat {
  constructor(networkManager) {
    this.networkManager = networkManager;

    /** @type {RTCPeerConnection|null} */
    this.peerConnection = null;

    /** @type {MediaStream|null} */
    this.localStream = null;

    /** @type {HTMLAudioElement|null} */
    this.remoteAudio = null;

    /** @type {AudioContext|null} */
    this.audioContext = null;

    /** @type {AnalyserNode|null} */
    this.analyser = null;

    /** @type {GainNode|null} */
    this.gainNode = null;

    /** @type {MediaStreamAudioSourceNode|null} */
    this.remoteSource = null;

    this._muted = false;
    this._volume = 1.0;
    this._speaking = false;
    this._speakingThreshold = 15; // RMS threshold for "speaking" detection
    this._speakingCheckInterval = null;
    this._active = false;
    this._micError = null;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Start voice chat. Call after multiplayer game begins.
   * @param {boolean} isInitiator - true if this player creates the offer (slot 0)
   */
  async start(isInitiator) {
    if (this._active) return;
    this._active = true;
    this._micError = null;

    // Get microphone access
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.warn('VoiceChat: Mic access denied or unavailable:', err.message);
      this._micError = 'Mic access denied';
      this._active = false;
      return;
    }

    // Create hidden audio element for remote playback
    this.remoteAudio = document.createElement('audio');
    this.remoteAudio.id = 'voice-chat-remote-audio';
    this.remoteAudio.autoplay = true;
    this.remoteAudio.style.display = 'none';
    document.body.appendChild(this.remoteAudio);

    // Create RTCPeerConnection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local audio tracks to the connection
    for (const track of this.localStream.getAudioTracks()) {
      this.peerConnection.addTrack(track, this.localStream);
    }

    // Handle ICE candidates - send to remote peer via signaling
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.networkManager.sendWebRTCIce(event.candidate.toJSON());
      }
    };

    // Handle remote audio stream
    this.peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (remoteStream) {
        this._setupRemoteAudio(remoteStream);
      }
    };

    // Connection state logging
    this.peerConnection.onconnectionstatechange = () => {
      console.log('VoiceChat: connection state:', this.peerConnection?.connectionState);
    };

    // If initiator, create and send offer
    if (isInitiator) {
      try {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        this.networkManager.sendWebRTCOffer(this.peerConnection.localDescription.toJSON());
      } catch (err) {
        console.error('VoiceChat: failed to create offer:', err);
      }
    }
  }

  /**
   * Handle incoming SDP offer from remote peer.
   * @param {Object} sdp - RTCSessionDescription init
   */
  async handleOffer(sdp) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.networkManager.sendWebRTCAnswer(this.peerConnection.localDescription.toJSON());
    } catch (err) {
      console.error('VoiceChat: failed to handle offer:', err);
    }
  }

  /**
   * Handle incoming SDP answer from remote peer.
   * @param {Object} sdp - RTCSessionDescription init
   */
  async handleAnswer(sdp) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (err) {
      console.error('VoiceChat: failed to handle answer:', err);
    }
  }

  /**
   * Handle incoming ICE candidate from remote peer.
   * @param {Object} candidate - RTCIceCandidate init
   */
  async handleIceCandidate(candidate) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('VoiceChat: failed to add ICE candidate:', err);
    }
  }

  /**
   * Toggle local microphone mute state.
   * @returns {boolean} New mute state
   */
  toggleMute() {
    this._muted = !this._muted;
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = !this._muted;
      }
    }
    return this._muted;
  }

  /**
   * @returns {boolean} Whether local mic is muted
   */
  get isMuted() {
    return this._muted;
  }

  /**
   * @returns {boolean} Whether the remote peer is currently speaking
   */
  get isSpeaking() {
    return this._speaking;
  }

  /**
   * @returns {string|null} Mic error message if getUserMedia failed
   */
  get micError() {
    return this._micError;
  }

  /**
   * @returns {boolean} Whether voice chat is active
   */
  get isActive() {
    return this._active && !this._micError;
  }

  /**
   * Set volume for remote audio playback.
   * @param {number} level - 0.0 to 1.0
   */
  setVolume(level) {
    this._volume = Math.max(0, Math.min(1, level));
    if (this.gainNode) {
      this.gainNode.gain.value = this._volume;
    }
    if (this.remoteAudio) {
      this.remoteAudio.volume = this._volume;
    }
  }

  /**
   * Stop voice chat and clean up all resources.
   */
  stop() {
    this._active = false;
    this._speaking = false;

    // Stop speaking detection
    if (this._speakingCheckInterval) {
      clearInterval(this._speakingCheckInterval);
      this._speakingCheckInterval = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop local media tracks
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }

    // Clean up audio context
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
      this.analyser = null;
      this.gainNode = null;
      this.remoteSource = null;
    }

    // Remove remote audio element
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null;
      this.remoteAudio.remove();
      this.remoteAudio = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /**
   * Set up remote audio playback with AnalyserNode for speaking detection.
   * @param {MediaStream} remoteStream
   */
  _setupRemoteAudio(remoteStream) {
    // Set stream on the audio element for playback
    this.remoteAudio.srcObject = remoteStream;
    this.remoteAudio.volume = this._volume;

    // Create AudioContext for speaking detection
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.remoteSource = this.audioContext.createMediaStreamSource(remoteStream);

      // Analyser for speaking detection
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.5;

      // Gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this._volume;

      // Connect: source -> analyser (for detection only, audio plays via <audio> element)
      this.remoteSource.connect(this.analyser);

      // Start speaking detection polling
      this._startSpeakingDetection();
    } catch (err) {
      console.warn('VoiceChat: AudioContext setup failed (speaking detection disabled):', err);
    }
  }

  /**
   * Poll the analyser to detect when the remote peer is speaking.
   */
  _startSpeakingDetection() {
    if (this._speakingCheckInterval) clearInterval(this._speakingCheckInterval);

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this._speakingCheckInterval = setInterval(() => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Calculate RMS of frequency data
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);

      this._speaking = rms > this._speakingThreshold;
    }, 100); // Check 10 times per second
  }
}
