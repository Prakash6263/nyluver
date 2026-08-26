import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Platform, KeyboardAvoidingView, ScrollView, ActivityIndicator, Modal, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';

interface CountryCode {
  name: string;
  nameAr: string;
  code: string;
  dial: string;
  flag: string;
  priority: number;
}

const COUNTRY_CODES: CountryCode[] = [
  { name: 'Libya', nameAr: 'ليبيا', code: 'LY', dial: '+218', flag: '\u{1F1F1}\u{1F1FE}', priority: 0 },
  { name: 'Tunisia', nameAr: 'تونس', code: 'TN', dial: '+216', flag: '\u{1F1F9}\u{1F1F3}', priority: 1 },
  { name: 'Egypt', nameAr: 'مصر', code: 'EG', dial: '+20', flag: '\u{1F1EA}\u{1F1EC}', priority: 1 },
  { name: 'Algeria', nameAr: 'الجزائر', code: 'DZ', dial: '+213', flag: '\u{1F1E9}\u{1F1FF}', priority: 1 },
  { name: 'Morocco', nameAr: 'المغرب', code: 'MA', dial: '+212', flag: '\u{1F1F2}\u{1F1E6}', priority: 1 },
  { name: 'Saudi Arabia', nameAr: 'السعودية', code: 'SA', dial: '+966', flag: '\u{1F1F8}\u{1F1E6}', priority: 2 },
  { name: 'UAE', nameAr: 'الإمارات', code: 'AE', dial: '+971', flag: '\u{1F1E6}\u{1F1EA}', priority: 2 },
  { name: 'Qatar', nameAr: 'قطر', code: 'QA', dial: '+974', flag: '\u{1F1F6}\u{1F1E6}', priority: 2 },
  { name: 'Kuwait', nameAr: 'الكويت', code: 'KW', dial: '+965', flag: '\u{1F1F0}\u{1F1FC}', priority: 2 },
  { name: 'Bahrain', nameAr: 'البحرين', code: 'BH', dial: '+973', flag: '\u{1F1E7}\u{1F1ED}', priority: 2 },
  { name: 'Oman', nameAr: 'عمان', code: 'OM', dial: '+968', flag: '\u{1F1F4}\u{1F1F2}', priority: 2 },
  { name: 'Jordan', nameAr: 'الأردن', code: 'JO', dial: '+962', flag: '\u{1F1EF}\u{1F1F4}', priority: 2 },
  { name: 'Lebanon', nameAr: 'لبنان', code: 'LB', dial: '+961', flag: '\u{1F1F1}\u{1F1E7}', priority: 2 },
  { name: 'Iraq', nameAr: 'العراق', code: 'IQ', dial: '+964', flag: '\u{1F1EE}\u{1F1F6}', priority: 2 },
  { name: 'Sudan', nameAr: 'السودان', code: 'SD', dial: '+249', flag: '\u{1F1F8}\u{1F1E9}', priority: 2 },
  { name: 'Palestine', nameAr: 'فلسطين', code: 'PS', dial: '+970', flag: '\u{1F1F5}\u{1F1F8}', priority: 2 },
  { name: 'Turkey', nameAr: 'تركيا', code: 'TR', dial: '+90', flag: '\u{1F1F9}\u{1F1F7}', priority: 3 },
  { name: 'United Kingdom', nameAr: 'بريطانيا', code: 'GB', dial: '+44', flag: '\u{1F1EC}\u{1F1E7}', priority: 3 },
  { name: 'United States', nameAr: 'أمريكا', code: 'US', dial: '+1', flag: '\u{1F1FA}\u{1F1F8}', priority: 3 },
  { name: 'Germany', nameAr: 'ألمانيا', code: 'DE', dial: '+49', flag: '\u{1F1E9}\u{1F1EA}', priority: 3 },
  { name: 'France', nameAr: 'فرنسا', code: 'FR', dial: '+33', flag: '\u{1F1EB}\u{1F1F7}', priority: 3 },
  { name: 'Italy', nameAr: 'إيطاليا', code: 'IT', dial: '+39', flag: '\u{1F1EE}\u{1F1F9}', priority: 3 },
  { name: 'Spain', nameAr: 'إسبانيا', code: 'ES', dial: '+34', flag: '\u{1F1EA}\u{1F1F8}', priority: 3 },
  { name: 'Canada', nameAr: 'كندا', code: 'CA', dial: '+1', flag: '\u{1F1E8}\u{1F1E6}', priority: 3 },
  { name: 'Australia', nameAr: 'أستراليا', code: 'AU', dial: '+61', flag: '\u{1F1E6}\u{1F1FA}', priority: 3 },
  { name: 'India', nameAr: 'الهند', code: 'IN', dial: '+91', flag: '\u{1F1EE}\u{1F1F3}', priority: 4 },
  { name: 'Pakistan', nameAr: 'باكستان', code: 'PK', dial: '+92', flag: '\u{1F1F5}\u{1F1F0}', priority: 4 },
  { name: 'Bangladesh', nameAr: 'بنغلاديش', code: 'BD', dial: '+880', flag: '\u{1F1E7}\u{1F1E9}', priority: 4 },
  { name: 'Philippines', nameAr: 'الفلبين', code: 'PH', dial: '+63', flag: '\u{1F1F5}\u{1F1ED}', priority: 4 },
  { name: 'Nigeria', nameAr: 'نيجيريا', code: 'NG', dial: '+234', flag: '\u{1F1F3}\u{1F1EC}', priority: 4 },
  { name: 'South Africa', nameAr: 'جنوب أفريقيا', code: 'ZA', dial: '+27', flag: '\u{1F1FF}\u{1F1E6}', priority: 4 },
  { name: 'China', nameAr: 'الصين', code: 'CN', dial: '+86', flag: '\u{1F1E8}\u{1F1F3}', priority: 4 },
  { name: 'Japan', nameAr: 'اليابان', code: 'JP', dial: '+81', flag: '\u{1F1EF}\u{1F1F5}', priority: 4 },
  { name: 'South Korea', nameAr: 'كوريا الجنوبية', code: 'KR', dial: '+82', flag: '\u{1F1F0}\u{1F1F7}', priority: 4 },
  { name: 'Brazil', nameAr: 'البرازيل', code: 'BR', dial: '+55', flag: '\u{1F1E7}\u{1F1F7}', priority: 4 },
  { name: 'Mexico', nameAr: 'المكسيك', code: 'MX', dial: '+52', flag: '\u{1F1F2}\u{1F1FD}', priority: 4 },
  { name: 'Russia', nameAr: 'روسيا', code: 'RU', dial: '+7', flag: '\u{1F1F7}\u{1F1FA}', priority: 4 },
  { name: 'Netherlands', nameAr: 'هولندا', code: 'NL', dial: '+31', flag: '\u{1F1F3}\u{1F1F1}', priority: 4 },
  { name: 'Sweden', nameAr: 'السويد', code: 'SE', dial: '+46', flag: '\u{1F1F8}\u{1F1EA}', priority: 4 },
  { name: 'Switzerland', nameAr: 'سويسرا', code: 'CH', dial: '+41', flag: '\u{1F1E8}\u{1F1ED}', priority: 4 },
  { name: 'Malaysia', nameAr: 'ماليزيا', code: 'MY', dial: '+60', flag: '\u{1F1F2}\u{1F1FE}', priority: 4 },
];

