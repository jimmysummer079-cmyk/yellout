export type VoiceEffect = 'deep' | 'robotic' | 'ethereal';

export interface VoiceReply {
  id: string;
  codename: string;
  duration: number; // in seconds
  createdAt: number;
  audioBlobUrl?: string;
  voiceEffect: VoiceEffect;
}

export interface VentPost {
  id: string;
  codename: string; // e.g. "松柏 001"
  targetTag: string; // 领导, 伴侣, 客户, 生活, 匿名 or custom tag
  duration: number; // in seconds (max 60)
  createdAt: number; // timestamp
  expiresAt: number; // 24 hours later
  voiceEffect: VoiceEffect;
  waveformData: number[]; // relative wave bar heights 0-1
  audioBlobUrl?: string; // object URL or generated tone synthesizer
  reactions: {
    hugs: number;
    understands: number;
    resonates: number;
  };
  userReactions: {
    hugs: boolean;
    understands: boolean;
    resonates: boolean;
  };
  shoulderTaps?: number;
  userTappedShoulder?: boolean;
  voiceReplies: VoiceReply[];
  // Abstract emotional mood hint for preview without revealing text
  moodWhisper?: string;
}

export interface TargetOption {
  id: string;
  name: string;
  isCustom?: boolean;
}
