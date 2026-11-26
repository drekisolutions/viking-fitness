import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Polygon } from 'react-native-svg';
import {
  Shield,
  Flame,
  Swords,
  Sparkles,
  Check,
  ArrowRight,
  Camera,
  Activity,
} from 'lucide-react-native';

// Dreki Solutions Brand Kit tokens (color_system.md & Brand Guidelines)
const BRAND = {
  obsidian: '#141414',
  charcoal: '#181818',
  gold: '#9B7B3F',
  goldTint10: 'rgba(155, 123, 63, 0.10)',
  goldTint25: 'rgba(155, 123, 63, 0.25)',
  ember: '#D4762C',
  emberTint10: 'rgba(212, 118, 44, 0.12)',
  steel: '#3A6B8C',
  victory: '#2D7A4F',
  ivory: '#E8E8E8',
  smoke: '#6B6B6B',
  border: '#262626',
};

const PILLARS = [
  {
    icon: Shield,
    accent: BRAND.gold,
    eyebrow: 'GLP-1 MUSCLE ARMOR',
    title: 'Protect Lean Mass While Losing Fat',
    body: 'Bateman pharmacokinetic Shot Wave modeling syncs protein floors, Peak/Cruise/Rebound calories, and lifting volume to your weekly dose cycle—plus a structured Reverse-Diet Taper Off-Ramp.',
  },
  {
    icon: Activity,
    accent: BRAND.ember,
    eyebrow: 'IRON <-> RATIONS + ADAPTIVE TDEE',
    title: '21-Day Metabolic Calibration',
    body: 'Zero-guesswork EMA weight trends and weekly +/-150 kcal adaptive TDEE check-ins. Heavy-lift days automatically fuel glycogen recovery while protecting you from under-fueled fatigue.',
  },
  {
    icon: Flame,
    accent: BRAND.steel,
    eyebrow: 'BATTLEFIELD PIVOTS & PHOTO SCAN',
    title: 'Adapt in One Tap—Never Miss a Day',
    body: 'Stuck in a hotel gym or short on time? Pivot today’s workout in one tap, salvage blown macros, log multiple foods by voice/text, or snap a plate photo for instant macros + GLP-1 tolerance.',
  },
  {
    icon: Swords,
    accent: BRAND.victory,
    eyebrow: 'WARBAND RAIDS & MIMIR AI COACH',
    title: 'Built for Consistency Under Pressure',
    body: 'Team up with 2–5 friends in weekly Norse boss raids protected by Shield Wall Passes, and message Mimir 24/7 for coaching grounded in your live workouts, macros, and recovery.',
  },
];

const TIERS = [
  {
    name: 'FREE',
    subtitle: 'Core Training & Tracking',
    monthly: '$0',
    annual: '$0',
    cta: 'START FREE',
    route: '/onboarding',
    highlight: false,
    features: [
      'Workout session timer, rest clock & PR detection',
      'Food diary, Quick Shield & barcode scanner',
      'GLP-1 shot log & Bateman wave tracker',
      'Muscle Armor Index & 21-day Adaptive TDEE',
      'Warband co-op raids & Shield Wall Passes',
    ],
  },
  {
    name: 'PREMIUM',
    subtitle: 'Full AI Arsenal',
    monthly: '$14.99/mo',
    annual: '$89/yr',
    badge: 'SAVE 50%',
    cta: 'START 7-DAY FREE TRIAL',
    route: '/onboarding',
    highlight: false,
    features: [
      'Everything in Free',
      'AI-generated meal & workout plans (GLP-1 tuned)',
      'AI Battlefield Pivots & Salvage My Day',
      'AI voice & natural-language food parser',
      'GLP-1 Reverse-Diet & Taper Off-Ramp',
    ],
  },
  {
    name: 'PRO',
    subtitle: '24/7 AI Co-Pilot',
    monthly: '$24.99/mo',
    annual: '$149/yr',
    badge: 'MOST COMPLETE',
    cta: 'GO VIKING PRO',
    route: '/upgrade?tier=pro',
    highlight: true,
    features: [
      'Everything in Viking Premium',
      '24/7 Mimir AI Coach (context-aware chat)',
      'Plate Photo Macro Scan (Claude Vision)',
      'GLP-1 meal tolerance score (1–10)',
      'Priority AI coaching & deep progress guidance',
    ],
  },
];

