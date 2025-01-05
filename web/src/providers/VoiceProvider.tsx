"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  useRef,
} from "react";
import { Opcodes } from "@repo/api";
import { useSocket } from "@web/providers/SocketProvider";
import { authClient } from "@web/utils/authClient";

type VoiceContextType = {
  joinVoiceChannel: (channelId: string) => Promise<void>;
  leaveVoiceChannel: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  isMuted: boolean;
  isDeafened: boolean;
  currentChannelId: string | null;
  connectedUsers: string[];
  speakingUsers: Set<string>;
  isSpeaking: boolean;
  isVideoEnabled: boolean;
  toggleVideo: () => void;
  leaveCall: () => void;
  incomingCall: {
    caller: any;
    channelId: string;
  } | null;
  acceptCall: () => void;
  declineCall: () => void;
};

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }
  return context;
};

type PeerConnection = {
  connection: RTCPeerConnection;
  stream: MediaStream;
  speaking: boolean;
  audioContext: AudioContext;
  analyzer: AnalyserNode;
};

export const VoiceProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { sendMessage, onMessage } = useSocket();
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

  const peerConnections = useRef<Map<string, PeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const localAudioContextRef = useRef<AudioContext | null>(null);
  const localAnalyzerRef = useRef<AnalyserNode | null>(null);
  const iceServersRef = useRef<RTCIceServer[]>([
    { urls: "stun:stun.l.google.com:19302" },
    // Add your TURN servers here
  ]);

  const SPEAKING_THRESHOLD = -45; // dB
  const SPEAKING_DETECTION_INTERVAL = 100; // ms

  const session = authClient.useSession();

  const detectSpeaking = useCallback((audioData: Uint8Array): boolean => {
    // Convert audio data to dB
    const average =
      audioData.reduce((sum, value) => sum + value, 0) / audioData.length;
    const db = 20 * Math.log10(average / 255);
    return db > SPEAKING_THRESHOLD;
  }, []);

  const setupVoiceDetection = useCallback(
    (stream: MediaStream, userId?: string) => {
      const audioContext = new AudioContext();
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 512;
      analyzer.smoothingTimeConstant = 0.1;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyzer);

      const audioData = new Uint8Array(analyzer.frequencyBinCount);

      const checkAudioLevel = () => {
        if (!analyzer) return;

        analyzer.getByteFrequencyData(audioData);
        const speaking = detectSpeaking(audioData);

        if (userId) {
          // Remote user speaking detection
          const peer = peerConnections.current.get(userId);
          if (peer && peer.speaking !== speaking) {
            peer.speaking = speaking;
            setSpeakingUsers((prev) => {
              const next = new Set(prev);
              if (speaking) {
                next.add(userId);
              } else {
                next.delete(userId);
              }
              return next;
            });
          }
        } else {
          // Local user speaking detection
          setIsSpeaking(speaking);
          if (currentChannelId && speaking !== isSpeaking) {
            sendMessage({
              op: Opcodes.VoiceStateUpdate,
              d: {
                channel_id: currentChannelId,
                self_mute: isMuted,
                self_deaf: isDeafened,
                speaking: speaking,
              },
            });
          }
        }
      };

      const interval = setInterval(
        checkAudioLevel,
        SPEAKING_DETECTION_INTERVAL
      );

      return {
        audioContext,
        analyzer,
        cleanup: () => {
          clearInterval(interval);
          source.disconnect();
          analyzer.disconnect();
          audioContext.close();
        },
      };
    },
    [
      currentChannelId,
      detectSpeaking,
      isMuted,
      isDeafened,
      isSpeaking,
      sendMessage,
    ]
  );

  const createPeerConnection = useCallback(
    async (targetUserId: string) => {
      if (!localStreamRef.current) return;

      const peerConnection = new RTCPeerConnection({
        iceServers: iceServersRef.current,
      });

      localStreamRef.current.getTracks().forEach((track) => {
        if (localStreamRef.current) {
          peerConnection.addTrack(track, localStreamRef.current);
        }
      });

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && currentChannelId) {
          sendMessage({
            op: Opcodes.VoiceSignal,
            d: {
              channel_id: currentChannelId,
              to_user: targetUserId,
              signal: {
                type: "ice_candidate",
                candidate: event.candidate,
              },
            },
          });
        }
      };

      peerConnection.ontrack = (event) => {
        const remoteStream = new MediaStream();
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });

        const { audioContext, analyzer, cleanup } = setupVoiceDetection(
          remoteStream,
          targetUserId
        );

        peerConnections.current.set(targetUserId, {
          connection: peerConnection,
          stream: remoteStream,
          audioContext,
          analyzer,
          speaking: false,
        });
      };

      return peerConnection;
    },
    [currentChannelId, sendMessage, setupVoiceDetection]
  );

  const joinVoiceChannel = useCallback(
    async (channelId: string) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        localStreamRef.current = stream;

        const { audioContext, analyzer, cleanup } = setupVoiceDetection(stream);
        localAudioContextRef.current = audioContext;
        localAnalyzerRef.current = analyzer;

        sendMessage({
          op: Opcodes.VoiceStateUpdate,
          d: {
            channel_id: channelId,
            self_mute: isMuted,
            self_deaf: isDeafened,
          },
        });

        setCurrentChannelId(channelId);
      } catch (error) {
        console.error("Error joining voice channel:", error);
        throw error;
      }
    },
    [sendMessage, isMuted, isDeafened, setupVoiceDetection]
  );

  const leaveVoiceChannel = useCallback(() => {
    if (currentChannelId) {
      if (localAudioContextRef.current) {
        localAudioContextRef.current.close();
        localAudioContextRef.current = null;
        localAnalyzerRef.current = null;
      }

      peerConnections.current.forEach((peer) => {
        peer.connection.close();
        peer.stream.getTracks().forEach((track) => track.stop());
        if (peer.audioContext) {
          peer.audioContext.close();
        }
      });
      peerConnections.current.clear();

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      sendMessage({
        op: Opcodes.VoiceStateUpdate,
        d: {
          channel_id: null,
          self_mute: false,
          self_deaf: false,
        },
      });

      setCurrentChannelId(null);
      setConnectedUsers([]);
      setIsSpeaking(false);
      setSpeakingUsers(new Set());
    }
  }, [currentChannelId, sendMessage]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const newMuteState = !isMuted;
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !newMuteState;
      });
      setIsMuted(newMuteState);

      if (currentChannelId) {
        sendMessage({
          op: Opcodes.VoiceStateUpdate,
          d: {
            channel_id: currentChannelId,
            self_mute: newMuteState,
            self_deaf: isDeafened,
          },
        });
      }
    }
  }, [currentChannelId, isMuted, isDeafened, sendMessage]);

  const toggleDeafen = useCallback(() => {
    const newDeafenState = !isDeafened;
    setIsDeafened(newDeafenState);

    peerConnections.current.forEach((peer) => {
      peer.stream.getAudioTracks().forEach((track) => {
        track.enabled = !newDeafenState;
      });
    });

    if (currentChannelId) {
      sendMessage({
        op: Opcodes.VoiceStateUpdate,
        d: {
          channel_id: currentChannelId,
          self_mute: isMuted,
          self_deaf: newDeafenState,
        },
      });
    }
  }, [currentChannelId, isMuted, isDeafened, sendMessage]);

  useEffect(() => {
    const unsubscribe = onMessage("voice_signal", async (data) => {
      if (!currentChannelId || !localStreamRef.current) return;

      const { from_user, to_user, signal } = data;
      if (to_user !== session?.data?.user?.id) return;

      let peerConnection = peerConnections.current.get(from_user)?.connection;

      switch (signal.type) {
        case "offer":
          if (!peerConnection) {
            peerConnection = await createPeerConnection(from_user);
            if (!peerConnection) return;
          }
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(signal)
          );
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);

          sendMessage({
            op: Opcodes.VoiceSignal,
            d: {
              channel_id: currentChannelId,
              to_user: from_user,
              signal: answer,
            },
          });
          break;

        case "answer":
          if (peerConnection) {
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(signal)
            );
          }
          break;

        case "ice_candidate":
          if (peerConnection) {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(signal.candidate)
            );
          }
          break;
      }
    });

    return () => unsubscribe();
  }, [
    currentChannelId,
    session?.data?.user?.id,
    createPeerConnection,
    sendMessage,
    onMessage,
  ]);

  useEffect(() => {
    const unsubscribe = onMessage("voice_state_updated", (data) => {
      const { user_id, channel_id, self_mute, self_deaf } = data;

      if (
        channel_id === currentChannelId &&
        !connectedUsers.includes(user_id)
      ) {
        setConnectedUsers((users) => [...users, user_id]);
        if (localStreamRef.current) {
          createPeerConnection(user_id).then(async (peerConnection) => {
            if (!peerConnection) return;
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            sendMessage({
              op: Opcodes.VoiceSignal,
              d: {
                channel_id: currentChannelId,
                to_user: user_id,
                signal: offer,
              },
            });
          });
        }
      } else if (!channel_id && connectedUsers.includes(user_id)) {
        setConnectedUsers((users) => users.filter((u) => u !== user_id));
        const peer = peerConnections.current.get(user_id);
        if (peer) {
          peer.connection.close();
          peer.stream.getTracks().forEach((track) => track.stop());
          if (peer.audioContext) {
            peer.audioContext.close();
          }
          peerConnections.current.delete(user_id);
        }
      }
    });

    return () => unsubscribe();
  }, [
    currentChannelId,
    connectedUsers,
    createPeerConnection,
    sendMessage,
    onMessage,
  ]);

  useEffect(() => {
    return () => {
      if (currentChannelId) {
        leaveVoiceChannel();
      }
    };
  }, [currentChannelId, leaveVoiceChannel]);

  const value = {
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    toggleDeafen,
    isMuted,
    isDeafened,
    currentChannelId,
    connectedUsers,
    speakingUsers,
    isSpeaking,
    isVideoEnabled: false,
    toggleVideo: () => {},
    leaveCall: () => {},
    incomingCall: null,
    acceptCall: () => {},
    declineCall: () => {},
  };

  return (
    <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
  );
};
