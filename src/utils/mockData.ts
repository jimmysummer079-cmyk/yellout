import { VentPost } from '../types';

const NOW = Date.now();
const HOUR = 3600 * 1000;
const MINUTE = 60 * 1000;

export const INITIAL_POSTS: VentPost[] = [
  {
    id: 'post-1',
    codename: '松柏 082',
    targetTag: '领导',
    duration: 38,
    createdAt: NOW - 12 * MINUTE,
    expiresAt: NOW + 23 * HOUR + 48 * MINUTE,
    voiceEffect: 'deep',
    waveformData: [0.3, 0.45, 0.7, 0.9, 0.6, 0.8, 0.5, 0.85, 0.95, 0.75, 0.4, 0.35, 0.6, 0.8, 0.7, 0.9, 0.85, 0.6, 0.45, 0.3, 0.5, 0.65, 0.8, 0.4, 0.3, 0.2, 0.15],
    reactions: {
      hugs: 14,
      understands: 29,
      resonates: 38,
    },
    userReactions: {
      hugs: false,
      understands: true,
      resonates: false,
    },
    moodWhisper: '“快五十岁了，在周会上被比我小十五岁的主管当众数落半小时，只能低头记笔记...”',
    voiceReplies: [
      {
        id: 'reply-1-1',
        codename: '潜渊 109',
        duration: 7,
        createdAt: NOW - 5 * MINUTE,
        voiceEffect: 'deep',
      },
    ],
  },
  {
    id: 'post-2',
    codename: '沉石 014',
    targetTag: '伴侣',
    duration: 44,
    createdAt: NOW - 45 * MINUTE,
    expiresAt: NOW + 23 * HOUR + 15 * MINUTE,
    voiceEffect: 'ethereal',
    waveformData: [0.2, 0.3, 0.5, 0.6, 0.4, 0.35, 0.55, 0.7, 0.65, 0.8, 0.75, 0.5, 0.3, 0.4, 0.6, 0.85, 0.9, 0.7, 0.5, 0.4, 0.3, 0.25, 0.35, 0.2],
    reactions: {
      hugs: 32,
      understands: 41,
      resonates: 18,
    },
    userReactions: {
      hugs: false,
      understands: false,
      resonates: false,
    },
    moodWhisper: '“坐在车库里抽完一整支烟才敢上楼。推开门不是冷战就是查账，真的太窒息了...”',
    voiceReplies: [
      {
        id: 'reply-2-1',
        codename: '远山 312',
        duration: 9,
        createdAt: NOW - 20 * MINUTE,
        voiceEffect: 'ethereal',
      },
      {
        id: 'reply-2-2',
        codename: '晚枫 098',
        duration: 6,
        createdAt: NOW - 8 * MINUTE,
        voiceEffect: 'deep',
      },
    ],
  },
  {
    id: 'post-3',
    codename: '风霜 231',
    targetTag: '客户',
    duration: 26,
    createdAt: NOW - 2 * HOUR,
    expiresAt: NOW + 22 * HOUR,
    voiceEffect: 'robotic',
    waveformData: [0.4, 0.6, 0.8, 0.95, 0.7, 0.5, 0.8, 0.9, 0.85, 0.6, 0.4, 0.5, 0.7, 0.8, 0.65, 0.4, 0.3, 0.2],
    reactions: {
      hugs: 19,
      understands: 35,
      resonates: 44,
    },
    userReactions: {
      hugs: true,
      understands: false,
      resonates: true,
    },
    moodWhisper: '“第十次改版方案，凌晨一点在酒桌上被逼着连干三杯白的，胃疼得在马路牙子上蹲着...”',
    voiceReplies: [],
  },
  {
    id: 'post-4',
    codename: '寒梅 057',
    targetTag: '生活',
    duration: 52,
    createdAt: NOW - 4 * HOUR,
    expiresAt: NOW + 20 * HOUR,
    voiceEffect: 'deep',
    waveformData: [0.25, 0.35, 0.45, 0.6, 0.75, 0.9, 0.85, 0.7, 0.6, 0.5, 0.65, 0.8, 0.9, 0.85, 0.7, 0.6, 0.45, 0.55, 0.7, 0.8, 0.65, 0.4, 0.25],
    reactions: {
      hugs: 58,
      understands: 47,
      resonates: 53,
    },
    userReactions: {
      hugs: false,
      understands: false,
      resonates: false,
    },
    moodWhisper: '“老父亲的住院缴费单，孩子下学期的补习班，还有下周的房贷。不敢生病，也不敢停下来...”',
    voiceReplies: [
      {
        id: 'reply-4-1',
        codename: '守望 402',
        duration: 8,
        createdAt: NOW - 3 * HOUR,
        voiceEffect: 'deep',
      },
    ],
  },
  {
    id: 'post-5',
    codename: '独木 169',
    targetTag: '匿名',
    duration: 19,
    createdAt: NOW - 7 * HOUR,
    expiresAt: NOW + 17 * HOUR,
    voiceEffect: 'ethereal',
    waveformData: [0.3, 0.5, 0.7, 0.65, 0.8, 0.6, 0.45, 0.5, 0.65, 0.4, 0.3, 0.2],
    reactions: {
      hugs: 27,
      understands: 16,
      resonates: 22,
    },
    userReactions: {
      hugs: false,
      understands: false,
      resonates: false,
    },
    moodWhisper: '“所有人都在依赖我，所有人都在找我要答案，可我不知道该去问谁...”',
    voiceReplies: [],
  },
  {
    id: 'post-6',
    codename: '苍竹 318',
    targetTag: '房贷',
    duration: 33,
    createdAt: NOW - 11 * HOUR,
    expiresAt: NOW + 13 * HOUR,
    voiceEffect: 'deep',
    waveformData: [0.3, 0.4, 0.6, 0.75, 0.85, 0.7, 0.55, 0.7, 0.8, 0.9, 0.75, 0.6, 0.45, 0.3, 0.4, 0.6, 0.5, 0.3, 0.2],
    reactions: {
      hugs: 41,
      understands: 52,
      resonates: 64,
    },
    userReactions: {
      hugs: true,
      understands: true,
      resonates: true,
    },
    moodWhisper: '“看着存折余额一点点见底，今年年终奖泡汤了，下个月的本息还没着落...”',
    voiceReplies: [
      {
        id: 'reply-6-1',
        codename: '破晓 882',
        duration: 10,
        createdAt: NOW - 6 * HOUR,
        voiceEffect: 'deep',
      },
    ],
  },
];
