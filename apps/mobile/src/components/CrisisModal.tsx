import { Modal, Pressable, ScrollView, StyleSheet, Text, View, Linking } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';

const HOTLINES = [
  { name: '全国希望24小时生命危机干预热线', number: '400-161-9995', desc: '全天候专业心理危机援助' },
  { name: '北京心理危机研究与干预热线', number: '010-82951332', desc: '国家级心理防线与倾听' },
  { name: '全国妇联与家庭心理援助热线', number: '12338', desc: '家庭关爱与女性心理支持' },
  { name: '全国共青团与家庭危机热线', number: '12355', desc: '家庭抚育与青少年成长支持' },
];

interface Props {
  visible: boolean;
  forced?: boolean;
  onClose: () => void;
}

export function CrisisModal({ visible, forced, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={forced ? undefined : onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>守护提示 · 停下来喘口气</Text>
          <Text style={styles.title}>生活很重，但你的存在更珍贵</Text>
          <Text style={styles.body}>
            {forced
              ? '我们检测到这段倾诉可能触及极度痛苦。请先看看这些随时可接通的援助热线——你不是一个人在扛。'
              : '人到中年，扛住全世界的同时，也请允许自己做回一个脆弱的人。有人随时愿意倾听你：'}
          </Text>
          <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ gap: spacing.sm }}>
            {HOTLINES.map((line) => (
              <View key={line.number} style={styles.line}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName}>{line.name}</Text>
                  <Text style={styles.lineDesc}>{line.desc}</Text>
                </View>
                <Pressable
                  onPress={() => Linking.openURL(`tel:${line.number}`)}
                  style={styles.telBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`拨打 ${line.number}`}
                >
                  <Text style={styles.telText}>{line.number}</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>
              {forced ? '我已知晓，继续留在树洞' : '我已知晓，继续在树洞释放'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.obsidianRaised,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: 'rgba(245,158,11,0.4)',
    padding: spacing.xl,
    gap: spacing.md,
  },
  eyebrow: { color: colors.amber, fontSize: 12, fontWeight: '600' },
  title: { color: colors.snow, fontSize: 20, fontWeight: '700' },
  body: { color: colors.mist, fontSize: 14, lineHeight: 22 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(30,41,59,0.8)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.voidBorder,
    padding: spacing.md,
  },
  lineName: { color: colors.snow, fontSize: 12, fontWeight: '600' },
  lineDesc: { color: colors.mist, fontSize: 11, marginTop: 2 },
  telBtn: {
    backgroundColor: 'rgba(245,158,11,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  telText: { color: colors.amber, fontSize: 12, fontWeight: '700' },
  closeBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.void,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeText: { color: colors.snow, fontSize: 14, fontWeight: '600' },
});
