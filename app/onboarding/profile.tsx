import React, { useEffect, useRef, useState } from 'react';
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

export default function ProfileScreen() {
  const router = useRouter();
  const { name, age, sex, setField } = useOnboardingStore();

  const [localName, setLocalName] = useState(name);
  const [localAge, setLocalAge] = useState(age > 0 ? String(age) : '');
  const [localSex, setLocalSex] = useState<'male' | 'female'>(sex);

  const nameRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const canContinue =
    localName.trim().length > 0 &&
    localAge.length > 0 &&
    Number(localAge) >= 13 &&
    Number(localAge) <= 100;

  const handleContinue = () => {
    setField('name', localName.trim());
    setField('age', Number(localAge));
    setField('sex', localSex);
    router.push('/onboarding/body');
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
                <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
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
            <Text style={styles.eyebrow}>WHAT'S YOUR</Text>
            <Text style={styles.title}>PROFILE?</Text>
            <Text style={styles.subtitle}>Tell us who you are, warrior.</Text>

            <Card style={styles.card}>
              {/* Name */}
              <Text style={styles.fieldLabel}>YOUR NAME</Text>
              <TextInput
                ref={nameRef}
                style={styles.fieldInput}
                placeholder="Enter your name"
                placeholderTextColor={colors.muted}
                value={localName}
                onChangeText={setLocalName}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => {}}
              />

              <View style={styles.divider} />

              {/* Age + Sex row */}
              <View style={styles.row}>
                {/* Age */}
                <View style={styles.ageField}>
                  <Text style={styles.fieldLabel}>AGE</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="25"
                    placeholderTextColor={colors.muted}
                    value={localAge}
                    onChangeText={setLocalAge}
                    keyboardType="number-pad"
                    maxLength={3}
                    returnKeyType="done"
                  />
                </View>

                {/* Sex */}
                <View style={styles.sexField}>
                  <Text style={styles.fieldLabel}>BIOLOGICAL SEX</Text>
                  <View style={styles.sexToggle}>
                    {(['male', 'female'] as const).map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.sexBtn, localSex === s && styles.sexBtnActive]}
                        onPress={() => setLocalSex(s)}
                      >
                        <Text style={[styles.sexBtnText, localSex === s && styles.sexBtnTextActive]}>
                          {s === 'male' ? 'M' : 'F'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </Card>
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.note}>Used only for accurate caloric calculations</Text>
            <View style={{ height: 12 }} />
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.blue,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
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
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    marginTop: 8,
    marginBottom: 0,
  },
  card: {
    marginTop: 32,
    padding: 20,
  },
  fieldLabel: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  fieldInput: {
    fontSize: 22,
    fontFamily: fonts.bodyMedium,
    color: colors.frost,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  ageField: {
    flex: 1,
  },
  sexField: {
    flex: 1,
  },
  sexToggle: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  sexBtn: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  sexBtnActive: {
    backgroundColor: colors.blue,
  },
  sexBtnText: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.muted,
  },
  sexBtnTextActive: {
    color: colors.black,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
  },
});
