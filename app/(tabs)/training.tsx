import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Play, Clock, Flame, ChevronRight, Dumbbell } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { AIPlanCard } from '@/components/AIPlanCard';
import { colors, fonts, radius } from '@/constants/theme';

const SPLITS = ['PPL', 'Upper/Lower', 'Full Body', 'Bro Split'];

const WORKOUTS = [
  {
    id: '1',
    day: 'MONDAY',
    name: 'PUSH DAY A',
    muscle: 'Chest · Shoulders · Triceps',
    sets: 18,
    duration: '55 min',
    calories: 420,
    image: 'https://images.pexels.com/photos/4162487/pexels-photo-4162487.jpeg?auto=compress&cs=tinysrgb&w=600',
    isToday: true,
  },
  {
    id: '2',
    day: 'TUESDAY',
    name: 'PULL DAY A',
    muscle: 'Back · Biceps · Rear Delts',
    sets: 20,
    duration: '60 min',
    calories: 450,
    image: 'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=600',
    isToday: false,
  },
  {
    id: '3',
    day: 'WEDNESDAY',
    name: 'LEG DAY A',
    muscle: 'Quads · Hamstrings · Calves',
    sets: 22,
    duration: '65 min',
    calories: 540,
    image: 'https://images.pexels.com/photos/4162579/pexels-photo-4162579.jpeg?auto=compress&cs=tinysrgb&w=600',
    isToday: false,
  },
  {
    id: '4',
    day: 'FRIDAY',
    name: 'PUSH DAY B',
    muscle: 'Shoulders · Chest · Triceps',
    sets: 18,
    duration: '55 min',
    calories: 400,
    image: 'https://images.pexels.com/photos/3289711/pexels-photo-3289711.jpeg?auto=compress&cs=tinysrgb&w=600',
    isToday: false,
  },
];

const EXERCISES = [
  { name: 'Barbell Bench Press', sets: '4 × 8', rest: '3 min', muscle: 'Chest' },
  { name: 'Incline DB Press', sets: '3 × 10', rest: '2 min', muscle: 'Upper Chest' },
  { name: 'OHP (Barbell)', sets: '4 × 8', rest: '3 min', muscle: 'Shoulders' },
  { name: 'Lateral Raises', sets: '4 × 15', rest: '1.5 min', muscle: 'Side Delts' },
  { name: 'Tricep Pushdown', sets: '3 × 12', rest: '1.5 min', muscle: 'Triceps' },
  { name: 'Overhead Ext.', sets: '3 × 12', rest: '1.5 min', muscle: 'Triceps' },
];

export default function TrainingScreen() {
  const [activeSplit, setActiveSplit] = useState('PPL');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>TRAINING</Text>
          <Text style={styles.headerSub}>Forge Your Legacy</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.splitRow}>
          {SPLITS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.splitChip, activeSplit === s && styles.splitChipActive]}
              onPress={() => setActiveSplit(s)}
            >
              <Text style={[styles.splitChipText, activeSplit === s && styles.splitChipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <AIPlanCard type="workout" />

        <Text style={styles.sectionTitle}>THIS WEEK'S SCHEDULE</Text>
        <View style={styles.workoutList}>
          {WORKOUTS.map((w) => (
            <TouchableOpacity key={w.id} activeOpacity={0.85}>
              <Card
                glowColor={w.isToday ? 'gold' : 'none'}
                style={[styles.workoutCard, w.isToday && styles.workoutCardToday]}
              >
                <Image source={{ uri: w.image }} style={styles.workoutImg} resizeMode="cover" />
                <View style={styles.workoutOverlay} />
                <View style={styles.workoutInfo}>
                  <View style={styles.workoutTop}>
                    <Text style={styles.workoutDay}>{w.day}</Text>
                    {w.isToday && (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeText}>TODAY</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.workoutName}>{w.name}</Text>
                  <Text style={styles.workoutMuscle}>{w.muscle}</Text>
                  <View style={styles.workoutMeta}>
                    <View style={styles.metaStat}>
                      <Clock size={12} color={colors.muted} />
                      <Text style={styles.metaText}>{w.duration}</Text>
                    </View>
                    <View style={styles.metaStat}>
                      <Dumbbell size={12} color={colors.muted} />
                      <Text style={styles.metaText}>{w.sets} sets</Text>
                    </View>
                    <View style={styles.metaStat}>
                      <Flame size={12} color={colors.muted} />
                      <Text style={styles.metaText}>{w.calories} kcal</Text>
                    </View>
                  </View>
                </View>
                {w.isToday && (
                  <TouchableOpacity style={styles.startBtn}>
                    <Play size={16} color={colors.black} fill={colors.black} />
                    <Text style={styles.startBtnText}>START</Text>
                  </TouchableOpacity>
                )}
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>TODAY'S EXERCISES</Text>
        <Card style={styles.exerciseCard}>
          {EXERCISES.map((ex, idx) => (
            <React.Fragment key={ex.name}>
              <TouchableOpacity style={styles.exerciseRow} activeOpacity={0.7}>
                <View style={styles.exerciseNum}>
                  <Text style={styles.exerciseNumText}>{idx + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <Text style={styles.exerciseMuscle}>{ex.muscle}</Text>
                </View>
                <View style={styles.exerciseRight}>
                  <Text style={styles.exerciseSets}>{ex.sets}</Text>
                  <Text style={styles.exerciseRest}>{ex.rest} rest</Text>
                </View>
              </TouchableOpacity>
              {idx < EXERCISES.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
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
  splitRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  splitChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  splitChipActive: {
    borderColor: colors.blue,
    backgroundColor: 'rgba(75, 163, 255, 0.1)',
  },
  splitChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.muted,
  },
  splitChipTextActive: { color: colors.blue },
  sectionTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 2,
    marginBottom: 12,
  },
  workoutList: { gap: 12, marginBottom: 24 },
  workoutCard: { padding: 0, overflow: 'hidden' },
  workoutCardToday: {},
  workoutImg: {
    width: '100%',
    height: 100,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  workoutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(11,11,13,0.7)',
  },
  workoutInfo: { padding: 14, paddingTop: 12, marginTop: 70 },
  workoutTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  workoutDay: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 2,
  },
  todayBadge: {
    backgroundColor: colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  todayBadgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    color: colors.black,
    letterSpacing: 1,
  },
  workoutName: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.white,
    letterSpacing: 1,
    lineHeight: 28,
  },
  workoutMuscle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 8,
  },
  workoutMeta: { flexDirection: 'row', gap: 16 },
  metaStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.gold,
    margin: 14,
    marginTop: 0,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  startBtnText: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.black,
    letterSpacing: 1,
  },
  exerciseCard: { padding: 0, overflow: 'hidden' },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  exerciseNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.muted,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.frost,
  },
  exerciseMuscle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  exerciseRight: { alignItems: 'flex-end' },
  exerciseSets: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.blue,
  },
  exerciseRest: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
});
