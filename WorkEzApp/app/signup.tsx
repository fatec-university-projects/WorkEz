import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Mail, Lock, Phone } from 'lucide-react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { AntigravityTheme } from '../constants/theme';

export default function SignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const handleSignUp = () => {
    router.push('/profile-choice');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={AntigravityTheme.colors.text} />
          </TouchableOpacity>

          <Text style={styles.title}>
            Criar conta
          </Text>
          <Text style={styles.subtitle}>
            Preencha seus dados para começar
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputWrapper}>
            <User size={20} color={AntigravityTheme.colors.textSecondary} style={styles.inputIcon} />
            <Input
              placeholder="Nome completo"
              value={formData.name}
              onChangeText={(val) => setFormData({ ...formData, name: val })}
              style={styles.inputWithIcon}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Mail size={20} color={AntigravityTheme.colors.textSecondary} style={styles.inputIcon} />
            <Input
              type="email"
              placeholder="E-mail"
              value={formData.email}
              onChangeText={(val) => setFormData({ ...formData, email: val })}
              style={styles.inputWithIcon}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Phone size={20} color={AntigravityTheme.colors.textSecondary} style={styles.inputIcon} />
            <Input
              type="tel"
              placeholder="Telefone"
              value={formData.phone}
              onChangeText={(val) => setFormData({ ...formData, phone: val })}
              style={styles.inputWithIcon}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Lock size={20} color={AntigravityTheme.colors.textSecondary} style={styles.inputIcon} />
            <Input
              type="password"
              placeholder="Criar senha"
              value={formData.password}
              onChangeText={(val) => setFormData({ ...formData, password: val })}
              style={styles.inputWithIcon}
            />
          </View>
        </View>

        <View style={styles.footerContainer}>
          <Button fullWidth onPress={handleSignUp}>
            Continuar
          </Button>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>
              Já tem uma conta?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.loginLinkText}>
                Entrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AntigravityTheme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 32,
  },
  title: {
    ...AntigravityTheme.typography.xl,
    fontWeight: AntigravityTheme.typography.fontWeight.bold,
    color: AntigravityTheme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    ...AntigravityTheme.typography.base,
    color: AntigravityTheme.colors.textSecondary,
  },
  formContainer: {
    gap: 16,
    marginBottom: 32,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  inputWithIcon: {
    paddingLeft: 48,
  },
  footerContainer: {
    gap: 12,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    ...AntigravityTheme.typography.sm,
    color: AntigravityTheme.colors.textSecondary,
  },
  loginLinkText: {
    ...AntigravityTheme.typography.sm,
    fontWeight: AntigravityTheme.typography.fontWeight.medium,
    color: '#2563EB',
  },
});
