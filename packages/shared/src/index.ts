/** Shared YellOut domain types & API contracts (web + future mobile). */

export type VoiceEffect = 'deep' | 'robotic' | 'ethereal';

export type ReactionType = 'hugs' | 'understands' | 'resonates' | 'shoulder_tap';

export type ReportReason =
  | 'abuse'
  | 'spam'
  | 'crisis_concern'
  | 'other';

export interface AnonymousSession {
  id: string;
  token: string;
  codename: string;
  createdAt: string;
}

export interface VoiceReplyDto {
  id: string;
  ventId: string;
  codename: string;
  duration: number;
  voiceEffect: VoiceEffect;
  createdAt: string;
  audioUrl: string;
}

export interface VentReactions {
  hugs: number;
  understands: number;
  resonates: number;
  shoulderTaps: number;
}

export interface UserReactions {
  hugs: boolean;
  understands: boolean;
  resonates: boolean;
  shoulderTap: boolean;
}

export interface VentPostDto {
  id: string;
  codename: string;
  targetTag: string;
  duration: number;
  voiceEffect: VoiceEffect;
  waveformData: number[];
  createdAt: string;
  expiresAt: string;
  audioUrl: string;
  reactions: VentReactions;
  userReactions: UserReactions;
  voiceReplies: VoiceReplyDto[];
  crisisFlag?: boolean;
}

export interface CreateVentMeta {
  targetTag: string;
  duration: number;
  voiceEffect: VoiceEffect;
  waveformData: number[];
}

export interface CreateReplyMeta {
  duration: number;
  voiceEffect: VoiceEffect;
}

export interface ReactionToggleRequest {
  type: ReactionType;
}

export interface ReactionToggleResponse {
  ventId: string;
  reactions: VentReactions;
  userReactions: UserReactions;
}

export interface ReportRequest {
  reason: ReportReason;
  detail?: string;
}

export interface ReportResponse {
  id: string;
  status: 'received';
}

export interface PaginatedVents {
  items: VentPostDto[];
  nextCursor: string | null;
}

export interface HealthResponse {
  status: 'ok';
  version: string;
  uptimeSec: number;
  moderation: 'stub' | 'gemini';
}

export interface ApiErrorBody {
  error: string;
  code?: string;
  details?: unknown;
}

/** Default post lifetime before auto-delete (48h). */
export const VENT_TTL_MS = 48 * 60 * 60 * 1000;

export const MAX_VENT_DURATION_SEC = 60;
export const MAX_REPLY_DURATION_SEC = 10;
export const MAX_TARGET_TAG_LEN = 4;
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

export const DEFAULT_TARGET_TAGS = [
  '领导',
  '伴侣',
  '客户',
  '生活',
  '匿名',
] as const;

export const CODENAME_PREFIXES = [
  '松柏',
  '风霜',
  '沉石',
  '寒梅',
  '远山',
  '苍竹',
  '暮雨',
  '潜渊',
  '微芒',
  '独木',
  '晚枫',
  '孤舟',
  '青岩',
  '厚土',
  '静水',
  '荒原',
  '秋叶',
  '溯溪',
  '夜澜',
  '守望',
  '残阳',
  '晨曦',
  '破晓',
  '止水',
] as const;

export function generateCodename(random = Math.random): string {
  const prefix =
    CODENAME_PREFIXES[Math.floor(random() * CODENAME_PREFIXES.length)]!;
  const num = Math.floor(random() * 900) + 100;
  return `${prefix} ${num}`;
}
