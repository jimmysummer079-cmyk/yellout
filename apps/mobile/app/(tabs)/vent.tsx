import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import {
  DEFAULT_TARGET_TAGS,
  MAX_TARGET_TAG_LEN,
  type VoiceEffect,
} from '@yellout/shared';
import { createVent, guessRecordingMime, refreshCodename } from '@/lib/api';
import { useSession } from '@/hooks/SessionContext';
import { colors, radii, spacing } from '@/theme/tokens';

const EFFECTS: { id: VoiceEffect; name: string; desc: string }[] = [
  { id: 'deep', name: '厚重', desc: '低沉沉稳' },
  { id: 'robotic', name: '机械', desc: '调频共振' },
  { id: 'ethereal', name: '空灵', desc: '泛音扩散' },
];

export default function VentScreen() {
  const { session, setCodename, openCrisis, refreshName } = useSession();
  const [customTags, setCustomTags] = useState<string[]>(['房贷']);
  const [target, setTarget] = useState('领导');
  const [effect, setEffect] = useState<VoiceEffect>('deep');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isBurn, setIsBurn] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<'idle' | 'sent' | 'burned' | 'error' | 'uploading'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [micDenied, setMicDenied] = useState(false);
  const startY = useRef(0);
  const burnRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startAt = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      void recording?.stopAndUnloadAsync().catch(() => undefined);
    };
  }, [recording]);

  const allTags = [...DEFAULT_TARGET_TAGS, ...customTags];

  const requestMic = async () => {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      setMicDenied(true);
      return false;
    }
    setMicDenied(false);
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    return true;
  };

  const startRecord = async () => {
    if (isRecording || status === 'uploading') return;
    const ok = await requestMic();
    if (!ok) {
      setStatus('error');
      setStatusMsg('需要麦克风权限才能录音，请在系统设置中允许');
      return;
    }
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
      setIsBurn(false);
      burnRef.current = false;
      setSeconds(0);
      setStatus('idle');
      startAt.current = Date.now();
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - startAt.current) / 1000);
        setSeconds(s);
        if (s >= 60) void stopRecord();
      }, 250);
    } catch {
      setStatus('error');
      setStatusMsg('无法开始录音');
    }
  };

  const stopRecord = async () => {
    if (!isRecording || !recording) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const duration = Math.max(1, Math.floor((Date.now() - startAt.current) / 1000));
    const wasBurn = burnRef.current;
    setIsRecording(false);
    setIsBurn(false);

    try {
      await recording.stopAndUnloadAsync();
    } catch {
      // ignore
    }
    const uri = recording.getURI();
    setRecording(null);

    if (wasBurn) {
      // Burn to Void — never upload
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStatus('burned');
      setStatusMsg('已焚入虚空 · 零字节上传 · 释怀放下');
      const next = await refreshName();
      setCodename(next);
      setTimeout(() => setStatus('idle'), 3500);
      return;
    }

    if (!uri || duration < 1) return;

    setStatus('uploading');
    setStatusMsg('正在脱敏推送到同温层…');
    try {
      const { mimeType, fileName } = guessRecordingMime(uri);
      const waveform = Array.from({ length: 28 }, () => 0.2 + Math.random() * 0.7);
      const res = await createVent({
        uri,
        mimeType,
        fileName,
        targetTag: target,
        duration: Math.min(60, duration),
        voiceEffect: effect,
        waveformData: waveform,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStatus('sent');
      setStatusMsg('已推送到同温层广场 · 48 小时后随风消散');
      const next = await refreshCodename();
      setCodename(next);
      if (res.crisisFlag) openCrisis(true);
      setTimeout(() => setStatus('idle'), 3500);
    } catch (err) {
      setStatus('error');
      setStatusMsg(err instanceof Error ? err.message : '发送失败');
    }
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        startY.current = e.nativeEvent.pageY;
        void startRecord();
      },
      onPanResponderMove: (e) => {
        const dy = startY.current - e.nativeEvent.pageY;
        const burn = dy > 60;
        burnRef.current = burn;
        setIsBurn(burn);
      },
      onPanResponderRelease: () => {
        void stopRecord();
      },
      onPanResponderTerminate: () => {
        void stopRecord();
      },
    })
  ).current;

  const addCustom = () => {
    const next = ['加班', '学费', '体检', '通勤'].find((t) => !customTags.includes(t));
    const tag = (next || '心事').slice(0, MAX_TARGET_TAG_LEN);
    if (!customTags.includes(tag)) setCustomTags((p) => [...p, tag]);
    setTarget(tag);
    void Haptics.selectionAsync();
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroBrand}>YellOut</Text>
        <Text style={styles.heroTag}>撕开隐忍 · 把压在喉咙里的委屈吼出来</Text>
      </View>

      {micDenied && (
        <View style={styles.alert}>
          <Text style={styles.alertTitle}>麦克风权限未开启</Text>
          <Text style={styles.alertBody}>请在系统设置中允许 YellOut 使用麦克风。</Text>
          <Pressable onPress={() => void requestMic()}>
            <Text style={styles.alertLink}>重新请求权限</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.muted}>当前脱敏代号</Text>
        <Text style={styles.codename}>{session?.codename ?? '…'}</Text>
        <Pressable
          onPress={async () => {
            void Haptics.selectionAsync();
            setCodename(await refreshName());
          }}
        >
          <Text style={styles.link}>换个代号</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>倾诉对象</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {allTags.map((t) => (
          <Pressable
            key={t}
            onPress={() => {
              void Haptics.selectionAsync();
              setTarget(t);
            }}
            style={[styles.chip, target === t && styles.chipOn]}
          >
            <Text style={[styles.chipText, target === t && styles.chipTextOn]}>#{t}</Text>
          </Pressable>
        ))}
        <Pressable onPress={addCustom} style={[styles.chip, styles.chipDashed]}>
          <Text style={styles.chipText}>+ 自定义</Text>
        </Pressable>
      </ScrollView>

      <Text style={styles.label}>DSP 变调脱敏</Text>
      <View style={styles.effectRow}>
        {EFFECTS.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => {
              void Haptics.selectionAsync();
              setEffect(e.id);
            }}
            style={[styles.effect, effect === e.id && styles.effectOn]}
          >
            <Text style={[styles.effectName, effect === e.id && { color: colors.amber }]}>
              {e.name}
            </Text>
            <Text style={styles.effectDesc}>{e.desc}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.hint}>
        {isRecording
          ? isBurn
            ? '松开即刻焚入虚空（永不上传）'
            : '松手 → 同温层 · 上滑 → 焚毁'
          : '松手 → 同温层 · 上滑 → 焚毁'}
      </Text>

      <View style={styles.btnWrap} {...pan.panHandlers}>
        <View
          style={[
            styles.bigBtn,
            isBurn && styles.bigBtnBurn,
            isRecording && !isBurn && styles.bigBtnRec,
          ]}
        >
          {isRecording ? (
            <>
              <Text style={styles.timer}>
                {String(Math.floor(seconds / 60)).padStart(2, '0')}:
                {String(seconds % 60).padStart(2, '0')}
              </Text>
              <Text style={styles.bigLabel}>
                {isBurn ? '松开焚入虚空' : '松手飘入同温层'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.bigLabel}>
                {status === 'uploading' ? '发送中…' : '长按倾诉'}
              </Text>
              <Text style={styles.bigSub}>松手发送 / 上滑焚化</Text>
            </>
          )}
        </View>
      </View>

      {status !== 'idle' && status !== 'uploading' && (
        <Text
          style={[
            styles.status,
            status === 'sent' && { color: colors.emerald },
            status === 'burned' && { color: colors.orange },
            status === 'error' && { color: colors.rose },
          ]}
        >
          {statusMsg}
        </Text>
      )}

      <Pressable onPress={() => openCrisis(false)} style={styles.help}>
        <Text style={styles.helpText}>心理危机援助热线</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.obsidian },
  content: { padding: spacing.lg, paddingBottom: 40 },
  hero: {
    backgroundColor: colors.obsidianRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.voidBorder,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    minHeight: 120,
    justifyContent: 'flex-end',
  },
  heroBrand: { color: colors.snow, fontSize: 36, fontWeight: '700' },
  heroTag: { color: colors.amber, marginTop: 6, fontSize: 13 },
  alert: {
    backgroundColor: 'rgba(154,52,18,0.35)',
    borderColor: 'rgba(249,115,22,0.45)',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  alertTitle: { color: '#FFEDD5', fontWeight: '700', fontSize: 13 },
  alertBody: { color: '#FED7AA', fontSize: 12, marginTop: 4 },
  alertLink: { color: colors.amber, marginTop: 8, fontSize: 12, textDecorationLine: 'underline' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(30,41,59,0.8)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.voidBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  muted: { color: colors.mist, fontSize: 12 },
  codename: { color: colors.amber, fontWeight: '700', fontFamily: 'SpaceMono', flex: 1 },
  link: { color: colors.mist, fontSize: 12 },
  label: { color: colors.mist, fontSize: 12, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: 'rgba(30,41,59,0.8)',
    borderWidth: 1,
    borderColor: colors.voidBorder,
    marginRight: 8,
  },
  chipOn: {
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderColor: 'rgba(245,158,11,0.5)',
  },
  chipDashed: { borderStyle: 'dashed' },
  chipText: { color: colors.mist, fontSize: 12, fontWeight: '600' },
  chipTextOn: { color: colors.amber },
  effectRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
  effect: {
    flex: 1,
    backgroundColor: 'rgba(7,11,20,0.5)',
    borderWidth: 1,
    borderColor: colors.voidBorder,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  effectOn: { borderColor: 'rgba(245,158,11,0.5)' },
  effectName: { color: colors.snow, fontSize: 13, fontWeight: '700' },
  effectDesc: { color: colors.mist, fontSize: 10, marginTop: 2 },
  hint: { color: colors.mist, fontSize: 11, textAlign: 'center', marginBottom: spacing.md },
  btnWrap: { alignItems: 'center', marginVertical: spacing.lg },
  bigBtn: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.void,
    borderWidth: 4,
    borderColor: colors.voidBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigBtnRec: {
    backgroundColor: colors.amber,
    borderColor: colors.amberSoft,
  },
  bigBtnBurn: {
    backgroundColor: '#9A3412',
    borderColor: colors.ember,
  },
  timer: { fontSize: 28, fontWeight: '800', color: colors.obsidian },
  bigLabel: { fontSize: 16, fontWeight: '700', color: colors.snow, textAlign: 'center' },
  bigSub: { fontSize: 12, color: colors.mist, marginTop: 4 },
  status: { textAlign: 'center', fontSize: 12, marginTop: 8 },
  help: { marginTop: spacing.xl, alignItems: 'center' },
  helpText: {
    color: colors.mist,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
