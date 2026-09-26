import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import { Haptics, impact, notify } from '@/lib/haptics';
import type { ReactionType, VentPostDto, VoiceReplyDto } from '@yellout/shared';
import {
  absoluteUrl,
  authorizedAudioHeaders,
  createReply,
  fetchVents,
  formatRemainingHours,
  formatTimeAgo,
  guessRecordingMime,
  reportVent,
  toggleReaction,
} from '@/lib/api';
import { useSession } from '@/hooks/SessionContext';
import { colors, radii, spacing } from '@/theme/tokens';

export default function PlazaScreen() {
  const { openCrisis } = useSession();
  const [posts, setPosts] = useState<VentPostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('全部');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replySeconds, setReplySeconds] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const replyRecRef = useRef<Audio.Recording | null>(null);
  const replyTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const replyStart = useRef(0);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchVents();
      setPosts(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => {
      clearInterval(id);
      void soundRef.current?.unloadAsync();
      if (replyTimer.current) clearInterval(replyTimer.current);
    };
  }, [load]);

  const tags = ['全部', ...Array.from(new Set(posts.map((p) => p.targetTag)))];
  const filtered = filter === '全部' ? posts : posts.filter((p) => p.targetTag === filter);

  const play = async (post: VentPostDto, reply?: VoiceReplyDto) => {
    const id = reply ? `reply-${reply.id}` : post.id;
    const url = absoluteUrl(reply ? reply.audioUrl : post.audioUrl);
    if (playingId === id) {
      await soundRef.current?.stopAsync();
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
      setPlayingId(null);
      return;
    }
    try {
      await soundRef.current?.unloadAsync();
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
      const headers = await authorizedAudioHeaders();
      const { sound } = await Audio.Sound.createAsync(
        { uri: url, headers },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlayingId(id);
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && st.didJustFinish) {
          setPlayingId(null);
        }
      });
      impact(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert('播放失败', '无法加载这段语音，请稍后重试');
    }
  };

  const react = async (post: VentPostDto, type: ReactionType) => {
    notify(Haptics.NotificationFeedbackType.Success);
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
      // ignore
    }
  };

  const startReply = async (postId: string) => {
    if (replyingId) return;
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('需要麦克风', '短语音慰藉需要麦克风权限');
      return;
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    replyRecRef.current = rec;
    setReplyingId(postId);
    setReplySeconds(0);
    replyStart.current = Date.now();
    replyTimer.current = setInterval(() => {
      const s = Math.floor((Date.now() - replyStart.current) / 1000);
      setReplySeconds(s);
      if (s >= 10) void stopReply(postId);
    }, 250);
    impact(Haptics.ImpactFeedbackStyle.Medium);
  };

  const stopReply = async (postId: string) => {
    if (!replyingId || !replyRecRef.current) return;
    if (replyTimer.current) {
      clearInterval(replyTimer.current);
      replyTimer.current = null;
    }
    const duration = Math.max(1, Math.floor((Date.now() - replyStart.current) / 1000));
    setReplyingId(null);
    try {
      await replyRecRef.current.stopAndUnloadAsync();
    } catch {
      // ignore
    }
    const uri = replyRecRef.current.getURI();
    replyRecRef.current = null;
    if (!uri || duration < 1) return;
    try {
      const { mimeType, fileName } = guessRecordingMime(uri);
      const reply = await createReply({
        ventId: postId,
        uri,
        mimeType,
        fileName: fileName.replace('vent', 'reply'),
        duration: Math.min(10, duration),
        voiceEffect: 'deep',
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, voiceReplies: [...p.voiceReplies, reply] } : p
        )
      );
    } catch (err) {
      Alert.alert('发送失败', err instanceof Error ? err.message : '请稍后重试');
    }
  };

  const renderItem = ({ item: post }: { item: VentPostDto }) => {
    const playing = playingId === post.id;
    const replying = replyingId === post.id;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.tagRow}>
            <Text style={styles.tag}>#{post.targetTag}</Text>
            <Text style={styles.mono}>{post.codename}</Text>
          </View>
          <Text style={styles.meta}>
            {formatTimeAgo(post.createdAt)} · {formatRemainingHours(post.expiresAt)}
          </Text>
        </View>

        <Pressable onPress={() => void play(post)} style={[styles.player, playing && styles.playerOn]}>
          <View style={[styles.playBtn, playing && styles.playBtnOn]}>
            <Text style={styles.playIcon}>{playing ? '❚❚' : '▶'}</Text>
          </View>
          <View style={styles.wave}>
            {post.waveformData.slice(0, 24).map((v, i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  { height: Math.max(4, v * 26) },
                  playing && { backgroundColor: colors.amber },
                ]}
              />
            ))}
          </View>
          <Text style={styles.dur}>{post.duration}"</Text>
        </Pressable>

        <View style={styles.actions}>
          {(
            [
              ['shoulder_tap', '拍拍肩', post.userReactions.shoulderTap],
              ['hugs', '抱抱', post.userReactions.hugs],
              ['understands', '懂你', post.userReactions.understands],
              ['resonates', '同感', post.userReactions.resonates],
            ] as const
          ).map(([type, label, active]) => (
            <Pressable
              key={type}
              onPress={() => void react(post, type)}
              style={[styles.reactBtn, active && styles.reactOn]}
            >
              <Text style={[styles.reactText, active && { color: colors.amber }]}>
                {type === 'shoulder_tap' && active ? '已拍了拍' : label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.replyRow}>
          <Pressable
            onPressIn={() => void startReply(post.id)}
            onPressOut={() => void stopReply(post.id)}
            style={[styles.replyBtn, replying && styles.replyBtnOn]}
          >
            <Text style={[styles.replyText, replying && { color: colors.obsidian }]}>
              {replying ? `松开发送 (${replySeconds}s)` : '长按微慰'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert('举报', '确认举报这条倾诉？', [
                { text: '取消', style: 'cancel' },
                {
                  text: '举报',
                  style: 'destructive',
                  onPress: () => {
                    void reportVent(post.id, 'abuse').then(() =>
                      Alert.alert('已收到', '我们会尽快审核')
                    );
                  },
                },
              ]);
            }}
            accessibilityLabel="举报"
          >
            <Text style={styles.flag}>⚑</Text>
          </Pressable>
        </View>

        {post.crisisFlag && (
          <Pressable onPress={() => openCrisis(true)} style={styles.crisisHint}>
            <Text style={styles.crisisText}>这条倾诉触发了守护提示 · 点击查看援助热线</Text>
          </Pressable>
        )}

        {post.voiceReplies.length > 0 && (
          <View style={styles.replies}>
            <Text style={styles.repliesLabel}>同温层回声 ({post.voiceReplies.length})</Text>
            <View style={styles.replyChips}>
              {post.voiceReplies.map((r) => {
                const id = `reply-${r.id}`;
                const on = playingId === id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => void play(post, r)}
                    style={[styles.replyChip, on && styles.reactOn]}
                  >
                    <Text style={styles.replyChipText}>
                      {on ? '❚❚' : '▶'} {r.codename} {r.duration}"
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading && posts.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.amber} />
        <Text style={styles.muted}>正在汇集同温层回声…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.amber}
          />
        }
        ListHeaderComponent={
          <View>
            <ScrollFilters tags={tags} filter={filter} onChange={setFilter} />
            <View style={styles.banner}>
              <Text style={styles.bannerText}>你并不孤单 · 每一个声音都经过深度脱敏</Text>
              <Text style={styles.bannerMeta}>48H 清空</Text>
            </View>
            {error && (
              <Pressable onPress={() => void load()} style={styles.errorBox}>
                <Text style={styles.errorText}>{error} · 点此重试</Text>
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.muted}>同温层此刻很安静</Text>
            <Text style={[styles.muted, { fontSize: 12, marginTop: 4 }]}>
              去树洞成为第一个释放负荷的人
            </Text>
          </View>
        }
      />
    </View>
  );
}

function ScrollFilters({
  tags,
  filter,
  onChange,
}: {
  tags: string[];
  filter: string;
  onChange: (t: string) => void;
}) {
  return (
    <View style={styles.filters}>
      {tags.map((tag) => (
        <Pressable
          key={tag}
          onPress={() => onChange(tag)}
          style={[styles.filterChip, filter === tag && styles.filterOn]}
        >
          <Text style={[styles.filterText, filter === tag && { color: colors.amber }]}>
            {tag === '全部' ? '全部同温层' : `#${tag}`}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.obsidian },
  list: { padding: spacing.lg, paddingBottom: 40 },
  center: { paddingVertical: 48, alignItems: 'center', gap: 12 },
  muted: { color: colors.mist, fontSize: 14 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(30,41,59,0.6)',
    borderWidth: 1,
    borderColor: colors.voidBorder,
  },
  filterOn: {
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderColor: 'rgba(245,158,11,0.4)',
  },
  filterText: { color: colors.mist, fontSize: 12, fontWeight: '600' },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30,41,59,0.5)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.voidBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: { color: colors.mist, fontSize: 12, flex: 1 },
  bannerMeta: { color: colors.mist, fontSize: 11 },
  errorBox: {
    backgroundColor: 'rgba(251,113,133,0.15)',
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  errorText: { color: colors.rose, fontSize: 12, textAlign: 'center' },
  card: {
    backgroundColor: 'rgba(30,41,59,0.4)',
    borderWidth: 1,
    borderColor: colors.voidBorder,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTop: { marginBottom: spacing.sm },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: {
    color: colors.amber,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  mono: { color: colors.mist, fontSize: 12 },
  meta: { color: colors.mist, fontSize: 11, marginTop: 4 },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(7,11,20,0.5)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.voidBorder,
    padding: spacing.md,
  },
  playerOn: {
    borderColor: 'rgba(245,158,11,0.4)',
    backgroundColor: 'rgba(245,158,11,0.1)',
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.voidBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnOn: { backgroundColor: colors.amber },
  playIcon: { color: colors.snow, fontSize: 12 },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 28 },
  bar: { flex: 1, borderRadius: 2, backgroundColor: '#475569' },
  dur: { color: colors.snow, fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
  reactBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(30,41,59,0.5)',
  },
  reactOn: {
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
  },
  reactText: { color: colors.mist, fontSize: 12, fontWeight: '600' },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  replyBtn: {
    backgroundColor: 'rgba(30,41,59,0.7)',
    borderWidth: 1,
    borderColor: colors.voidBorder,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  replyBtnOn: { backgroundColor: colors.amber, borderColor: colors.amber },
  replyText: { color: colors.mist, fontSize: 12, fontWeight: '600' },
  flag: { color: '#64748B', fontSize: 18, padding: 8 },
  crisisHint: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.3)',
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  crisisText: { color: colors.amber, fontSize: 11 },
  replies: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.voidBorder, paddingTop: spacing.sm },
  repliesLabel: { color: colors.mist, fontSize: 11, marginBottom: 6 },
  replyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  replyChip: {
    backgroundColor: 'rgba(30,41,59,0.6)',
    borderWidth: 1,
    borderColor: colors.voidBorder,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  replyChipText: { color: colors.mist, fontSize: 11 },
});
