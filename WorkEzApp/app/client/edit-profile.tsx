import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Camera, User, Mail, Phone, Save } from 'lucide-react-native';
import {
  View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Image, Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useFetch } from '../../hooks/useFetch';
import { apiRequest } from '../../services/api';
import { authService } from '../../services/authService';
import { imageService } from '../../services/imageService';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  photo?: string;
  phone?: string;
}

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const { colors, isDark } = useAppTheme();

  const { data: profile, loading: loadingProfile, error: profileError } = useFetch<CustomerProfile>(
    user ? `/api/Customers/by-user/${user.id}` : null
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setName(profile.name || user?.name || '');
      setEmail(profile.email || user?.email || '');
      setPhone(profile.phone || '');
      setPhoto(profile.photo || '');
    } else if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [profile, user]);

  const applyPhoneMask = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      return digits
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso às suas fotos para atualizar a imagem.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setUploading(true);

      try {
        const imageUrl = await imageService.uploadProfileImage(asset.uri, 312);
        setPhoto(imageUrl);
      } catch (err) {
        console.error(err);
        Alert.alert('Erro', 'Não foi possível enviar a imagem.');
      } finally {
        setUploading(false);
      }
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Nome é obrigatório.';
    if (!email.trim()) newErrors.email = 'E-mail é obrigatório.';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'E-mail inválido.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;
    setSaving(true);

    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        photo: photo || null
      };

      const res = await apiRequest(`/api/Customers/by-user/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (res.error) {
        Alert.alert('Erro ao atualizar', res.error);
      } else {
        await refreshUser();
        Alert.alert('Sucesso!', 'Perfil atualizado com sucesso.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível salvar os dados.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.backgroundAlt }]}
    >
      <ScreenHeader title="Editar Perfil" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {loadingProfile ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando dados...</Text>
          </View>
        ) : (
          <View style={[styles.form, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            {/* Foto de Perfil */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarWrapper}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.backgroundAlt }]}>
                    <User size={48} color={colors.textSecondary} />
                  </View>
                )}
                <TouchableOpacity
                  onPress={pickImage}
                  disabled={uploading}
                  style={styles.cameraIconContainer}
                  activeOpacity={0.8}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Camera size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={[styles.avatarTip, { color: colors.textSecondary }]}>Toque no ícone da câmera para trocar a foto</Text>
            </View>

            {/* Inputs */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Nome Completo</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <Input
                  placeholder="Seu nome completo"
                  value={name}
                  onChangeText={setName}
                  error={errors.name}
                  style={styles.inputWithIcon}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>E-mail</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <Input
                  placeholder="Seu e-mail"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                  style={styles.inputWithIcon}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Telefone</Text>
              <View style={styles.inputWrapper}>
                <Phone size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <Input
                  placeholder="Telefone (opcional)"
                  value={phone}
                  onChangeText={(val) => setPhone(applyPhoneMask(val))}
                  keyboardType="phone-pad"
                  maxLength={15}
                  style={styles.inputWithIcon}
                />
              </View>
            </View>

            <View style={styles.saveBtn}>
              <Button
                variant="primary"
                fullWidth
                onPress={handleSave}
                disabled={saving || uploading}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Save size={20} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Salvar Alterações</Text>
                  </>
                )}
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  form: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  avatarWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    resizeMode: 'cover',
    borderWidth: 3,
    borderColor: '#2563EB',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2563EB',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarTip: {
    ...WorkEzTheme.typography.xs,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    ...WorkEzTheme.typography.sm,
    fontWeight: '500',
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
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  saveBtn: {
    marginTop: 16,
  },
});
