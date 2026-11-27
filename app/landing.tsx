import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  type ScrollViewInstance,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
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
  Download,
  Smartphone,
  Globe,
  MessageSquarePlus,
  Bug,
  Lightbulb,
  Wrench,
  Crown,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/user';
import { useOnboardingStore } from '@/store/onboarding';
import { identifyUser, trackEvent } from '@/lib/analytics';

const ANDROID_APK_URL =
  'https://expo.dev/artifacts/eas/s6sO3QJ41wFzJbJqeaDbxf9jSTOj-X7vk_R56D3g-xc.apk';

// Live www.dreki-solutions.ai ("dreki-forge" / "asgard-glass") design tokens
const BRAND = {
  obsidian: '#090909',
  obsidianDeep: '#0c0c0b',
  charcoal: '#171613',
  gold: '#e6b85b',
  goldPale: '#ffe2a1',
  goldTint10: 'rgba(230, 184, 91, 0.10)',
  goldTint25: 'rgba(224, 172, 71, 0.34)',
  ember: '#e99b5d',
  copper: '#b6532b',
  emberTint12: 'rgba(233, 155, 93, 0.14)',
  steel: '#a7e0f3',
  victory: '#2D7A4F',
  ivory: '#f1ece2',
  ivorySoft: '#d8d1c2',
  smoke: '#b6afa0',
  border: 'rgba(224, 172, 71, 0.24)',
  danger: '#E57373',
};

type PathKey = 'glp1' | 'cut' | 'build';

const PATH_CONTENT: Record<
  PathKey,
  {
    label: string;
    headline: string;
    sub: string;
    metrics: { label: string; value: string }[];
  }
