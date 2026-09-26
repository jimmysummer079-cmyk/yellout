import { ScrollView, StyleSheet, Text, View, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { getApiBaseUrl } from '@/lib/api';
import { colors, radii, spacing } from '@/theme/tokens';

export default function AboutScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>YellOut</Text>
      <Text style={styles.tag}>声波破晓 · 咆哮释然</Text>
      <Text style={styles.body}>
        面向 30–55 岁成年人的匿名语音发泄与同温层互慰树洞。按住倾诉，变声脱敏，松手送出或焚入虚空。
      </Text>

      <Text style={styles.h2}>品牌色</Text>
      {(
        [
          ['燃烬橙 Ember', colors.ember],
          ['暗夜黑 Obsidian', colors.obsidian],
          ['温暖琥珀 Amber', colors.amber],
          ['虚空灰 Void', colors.void],
        ] as const
      ).map(([name, hex]) => (
        <View key={hex} style={styles.swatch}>
          <View style={[styles.dot, { backgroundColor: hex }]} />
          <View>
            <Text style={styles.swatchName}>{name}</Text>
            <Text style={styles.swatchHex}>{hex}</Text>
          </View>
        </View>
      ))}

      <Text style={styles.h2}>API</Text>
      <Text style={styles.body}>当前连接：{getApiBaseUrl()}</Text>
      <Text style={styles.hint}>可通过 EXPO_PUBLIC_API_URL 覆盖默认地址。</Text>

      <Pressable
        onPress={() => Linking.openURL(`${getApiBaseUrl()}/privacy`)}
        style={styles.linkBtn}
      >
        <Text style={styles.linkText}>查看隐私政策（网页）</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>返回树洞</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.obsidian },
  content: { padding: spacing.xl, paddingBottom: 48 },
  brand: { color: colors.snow, fontSize: 36, fontWeight: '700' },
  tag: { color: colors.amber, marginTop: 6, marginBottom: spacing.lg },
  body: { color: colors.mist, fontSize: 14, lineHeight: 22 },
  h2: { color: colors.snow, fontSize: 20, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.md },
  swatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.voidBorder,
    backgroundColor: 'rgba(30,41,59,0.4)',
  },
  dot: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  swatchName: { color: colors.snow, fontWeight: '600', fontSize: 13 },
  swatchHex: { color: colors.mist, fontFamily: 'SpaceMono', fontSize: 12 },
  hint: { color: '#64748B', fontSize: 12, marginTop: 6 },
  linkBtn: { marginTop: spacing.lg },
  linkText: { color: colors.amber, textDecorationLine: 'underline', fontSize: 13 },
  back: {
    marginTop: spacing.xl,
    backgroundColor: colors.void,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backText: { color: colors.snow, fontWeight: '600' },
});
