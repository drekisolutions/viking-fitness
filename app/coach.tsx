import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  type ScrollViewInstance,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Crown, Send, Sparkles } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { colors, fonts, radius } from '@/constants/theme';
import { useUserStore, hasProAccess } from '@/store/user';
import { useTrackerStore, getTodayDateKey } from '@/store/tracker';
import { askMimirCoach, type CoachMessage } from '@/lib/pro';
import { trackEvent } from '@/lib/analytics';

const QUICK_PROMPTS = [
  'What should I eat for dinner to hit my protein target?',
  'Adjust today’s workout if my lower back feels tight.',
  'How is my Muscle Armor looking this week?',
  'I have 25 minutes — give me a fast high-stimulus session.',
];

export default function CoachScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const { foodLogs, workoutSessions, glp1Profile } = useTrackerStore();
  const isPro = hasProAccess(profile?.plan);

  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      role: 'assistant',
      content:
        'Hail, Warrior. I am Mimir — your 24/7 Viking Pro coach. Ask me about today’s macros, workout swaps, or GLP-1 muscle protection.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const todayContext = useMemo(() => {
    const today = getTodayDateKey();
    const todayFoods = foodLogs.filter((f) => f.logDate === today);
    const todayCals = todayFoods.reduce((s, f) => s + f.calories, 0);
    const todayProtein = todayFoods.reduce((s, f) => s + f.protein, 0);
    return {
      todayCaloriesLogged: Math.round(todayCals),
      todayProteinLoggedG: Math.round(todayProtein),
      recentWorkoutsCount: workoutSessions.slice(0, 5).length,
      lastWorkout: workoutSessions[0]?.name ?? null,
      glp1Enabled: glp1Profile.enabled,
    };
  }, [foodLogs, workoutSessions, glp1Profile.enabled]);

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    if (!isPro) {
      router.push('/upgrade?tier=pro' as Href);
      return;
    }

    const nextMessages: CoachMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    if (!textOverride) setInput('');
    setSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const reply = await askMimirCoach(nextMessages, todayContext);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      trackEvent('pro_coach_message');
    } catch (err: any) {
      Alert.alert('Mimir Coach', err?.message ?? 'Could not reach AI Coach.');
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ChevronLeft size={24} color={colors.blue} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>VIKING PRO</Text>
            <Text style={styles.headerTitle}>MIMIR AI COACH</Text>
          </View>
          {!isPro && (
            <TouchableOpacity
              style={styles.proPill}
              onPress={() => router.push('/upgrade?tier=pro' as Href)}
            >
              <Crown size={14} color={colors.black} />
              <Text style={styles.proPillText}>UNLOCK PRO</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!isPro && (
            <Card glowColor="gold" style={styles.gateCard}>
              <View style={styles.gateRow}>
                <Sparkles size={18} color={colors.gold} />
                <Text style={styles.gateTitle}>24/7 Context-Aware AI Coach</Text>
              </View>
              <Text style={styles.gateDesc}>
                Mimir reads your live macros, Muscle Armor, Adaptive TDEE, and GLP-1 wave to answer
                nutrition and training questions anytime. Included in Viking Pro ($24.99/mo or
                $149/yr).
              </Text>
              <TouchableOpacity
                style={styles.gateBtn}
                onPress={() => router.push('/upgrade?tier=pro' as Href)}
              >
                <Text style={styles.gateBtnText}>UPGRADE TO VIKING PRO</Text>
              </TouchableOpacity>
            </Card>
          )}

          {messages.map((m, idx) => (
            <View
              key={idx}
              style={[
                styles.bubble,
                m.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text style={styles.bubbleRole}>
                {m.role === 'user' ? 'YOU' : 'MIMIR'}
              </Text>
              <Text style={styles.bubbleText}>{m.content}</Text>
            </View>
          ))}

          {sending && (
            <View style={[styles.bubble, styles.assistantBubble]}>
              <ActivityIndicator size="small" color={colors.gold} />
            </View>
          )}

          <View style={styles.promptsWrap}>
            {QUICK_PROMPTS.map((q) => (
              <TouchableOpacity
                key={q}
                style={styles.promptChip}
                onPress={() => sendMessage(q)}
                activeOpacity={0.8}
              >
                <Text style={styles.promptChipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder={isPro ? 'Ask Mimir anything…' : 'Upgrade to Pro to chat with Mimir…'}
            placeholderTextColor={colors.muted}
            value={input}
            onChangeText={setInput}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
            editable={isPro}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!isPro || !input.trim()) && { opacity: 0.45 }]}
            onPress={() => sendMessage()}
            disabled={sending}
          >
            <Send size={18} color={colors.black} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.black },
  container: { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerEyebrow: {
    fontFamily: fonts.heading,
    fontSize: 10,
    color: colors.gold,
    letterSpacing: 1.5,
  },
  headerTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.frost },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  proPillText: { fontFamily: fonts.heading, fontSize: 11, color: colors.black, letterSpacing: 0.8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 24 },
  gateCard: { padding: 16, marginBottom: 4 },
  gateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gateTitle: { fontFamily: fonts.heading, fontSize: 15, color: colors.frost },
  gateDesc: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 19 },
  gateBtn: {
    marginTop: 12,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateBtnText: { fontFamily: fonts.heading, fontSize: 12, color: colors.black, letterSpacing: 1 },
  bubble: { padding: 14, borderRadius: radius.md, maxWidth: '90%' },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(79, 195, 247, 0.14)',
    borderWidth: 1,
    borderColor: colors.blue,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleRole: {
    fontFamily: fonts.heading,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  bubbleText: { fontFamily: fonts.body, fontSize: 14, color: colors.frost, lineHeight: 20 },
  promptsWrap: { gap: 8, marginTop: 8 },
  promptChip: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  promptChipText: { fontFamily: fonts.body, fontSize: 13, color: colors.blue },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.frost,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
