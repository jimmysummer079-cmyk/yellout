import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, Mic, Flame, Volume2, Sparkles, Flag, Loader2 } from 'lucide-react';
import type { ReactionType, VentPostDto, VoiceReplyDto } from '@yellout/shared';
import { DSPVoicePlayer, VoiceRecorder } from '../utils/audioDsp';
import { haptic } from '../utils/haptics';
import {
  createReply,
  fetchAudioBlob,
  fetchVents,
  reportVent,
  toggleReaction,
} from '../lib/api';

interface PlazaPageProps {
  codename: string;
  onOpenCrisis: (forced?: boolean) => void;
}

export function PlazaPage({ codename, onOpenCrisis }: PlazaPageProps) {
  const [posts, setPosts] = useState<VentPostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('全部');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replySeconds, setReplySeconds] = useState(0);

  const playerRef = useRef<DSPVoicePlayer | null>(null);
  const replyRecorderRef = useRef<VoiceRecorder | null>(null);
  const replyTimerRef = useRef<number | null>(null);
  const replyStartRef = useRef(0);
  const audioCache = useRef<Map<string, Blob>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchVents();
      setPosts(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    playerRef.current = new DSPVoicePlayer();
    replyRecorderRef.current = new VoiceRecorder();
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => {
      window.clearInterval(id);
      playerRef.current?.stop();
      replyRecorderRef.current?.cancel();
      if (replyTimerRef.current) window.clearInterval(replyTimerRef.current);
    };
  }, [load]);

  const tags = ['全部', ...Array.from(new Set(posts.map((p) => p.targetTag)))];
  const filtered = filter === '全部' ? posts : posts.filter((p) => p.targetTag === filter);

  const getBlob = async (url: string) => {
    const cached = audioCache.current.get(url);
    if (cached) return cached;
    const blob = await fetchAudioBlob(url);
    audioCache.current.set(url, blob);
    return blob;
  };

  const handlePlay = async (post: VentPostDto, reply?: VoiceReplyDto) => {
    const playId = reply ? `reply-${reply.id}` : post.id;
    const effect = reply ? reply.voiceEffect : post.voiceEffect;
    const duration = reply ? reply.duration : post.duration;
    const url = reply ? reply.audioUrl : post.audioUrl;

    if (playingId === playId) {
      playerRef.current?.stop();
      setPlayingId(null);
      setProgress(0);
      return;
    }

    haptic.triggerPress();
    setPlayingId(playId);
    setProgress(0);
    try {
      const blob = await getBlob(url);
      await playerRef.current?.play(
        blob,
        duration,
        effect,
        (p) => setProgress(p),
        () => {
          setPlayingId(null);
          setProgress(0);
        }
      );
    } catch {
      await playerRef.current?.play(null, duration, effect, (p) => setProgress(p), () => {
        setPlayingId(null);
        setProgress(0);
      });
    }
  };

  const handleReaction = async (post: VentPostDto, type: ReactionType) => {
    haptic.triggerEmpathy();
    try {
      const res = await toggleReaction(post.id, type);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, reactions: res.reactions, userReactions: res.userReactions }
            : p
        )
      );
    } catch {
      // ignore transient errors
    }
  };

  const startReply = async (e: React.TouchEvent | React.MouseEvent, postId: string) => {
    e.preventDefault();
    if (replyingId) return;
    haptic.triggerPress();
    setReplyingId(postId);
    setReplySeconds(0);
    replyStartRef.current = Date.now();
    replyTimerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - replyStartRef.current) / 1000);
      setReplySeconds(elapsed);
      if (elapsed >= 10) void stopReply(postId);
    }, 250);
    await replyRecorderRef.current?.start();
  };

  const stopReply = async (postId: string) => {
    if (!replyingId) return;
    if (replyTimerRef.current) {
      window.clearInterval(replyTimerRef.current);
      replyTimerRef.current = null;
    }
    const duration = Math.max(1, Math.floor((Date.now() - replyStartRef.current) / 1000));
    setReplyingId(null);
    if (duration < 1) {
      replyRecorderRef.current?.cancel();
      return;
    }
    haptic.triggerRelease();
    const result = await replyRecorderRef.current!.stop();
    const blob = result.blob || new Blob([new Uint8Array([0])], { type: 'audio/webm' });
    try {
      const reply = await createReply({
        ventId: postId,
        audio: blob,
        duration: Math.min(10, duration),
        voiceEffect: 'deep',
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, voiceReplies: [...p.voiceReplies, reply] } : p
        )
      );
    } catch (err) {
      console.warn(err);
    }
  };

  const formatTimeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    return `${Math.floor(diff / 3600)}小时前`;
  };

  const formatRemaining = (iso: string) => {
    const hours = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 3600000));
    return `${hours}小时后焚毁`;
  };

  return (
    <div className="px-4 py-3 w-full">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => {
              haptic.triggerTick();
              setFilter(tag);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filter === tag
                ? 'bg-amber/20 text-amber border border-amber/40'
                : 'bg-void/60 text-mist border border-void-border hover:text-snow'
            }`}
          >
            {tag === '全部' ? '全部同温层' : `#${tag}`}
          </button>
        ))}
      </div>

      <div className="bg-void/50 border border-void-border/80 rounded-xl p-3 mb-4 flex items-center justify-between text-xs text-mist gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-amber shrink-0" />
          <span className="truncate">你并不孤单 · 每一个声音都经过深度脱敏</span>
        </div>
        <span className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0">
          <Flame className="w-3 h-3 text-orange-400" />
          48H 清空
        </span>
      </div>

      {loading && posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-mist gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-amber" />
          <p className="text-sm">正在汇集同温层回声…</p>
        </div>
      )}

      {error && (
        <div className="text-center py-10 space-y-3">
          <p className="text-sm text-rose-300">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="px-4 py-2 rounded-xl bg-void border border-void-border text-xs hover:border-amber/40"
          >
            重新加载
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-mist">
          <WavesEmpty />
          <p className="text-sm mt-3">同温层此刻很安静</p>
          <p className="text-xs mt-1 text-slate-500">去首页成为第一个释放负荷的人</p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((post) => {
          const playing = playingId === post.id;
          const replying = replyingId === post.id;
          return (
            <article
              key={post.id}
              className="border border-void-border/80 hover:border-slate-600/80 rounded-2xl p-4 bg-void/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-2.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber/10 border border-amber/30 text-amber font-semibold text-xs">
                    #{post.targetTag}
                  </span>
                  <span className="text-xs font-mono text-mist truncate">{post.codename}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-mist shrink-0">
                  <span>{formatTimeAgo(post.createdAt)}</span>
                  <span className="flex items-center gap-0.5 text-orange-400/90">
                    <Flame className="w-3 h-3" />
                    {formatRemaining(post.expiresAt)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handlePlay(post)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                  playing
                    ? 'bg-amber/10 border border-amber/40'
                    : 'bg-obsidian/50 border border-void-border hover:bg-void/80'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    playing ? 'bg-amber text-obsidian' : 'bg-void-border text-snow'
                  }`}
                >
                  {playing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </div>
                <div className="flex-1 flex items-center gap-1 h-8">
                  {post.waveformData.map((val, idx) => {
                    const played = playing && progress >= idx / post.waveformData.length;
                    return (
                      <div
                        key={idx}
                        className={`flex-1 rounded-full ${
                          played ? 'bg-amber' : playing ? 'bg-amber/40' : 'bg-slate-600'
                        }`}
                        style={{ height: `${Math.max(4, val * 26)}px` }}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-col items-end shrink-0 pl-1">
                  <span className="text-xs font-mono font-bold text-snow/80">{post.duration}"</span>
                  <span className="text-[10px] text-mist">
                    {post.voiceEffect === 'deep' ? '厚重' : post.voiceEffect === 'robotic' ? '机械' : '空灵'}
                  </span>
                </div>
              </button>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-void-border/80 gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(
                    [
                      { type: 'shoulder_tap' as const, label: '拍拍肩', active: post.userReactions.shoulderTap },
                      { type: 'hugs' as const, label: '抱抱', active: post.userReactions.hugs },
                      { type: 'understands' as const, label: '懂你', active: post.userReactions.understands },
                      { type: 'resonates' as const, label: '同感', active: post.userReactions.resonates },
                    ] as const
                  ).map((r) => (
                    <button
                      key={r.type}
                      type="button"
                      onClick={() => void handleReaction(post, r.type)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        r.active
                          ? 'bg-amber/20 text-amber border-amber/40'
                          : 'bg-void/50 text-mist border-transparent hover:text-snow hover:bg-void'
                      }`}
                    >
                      {r.active && r.type === 'shoulder_tap' ? '已拍了拍' : r.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onMouseDown={(e) => void startReply(e, post.id)}
                    onMouseUp={() => void stopReply(post.id)}
                    onMouseLeave={() => {
                      if (replying) void stopReply(post.id);
                    }}
                    onTouchStart={(e) => void startReply(e, post.id)}
                    onTouchEnd={() => void stopReply(post.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium select-none ${
                      replying
                        ? 'bg-amber text-obsidian font-bold animate-pulse'
                        : 'bg-void/70 text-mist border border-void-border hover:text-snow'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    {replying ? `松开发送 (${replySeconds}s)` : '长按微慰'}
                  </button>
                  <button
                    type="button"
                    title="举报"
                    onClick={async () => {
                      haptic.triggerTick();
                      try {
                        await reportVent(post.id, 'abuse');
                        alert('已收到举报，我们会尽快审核。');
                      } catch {
                        alert('举报失败，请稍后重试');
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-void"
                    aria-label="举报这条倾诉"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {post.crisisFlag && (
                <button
                  type="button"
                  onClick={() => onOpenCrisis(true)}
                  className="mt-3 w-full text-left text-[11px] text-amber bg-amber/10 border border-amber/30 rounded-lg px-3 py-2"
                >
                  这条倾诉触发了守护提示 · 点击查看援助热线
                </button>
              )}

              {post.voiceReplies.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-void-border/50 space-y-1.5">
                  <div className="text-[11px] text-mist flex items-center gap-1 mb-1">
                    <Volume2 className="w-3 h-3 text-amber/80" />
                    同温层回声 ({post.voiceReplies.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.voiceReplies.map((reply) => {
                      const id = `reply-${reply.id}`;
                      const isPlaying = playingId === id;
                      return (
                        <button
                          key={reply.id}
                          type="button"
                          onClick={() => void handlePlay(post, reply)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border ${
                            isPlaying
                              ? 'bg-amber/20 text-amber border-amber/40'
                              : 'bg-void/60 text-mist border-void-border hover:text-snow'
                          }`}
                        >
                          {isPlaying ? (
                            <Pause className="w-3 h-3 fill-current" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                          <span className="font-mono text-[11px]">{reply.codename}</span>
                          <span className="text-[10px] font-mono">{reply.duration}"</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <p className="sr-only">当前代号 {codename}</p>
    </div>
  );
}

function WavesEmpty() {
  return (
    <div className="mx-auto w-16 h-16 rounded-full border border-void-border flex items-center justify-center text-amber/70">
      <Flame className="w-7 h-7 opacity-60" />
    </div>
  );
}
