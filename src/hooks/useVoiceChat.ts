import { useCallback, useEffect, useRef, useState } from 'react';

export interface VoicePeer {
  peerId: string;
  name: string;
  speaking: boolean;
}

interface UseVoiceChatProps {
  sendWs: (type: string, payload?: Record<string, unknown>) => void;
  playerId: string | null;
}

export function useVoiceChat({ sendWs, playerId }: UseVoiceChatProps) {
  const [joinedRoomId, setJoinedRoomId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [peers, setPeers] = useState<VoicePeer[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const analyserIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);
  const lastSpeakingSentRef = useRef(false);

  mutedRef.current = muted;

  const cleanupPeer = useCallback((peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    const audioEl = audioElsRef.current.get(peerId);
    if (audioEl) {
      audioEl.srcObject = null;
      audioEl.remove();
      audioElsRef.current.delete(peerId);
    }
    setPeers((prev) => prev.filter((p) => p.peerId !== peerId));
  }, []);

  const leaveVoice = useCallback(() => {
    if (joinedRoomId) {
      sendWs('rtc:leave', { roomId: joinedRoomId });
    }
    setJoinedRoomId(null);
    setLocalSpeaking(false);
    setMicLevel(0);
    if (analyserIntervalRef.current) {
      window.clearInterval(analyserIntervalRef.current);
      analyserIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    for (const peerId of Array.from(peerConnectionsRef.current.keys())) {
      cleanupPeer(peerId);
    }
    setPeers([]);
  }, [cleanupPeer, joinedRoomId, sendWs]);

  const createPeerConnection = useCallback(
    (peerId: string, initiator: boolean) => {
      if (peerConnectionsRef.current.has(peerId)) {
        return peerConnectionsRef.current.get(peerId)!;
      }
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionsRef.current.set(peerId, pc);

      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          pc.addTrack(track, localStreamRef.current);
        }
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendWs('rtc:signal', { targetPeerId: peerId, signal: { candidate: e.candidate } });
        }
      };

      pc.ontrack = (e) => {
        let audio = audioElsRef.current.get(peerId);
        if (!audio) {
          audio = document.createElement('audio');
          audio.autoplay = true;
          audioElsRef.current.set(peerId, audio);
        }
        audio.srcObject = e.streams[0] || new MediaStream([e.track]);
      };

      if (initiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer).then(() => offer))
          .then((offer) => {
            sendWs('rtc:signal', { targetPeerId: peerId, signal: { sdp: offer } });
          })
          .catch(() => {});
      }

      return pc;
    },
    [sendWs],
  );

  const joinVoice = useCallback(
    async (roomId: string) => {
      setErrorMsg(null);
      if (joinedRoomId === roomId) return;
      if (joinedRoomId) leaveVoice();

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Microphone API unavailable in this browser');
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        stream.getAudioTracks().forEach((t) => {
          t.enabled = !mutedRef.current;
        });

        // Monitor local speaking level
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          src.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);

          analyserIntervalRef.current = window.setInterval(() => {
            if (mutedRef.current) {
              setMicLevel(0);
              setLocalSpeaking(false);
              if (lastSpeakingSentRef.current) {
                lastSpeakingSentRef.current = false;
                sendWs('rtc:speaking', { speaking: false });
              }
              return;
            }
            analyser.getByteFrequencyData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i];
            const avg = sum / data.length;
            const norm = Math.min(100, Math.round((avg / 64) * 100));
            setMicLevel(norm);
            const speaking = avg > 14;
            setLocalSpeaking(speaking);
            if (speaking !== lastSpeakingSentRef.current) {
              lastSpeakingSentRef.current = speaking;
              sendWs('rtc:speaking', { speaking });
            }
          }, 140);
        }

        setJoinedRoomId(roomId);
        sendWs('rtc:join', { roomId });
      } catch (err) {
        // Still allow joining voice signaling channel as listen-only if mic denied
        setErrorMsg(err instanceof Error ? err.message : 'Microphone access unavailable (listen-only mode)');
        setJoinedRoomId(roomId);
        sendWs('rtc:join', { roomId });
      }
    },
    [joinedRoomId, leaveVoice, sendWs],
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  const handleVoiceWsMessage = useCallback(
    async (type: string, payload: Record<string, unknown>) => {
      if (type === 'rtc:peers') {
        const list = (payload.peers as Array<{ peerId: string; name: string }>) || [];
        setPeers(list.map((p) => ({ peerId: p.peerId, name: p.name, speaking: false })));
        for (const p of list) {
          createPeerConnection(p.peerId, true);
        }
      } else if (type === 'rtc:peer-joined') {
        const peerId = String(payload.peerId || '');
        const name = String(payload.name || 'Guildmate');
        if (!peerId || peerId === playerId) return;
        setPeers((prev) => (prev.some((p) => p.peerId === peerId) ? prev : [...prev, { peerId, name, speaking: false }]));
        createPeerConnection(peerId, false);
      } else if (type === 'rtc:peer-left') {
        const peerId = String(payload.peerId || '');
        if (peerId) cleanupPeer(peerId);
      } else if (type === 'rtc:speaking') {
        const peerId = String(payload.peerId || '');
        const speaking = Boolean(payload.speaking);
        setPeers((prev) => prev.map((p) => (p.peerId === peerId ? { ...p, speaking } : p)));
      } else if (type === 'rtc:signal') {
        const fromPeerId = String(payload.fromPeerId || '');
        const signal = payload.signal as { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
        if (!fromPeerId || !signal) return;
        const pc = createPeerConnection(fromPeerId, false);
        try {
          if (signal.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            if (signal.sdp.type === 'offer') {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendWs('rtc:signal', { targetPeerId: fromPeerId, signal: { sdp: answer } });
            }
          } else if (signal.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        } catch {
          // Ignore transient WebRTC negotiation races
        }
      }
    },
    [cleanupPeer, createPeerConnection, playerId, sendWs],
  );

  useEffect(() => {
    return () => {
      leaveVoice();
    };
  }, [leaveVoice]);

  return {
    joinedRoomId,
    muted,
    micLevel,
    localSpeaking,
    peers,
    errorMsg,
    joinVoice,
    leaveVoice,
    toggleMute,
    handleVoiceWsMessage,
  };
}
