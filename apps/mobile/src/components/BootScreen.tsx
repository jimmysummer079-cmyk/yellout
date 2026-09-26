import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';

interface Props {
  phaseDetail?: string;
  error?: string | null;
  onRetry?: () => void;
}

export function BootScreen({ phaseDetail, error, onRetry }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.brand}>YellOut</Text>
      <Text style={styles.tag}>声波破晓 · 咆哮释然</Text>
      {error ? (
        <>
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.hint}>
            免费服务器休眠后首次访问可能需要 30–60 秒唤醒。请确认网络后重试。
          </Text>
          {onRetry && (
            <Pressable onPress={onRetry} style={styles.btn}>
              <Text style={styles.btnText}>重试连接</Text>
            </Pressable>
          )}
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.amber} style={{ marginTop: spacing.xl }} />
          <Text style={styles.detail}>{phaseDetail || '正在建立匿名会话…'}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  brand: {
    color: colors.snow,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tag: { color: colors.amber, marginTop: spacing.sm, fontSize: 14 },
  detail: { color: colors.mist, marginTop: spacing.lg, textAlign: 'center', fontSize: 14 },
  error: { color: colors.rose, marginTop: spacing.xl, textAlign: 'center', fontSize: 14 },
  hint: {
    color: colors.mist,
    marginTop: spacing.md,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
  btn: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(249,115,22,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.45)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  btnText: { color: colors.ember, fontWeight: '700' },
});
