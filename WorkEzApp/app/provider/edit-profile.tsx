import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, User, Mail, Phone, Save, FileText, Clock, Check } from 'lucide-react-native';
import {
  View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Image, Alert, TextInput
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
import { ScreenHeader } from '../../components/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ProviderProfile {
  id: string;
  name: string;
  email: string;
  photo?: string;
  phone?: string;
  professionalDescription?: string;
  categories?: { id: string; name: string }[];
  specialties?: { id: string; name: string }[];
}

export default function ProviderEditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();

  const { data: profile, loading: loadingProfile, error: profileError } = useFetch<ProviderProfile>(
    user ? `/api/ServiceProviders/by-user/${user.id}` : null
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: allCategories, loading: loadingCategories } = useFetch<any[]>('/api/Categories');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [experience, setExperience] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name || user?.name || '');
      setEmail(profile.email || user?.email || '');
      setPhone(profile.phone || '');
      setPhoto(profile.photo || '');

      const rawDesc = profile.professionalDescription || '';
      const expMatch = rawDesc.match(/\[(?:Experiência|Experiencia):\s*([^\]]+)\]/i);
      let expVal = '';
      if (expMatch) {
        expVal = expMatch[1].replace(/\D/g, '') || expMatch[1].replace(/anos?/i, '').trim();
      }
      setExperience(expVal);
      setDescription(rawDesc.replace(/\[(?:Experiência|Experiencia):\s*[^\]]+\]/gi, '').trim());

      const currentSpecialties = profile.specialties || profile.categories || [];
      if (currentSpecialties.length > 0) {
        setSelectedCategories(currentSpecialties.map((c: any) => c.id || c.Id));
      }

      if (profile.id) {
        apiRequest<any[]>(`/api/ProviderCategories/by-provider/${profile.id}/categories`)
          .then((res) => {
            if (res.data && res.data.length > 0) {
              setSelectedCategories(res.data.map((c: any) => c.id || c.Id));
            }
          })
          .catch(() => {});
      }
    } else if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [profile, user]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      const exists = prev.some(id => id.toLowerCase() === categoryId.toLowerCase());
      if (exists) {
        return prev.filter(id => id.toLowerCase() !== categoryId.toLowerCase());
      } else {
        return [...prev, categoryId];
      }
    });
  };

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
        const imageUrl = await imageService.uploadImage(asset.uri, asset.base64);
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
      // 1. Update general User profile
      const userPayload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        profilePicture: photo || null
      };

      const userResponse = await apiRequest<any>('/api/Users/profile', {
        method: 'PUT',
        body: JSON.stringify(userPayload)
      });

      if (userResponse.error) {
        Alert.alert('Erro ao atualizar usuário', userResponse.error);
        setSaving(false);
        return;
      }

      // 2. Update Provider Description details
      if (profile) {
        const finalDesc = experience.trim()
          ? `[Experiência: ${experience.trim()} ${parseInt(experience.trim()) === 1 ? 'ano' : 'anos'}] ${description.trim()}`.trim()
          : description.trim();

        const providerPayload = {
          id: profile.id,
          userId: user?.id,
          professionalDescription: finalDesc
        };

        const providerResponse = await apiRequest<any>(`/api/ServiceProviders/${profile.id}`, {
          method: 'PUT',
          body: JSON.stringify(providerPayload)
        });

        if (providerResponse.error) {
          Alert.alert('Erro ao atualizar descrição', providerResponse.error);
          setSaving(false);
          return;
        }

        // Update Provider Categories
        const catResponse = await apiRequest<any>(`/api/ProviderCategories/by-provider/${profile.id}/categories`, {
          method: 'POST',
          body: JSON.stringify(selectedCategories)
        });

        if (catResponse.error) {
          Alert.alert('Erro ao atualizar especialidades', catResponse.error);
          setSaving(false);
          return;
        }
      }

      // Update local credentials cache
      const savedPic = userResponse.data?.profilePicture || userPayload.profilePicture || null;
      await authService.updateLocalProfile({
        name: userPayload.name,
        email: userPayload.email,
        photo: savedPic,
        profilePicture: savedPic
      });
      await refreshUser();

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
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
      <ScreenHeader title="Dados pessoais" showBack />

      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 110 + (insets.bottom > 0 ? insets.bottom : 20) }
        ]}
        showsVerticalScrollIndicator={false}
      >
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

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Experiência (anos)</Text>
              <View style={styles.inputWrapper}>
                <Clock size={20} color={WorkEzTheme.colors.textSecondary} style={styles.inputIcon} />
                <Input
                  placeholder="Ex: 5"
                  value={experience}
                  onChangeText={setExperience}
                  keyboardType="numeric"
                  style={styles.inputWithIcon}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Descrição / Biografia</Text>
              <View style={styles.inputWrapper}>
                <FileText size={20} color={WorkEzTheme.colors.textSecondary} style={styles.inputIconDescription} />
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Conte um pouco sobre sua experiência..."
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={styles.descriptionInput}
                />
              </View>
            </View>

            {/* Categorias / Especialidades */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Especialidades / Categorias</Text>
              {loadingCategories ? (
                <ActivityIndicator size="small" color={WorkEzTheme.colors.primary} />
              ) : (
                <View style={styles.categoriesContainer}>
                  {allCategories?.map((cat) => {
                    const isSelected = selectedCategories.some(
                      (id) => id && cat?.id && id.toLowerCase() === cat.id.toLowerCase()
                    );
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => toggleCategory(cat.id)}
                        activeOpacity={0.8}
                        style={[
                          styles.categoryTag,
                          isSelected && styles.categoryTagSelected
                        ]}
                      >
                        {isSelected && (
                          <Check size={14} color="#1D4ED8" style={{ marginRight: 6 }} />
                        )}
                        <Text
                          style={[
                            styles.categoryTagText,
                            isSelected && styles.categoryTagTextSelected
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
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
  saveBtn: {
    marginTop: 16,
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
  inputIconDescription: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 1,
  },
  inputWithIcon: {
    paddingLeft: 48,
  },
  descriptionInput: {
    width: '100%',
    paddingLeft: 48,
    paddingRight: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    fontSize: 16,
    color: '#0F172A',
    minHeight: 100,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryTagSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  categoryTagText: {
    ...WorkEzTheme.typography.sm,
    color: '#64748B',
    fontWeight: '500',
  },
  categoryTagTextSelected: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
});
