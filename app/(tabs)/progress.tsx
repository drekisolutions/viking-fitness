import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TrendingUp, TrendingDown, Minus, Award } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { colors, fonts, radius } from '@/constants/theme';

const { width } = Dimensions.get('window');

const PERIODS = ['1W', '1M', '3M', '6M', '1Y'];

const WEIGHT_DATA = [181, 180.5, 179.8, 179, 178.5, 178, 177.3];
const LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MEASUREMENTS = [
  { label: 'Weight', current: '177.3 lbs', change: -3.7, unit: 'lbs', trend: 'down' },
  { label: 'Body Fat', current: '16.2%', change: -1.3, unit: '%', trend: 'down' },
  { label: 'Muscle Mass', current: '148 lbs', change: +1.2, unit: 'lbs', trend: 'up' },
  { label: 'BMI', current: '25.4', change: -0.5, unit: '', trend: 'down' },
];

const STRENGTH_PRS = [
  { lift: 'Bench Press', weight: '225 lbs', reps: '3 reps', date: 'May 12' },
  { lift: 'Squat', weight: '315 lbs', reps: '2 reps', date: 'May 8' },
  { lift: 'Deadlift', weight: '365 lbs', reps: '1 rep', date: 'Apr 30' },
  { lift: 'OHP', weight: '145 lbs', reps: '3 reps', date: 'May 10' },
];

const maxWeight = Math.max(...WEIGHT_DATA);
const minWeight = Math.min(...WEIGHT_DATA);
const range = maxWeight - minWeight || 1;