function CountryCodePicker({ selected, onSelect, isRTL, lang }: {
  selected: CountryCode;
  onSelect: (c: CountryCode) => void;
  isRTL: boolean;
  lang: string;
}) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? COUNTRY_CODES.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.nameAr.includes(q) ||
          c.dial.includes(q) ||
          c.code.toLowerCase().includes(q)
        )
      : COUNTRY_CODES;
    return [...list].sort((a, b) => a.priority - b.priority);
  }, [search]);

  return (
    <>
      <Pressable
        onPress={() => { setVisible(true); setSearch(''); }}
        style={styles.codePickerBtn}
      >
        <Text style={styles.codePickerFlag}>{selected.flag}</Text>
        <Text style={styles.codePickerDial}>{selected.dial}</Text>
        <Feather name="chevron-down" size={14} color={Colors.textTertiary} />
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismiss} onPress={() => setVisible(false)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {lang === 'ar' ? 'اختر رمز البلد' : 'Select Country Code'}
              </Text>
              <Pressable onPress={() => setVisible(false)} style={styles.modalClose}>
                <Feather name="x" size={22} color={Colors.text} />
              </Pressable>
            </View>

            <View style={styles.searchWrapper}>
              <Feather name="search" size={16} color={Colors.textTertiary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                style={[styles.searchInput, isRTL && { textAlign: 'right' }]}
                placeholder={lang === 'ar' ? 'ابحث عن بلد...' : 'Search country...'}
                placeholderTextColor={Colors.textTertiary}
                autoCorrect={false}
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.code === selected.code;
                return (
                  <Pressable
                    onPress={() => {
                      onSelect(item);
                      setVisible(false);
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.countryRow,
                      isSelected && styles.countryRowSelected,
                      isRTL && { flexDirection: 'row-reverse' },
                    ]}
                  >
                    <Text style={styles.countryFlag}>{item.flag}</Text>
                    <View style={[styles.countryInfo, isRTL && { alignItems: 'flex-end' }]}>
                      <Text style={[styles.countryName, isSelected && { color: Colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                        {lang === 'ar' ? item.nameAr : item.name}
                      </Text>
                      <Text style={styles.countryDial}>{item.dial}</Text>
                    </View>
                    {isSelected && (
                      <Feather name="check" size={18} color={Colors.primary} />
                    )}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function AuthScreen() {
  const { t, lang, isRTL } = useApp();
  const { signIn, sendSignUpOtp, verifySignUp } = useAuth();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const canSubmit = mode === 'signin'
    ? email.trim().length > 0 && phone.trim().length > 0
    : step === 'verify'
      ? otpCode.trim().length === 6
      : email.trim().length > 0 && fullName.trim().length > 0 && phone.trim().length > 0;

  const getFullPhone = () => {
    let num = phone.trim().replace(/[\s\-()]/g, '');
    if (num.startsWith('0')) num = num.slice(1);
    return countryCode.dial + num;
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setError('');
    setLoading(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const fullPhone = getFullPhone();

    try {
      if (mode === 'signin') {
        const result = await signIn(email.trim(), fullPhone);
        if (result.error) {
          setError(result.error);
        } else {
          router.replace('/(tabs)');
        }
      } else if (step === 'details') {
        const result = await sendSignUpOtp(fullName.trim(), email.trim(), fullPhone);
        if (result.error) {
          setError(result.error);
        } else {
          setVerifiedPhone(result.phone || fullPhone);
          setStep('verify');
          startResendTimer();
        }
      } else {
        const result = await verifySignUp(fullName.trim(), email.trim(), verifiedPhone || fullPhone, otpCode.trim());
        if (result.error) {
          setError(result.error);
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (e: any) {
      setError(e.message || t('authError'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      const fullPhone = getFullPhone();
      const result = await sendSignUpOtp(fullName.trim(), email.trim(), fullPhone);
      if (result.error) {
        setError(result.error);
      } else {
        startResendTimer();
      }
    } catch (e: any) {
      setError(e.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setStep('details');
    setOtpCode('');
    setError('');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.primary, '#0F2419', '#0A1A12']} style={StyleSheet.absoluteFill} />
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + webTopInset + 40, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 20) }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.logoArea}>
            <View style={styles.logoIcon}>
              <Feather name="droplet" size={28} color={Colors.gold} />
            </View>
            <Text style={styles.brandName}>NYLUVER</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.formCard}>
            {mode === 'signup' && step === 'verify' ? (
              <>
                <Pressable onPress={() => { setStep('details'); setOtpCode(''); setError(''); }} style={[styles.backBtn, isRTL && { alignSelf: 'flex-end' }]}>
                  <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={20} color={Colors.textSecondary} />
                </Pressable>
                <View style={styles.verifyIcon}>
                  <Feather name="shield" size={28} color={Colors.gold} />
                </View>
                <Text style={[styles.formTitle, { textAlign: 'center' }]}>
                  {lang === 'ar' ? 'تحقق من رقم هاتفك' : 'Verify Your Phone'}
                </Text>
                <Text style={[styles.formSubtitle, { textAlign: 'center' }]}>
                  {lang === 'ar'
                    ? `أدخل الرمز المكون من 6 أرقام المرسل إلى ${verifiedPhone}`
                    : `Enter the 6-digit code sent to ${verifiedPhone}`}
                </Text>

                <View style={styles.otpContainer}>
                  <TextInput
                    value={otpCode}
                    onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                    style={styles.otpInput}
                    placeholder="000000"
                    placeholderTextColor={Colors.border}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    textContentType="oneTimeCode"
                  />
                </View>

                {error ? (
                  <Animated.View entering={FadeInDown.duration(300)} style={styles.errorBox}>
                    <Feather name="alert-circle" size={16} color={Colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </Animated.View>
                ) : null}

                <Pressable
                  onPress={handleSubmit}
                  disabled={!canSubmit || loading}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    (!canSubmit || loading) && styles.submitBtnDisabled,
                    { transform: [{ scale: pressed && canSubmit ? 0.98 : 1 }] }
                  ]}
                >
                  <LinearGradient
                    colors={canSubmit ? [Colors.gold, Colors.goldDark] : [Colors.textTertiary, Colors.textTertiary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtnGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color={Colors.primary} size="small" />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        {lang === 'ar' ? 'تأكيد' : 'Verify & Create Account'}
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={handleResend} disabled={resendTimer > 0} style={styles.resendRow}>
                  <Text style={[styles.resendText, resendTimer > 0 && { opacity: 0.5 }]}>
                    {resendTimer > 0
                      ? (lang === 'ar' ? `إعادة الإرسال خلال ${resendTimer}ث` : `Resend in ${resendTimer}s`)
                      : (lang === 'ar' ? 'إعادة إرسال الرمز' : 'Resend code')}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.formTitle, isRTL && { textAlign: 'right' }]}>
                  {mode === 'signin' ? t('welcomeBack') : t('joinNyluver')}
                </Text>
                <Text style={[styles.formSubtitle, isRTL && { textAlign: 'right' }]}>
                  {mode === 'signin'
                    ? (lang === 'ar' ? 'أدخل بريدك ورقم هاتفك لتسجيل الدخول' : 'Enter your email and phone to sign in')
                    : (lang === 'ar' ? 'أنشئ حسابك بسهولة' : 'Create your account in seconds')}
                </Text>

                {mode === 'signup' && (
                  <Animated.View entering={FadeInDown.duration(400)}>
                    <View style={styles.inputWrapper}>
                      <Feather name="user" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                      <TextInput
                        value={fullName}
                        onChangeText={setFullName}
                        style={[styles.input, isRTL && { textAlign: 'right' }]}
                        placeholder={t('enterName')}
                        placeholderTextColor={Colors.textTertiary}
                        autoCapitalize="words"
                      />
                    </View>
                  </Animated.View>
                )}

                <View style={styles.inputWrapper}>
                  <Feather name="mail" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    style={[styles.input, isRTL && { textAlign: 'right' }]}
                    placeholder={t('enterEmail')}
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={[styles.phoneRow, isRTL && { flexDirection: 'row-reverse' }]}>
                  <CountryCodePicker
                    selected={countryCode}
                    onSelect={setCountryCode}
                    isRTL={isRTL}
                    lang={lang}
                  />
                  <View style={styles.phoneInputWrapper}>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      style={[styles.phoneInput, isRTL && { textAlign: 'right' }]}
                      placeholder={lang === 'ar' ? 'رقم الهاتف' : 'Phone number'}
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                {error ? (
                  <Animated.View entering={FadeInDown.duration(300)} style={styles.errorBox}>
                    <Feather name="alert-circle" size={16} color={Colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </Animated.View>
                ) : null}

                <Pressable
                  onPress={handleSubmit}
                  disabled={!canSubmit || loading}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    (!canSubmit || loading) && styles.submitBtnDisabled,
                    { transform: [{ scale: pressed && canSubmit ? 0.98 : 1 }] }
                  ]}
                >
                  <LinearGradient
                    colors={canSubmit ? [Colors.gold, Colors.goldDark] : [Colors.textTertiary, Colors.textTertiary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtnGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color={Colors.primary} size="small" />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        {mode === 'signin' ? t('signIn') : (lang === 'ar' ? 'متابعة' : 'Continue')}
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <View style={styles.switchRow}>
                  <Text style={styles.switchText}>
                    {mode === 'signin' ? t('dontHaveAccount') : t('alreadyHaveAccount')}
                  </Text>
                  <Pressable onPress={toggleMode}>
                    <Text style={styles.switchLink}>
                      {mode === 'signin' ? t('signUp') : t('signIn')}
                    </Text>
                  </Pressable>
                </View>

                {mode === 'signin' && (
                  <Pressable 
                    onPress={async () => {
                      setEmail('prakash@gmail.com');
                      setPhone('23435445');
                      setCountryCode(COUNTRY_CODES[0]);
                      setLoading(true);
                      setError('');
                      const result = await signIn('prakash@gmail.com', '+21823435445');
                      setLoading(false);
                      if (result.error) {
                        setError(result.error);
                      } else {
                        router.replace('/(tabs)');
                      }
                    }}
                    style={{ marginTop: 20, alignItems: 'center' }}
                  >
                    <Text style={{ color: Colors.gold, fontFamily: 'Inter_600SemiBold', textDecorationLine: 'underline' }}>
                      Skip Login (Use Test Account)
                    </Text>
                  </Pressable>
                )}
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  decorCircle1: {
    position: 'absolute', top: -100, right: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(201, 169, 110, 0.06)',
  },
  decorCircle2: {
    position: 'absolute', bottom: -50, left: -100,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(201, 169, 110, 0.04)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoArea: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 40,
  },
  logoIcon: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(201, 169, 110, 0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(201, 169, 110, 0.2)',
  },
  brandName: {
    fontSize: 28, fontFamily: 'GFSDidot_400Regular',
    color: Colors.cream, letterSpacing: 6,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  formTitle: {
    fontSize: 24, fontFamily: 'CormorantGaramond_700Bold',
    color: Colors.text,
  },
  formSubtitle: {
    fontSize: 14, fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary, marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.cream, borderRadius: 14,
    paddingHorizontal: 14, borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, paddingVertical: 14,
    fontSize: 15, fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  codePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.cream,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 100,
  },
  codePickerFlag: {
    fontSize: 18,
  },
  codePickerDial: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  phoneInputWrapper: {
    flex: 1,
    backgroundColor: Colors.cream,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.error + '10', borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: Colors.error + '20',
  },
  errorText: {
    flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium',
    color: Colors.error,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.cream, alignItems: 'center',
    justifyContent: 'center', alignSelf: 'flex-start',
  },
  verifyIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.gold + '15', alignItems: 'center',
    justifyContent: 'center', alignSelf: 'center',
    borderWidth: 1, borderColor: Colors.gold + '25', marginBottom: 4,
  },
  otpContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  otpInput: {
    fontSize: 32, fontFamily: 'Inter_700Bold',
    color: Colors.text, textAlign: 'center',
    letterSpacing: 12, width: 220,
    paddingVertical: 14, borderBottomWidth: 2,
    borderBottomColor: Colors.gold,
  },
  resendRow: {
    alignItems: 'center', paddingVertical: 8,
  },
  resendText: {
    fontSize: 14, fontFamily: 'Inter_600SemiBold',
    color: Colors.gold,
  },
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnGradient: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16,
  },
  submitBtnText: {
    fontSize: 16, fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  switchRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, marginTop: 4,
  },
  switchText: {
    fontSize: 14, fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
  switchLink: {
    fontSize: 14, fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingHorizontal: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'CormorantGaramond_600SemiBold',
    color: Colors.text,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cream,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  countryRowSelected: {
    backgroundColor: Colors.cream,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: Colors.text,
  },
  countryDial: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
