import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { useOnboardingStore } from '@/store/onboarding';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, fonts, radius } from '@/constants/theme';

const ACTIVITY_LEVELS = [
  { label: 'Sedentary', desc: 'Desk job, little exercise', multiplier: 1.2 },
  { label: 'Lightly Active', desc: '1–3 workouts per week', multiplier: 1.375 },
  { label: 'Moderately Active', desc: '3–5 workouts per week', multiplier: 1.55 },
  { label: 'Very Active', desc: '6–7 days per week', multiplier: 1.725 },
  { label: 'Extremely Active', desc: 'Physical job + daily training', multiplier: 1.9 },
];

export default function BodyScreen() {
  const router = useRouter();
  const { heightFt, heightIn, weightLbs, activityLevel, setField } = useOnboardingStore();

  const [unit, setUnit] = useState<'imperial' | 'metric'>('imperial');
  const [localFt, setLocalFt] = useState(heightFt > 0 ? String(heightFt) : '');
  const [localIn, setLocalIn] = useState(heightIn >= 0 && heightFt > 0 ? String(heightIn) : '');
  const [localCm, setLocalCm] = useState('');
  const [localWeightLbs, setLocalWeightLbs] = useState(weightLbs > 0 ? String(weightLbs) : '');
  const [localWeightKg, setLocalWeightKg] = useState('');
  const [localActivity, setLocalActivity] = useState(activityLevel || 1.55);

  const heightFilled =
    unit === 'imperial'
      ? localFt.length > 0 && localIn.length > 0
      : localCm.length > 0;
  const weightFilled =
    unit === 'imperial' ? localWeightLbs.length > 0 : localWeightKg.length > 0;
  const canContinue = heightFilled && weightFilled;

  const handleContinue = () => {
    let ft: number, inches: number, lbs: number;
    if (unit === 'imperial') {
      ft = Number(localFt);
      inches = Number(localIn);
      lbs = Number(localWeightLbs);
    } else {
      const totalInches = Math.round(Number(localCm) / 2.54);
      ft = Math.floor(totalInches / 12);
      inches = totalInches % 12;
      lbs = Math.round(Number(localWeightKg) * 2.20462);
    }
    setField('heightFt', ft);
    setField('heightIn', inches);
    setField('weightLbs', lbs);
    setField('activityLevel', localActivity);
    const selected = ACTIVITY_LEVELS.find((l) => l.multiplier === localActivity);
    setField('activityLabel', selected?.label ?? 'Moderately Active');
    router.push('/onboarding/goal');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
          <StatusBar style="light" backgroundColor={colors.black} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
              <ChevronLeft size={24} color={colors.blue} />
            </TouchableOpacity>
            <View style={styles.dots}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.dot, i === 1 && styles.dotActive]} />
              ))}
            </View>
            <View style={styles.backBtn} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.eyebrow}>YOUR</Text>
            <Text style={styles.title}>BODY</Text>

            {/* Body Stats Card */}
            <Card style={styles.card}>
              {/* Unit toggle */}
              <View style={styles.unitToggleRow}>
                <Text style={styles.cardSectionLabel}>BODY STATS</Text>
                <View style={styles.unitToggle}>
                  {(['imperial', 'metric'] as const).map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                      onPress={() => setUnit(u)}
                    >
                      <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>
                        {u === 'imperial' ? 'Imperial' : 'Metric'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Height */}
              <Text style={styles.fieldLabel}>HEIGHT</Text>
              {unit === 'imperial' ? (
                <View style={styles.heightRow}>
                  <View style={styles.heightInputWrap}>
                    <TextInput
                      style={styles.bigInput}
                      placeholder="5"
                      placeholderTextColor={colors.muted}
                      value={localFt}
                      onChangeText={setLocalFt}
                      keyboardType="number-pad"
                      maxLength={1}
                      textAlign="center"
                    />
                    <Text style={styles.inputUnit}>ft</Text>
                  </View>
                  <View style={styles.heightInputWrap}>
                    <TextInput
                      style={styles.bigInput}
                      placeholder="10"
                      placeholderTextColor={colors.muted}
                      value={localIn}
                      onChangeText={setLocalIn}
                      keyboardType="number-pad"
                      maxLength={2}
                      textAlign="center"
                    />
                    <Text style={styles.inputUnit}>in</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.singleInputRow}>
                  <TextInput
                    style={styles.bigInput}
                    placeholder="178"
                    placeholderTextColor={colors.muted}
                    value={localCm}
                    onChangeText={setLocalCm}
                    keyboardType="number-pad"
                    maxLength={3}
                    textAlign="center"
                  />
                  <Text style={styles.inputUnit}>cm</Text>
                </View>
              )}

              {/* Weight */}
              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>WEIGHT</Text>
              <View style={styles.singleInputRow}>
                <TextInput
                  style={styles.bigInput}
                  placeholder={unit === 'imperial' ? '180' : '82'}
                  placeholderTextColor={colors.muted}
                  value={unit === 'imperial' ? localWeightLbs : localWeightKg}
                  onChangeText={unit === 'imperial' ? setLocalWeightLbs : setLocalWeightKg}
                  keyboardType="decimal-pad"
                  maxLength={5}
                  textAlign="center"
                />
                <Text style={styles.inputUnit}>{unit === 'imperial' ? 'lbs' : 'kg'}</Text>
              </View>
            </Card>

            {/* Activity Card */}
            <Card style={[styles.card, { marginTop: 16 }]}>
              <Text style={styles.cardSectionLabel}>YOUR LIFESTYLE</Text>
              <Text style={styles.fieldLabel}>HOW ACTIVE ARE YOU?</Text>
              {ACTIVITY_LEVELS.map((level, idx) => (
                <React.Fragment key={level.multiplier}>
                  <TouchableOpacity
                    style={styles.activityRow}
                    onPress={() => setLocalActivity(level.multiplier)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radio, localActivity === level.multiplier && styles.radioActive]}>
                      {localActivity === level.multiplier && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={[styles.activityName, localActivity === level.multiplier && styles.activityNameActive]}>
                        {level.label}
                      </Text>
                      <Text style={styles.activityDesc}>{level.desc}</Text>
                    </View>
                  </TouchableOpacity>
                  {idx < ACTIVITY_LEVELS.length - 1 && <View style={styles.rowDivider} />}
                </React.Fragment>
              ))}
            </Card>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label="CONTINUE"
              onPress={handleContinue}
              variant="primary"
              disabled={!canContinue}
              fullWidth
            />
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  eyebrow: {
    fontFamily: fonts.headingLight,
    fontSize: 18,
    color: colors.muted,
    letterSpacing: 2,
    marginTop: 8,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 48,
    color: colors.frost,
    lineHeight: 50,
    marginTop: 2,
    marginBottom: 0,
  },
  card: { marginTop: 20, padding: 20 },
  unitToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cardSectionLabel: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 2,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.full,
    padding: 3,
    gap: 2,
  },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  unitBtnActive: { backgroundColor: colors.blue },
  unitBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.muted,
  },
  unitBtnTextActive: { color: colors.black },
  fieldLabel: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 2,
    marginBottom: 12,
  },
  heightRow: { flexDirection: 'row', gap: 16 },
  heightInputWrap: { alignItems: 'center', gap: 6 },
  singleInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigInput: {
    width: 64,
    height: 52,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    fontSize: 28,
    fontFamily: fonts.bodyMedium,
    color: colors.frost,
  },
  inputUnit: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    gap: 14,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.blue },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.blue,
  },
  activityInfo: { flex: 1 },
  activityName: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 15,
    color: colors.frost,
  },
  activityNameActive: { color: colors.blue },
  activityDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  rowDivider: { height: 1, backgroundColor: colors.border },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
});