export default function ProgressScreen() {
  const [activePeriod, setActivePeriod] = useState('1W');

  const chartHeight = 100;
  const chartWidth = width - 40 - 32;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PROGRESS</Text>
          <Text style={styles.headerSub}>Track Your Gains</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card glowColor="blue" style={styles.weightCard}>
          <View style={styles.cardTopRow}>
            <View>
              <Text style={styles.cardLabel}>CURRENT WEIGHT</Text>
              <Text style={styles.bigValue}>177.3 <Text style={styles.bigUnit}>lbs</Text></Text>
            </View>
            <View style={styles.changeBadge}>
              <TrendingDown size={14} color="#4CAF50" />
              <Text style={styles.changeText}>-3.7 lbs</Text>
              <Text style={styles.changePeriod}>this month</Text>
            </View>
          </View>

          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodChip, activePeriod === p && styles.periodChipActive]}
                onPress={() => setActivePeriod(p)}
              >
                <Text style={[styles.periodText, activePeriod === p && styles.periodTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.chart, { height: chartHeight + 40 }]}>
            <View style={{ height: chartHeight, position: 'relative', flexDirection: 'row', alignItems: 'flex-end' }}>
              {WEIGHT_DATA.map((val, idx) => {
                const barH = ((val - minWeight) / range) * (chartHeight - 20) + 20;
                const isLast = idx === WEIGHT_DATA.length - 1;
                return (
                  <View
                    key={idx}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: barH,
                        borderRadius: 3,
                        backgroundColor: isLast ? colors.blue : `${colors.blue}40`,
                      }}
                    />
                  </View>
                );
              })}
            </View>
            <View style={styles.chartLabels}>
              {LABELS.map((l) => (
                <Text key={l} style={styles.chartLabel}>{l}</Text>
              ))}
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>BODY MEASUREMENTS</Text>
        <View style={styles.measureGrid}>
          {MEASUREMENTS.map((m) => (
            <Card key={m.label} style={styles.measureCard}>
              <Text style={styles.measureLabel}>{m.label}</Text>
              <Text style={styles.measureValue}>{m.current}</Text>
              <View style={styles.measureChange}>
                {m.trend === 'up' ? (
                  <TrendingUp size={12} color={m.label === 'Muscle Mass' ? '#4CAF50' : colors.red} />
                ) : m.trend === 'down' ? (
                  <TrendingDown size={12} color={m.label === 'Body Fat' || m.label === 'Weight' || m.label === 'BMI' ? '#4CAF50' : colors.red} />
                ) : (
                  <Minus size={12} color={colors.muted} />
                )}
                <Text
                  style={[
                    styles.measureChangeText,
                    { color: m.change < 0 ? '#4CAF50' : m.change > 0 && m.label === 'Muscle Mass' ? '#4CAF50' : colors.gold },
                  ]}
                >
                  {m.change > 0 ? '+' : ''}{m.change}{m.unit}
                </Text>
              </View>
            </Card>
          ))}
        </View>

        <Text style={styles.sectionTitle}>STRENGTH RECORDS</Text>
        <Card style={styles.prsCard}>
          {STRENGTH_PRS.map((pr, idx) => (
            <React.Fragment key={pr.lift}>
              <View style={styles.prRow}>
                <View style={styles.prIcon}>
                  <Award size={18} color={colors.gold} />
                </View>
                <View style={styles.prInfo}>
                  <Text style={styles.prLift}>{pr.lift}</Text>
                  <Text style={styles.prDate}>{pr.date}</Text>
                </View>
                <View style={styles.prResult}>
                  <Text style={styles.prWeight}>{pr.weight}</Text>
                  <Text style={styles.prReps}>{pr.reps}</Text>
                </View>
              </View>
              {idx < STRENGTH_PRS.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </Card>

        <Text style={styles.sectionTitle}>CONSISTENCY STREAK</Text>
        <Card glowColor="gold" style={styles.streakCard}>
          <View style={styles.streakTop}>
            <Text style={styles.streakValue}>14</Text>
            <Text style={styles.streakUnit}>day streak</Text>
          </View>
          <Text style={styles.streakNote}>Keep going — your best was 21 days!</Text>
          <View style={styles.streakDots}>
            {Array.from({ length: 21 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.streakDot,
                  i < 14 && styles.streakDotFilled,
                  i === 13 && styles.streakDotToday,
                ]}
              />
            ))}
          </View>
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  safeArea: { backgroundColor: colors.black },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.white,
    letterSpacing: 2,
    lineHeight: 40,
  },
  headerSub: {
    fontFamily: fonts.headingLight,
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 3,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  weightCard: { marginBottom: 24 },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 2,
    marginBottom: 6,
  },
  bigValue: {
    fontFamily: fonts.display,
    fontSize: 48,
    color: colors.white,
    lineHeight: 48,
  },
  bigUnit: {
    fontSize: 22,
    color: colors.muted,
  },
  changeBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.25)',
    borderRadius: radius.sm,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: '#4CAF50',
  },
  changePeriod: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  periodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodChipActive: {
    borderColor: colors.blue,
    backgroundColor: 'rgba(75,163,255,0.1)',
  },
  periodText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.muted,
  },
  periodTextActive: { color: colors.blue },
  chart: { overflow: 'hidden' },
  chartLabels: {
    flexDirection: 'row',
    marginTop: 8,
  },
  chartLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
  },
  sectionTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 2,
    marginBottom: 12,
  },
  measureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  measureCard: {
    width: '47%',
    gap: 4,
  },
  measureLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1,
  },
  measureValue: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.frost,
    marginTop: 4,
  },
  measureChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  measureChangeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  prsCard: { padding: 0, overflow: 'hidden', marginBottom: 24 },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  prIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(214, 167, 86, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prInfo: { flex: 1 },
  prLift: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.frost },
  prDate: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  prResult: { alignItems: 'flex-end' },
  prWeight: { fontFamily: fonts.heading, fontSize: 16, color: colors.gold },
  prReps: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
  streakCard: { marginBottom: 24 },
  streakTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 4,
  },
  streakValue: {
    fontFamily: fonts.display,
    fontSize: 64,
    color: colors.gold,
    lineHeight: 64,
  },
  streakUnit: {
    fontFamily: fonts.headingLight,
    fontSize: 18,
    color: colors.muted,
    marginBottom: 10,
  },
  streakNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginBottom: 16,
    lineHeight: 19,
  },
  streakDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  streakDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  streakDotFilled: { backgroundColor: `${colors.gold}60` },
  streakDotToday: { backgroundColor: colors.gold },
});
