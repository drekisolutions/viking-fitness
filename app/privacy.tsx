import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { colors, fonts } from '@/constants/theme';

// Privacy policy — served on web at /privacy. This URL is used as the
// privacy policy link in the Google Play / App Store listings.

const EFFECTIVE_DATE = 'November 20, 2026';
const CONTACT_EMAIL = 'dreki.solutions@gmail.com';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Who We Are',
    body:
      'Viking Fitness is operated by Dreki Solutions, a brand of Moser Holdings LLC ' +
      `("we", "us"). Questions about this policy can be sent to ${CONTACT_EMAIL}.`,
  },
  {
    title: 'Information We Collect',
    body:
      'Account information: your email address and an encrypted password, managed by our ' +
      'authentication provider (Supabase).\n\n' +
      'Fitness profile: name, age, sex, height, weight, activity level, fitness goal, and ' +
      'meal-plan preference you enter during onboarding, plus values we calculate from them ' +
      '(BMI, calorie and macro targets).\n\n' +
      'Activity & GLP-1 companion logs: workouts, sets/reps, food logs, hydration, body ' +
      'measurements, and optional GLP-1 shot logs (medication type, dose, injection site, ' +
      'and symptom check-ins) you choose to record in the app.\n\n' +
      'Subscription status: whether your account is on the free or premium plan.',
  },
  {
    title: 'Payments',
    body:
      'On Android, subscriptions are purchased through Google Play Billing; on iOS, through ' +
      'Apple In-App Purchase. Purchase processing is handled by RevenueCat on our behalf. On ' +
      'the web, payments are processed by Stripe. We never see or store your full card details — ' +
      'payment information is handled entirely by Google, Apple, or Stripe.',
  },
  {
    title: 'How We Use Your Information',
    body:
      'We use your information to run the app: calculating your calorie and macro targets, ' +
      'saving your training, nutrition, and GLP-1 companion logs, syncing your data across ' +
      'devices, generating optional Premium AI workout/meal plans, and managing your ' +
      'subscription. We do not sell your personal information and we do not show third-party ' +
      'advertising.',
  },
  {
    title: 'Where Your Data Lives',
    body:
      'Your data is stored locally on your device for instant offline use and synced to our ' +
      'Supabase-hosted database when you sign in, protected by row-level security so only your ' +
      'authenticated account can read or write your records. Session tokens are stored in your ' +
      'device’s secure storage.',
  },
  {
    title: 'Data Sharing',
    body:
      'We share data only with the service providers needed to operate the app: Supabase ' +
      '(database and authentication), Anthropic (generates Premium AI meal and workout plans ' +
      'from your fitness targets and optional GLP-1 phase when you tap Generate), Open Food ' +
      'Facts (public food search and barcode lookup when you search foods), Stripe (web ' +
      'payments), RevenueCat and Google Play / Apple (mobile subscriptions), and Vercel (web ' +
      'hosting). Each processes data solely to provide their service to us.',
  },
  {
    title: 'Data Retention & Deletion',
    body:
      'Your data is retained while your account is active. You can delete your account and all ' +
      'associated data at any time from Profile → Delete account & data inside the app, or by ' +
      `emailing ${CONTACT_EMAIL} from your account email. Deletion removes your ` +
      'authentication record and all fitness, workout, nutrition, and GLP-1 logs from our systems.',
  },
  {
    title: 'Children',
    body:
      'Viking Fitness is not directed at children under 13, and we do not knowingly collect ' +
      'personal information from children under 13.',
  },
  {
    title: 'Health & GLP-1 Disclaimer',
    body:
      'Calorie, macro, BMI, Muscle Armor, Reverse-Diet, and GLP-1 pharmacokinetic curve ' +
      'calculations are informational estimates only and are NOT medical advice. Viking Fitness ' +
      'does not prescribe medications, recommend specific GLP-1 dosages, or replace guidance ' +
      'from your physician or obesity-medicine specialist. Always consult your prescribing ' +
      'clinician before starting, adjusting, or tapering any GLP-1 medication, diet, or ' +
      'training program.',
  },
  {
    title: 'Changes to This Policy',
    body:
      'If we make material changes to this policy, we will update this page and revise the ' +
      'effective date above.',
  },
];

export default function PrivacyScreen() {
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
          <Text style={styles.title}>PRIVACY POLICY</Text>
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
  title: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.frost,
    lineHeight: 44,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
    marginBottom: 24,
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.gold,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  sectionBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.frost,
    lineHeight: 22,
  },
  footer: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 16,
  },
});
