import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { colors, fonts } from '@/constants/theme';

// Terms of Use (EULA) — served on web at /terms and reachable in-app from the
// paywall. A functional Terms link at the point of purchase is required for
// auto-renewable subscriptions (Apple Guideline 3.1.2; Google Play).

const EFFECTIVE_DATE = 'July 9, 2026';
const CONTACT_EMAIL = 'dreki.solutions@gmail.com';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Agreement',
    body:
      'By creating an account or using Viking Fitness ("the app"), operated by Dreki Solutions, ' +
      'a brand of Moser Holdings LLC ("we", "us"), you agree to these Terms of Use. If you do ' +
      'not agree, do not use the app.',
  },
  {
    title: 'The Service',
    body:
      'Viking Fitness provides fitness and nutrition tracking, calorie and macro estimates, and ' +
      'training and meal-plan features. A free tier is available; Premium unlocks additional ' +
      'features described in the app.',
  },
  {
    title: 'Subscriptions & Auto-Renewal',
    body:
      'Premium is offered as an auto-renewable subscription (monthly at $14.99 or annual at $89, ' +
      'shown in your local currency at checkout), which may include an introductory free trial. ' +
      'Payment is charged to your Google Play or Apple account (mobile) or via Stripe (web) at ' +
      'confirmation of purchase. The subscription automatically renews at the then-current price ' +
      'unless canceled at least 24 hours before the end of the current period. You can manage or ' +
      'cancel anytime in your store account settings (Google Play or App Store) or, on web, via ' +
      'the billing portal. Any unused portion of a free trial is forfeited when you purchase a ' +
      'subscription. Deleting the app does not cancel a subscription.',
  },
  {
    title: 'Refunds',
    body:
      'Purchases made through Google Play or the App Store are subject to those stores’ refund ' +
      'policies. Web purchases are handled per our billing provider’s terms. Contact ' +
      `${CONTACT_EMAIL} with any billing questions.`,
  },
  {
    title: 'Health Disclaimer',
    body:
      'The app provides informational estimates only and is not medical advice. Consult a ' +
      'qualified professional before starting any diet or exercise program. You use the app at ' +
      'your own risk.',
  },
  {
    title: 'Acceptable Use',
    body:
      'You agree not to misuse the app, attempt to access it in unauthorized ways, or use it to ' +
      'violate any law. We may suspend or terminate accounts that violate these terms.',
  },
  {
    title: 'Limitation of Liability',
    body:
      'To the maximum extent permitted by law, the app is provided "as is" without warranties, ' +
      'and we are not liable for any indirect or consequential damages arising from its use.',
  },
  {
    title: 'Changes',
    body:
      'We may update these terms; material changes will be reflected here with a revised ' +
      'effective date. Continued use after changes constitutes acceptance.',
  },
  {
    title: 'Contact',
    body: `Questions about these terms: ${CONTACT_EMAIL}.`,
  },
];

export default function TermsScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={styles.backBtn}
            hitSlop={8}
          >
            <ChevronLeft size={24} color={colors.blue} />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>TERMS OF USE</Text>
          <Text style={styles.meta}>Viking Fitness · Effective {EFFECTIVE_DATE}</Text>

          {SECTIONS.map((s) => (
            <View key={s.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{s.title.toUpperCase()}</Text>
              <Text style={styles.sectionBody}>{s.body}</Text>
            </View>
          ))}

          <Text style={styles.footer}>
            Dreki Solutions · Moser Holdings LLC · {CONTACT_EMAIL}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  title: { fontFamily: fonts.display, fontSize: 40, color: colors.frost, lineHeight: 44 },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.gold,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  sectionBody: { fontFamily: fonts.body, fontSize: 14, color: colors.frost, lineHeight: 22 },
  footer: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 16 },
});
