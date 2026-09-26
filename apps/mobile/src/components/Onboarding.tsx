import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { impact, selection } from '@/lib/haptics';
import { colors, radii, spacing } from '@/theme/tokens';

const STEPS = [
  {
    title: '这里没有观众',
    body: 'YellOut 是为 30–55 岁成年人准备的匿名情绪树洞。不读通讯录，不绑社交账号，只留下脱敏后的声音。',
  },
  {
    title: '按住倾诉，声线会被改写',
    body: '长按录音后可选变声方案。松开发送到同温层；上滑则「焚入虚空」，音频永不上传。',
  },
  {
    title: '代号随机，痕迹会自己消失',
    body: '每次发泄后代号会刷新。广场帖子默认 48 小时后自动焚毁，连同音频文件一并删除。',
  },
  {
    title: '需要时，请停下来求助',
    body: '若感到情绪过载，请立刻使用「温暖守护」查看心理援助热线。你的存在比任何压力都珍贵。',
  },
];

interface Props {
  onComplete: () => void;
  onOpenCrisis: () => void;
}

export function Onboarding({ onComplete, onOpenCrisis }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.brand}>YellOut</Text>
        <Text style={styles.tag}>声波破晓 · 咆哮释然</Text>
        <View style={styles.progress}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.bar, i <= step && styles.barOn]} />
          ))}
        </View>
        <Text style={styles.step}>
          {step + 1} / {STEPS.length}
        </Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>
        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              selection();
              onOpenCrisis();
            }}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>心理援助热线</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              impact();
              if (isLast) onComplete();
              else setStep((s) => s + 1);
            }}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>{isLast ? '我明白了，进入树洞' : '继续'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,11,20,0.96)',
    justifyContent: 'flex-end',
    padding: spacing.lg,
    zIndex: 50,
  },
  card: {
    backgroundColor: colors.obsidianRaised,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.voidBorder,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  brand: { color: colors.snow, fontSize: 32, fontWeight: '700' },
  tag: { color: colors.amber, fontSize: 12, marginBottom: spacing.sm },
  progress: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.void },
  barOn: { backgroundColor: colors.ember },
  step: { color: colors.amber, fontSize: 12, fontWeight: '600' },
  title: { color: colors.snow, fontSize: 24, fontWeight: '700', marginTop: 4 },
  body: { color: colors.mist, fontSize: 14, lineHeight: 22, marginTop: 8 },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
  secondary: {
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { color: colors.amber, fontSize: 13, fontWeight: '600' },
  primary: {
    backgroundColor: colors.ember,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: colors.obsidian, fontSize: 15, fontWeight: '700' },
});