function HexGridBackdrop() {
  const hexes: { x: number; y: number }[] = [];
  const size = 46;
  const w = Math.sqrt(3) * size;
  const h = 2 * size;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 14; col++) {
      hexes.push({
        x: col * w + (row % 2 === 1 ? w / 2 : 0),
        y: row * (h * 0.75),
      });
    }
  }
  const points = (cx: number, cy: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 180) * (60 * i - 30);
      return `${(cx + size * Math.cos(angle)).toFixed(1)},${(cy + size * Math.sin(angle)).toFixed(1)}`;
    }).join(' ');

  return (
    <View style={styles.hexWrap} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 1100 420" preserveAspectRatio="xMidYMid slice">
        {hexes.map((hex, idx) => (
          <Polygon
            key={idx}
            points={points(hex.x, hex.y)}
            fill="none"
            stroke={BRAND.gold}
            strokeWidth={1}
            strokeOpacity={0.08}
          />
        ))}
      </Svg>
    </View>
  );
}

export default function LandingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top Navigation */}
        <View style={styles.navOuter}>
          <View style={styles.navInner}>
            <View style={styles.brandLockup}>
              <Image
                source={require('../assets/brand/dreki_icon_mark.png')}
                style={styles.navLogo}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.brandWordmark}>VIKING FITNESS</Text>
                <Text style={styles.brandSub}>BY DREKI SOLUTIONS</Text>
              </View>
            </View>

            <View style={styles.navActions}>
              <TouchableOpacity
                onPress={() => router.push('/signin')}
                style={styles.navGhostBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.navGhostText}>SIGN IN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/onboarding')}
                style={styles.navPrimaryBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.navPrimaryText}>START FREE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroOuter}>
          <HexGridBackdrop />
          <View style={styles.heroInner}>
            <View style={styles.eyebrowPill}>
              <Sparkles size={13} color={BRAND.gold} />
              <Text style={styles.eyebrowText}>
                SMARTER TOOLS · UNFAIR RESULTS · TOTAL DOMINANCE
              </Text>
            </View>

            <Text style={[styles.heroTitle, !isWide && styles.heroTitleMobile]}>
              FORGE YOUR LEGACY.{'\n'}PROTECT EVERY POUND OF MUSCLE.
            </Text>

            <Text style={styles.heroBody}>
              The AI-powered strength, adaptive nutrition, and GLP-1 Muscle Armor platform built by
              Dreki Solutions. Calibrated to your real metabolism, your weekly shot wave, and your
              schedule—zero guesswork.
            </Text>

            <View style={[styles.heroCtas, !isWide && styles.heroCtasMobile]}>
              <TouchableOpacity
                style={styles.ctaPrimary}
                onPress={() => router.push('/onboarding')}
                activeOpacity={0.88}
              >
                <Text style={styles.ctaPrimaryText}>START 7-DAY FREE TRIAL</Text>
                <ArrowRight size={17} color={BRAND.obsidian} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ctaSecondary}
                onPress={() => router.push('/signin')}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaSecondaryText}>MEMBER SIGN IN</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.proofGrid, !isWide && styles.proofGridMobile]}>
              {[
                { label: 'METABOLISM', value: '21-Day EMA TDEE' },
                { label: 'GLP-1 SHIELD', value: 'Bateman Wave Cycling' },
                { label: 'PRO AI COACH', value: 'Mimir + Photo Scan' },
              ].map((item) => (
                <View key={item.label} style={styles.proofCard}>
                  <Text style={styles.proofLabel}>{item.label}</Text>
                  <Text style={styles.proofValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Pillars Section */}
        <View style={styles.sectionOuter}>
          <View style={styles.sectionInner}>
            <Text style={styles.sectionEyebrow}>THE ARSENAL</Text>
            <Text style={[styles.sectionTitle, !isWide && styles.sectionTitleMobile]}>
              BUILT FOR REAL-WORLD EXECUTION
            </Text>
            <Text style={styles.sectionLead}>
              Most fitness apps break the moment your schedule slips or your appetite shifts. Viking
              Fitness adapts in real time.
            </Text>

            <View style={[styles.pillarsGrid, isWide && styles.pillarsGridWide]}>
              {PILLARS.map((p) => {
                const Icon = p.icon;
                return (
                  <View
                    key={p.eyebrow}
                    style={[
                      styles.pillarCard,
                      isWide && styles.pillarCardWide,
                      { borderTopColor: p.accent },
                    ]}
                  >
                    <View style={styles.pillarHeader}>
                      <View style={[styles.pillarIconBox, { borderColor: BRAND.goldTint25 }]}>
                        <Icon size={18} color={p.accent} />
                      </View>
                      <Text style={[styles.pillarEyebrow, { color: p.accent }]}>{p.eyebrow}</Text>
                    </View>
                    <Text style={styles.pillarTitle}>{p.title}</Text>
                    <Text style={styles.pillarBody}>{p.body}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Pro Spotlight Banner */}
        <View style={styles.spotlightOuter}>
          <View style={[styles.spotlightCard, isWide && styles.spotlightCardWide]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.spotlightEyebrow}>VIKING PRO · AI CO-PILOT</Text>
              <Text style={styles.spotlightTitle}>
                SNAP YOUR PLATE. MESSAGE MIMIR 24/7.
              </Text>
              <Text style={styles.spotlightBody}>
                Upload a meal photo for instant calories, macros, and a 1–10 GLP-1 stomach tolerance
                score—or ask Mimir to swap exercises and dial in tonight’s protein target.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.spotlightBtn}
              onPress={() => router.push('/upgrade?tier=pro' as Href)}
              activeOpacity={0.85}
            >
              <Camera size={16} color={BRAND.obsidian} />
              <Text style={styles.spotlightBtnText}>EXPLORE PRO</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pricing Section */}
        <View style={styles.sectionOuter}>
          <View style={styles.sectionInner}>
            <Text style={styles.sectionEyebrow}>SIMPLE PRICING</Text>
            <Text style={[styles.sectionTitle, !isWide && styles.sectionTitleMobile]}>
              CHOOSE YOUR BATTLE PASS
            </Text>

            <View style={styles.billingToggle}>
              {(['annual', 'monthly'] as const).map((mode) => {
                const active = billing === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.billingBtn, active && styles.billingBtnActive]}
                    onPress={() => setBilling(mode)}
                  >
                    <Text style={[styles.billingText, active && styles.billingTextActive]}>
                      {mode === 'annual' ? 'ANNUAL (SAVE 50%)' : 'MONTHLY'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.tiersRow, isWide && styles.tiersRowWide]}>
              {TIERS.map((tier) => (
                <View
                  key={tier.name}
                  style={[
                    styles.tierCard,
                    isWide && styles.tierCardWide,
                    tier.highlight && styles.tierCardHighlight,
                  ]}
                >
                  {tier.badge && (
                    <View
                      style={[
                        styles.tierBadge,
                        tier.highlight && { backgroundColor: BRAND.ember },
                      ]}
                    >
                      <Text style={styles.tierBadgeText}>{tier.badge}</Text>
                    </View>
                  )}
                  <Text style={styles.tierName}>{tier.name}</Text>
                  <Text style={styles.tierSubtitle}>{tier.subtitle}</Text>
                  <Text style={styles.tierPrice}>
                    {billing === 'annual' ? tier.annual : tier.monthly}
                  </Text>

                  <View style={styles.tierFeatures}>
                    {tier.features.map((f) => (
                      <View key={f} style={styles.tierFeatureRow}>
                        <Check size={15} color={BRAND.gold} />
                        <Text style={styles.tierFeatureText}>{f}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.tierCta, tier.highlight && styles.tierCtaHighlight]}
                    onPress={() => router.push(tier.route as Href)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.tierCtaText,
                        tier.highlight && { color: BRAND.obsidian },
                      ]}
                    >
                      {tier.cta}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerOuter}>
          <View style={styles.footerInner}>
            <Image
              source={require('../assets/brand/dreki_logo_horizontal.png')}
              style={styles.footerLogo}
              resizeMode="contain"
            />
            <Text style={styles.footerTagline}>
              Smarter Tools. Unfair Results. Total Dominance.
            </Text>
            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => router.push('/onboarding')}>
                <Text style={styles.footerLink}>Get Started</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/signin')}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/privacy')}>
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/terms')}>
                <Text style={styles.footerLink}>Terms of Service</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.footerCopy}>
              © {new Date().getFullYear()} Dreki Solutions LLC · All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.obsidian },
  scroll: { flex: 1, backgroundColor: BRAND.obsidian },

  navOuter: {
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    backgroundColor: BRAND.obsidian,
  },
  navInner: {
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navLogo: { width: 34, height: 34 },
  brandWordmark: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 16,
    color: BRAND.ivory,
    letterSpacing: 1.5,
  },
  brandSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: BRAND.gold,
    letterSpacing: 1.5,
  },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navGhostBtn: { paddingHorizontal: 14, paddingVertical: 9 },
  navGhostText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: BRAND.ivory,
    letterSpacing: 0.8,
  },
  navPrimaryBtn: {
    backgroundColor: BRAND.gold,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  navPrimaryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: BRAND.obsidian,
    letterSpacing: 0.8,
  },

  heroOuter: {
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  hexWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroInner: {
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 72,
    alignItems: 'flex-start',
  },
  eyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.goldTint25,
    backgroundColor: BRAND.goldTint10,
    marginBottom: 20,
  },
  eyebrowText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: BRAND.gold,
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 52,
    lineHeight: 60,
    color: BRAND.ivory,
    letterSpacing: 1,
    maxWidth: 840,
  },
  heroTitleMobile: {
    fontSize: 34,
    lineHeight: 42,
  },
  heroBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    lineHeight: 27,
    color: '#B8B8B8',
    maxWidth: 660,
    marginTop: 18,
  },
  heroCtas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 30,
  },
  heroCtasMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: BRAND.ember,
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 8,
  },
  ctaPrimaryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: BRAND.obsidian,
    letterSpacing: 1,
  },
  ctaSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BRAND.gold,
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 8,
    backgroundColor: BRAND.goldTint10,
  },
  ctaSecondaryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: BRAND.ivory,
    letterSpacing: 1,
  },

  proofGrid: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 44,
    width: '100%',
  },
  proofGridMobile: { flexDirection: 'column' },
  proofCard: {
    flex: 1,
    backgroundColor: BRAND.charcoal,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderTopWidth: 3,
    borderTopColor: BRAND.gold,
    borderRadius: 10,
    padding: 16,
  },
  proofLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: BRAND.smoke,
    letterSpacing: 1.2,
  },
  proofValue: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 17,
    color: BRAND.ivory,
    marginTop: 6,
  },

  sectionOuter: { paddingVertical: 64 },
  sectionInner: {
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  sectionEyebrow: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: BRAND.gold,
    letterSpacing: 1.6,
  },
  sectionTitle: {
    fontFamily: 'Cinzel_400Regular',
    fontSize: 36,
    lineHeight: 44,
    color: BRAND.ivory,
    marginTop: 8,
  },
  sectionTitleMobile: { fontSize: 28, lineHeight: 35 },
  sectionLead: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: '#A8A8A8',
    maxWidth: 620,
    marginTop: 10,
  },

  pillarsGrid: { marginTop: 32, gap: 16 },
  pillarsGridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  pillarCard: {
    backgroundColor: BRAND.charcoal,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderTopWidth: 3,
    borderRadius: 12,
    padding: 22,
  },
  pillarCardWide: { width: '48.8%' },
  pillarHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  pillarIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: BRAND.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarEyebrow: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  pillarTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 19,
    color: BRAND.ivory,
    marginBottom: 8,
  },
  pillarBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#B0B0B0',
  },

  spotlightOuter: { paddingHorizontal: 24 },
  spotlightCard: {
    maxWidth: 1072,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: BRAND.charcoal,
    borderWidth: 1,
    borderColor: BRAND.goldTint25,
    borderTopWidth: 3,
    borderTopColor: BRAND.ember,
    borderRadius: 12,
    padding: 26,
    gap: 18,
  },
  spotlightCardWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spotlightEyebrow: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: BRAND.ember,
    letterSpacing: 1.4,
  },
  spotlightTitle: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 22,
    color: BRAND.ivory,
    marginTop: 6,
  },
  spotlightBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#B8B8B8',
    marginTop: 6,
    maxWidth: 680,
  },
  spotlightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND.gold,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 8,
  },
  spotlightBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: BRAND.obsidian,
    letterSpacing: 1,
  },

  billingToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: BRAND.charcoal,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 10,
    padding: 4,
    marginTop: 22,
    gap: 4,
  },
  billingBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 7 },
  billingBtnActive: { backgroundColor: BRAND.gold },
  billingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: BRAND.smoke,
    letterSpacing: 0.8,
  },
  billingTextActive: { color: BRAND.obsidian },

  tiersRow: { marginTop: 24, gap: 16 },
  tiersRowWide: { flexDirection: 'row', alignItems: 'stretch' },
  tierCard: {
    backgroundColor: BRAND.charcoal,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderTopWidth: 3,
    borderTopColor: BRAND.gold,
    borderRadius: 12,
    padding: 24,
  },
  tierCardWide: { flex: 1 },
  tierCardHighlight: {
    borderColor: BRAND.gold,
    borderTopColor: BRAND.ember,
    backgroundColor: '#1C1915',
  },
  tierBadge: {
    alignSelf: 'flex-start',
    backgroundColor: BRAND.gold,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 10,
  },
  tierBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: BRAND.obsidian,
    letterSpacing: 0.8,
  },
  tierName: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 22,
    color: BRAND.ivory,
    letterSpacing: 1,
  },
  tierSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: BRAND.smoke,
    marginTop: 2,
  },
  tierPrice: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 32,
    color: BRAND.gold,
    marginTop: 14,
    marginBottom: 16,
  },
  tierFeatures: { gap: 10, flex: 1, marginBottom: 22 },
  tierFeatureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tierFeatureText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: BRAND.ivory,
    flex: 1,
  },
  tierCta: {
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.gold,
    backgroundColor: BRAND.goldTint10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierCtaHighlight: {
    backgroundColor: BRAND.ember,
    borderColor: BRAND.ember,
  },
  tierCtaText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: BRAND.ivory,
    letterSpacing: 0.9,
  },

  footerOuter: {
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    paddingVertical: 40,
    backgroundColor: '#101010',
  },
  footerInner: {
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  footerLogo: { width: 190, height: 42 },
  footerTagline: {
    fontFamily: 'Cinzel_400Regular',
    fontSize: 13,
    color: BRAND.gold,
    letterSpacing: 1,
    textAlign: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    marginTop: 6,
  },
  footerLink: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#A8A8A8',
  },
  footerCopy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: BRAND.smoke,
    marginTop: 6,
  },
});
