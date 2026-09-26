import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '@/hooks/SessionContext';
import { BootScreen } from '@/components/BootScreen';
import { Onboarding } from '@/components/Onboarding';
import { CrisisModal } from '@/components/CrisisModal';
import { colors, spacing } from '@/theme/tokens';

function AppChrome({ children }: { children: React.ReactNode }) {
  const {
    ready,
    phase,
    phaseDetail,
    error,
    session,
    onboardingDone,
    completeOnboarding,
    retryBoot,
    crisisOpen,
    crisisForced,
    openCrisis,
    closeCrisis,
  } = useSession();
  const router = useRouter();

  const booting = !ready || !!error || phase === 'waking' || phase === 'idle';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      {!booting && (
        <>
          <View style={styles.header}>
            <Pressable onPress={() => router.push('/about')} style={styles.brandBtn}>
              <Text style={styles.brand}>YellOut</Text>
              <Text style={styles.sub} numberOfLines={1}>
                代号 {session?.codename ?? '…'} · 匿名树洞
              </Text>
            </Pressable>
            <Pressable
              onPress={() => openCrisis(false)}
              style={styles.helpBtn}
              accessibilityLabel="温暖守护"
            >
              <Text style={styles.helpText}>温暖守护</Text>
            </Pressable>
          </View>
          <View style={styles.privacy}>
            <View style={styles.dot} />
            <Text style={styles.privacyText}>匿名保护中 · 变声脱敏 · 48H 自动焚毁</Text>
          </View>
        </>
      )}

      <View style={{ flex: 1 }}>{children}</View>

      {booting && (
        <View style={StyleSheet.absoluteFill}>
          <BootScreen
            phaseDetail={
              phase === 'waking' ? phaseDetail : phaseDetail || '正在建立匿名会话…'
            }
            error={error}
            onRetry={retryBoot}
          />
        </View>
      )}

      {ready && !error && !onboardingDone && (
        <Onboarding
          onComplete={() => void completeOnboarding()}
          onOpenCrisis={() => openCrisis(false)}
        />
      )}
      <CrisisModal visible={crisisOpen} forced={crisisForced} onClose={closeCrisis} />
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <AppChrome>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.obsidian },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="about" options={{ presentation: 'modal' }} />
          </Stack>
        </AppChrome>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.obsidian },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.voidBorder,
  },
  brandBtn: { flex: 1, marginRight: 12 },
  brand: { color: colors.snow, fontSize: 22, fontWeight: '700' },
  sub: { color: colors.mist, fontSize: 11, marginTop: 2 },
  helpBtn: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  helpText: { color: colors.amber, fontSize: 12, fontWeight: '600' },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.voidBorder,
    backgroundColor: 'rgba(11,18,32,0.7)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.emerald,
  },
  privacyText: { color: colors.snow, fontSize: 11, opacity: 0.9 },
});
