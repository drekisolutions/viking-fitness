import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, fonts } from '@/constants/theme';

// Privacy policy — served on web at /privacy. This URL is used as the
// privacy policy link in the Google Play / App Store listings.

const EFFECTIVE_DATE = 'July 9, 2026';
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
      'Activity data: workouts, food logs, body measurements, and progress entries you record ' +
      'in the app.\n\n' +
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
      'saving your training and nutrition history, syncing your data across devices, and ' +
      'managing your subscription. We do not sell your personal information and we do not ' +
      'show third-party advertising.',
  },
  {
    title: 'Where Your Data Lives',
    body:
      'Your data is stored in our Supabase-hosted database, protected by row-level security so ' +
      'only your authenticated account can read or write your records. Session tokens are ' +
      'stored in your device’s secure storage.',
  },
  {
    title: 'Data Sharing',
    body:
      'We share data only with the service providers needed to operate the app: Supabase ' +
      '(database and authentication), Stripe (web payments), RevenueCat and Google Play / ' +
      'Apple (mobile subscriptions), and Vercel (web hosting). Each processes data solely to ' +
      'provide their service to us.',
  },
  {
    title: 'Data Retention & Deletion',
    body:
      'Your data is retained while your account is active. You can delete your account and all ' +
      'associated data at any time from Profile → Delete Account inside the app, or by ' +
      `emailing ${CONTACT_EMAIL} from your account email. Deletion removes your ` +
      'authentication record and all fitness data from our systems.',
  },
  {
    title: 'Children',
    body:
      'Viking Fitness is not directed at children under 13, and we do not knowingly collect ' +
      'personal information from children under 13.',
  },
  {
    title: 'Health Disclaimer',
    body:
      'Calorie, macro, and BMI figures are informational estimates and are not medical advice. ' +
      'Consult a qualified professional before making significant changes to your diet or ' +
      'training.',
  },
  {
    title: 'Changes to This Policy',
    body:
      'If we make material changes to this policy, we will update this page and revise the ' +
      'effective date above.',
  },
];

export default function PrivacyScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
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
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
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
