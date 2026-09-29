import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, User, Mail, Phone, Save } from 'lucide-react-native';
import {
  View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Image, Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { apiRequest } from '../../services/api';
import { authService } from '../../services/authService';
import { imageService } from '../../services/imageService';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  photo?: string;
  phone?: string;
}

export default function EditProfile() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

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
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedUri = result.assets[0].uri;
      setUploading(true);

      try {
        const imageUrl = await imageService.uploadImage(selectedUri);
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
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'E-mail inválido.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        profilePicture: photo || null
      };

      const response = await apiRequest<any>('/api/Users/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (response.error) {
        Alert.alert('Erro', response.error);
      } else {
        // Update local cache
        await authService.updateLocalProfile({
          name: payload.name,
          email: payload.email
        });
        await refreshUser();
        Alert.alert('Sucesso', 'Perfil atualizado com sucesso!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <ArrowLeft size={24} color={WorkEzTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dados pessoais</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loadingProfile ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={styles.loadingText}>Carregando dados...</Text>
          </View>
        ) : (
          <View style={styles.form}>
            {/* Avatar Picker */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                onPress={pickImage}
                disabled={uploading}
                style={styles.avatarWrapper}
                activeOpacity={0.9}
              >
                {photo ? (
                  <Image
                    source={{ uri: photo }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <User size={48} color={WorkEzTheme.colors.textSecondary} />
                  </View>
                )}
                <View style={styles.cameraIconContainer}>
                  {uploading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Camera size={16} color="#FFF" />
                  )}
                </View>
              </TouchableOpacity>
              <Text style={styles.avatarTip}>Toque para alterar a foto</Text>
            </View>

            {/* Inputs */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nome Completo</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color={WorkEzTheme.colors.textSecondary} style={styles.inputIcon} />
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
              <Text style={styles.label}>E-mail</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color={WorkEzTheme.colors.textSecondary} style={styles.inputIcon} />
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
              <Text style={styles.label}>Telefone</Text>
              <View style={styles.inputWrapper}>
                <Phone size={20} color={WorkEzTheme.colors.textSecondary} style={styles.inputIcon} />
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
                variant="secondary"
                fullWidth
                onPress={handleSave}
                disabled={saving || uploading}
              >
                {saving ? (
                  <ActivityIndicator color="#2563EB" />
                ) : (
                  <>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    ...WorkEzTheme.typography.lg,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: '#0F172A',
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
    color: '#64748B',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    backgroundColor: '#E2E8F0',
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
    color: '#64748B',
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    ...WorkEzTheme.typography.sm,
    fontWeight: '500',
    color: '#0F172A',
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
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  saveBtn: {
    marginTop: 16,
    borderWidth: 1,
    backgroundColor: '#2563EB',
    fontWeight: '600',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    borderRadius: 12,
    padding: 8,
  },
});