> = {
  glp1: {
    label: 'GLP-1 Muscle Armor',
    headline: 'LOSE FAT ON GLP-1.\nKEEP YOUR STRENGTH.',
    sub: 'Bateman pharmacokinetic Shot Wave modeling syncs your protein shield, Peak/Cruise/Rebound calories, and lifting volume—plus a Reverse-Diet Taper Off-Ramp.',
    metrics: [
      { label: 'PROTEIN SHIELD', value: 'Muscle Armor Index 0–100' },
      { label: 'SHOT WAVE', value: 'Peak · Cruise · Rebound' },
      { label: 'OFF-RAMP', value: 'Reverse-Diet Taper' },
    ],
  },
  cut: {
    label: 'Fat Loss / Cut',
    headline: 'CALIBRATED CUTTING.\nZERO METABOLIC GUESSWORK.',
    sub: '21-day EMA weight trends and weekly +/-150 kcal Adaptive TDEE check-ins keep your deficit dialed in while Iron <-> Rations fuels heavy training days.',
    metrics: [
      { label: 'ADAPTIVE TDEE', value: '21-Day EMA Calibration' },
      { label: 'MACRO RESCUE', value: 'AI Salvage My Day' },
      { label: 'QUICK LOG', value: 'Text/Mic + Photo Scan' },
    ],
  },
  build: {
    label: 'Strength & Hypertrophy',
    headline: 'FORGE REAL STRENGTH.\nNEVER MISS A SESSION.',
    sub: 'Live workout stopwatch, rest timer, Epley 1RM PR tracking, and 1-tap Battlefield Pivots when you have 25 minutes or only hotel dumbbells.',
    metrics: [
      { label: 'LIVE SESSION', value: 'PR & Volume Tracking' },
      { label: '1-TAP PIVOT', value: '25-Min / Hotel / Back-Safe' },
      { label: 'CO-OP RAIDS', value: 'Warband Boss Battles' },
    ],
  },
};

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
    subtitle: 'First 10 Sign-Ups: Year 1 Free',
    monthly: '$24.99/mo',
    annual: '$149/yr',
    badge: 'FOUNDING 10: $0 YR 1',
    cta: 'CLAIM FREE PRO YEAR',
    route: '#signup',
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
  const scrollRef = useRef<ScrollViewInstance>(null);
  const { setProfile } = useUserStore();
  const onboarding = useOnboardingStore();

  const [activePath, setActivePath] = useState<PathKey>('glp1');
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual');
  const [spotsRemaining, setSpotsRemaining] = useState<number>(10);

  // Section Y offsets for smooth scrolling
  const [signupY, setSignupY] = useState(0);
  const [downloadY, setDownloadY] = useState(0);
  const [feedbackY, setFeedbackY] = useState(0);

  // Sign-up form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [goal, setGoal] = useState<'cut' | 'build' | 'recomp' | 'maintain'>('cut');
  const [onGlp1, setOnGlp1] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [signupMsg, setSignupMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Feedback form state
  const [fbCategory, setFbCategory] = useState<'bug' | 'improvement' | 'feature'>('bug');
  const [fbEmail, setFbEmail] = useState('');
  const [fbTitle, setFbTitle] = useState('');
  const [fbDetails, setFbDetails] = useState('');
  const [sendingFb, setSendingFb] = useState(false);
  const [fbMsg, setFbMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    Promise.resolve(supabase.rpc('get_founding_spots_remaining'))
      .then(({ data, error }) => {
        if (active && !error && typeof data === 'number') {
          setSpotsRemaining(data);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const scrollTo = (y: number) => {
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
  };

  const handleFoundingSignUp = async () => {
    setSignupMsg(null);
    const trimmedEmail = email.trim();
    const trimmedName = name.trim() || 'Warrior';
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setSignupMsg({ type: 'err', text: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < 8) {
      setSignupMsg({ type: 'err', text: 'Password must be at least 8 characters.' });
      return;
    }

    setSigningUp(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { data: { name: trimmedName } },
      });
      if (error) {
        setSignupMsg({ type: 'err', text: error.message });
        return;
      }
      if (!data.user) {
        setSignupMsg({ type: 'err', text: 'Could not create account. Please try again.' });
        return;
      }

      if (!data.session) {
        setSignupMsg({
          type: 'ok',
          text: 'Account created! Check your inbox to confirm your email, then sign in to finish setup.',
        });
        return;
      }

      // Create initial profile row
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name: trimmedName,
        goal,
        meal_plan: onGlp1 ? 'glp1' : 'balanced',
        onboarding_complete: false,
      });

      // Attempt to claim Founding 10 free year of Viking Pro
      let grantedPlan: 'free' | 'pro' = 'free';
      try {
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/claim-founding-offer`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.session.access_token}`,
              apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            },
          }
        );
        const claimData = await res.json();
        if (res.ok && claimData?.claimed) {
          grantedPlan = 'pro';
          if (typeof claimData.remaining === 'number') {
            setSpotsRemaining(claimData.remaining);
          }
        }
      } catch {
        // Non-fatal; user still gets free account
      }

      onboarding.setField('name', trimmedName);
      onboarding.setField('goal', goal);
      if (onGlp1) onboarding.setField('mealPlan', 'glp1');

      setProfile({
        id: data.user.id,
        name: trimmedName,
        email: trimmedEmail,
        age: onboarding.age || 30,
        sex: onboarding.sex || 'male',
        heightFt: onboarding.heightFt || 5,
        heightIn: onboarding.heightIn || 10,
        weightLbs: onboarding.weightLbs || 185,
        goal,
        mealPlan: onGlp1 ? 'glp1' : 'balanced',
        calories: onboarding.calories || 2200,
        protein: onboarding.protein || 180,
        carbs: onboarding.carbs || 200,
        fat: onboarding.fat || 70,
        bmi: onboarding.bmi || 26,
        plan: grantedPlan,
        onboardingComplete: false,
      });

      identifyUser(data.user.id, { plan: grantedPlan, goal, foundingOffer: grantedPlan === 'pro' });
      trackEvent('landing_signup', { plan: grantedPlan, goal });

      router.replace('/onboarding/body');
    } catch (e: any) {
      setSignupMsg({ type: 'err', text: e?.message ?? 'Sign up failed. Please try again.' });
    } finally {
      setSigningUp(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    setFbMsg(null);
    if (!fbTitle.trim() || !fbDetails.trim()) {
      setFbMsg({ type: 'err', text: 'Please include a short title and details.' });
      return;
    }
    setSendingFb(true);
    try {
      const { error } = await supabase.from('app_feedback').insert({
        category: fbCategory,
        email: fbEmail.trim() || null,
        title: fbTitle.trim(),
        details: fbDetails.trim(),
        platform: 'web',
      });
      if (error) {
        setFbMsg({ type: 'err', text: error.message });
        return;
      }
      trackEvent('feedback_submitted', { category: fbCategory });
      setFbTitle('');
      setFbDetails('');
      setFbMsg({
        type: 'ok',
        text: 'Feedback received—thank you for helping forge Viking Fitness.',
      });
    } catch (e: any) {
      setFbMsg({ type: 'err', text: e?.message ?? 'Could not submit feedback.' });
    } finally {
      setSendingFb(false);
    }
  };

  const path = PATH_CONTENT[activePath];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView ref={scrollRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top Founding 10 Offer Strip */}
        <TouchableOpacity
          style={styles.offerBar}
          onPress={() => scrollTo(signupY)}
          activeOpacity={0.88}
        >
          <Crown size={14} color={BRAND.obsidian} />
          <Text style={styles.offerBarText}>
            FOUNDING 10 OFFER: FIRST 10 SIGN-UPS GET 1 YEAR OF VIKING PRO FREE ({spotsRemaining} OF
            10 SPOTS LEFT) →
          </Text>
        </TouchableOpacity>

        {/* Top Navigation */}
        <View style={styles.navOuter}>
          <View style={styles.navInner}>
            <View style={styles.brandLockup}>
              <Image
                source={require('../assets/brand/dreki-network-mark.webp')}
                style={styles.navLogo}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.brandWordmark}>VIKING FITNESS</Text>
                <Text style={styles.brandSub}>BY DREKI SOLUTIONS</Text>
              </View>
            </View>

            <View style={styles.navActions}>
              {isWide && (
                <>
                  <TouchableOpacity onPress={() => scrollTo(downloadY)} style={styles.navGhostBtn}>
                    <Text style={styles.navGhostText}>DOWNLOAD</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => scrollTo(feedbackY)} style={styles.navGhostBtn}>
                    <Text style={styles.navGhostText}>FEEDBACK</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                onPress={() => router.push('/signin')}
                style={styles.navGhostBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.navGhostText}>SIGN IN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => scrollTo(signupY)}
                style={styles.navPrimaryBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.navPrimaryText}>CLAIM FREE YEAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Dynamic Hero Section */}
        <View style={styles.heroOuter}>
          <HexGridBackdrop />
          <View style={styles.heroInner}>
            <View style={styles.eyebrowPill}>
              <Sparkles size={13} color={BRAND.gold} />
              <Text style={styles.eyebrowText}>
                SMARTER TOOLS · UNFAIR RESULTS · {spotsRemaining} FOUNDING SPOTS LEFT
              </Text>
            </View>

            {/* Interactive Path Switcher */}
            <View style={styles.pathTabs}>
              {(Object.keys(PATH_CONTENT) as PathKey[]).map((key) => {
                const active = activePath === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.pathTab, active && styles.pathTabActive]}
                    onPress={() => setActivePath(key)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.pathTabText, active && styles.pathTabTextActive]}>
                      {PATH_CONTENT[key].label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.heroTitle, !isWide && styles.heroTitleMobile]}>
              {path.headline}
            </Text>

            <Text style={styles.heroBody}>{path.sub}</Text>

            <View style={[styles.heroCtas, !isWide && styles.heroCtasMobile]}>
              <TouchableOpacity
                style={styles.ctaPrimary}
                onPress={() => scrollTo(signupY)}
                activeOpacity={0.88}
              >
                <Text style={styles.ctaPrimaryText}>
                  {spotsRemaining > 0
                    ? `CLAIM 1 YEAR PRO FREE (${spotsRemaining}/10 LEFT)`
                    : 'START FREE 7-DAY TRIAL'}
                </Text>
                <ArrowRight size={17} color={BRAND.obsidian} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ctaSecondary}
                onPress={() => scrollTo(downloadY)}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaSecondaryText}>DOWNLOAD APP</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.proofGrid, !isWide && styles.proofGridMobile]}>
              {path.metrics.map((item) => (
                <View key={item.label} style={styles.proofCard}>
                  <Text style={styles.proofLabel}>{item.label}</Text>
                  <Text style={styles.proofValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Founding 10 Sign-Up Form Section */}
        <View
          style={styles.sectionOuter}
          onLayout={(e) => setSignupY(e.nativeEvent.layout.y)}
        >
          <View style={styles.sectionInner}>
            <View style={[styles.splitRow, isWide && styles.splitRowWide]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionEyebrow}>FOUNDING WARRIOR OFFER</Text>
                <Text style={[styles.sectionTitle, !isWide && styles.sectionTitleMobile]}>
                  FIRST 10 SIGN-UPS GET 1 YEAR OF VIKING PRO FREE
                </Text>
                <Text style={styles.sectionLead}>
                  Normally $149/year. Create your account below to lock in one of the{' '}
                  {spotsRemaining} remaining Founding Warrior spots (includes Premium + Pro)—no
                  credit card required.
                </Text>

                <View style={styles.offerBullets}>
                  {[
                    '24/7 Mimir AI Coach & Plate Photo Macro Scan (Pro)',
                    'AI meal & workout plans tuned to your macros & GLP-1 wave',
                    '1-tap Battlefield Pivots & AI Salvage My Day',
                    'GLP-1 Reverse-Diet Taper, Adaptive TDEE & Warband Raids',
                  ].map((b) => (
                    <View key={b} style={styles.tierFeatureRow}>
                      <Check size={16} color={BRAND.gold} />
                      <Text style={styles.tierFeatureText}>{b}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={[styles.formCard, isWide && { width: 460 }]}>
                <View style={styles.formHeaderRow}>
                  <Text style={styles.formTitle}>CREATE YOUR ACCOUNT</Text>
                  <View style={styles.spotsChip}>
                    <Text style={styles.spotsChipText}>{spotsRemaining}/10 LEFT</Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ragnar"
                  placeholderTextColor={BRAND.smoke}
                  value={name}
                  onChangeText={setName}
                />

                <Text style={styles.inputLabel}>EMAIL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="warrior@example.com"
                  placeholderTextColor={BRAND.smoke}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.inputLabel}>PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Minimum 8 characters"
                  placeholderTextColor={BRAND.smoke}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                <Text style={styles.inputLabel}>PRIMARY GOAL</Text>
                <View style={styles.chipRow}>
                  {(
                    [
                      { k: 'cut', l: 'Cut Fat' },
                      { k: 'build', l: 'Build Muscle' },
                      { k: 'recomp', l: 'Recomp' },
                      { k: 'maintain', l: 'Maintain' },
                    ] as const
                  ).map((g) => (
                    <TouchableOpacity
                      key={g.k}
                      style={[styles.choiceChip, goal === g.k && styles.choiceChipOn]}
                      onPress={() => setGoal(g.k)}
                    >
                      <Text
                        style={[styles.choiceChipText, goal === g.k && { color: BRAND.obsidian }]}
                      >
                        {g.l}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.glp1Toggle, onGlp1 && styles.glp1ToggleOn]}
                  onPress={() => setOnGlp1((v) => !v)}
                >
                  <Shield size={15} color={onGlp1 ? BRAND.obsidian : BRAND.gold} />
                  <Text style={[styles.glp1ToggleText, onGlp1 && { color: BRAND.obsidian }]}>
                    {onGlp1 ? '✓ GLP-1 Muscle Armor Enabled' : 'I’m on a GLP-1 (Ozempic / Zepbound)'}
                  </Text>
                </TouchableOpacity>

                {signupMsg && (
                  <Text
                    style={[
                      styles.formFeedback,
                      { color: signupMsg.type === 'ok' ? '#66BB6A' : BRAND.danger },
                    ]}
                  >
                    {signupMsg.text}
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleFoundingSignUp}
                  disabled={signingUp}
                  activeOpacity={0.85}
                >
                  {signingUp ? (
                    <ActivityIndicator size="small" color={BRAND.obsidian} />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {spotsRemaining > 0
                        ? 'CLAIM FREE YEAR & ENTER'
                        : 'CREATE ACCOUNT & START TRIAL'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Download Section */}
        <View
          style={[styles.sectionOuter, styles.altBand]}
          onLayout={(e) => setDownloadY(e.nativeEvent.layout.y)}
        >
          <View style={styles.sectionInner}>
            <Text style={styles.sectionEyebrow}>GET VIKING FITNESS</Text>
            <Text style={[styles.sectionTitle, !isWide && styles.sectionTitleMobile]}>
              DOWNLOAD & TRAIN ANYWHERE
            </Text>

            <View style={[styles.tiersRow, isWide && styles.tiersRowWide]}>
              <View style={[styles.downloadCard, isWide && { flex: 1 }]}>
                <Globe size={22} color={BRAND.gold} />
                <Text style={styles.downloadTitle}>Web App (Instant)</Text>
                <Text style={styles.downloadDesc}>
                  Run the full Viking Fitness app right in your desktop or mobile browser—zero
                  install required.
                </Text>
                <TouchableOpacity
                  style={styles.tierCta}
                  onPress={() => router.push('/onboarding')}
                >
                  <Text style={styles.tierCtaText}>LAUNCH WEB APP</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.downloadCard, styles.tierCardHighlight, isWide && { flex: 1 }]}>
                <Download size={22} color={BRAND.ember} />
                <Text style={styles.downloadTitle}>Android Direct APK</Text>
                <Text style={styles.downloadDesc}>
                  Direct Android install package from Dreki Solutions. Tap to download and install
                  on any Android phone.
                </Text>
                <TouchableOpacity
                  style={[styles.tierCta, styles.tierCtaHighlight]}
                  onPress={() => Linking.openURL(ANDROID_APK_URL)}
                >
                  <Text style={[styles.tierCtaText, { color: BRAND.obsidian }]}>
                    DOWNLOAD ANDROID APK
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.downloadCard, isWide && { flex: 1 }]}>
                <Smartphone size={22} color={BRAND.steel} />
                <Text style={styles.downloadTitle}>iPhone / iPad</Text>
                <Text style={styles.downloadDesc}>
                  Native iOS build is in preparation. Open the Web App in Safari and tap “Add to
                  Home Screen” for full-screen access.
                </Text>
                <TouchableOpacity
                  style={styles.tierCta}
                  onPress={() => router.push('/onboarding')}
                >
                  <Text style={styles.tierCtaText}>OPEN IN SAFARI</Text>
                </TouchableOpacity>
              </View>
            </View>
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
                    onPress={() =>
                      tier.route === '#signup'
                        ? scrollTo(signupY)
                        : router.push(tier.route as Href)
                    }
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

        {/* Feedback Form Section */}
        <View
          style={[styles.sectionOuter, styles.altBand]}
          onLayout={(e) => setFeedbackY(e.nativeEvent.layout.y)}
        >
          <View style={styles.sectionInner}>
            <View style={[styles.splitRow, isWide && styles.splitRowWide]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionEyebrow}>DIRECT LINE TO THE FORGE</Text>
                <Text style={[styles.sectionTitle, !isWide && styles.sectionTitleMobile]}>
                  REPORT A BUG OR SUGGEST A FEATURE
                </Text>
                <Text style={styles.sectionLead}>
                  Found a rough edge, have an improvement idea, or want a specific feature built?
                  Send it straight to our engineering queue.
                </Text>
              </View>

              <View style={[styles.formCard, isWide && { width: 520 }]}>
                <View style={styles.formHeaderRow}>
                  <Text style={styles.formTitle}>SUBMIT FEEDBACK</Text>
                  <MessageSquarePlus size={18} color={BRAND.gold} />
                </View>

                <Text style={styles.inputLabel}>TYPE</Text>
                <View style={styles.chipRow}>
                  {(
                    [
                      { k: 'bug', l: 'Bug Report', icon: Bug },
                      { k: 'improvement', l: 'Improvement', icon: Wrench },
                      { k: 'feature', l: 'Feature Idea', icon: Lightbulb },
                    ] as const
                  ).map((cat) => {
                    const Icon = cat.icon;
                    const active = fbCategory === cat.k;
                    return (
                      <TouchableOpacity
                        key={cat.k}
                        style={[styles.choiceChip, active && styles.choiceChipOn]}
                        onPress={() => setFbCategory(cat.k)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Icon size={13} color={active ? BRAND.obsidian : BRAND.gold} />
                          <Text
                            style={[styles.choiceChipText, active && { color: BRAND.obsidian }]}
                          >
                            {cat.l}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.inputLabel}>EMAIL (OPTIONAL)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="So we can follow up if needed"
                  placeholderTextColor={BRAND.smoke}
                  value={fbEmail}
                  onChangeText={setFbEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.inputLabel}>SUMMARY</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Short title (e.g. Barcode scan on iPhone Safari)"
                  placeholderTextColor={BRAND.smoke}
                  value={fbTitle}
                  onChangeText={setFbTitle}
                />

                <Text style={styles.inputLabel}>DETAILS</Text>
                <TextInput
                  style={[styles.input, { height: 92, textAlignVertical: 'top', paddingTop: 10 }]}
                  placeholder="Steps to reproduce, or what you'd like to see..."
                  placeholderTextColor={BRAND.smoke}
                  value={fbDetails}
                  onChangeText={setFbDetails}
                  multiline
                />

                {fbMsg && (
                  <Text
                    style={[
                      styles.formFeedback,
                      { color: fbMsg.type === 'ok' ? '#66BB6A' : BRAND.danger },
                    ]}
                  >
                    {fbMsg.text}
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.submitBtnGold}
                  onPress={handleFeedbackSubmit}
                  disabled={sendingFb}
                  activeOpacity={0.85}
                >
                  {sendingFb ? (
                    <ActivityIndicator size="small" color={BRAND.obsidian} />
                  ) : (
                    <Text style={styles.submitBtnText}>SEND FEEDBACK</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerOuter}>
          <View style={styles.footerInner}>
            <Image
              source={require('../assets/brand/dreki-logo-horizontal.webp')}
              style={styles.footerLogo}
              resizeMode="contain"
            />
            <Text style={styles.footerTagline}>
              Smarter Tools. Unfair Results. Total Dominance.
            </Text>
            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => scrollTo(signupY)}>
                <Text style={styles.footerLink}>Founding Offer</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => scrollTo(downloadY)}>
                <Text style={styles.footerLink}>Download</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => scrollTo(feedbackY)}>
                <Text style={styles.footerLink}>Feedback</Text>
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

  offerBar: {
    backgroundColor: BRAND.gold,
    paddingVertical: 9,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  offerBarText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: BRAND.obsidian,
    letterSpacing: 0.9,
    textAlign: 'center',
  },

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
    paddingVertical: 14,
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
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navGhostBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  navGhostText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: BRAND.ivory,
    letterSpacing: 0.8,
  },
  navPrimaryBtn: {
    backgroundColor: BRAND.ember,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  navPrimaryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: BRAND.obsidian,
    letterSpacing: 0.8,
  },

  heroOuter: {
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  hexWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroInner: {
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 56,
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
    marginBottom: 18,
  },
  eyebrowText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: BRAND.gold,
    letterSpacing: 1.2,
  },
  pathTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  pathTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.charcoal,
  },
  pathTabActive: {
    borderColor: BRAND.gold,
    backgroundColor: BRAND.goldTint10,
  },
  pathTabText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: BRAND.smoke },
  pathTabTextActive: { color: BRAND.gold },

  heroTitle: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 48,
    lineHeight: 56,
    color: BRAND.ivory,
    letterSpacing: 1,
    maxWidth: 840,
  },
  heroTitleMobile: { fontSize: 32, lineHeight: 40 },
  heroBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    lineHeight: 27,
    color: '#B8B8B8',
    maxWidth: 660,
    marginTop: 16,
  },
  heroCtas: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 28 },
  heroCtasMobile: { flexDirection: 'column', alignItems: 'stretch', width: '100%' },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: BRAND.ember,
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 8,
  },
  ctaPrimaryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: BRAND.obsidian,
    letterSpacing: 0.9,
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
    fontSize: 13,
    color: BRAND.ivory,
    letterSpacing: 0.9,
  },

  proofGrid: { flexDirection: 'row', gap: 14, marginTop: 40, width: '100%' },
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

  sectionOuter: { paddingVertical: 60 },
  altBand: {
    backgroundColor: '#0c0c0b',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BRAND.border,
  },
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
    fontSize: 34,
    lineHeight: 42,
    color: BRAND.ivory,
    marginTop: 8,
  },
  sectionTitleMobile: { fontSize: 26, lineHeight: 33 },
  sectionLead: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: '#A8A8A8',
    maxWidth: 560,
    marginTop: 10,
  },

  splitRow: { gap: 28 },
  splitRowWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 40 },
  offerBullets: { gap: 12, marginTop: 24 },

  formCard: {
    backgroundColor: BRAND.charcoal,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderTopWidth: 3,
    borderTopColor: BRAND.gold,
    borderRadius: 12,
    padding: 22,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  formTitle: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 17,
    color: BRAND.ivory,
    letterSpacing: 1,
  },
  spotsChip: {
    backgroundColor: BRAND.emberTint12,
    borderWidth: 1,
    borderColor: BRAND.ember,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  spotsChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: BRAND.ember,
    letterSpacing: 0.6,
  },
  inputLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: BRAND.smoke,
    letterSpacing: 1.2,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.obsidian,
    paddingHorizontal: 12,
    color: BRAND.ivory,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.obsidian,
  },
  choiceChipOn: { backgroundColor: BRAND.gold, borderColor: BRAND.gold },
  choiceChipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: BRAND.ivory },

  glp1Toggle: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.goldTint25,
    backgroundColor: BRAND.goldTint10,
  },
  glp1ToggleOn: { backgroundColor: BRAND.gold, borderColor: BRAND.gold },
  glp1ToggleText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: BRAND.ivory },

  formFeedback: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 12,
    lineHeight: 19,
  },
  submitBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 8,
    backgroundColor: BRAND.ember,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnGold: {
    marginTop: 16,
    height: 48,
    borderRadius: 8,
    backgroundColor: BRAND.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: BRAND.obsidian,
    letterSpacing: 1,
  },

  downloadCard: {
    backgroundColor: BRAND.charcoal,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderTopWidth: 3,
    borderTopColor: BRAND.gold,
    borderRadius: 12,
    padding: 22,
    gap: 10,
  },
  downloadTitle: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 18,
    color: BRAND.ivory,
  },
  downloadDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: '#B0B0B0',
    flex: 1,
    marginBottom: 8,
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
    borderColor: '#f5bf5091',
    borderTopColor: BRAND.goldPale,
    backgroundColor: '#1f1b15',
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
  tierCtaHighlight: { backgroundColor: BRAND.ember, borderColor: BRAND.ember },
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
  footerLink: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#A8A8A8' },
  footerCopy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: BRAND.smoke,
    marginTop: 6,
  },
});
