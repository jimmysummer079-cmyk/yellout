import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, Clock, ShieldCheck, Flame, Volume2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VentPost, VoiceReply, VoiceEffect } from '../types';
import { DSPVoicePlayer, VoiceRecorder } from '../utils/audioDsp';
import { haptic } from '../utils/haptics';
import { generateCodename } from '../utils/codenames';

interface PlazaScreenProps {
  posts: VentPost[];
  onUpdatePost: (updatedPost: VentPost) => void;
  currentCodename: string;
}

export const PlazaScreen: React.FC<PlazaScreenProps> = ({
  posts,
  onUpdatePost,
  currentCodename,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('全部');
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);

  // 10秒短语音评论录制状态
  const [recordingReplyPostId, setRecordingReplyPostId] = useState<string | null>(null);
  const [replySeconds, setReplySeconds] = useState<number>(0);
  const [replyVolume, setReplyVolume] = useState<number>(0.2);

  const playerRef = useRef<DSPVoicePlayer | null>(null);
  const replyRecorderRef = useRef<VoiceRecorder | null>(null);
  const replyTimerRef = useRef<number | null>(null);
  const replyStartTimeRef = useRef<number>(0);

  useEffect(() => {
    playerRef.current = new DSPVoicePlayer();
    replyRecorderRef.current = new VoiceRecorder();
    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
      }
      if (replyRecorderRef.current) {
        replyRecorderRef.current.cancel();
      }
      if (replyTimerRef.current) {
        window.clearInterval(replyTimerRef.current);
      }
    };
  }, []);

  // 收集所有标签
  const allTags = ['全部', ...Array.from(new Set(posts.map((p) => p.targetTag)))];

  const filteredPosts =
    selectedFilter === '全部'
      ? posts
      : posts.filter((p) => p.targetTag === selectedFilter);

  // 播放 / 暂停语音
  const handleTogglePlay = (post: VentPost, isReply?: VoiceReply) => {
    const playId = isReply ? `reply-${isReply.id}` : post.id;
    const effect = isReply ? isReply.voiceEffect : post.voiceEffect;
    const duration = isReply ? isReply.duration : post.duration;

    if (activePlayingId === playId) {
      if (playerRef.current) {
        playerRef.current.stop();
      }
      setActivePlayingId(null);
      setPlaybackProgress(0);
      return;
    }

    haptic.triggerPress();
    setActivePlayingId(playId);
    setPlaybackProgress(0);

    if (playerRef.current) {
      playerRef.current.play(
        null, // 采用 DSP 模拟人声，或有音频 blob
        duration,
        effect,
        (progress) => {
          setPlaybackProgress(progress);
        },
        () => {
          setActivePlayingId(null);
          setPlaybackProgress(0);
        }
      );
    }
  };

  // 快捷回应操作（抱抱、懂你、同感）
  // PRD 明确要求：“不设数字点赞量，仅展示互动氛围”
  const handleToggleReaction = (
    post: VentPost,
    type: 'hugs' | 'understands' | 'resonates'
  ) => {
    haptic.triggerEmpathy();
    const currentStatus = post.userReactions[type];
    const updatedPost: VentPost = {
      ...post,
      reactions: {
        ...post.reactions,
        [type]: currentStatus
          ? Math.max(0, post.reactions[type] - 1)
          : post.reactions[type] + 1,
      },
      userReactions: {
        ...post.userReactions,
        [type]: !currentStatus,
      },
    };
    onUpdatePost(updatedPost);
  };

  // 极简无声拍肩（中年人最沉稳的共鸣手势：两下沉厚心跳微震）
  const handleShoulderTap = (post: VentPost) => {
    haptic.triggerShoulderTap();
    const currentStatus = !!post.userTappedShoulder;
    const updatedPost: VentPost = {
      ...post,
      shoulderTaps: (post.shoulderTaps || 0) + (currentStatus ? -1 : 1),
      userTappedShoulder: !currentStatus,
    };
    onUpdatePost(updatedPost);
  };

  // 开始长按录制 10 秒短语音回应
  const handleStartReplyRecord = async (
    e: React.TouchEvent | React.MouseEvent,
    postId: string
  ) => {
    e.preventDefault();
    if (recordingReplyPostId) return;

    haptic.triggerPress();
    setRecordingReplyPostId(postId);
    setReplySeconds(0);
    replyStartTimeRef.current = Date.now();

    replyTimerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - replyStartTimeRef.current) / 1000);
      setReplySeconds(elapsed);
      if (elapsed >= 10) {
        handleStopReplyRecord(postId);
      }
    }, 250);

    if (replyRecorderRef.current) {
      await replyRecorderRef.current.start((vol) => {
        setReplyVolume(vol);
      });
    }
  };

  // 结束长按录制 10 秒短语音回应
  const handleStopReplyRecord = async (postId: string) => {
    if (!recordingReplyPostId) return;

    if (replyTimerRef.current) {
      window.clearInterval(replyTimerRef.current);
      replyTimerRef.current = null;
    }

    const duration = Math.max(1, Math.floor((Date.now() - replyStartTimeRef.current) / 1000));
    setRecordingReplyPostId(null);

    if (duration < 1) {
      if (replyRecorderRef.current) replyRecorderRef.current.cancel();
      return;
    }

    haptic.triggerRelease();

    if (replyRecorderRef.current) {
      await replyRecorderRef.current.stop();
      const targetPost = posts.find((p) => p.id === postId);
      if (!targetPost) return;

      const newReply: VoiceReply = {
        id: `reply-${Date.now()}`,
        codename: generateCodename(),
        duration: Math.min(10, duration),
        createdAt: Date.now(),
        voiceEffect: 'deep',
      };

      const updatedPost: VentPost = {
        ...targetPost,
        voiceReplies: [...targetPost.voiceReplies, newReply],
      };
      onUpdatePost(updatedPost);
    }
  };

  // 计算相对时间
  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    return `${Math.floor(diff / 3600)}小时前`;
  };

  // 计算剩余自毁时间（24小时倒计时）
  const formatRemainingHours = (expiresAt: number) => {
    const diffHours = Math.max(1, Math.floor((expiresAt - Date.now()) / (3600 * 1000)));
    return `${diffHours}小时后焚毁`;
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 max-w-md mx-auto w-full pb-20">
      {/* 顶部标签筛选 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
        {allTags.map((tag) => {
          const isSelected = selectedFilter === tag;
          return (
            <button
              key={tag}
              onClick={() => {
                haptic.triggerTick();
                setSelectedFilter(tag);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800/60 text-slate-400 border border-slate-700/40 hover:text-slate-200'
              }`}
            >
              {tag === '全部' ? '全部同温层' : `#${tag}`}
            </button>
          );
        })}
      </div>

      {/* 同温层提示语 */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 mb-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>你并不孤单 · 每一个声音都经过深度脱敏</span>
        </div>
        <span className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0">
          <Flame className="w-3 h-3 text-orange-400" />
          24H绝对清空
        </span>
      </div>

      {/* 瀑布流卡片列表 */}
      <div className="space-y-4">
        {filteredPosts.map((post) => {
          const isPlayingThis = activePlayingId === post.id;
          const isReplyingThis = recordingReplyPostId === post.id;

          return (
            <div
              key={post.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition-all shadow-lg relative overflow-hidden"
            >
              {/* 卡片顶部：严格禁止头像与昵称，仅显示脱敏代号、标签与时间 */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-xs">
                    #{post.targetTag}
                  </span>
                  <span className="text-xs font-mono font-medium text-slate-400">
                    {post.codename}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{formatTimeAgo(post.createdAt)}</span>
                  <span className="text-slate-700">·</span>
                  <span className="flex items-center gap-0.5 text-orange-400/90">
                    <Flame className="w-3 h-3" />
                    {formatRemainingHours(post.expiresAt)}
                  </span>
                </div>
              </div>

              {/* 心情引言摘要（抽象化氛围） */}
              {post.moodWhisper && (
                <p className="text-xs text-slate-400 italic mb-3 leading-relaxed">
                  {post.moodWhisper}
                </p>
              )}

              {/* 语音播放模块（波形图可视化 + 播放按键） */}
              <div
                onClick={() => handleTogglePlay(post)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  isPlayingThis
                    ? 'bg-amber-950/30 border border-amber-500/40 shadow-inner'
                    : 'bg-slate-800/70 border border-slate-700/50 hover:bg-slate-800'
                }`}
              >
                {/* 播放 / 暂停圆形按钮 */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isPlayingThis
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {isPlayingThis ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </div>

                {/* 动态波形条 */}
                <div className="flex-1 flex items-center gap-1 h-8 px-1">
                  {post.waveformData.map((val, idx) => {
                    const barProgress = idx / post.waveformData.length;
                    const isPlayed = isPlayingThis && playbackProgress >= barProgress;
                    return (
                      <div
                        key={idx}
                        className={`flex-1 rounded-full transition-all duration-100 ${
                          isPlayed
                            ? 'bg-amber-400'
                            : isPlayingThis
                            ? 'bg-amber-500/40'
                            : 'bg-slate-600'
                        }`}
                        style={{
                          height: `${Math.max(4, val * 26)}px`,
                        }}
                      />
                    );
                  })}
                </div>

                {/* 时长与变声音效徽章 */}
                <div className="flex flex-col items-end shrink-0 pl-1">
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {post.duration}"
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {post.voiceEffect === 'deep'
                      ? '厚重'
                      : post.voiceEffect === 'robotic'
                      ? '机械'
                      : '空灵'}
                  </span>
                </div>
              </div>

              {/* 快捷回应模块（PRD：提供“拍拍肩”、“抱抱”、“懂你”、“同感”等图形化按钮，不设数字点赞量，仅展示互动氛围） */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* 无声拍肩 */}
                  <button
                    onClick={() => handleShoulderTap(post)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      post.userTappedShoulder
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                        : 'bg-slate-800/70 text-slate-300 border border-slate-700/60 hover:text-amber-300 hover:bg-slate-800'
                    }`}
                    title="无声拍肩：无需言语，两下沉闷温厚心跳"
                  >
                    <span>🫱</span>
                    <span>{post.userTappedShoulder ? '已拍了拍' : '拍拍肩'}</span>
                  </button>

                  {/* 抱抱 */}
                  <button
                    onClick={() => handleToggleReaction(post, 'hugs')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      post.userReactions.hugs
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                    title="送出一个无言的拥抱"
                  >
                    <span className="text-sm">🤗</span>
                    <span>抱抱</span>
                    {post.userReactions.hugs && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    )}
                  </button>

                  {/* 懂你 */}
                  <button
                    onClick={() => handleToggleReaction(post, 'understands')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      post.userReactions.understands
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                        : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                    title="我懂得这种不易"
                  >
                    <span className="text-sm">🤝</span>
                    <span>懂你</span>
                    {post.userReactions.understands && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                    )}
                  </button>

                  {/* 同感 */}
                  <button
                    onClick={() => handleToggleReaction(post, 'resonates')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      post.userReactions.resonates
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                        : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                    title="我也经历着相同处境"
                  >
                    <span className="text-sm">🫂</span>
                    <span>同感</span>
                    {post.userReactions.resonates && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                    )}
                  </button>
                </div>

                {/* 语音微评论（严禁文本输入，仅限长按录制 ≤10s 语音） */}
                <button
                  onMouseDown={(e) => handleStartReplyRecord(e, post.id)}
                  onMouseUp={() => handleStopReplyRecord(post.id)}
                  onMouseLeave={() => {
                    if (isReplyingThis) handleStopReplyRecord(post.id);
                  }}
                  onTouchStart={(e) => handleStartReplyRecord(e, post.id)}
                  onTouchEnd={() => handleStopReplyRecord(post.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none cursor-pointer ${
                    isReplyingThis
                      ? 'bg-amber-600 text-slate-950 font-bold animate-pulse'
                      : 'bg-slate-800/70 hover:bg-slate-750 text-slate-300 border border-slate-700/50'
                  }`}
                  title="按住录制10秒内温暖短语音"
                >
                  <Mic className={`w-3.5 h-3.5 ${isReplyingThis ? 'text-slate-950' : 'text-amber-400'}`} />
                  <span>
                    {isReplyingThis ? `松开发送 (${replySeconds}s/10s)` : '长按微慰'}
                  </span>
                </button>
              </div>

              {/* 展示语音评论列表（无文本，纯纯净短语音气泡） */}
              {post.voiceReplies.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/50 space-y-1.5">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                    <Volume2 className="w-3 h-3 text-amber-400/80" />
                    <span>同温层回声 ({post.voiceReplies.length}条短语音慰藉)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.voiceReplies.map((reply) => {
                      const replyPlayId = `reply-${reply.id}`;
                      const isPlayingReply = activePlayingId === replyPlayId;
                      return (
                        <button
                          key={reply.id}
                          onClick={() => handleTogglePlay(post, reply)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border ${
                            isPlayingReply
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-800/60 text-slate-300 border-slate-700/40 hover:bg-slate-800'
                          }`}
                        >
                          {isPlayingReply ? (
                            <Pause className="w-3 h-3 fill-current text-amber-400" />
                          ) : (
                            <Play className="w-3 h-3 fill-current text-slate-400" />
                          )}
                          <span className="font-mono text-[11px]">{reply.codename}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {reply.duration}"
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredPosts.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm">该标签下暂无倾诉</p>
            <p className="text-xs mt-1 text-slate-400">去首页成为第一个释放负荷的人</p>
          </div>
        )}
      </div>
    </div>
  );
};
