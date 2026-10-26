import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, User, Mail, Phone, Save, FileText, Clock, Check } from 'lucide-react-native';
import {
  View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Image, Alert, TextInput
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { WorkEzTheme } from '../../constants/theme';
import { useAppTheme } from '../../contexts/ThemeContext';
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
  const { colors, isDark } = useAppTheme();
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
        const url = await imageService.uploadProfileImage(asset.uri, 312);
        setPhoto(url);
      } catch (err: any) {
        Alert.alert('Erro', 'Falha ao fazer upload da imagem.');
      } finally {
        setUploading(false);
      }
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Nome é obrigatório';
    if (!email.trim()) {
      errs.email = 'E-mail é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'E-mail inválido';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;
    setSaving(true);

    try {
      // 1. Atualiza dados de usuário
      const userPayload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() ? phone.replace(/\D/g, '') : null,
        phoneNumber: phone.trim() ? phone.replace(/\D/g, '') : null,
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

      // 2. Atualiza dados do prestador
      if (profile?.id) {
        let finalDescription = description.trim();
        if (experience.trim()) {
          finalDescription = `[Experiência: ${experience.trim()} anos]\n${finalDescription}`.trim();
        }

        const providerPayload = {
          name: name.trim(),
          phone: phone.trim() ? phone.replace(/\D/g, '') : null,
          photo: photo || null,
          professionalDescription: finalDescription || null,
        };

        const providerResponse = await apiRequest<any>(`/api/ServiceProviders/${profile.id}`, {
          method: 'PUT',
          body: JSON.stringify(providerPayload)
        });

        if (providerResponse.error) {
          Alert.alert('Erro ao atualizar dados do prestador', providerResponse.error);
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

  const dynamicStyles = useMemo(() => {
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
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
        color: colors.textSecondary,
      },
      saveBtn: {
        marginTop: 16,
      },
      form: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.25 : 0.05,
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
        borderColor: colors.primary,
      },
      avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: colors.primary,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      },
      cameraIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.card,
      },
      avatarTip: {
        ...WorkEzTheme.typography.xs,
        color: colors.textSecondary,
      },
      inputContainer: {
        gap: 8,
      },
      label: {
        ...WorkEzTheme.typography.sm,
        fontWeight: '500',
        color: colors.text,
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
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        fontSize: 16,
        color: colors.text,
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
        backgroundColor: colors.surface,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
      },
      categoryTagSelected: {
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
        borderColor: colors.primary,
      },
      categoryTagText: {
        ...WorkEzTheme.typography.sm,
        color: colors.textSecondary,
        fontWeight: '500',
      },
      categoryTagTextSelected: {
        color: isDark ? '#93C5FD' : '#1D4ED8',
        fontWeight: '600',
      },
    });
  }, [colors, isDark]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={dynamicStyles.container}
    >
      <ScreenHeader title="Dados pessoais" showBack />

      <ScrollView 
        contentContainerStyle={[
          dynamicStyles.scrollContent,
          { paddingBottom: 110 + (insets.bottom > 0 ? insets.bottom : 20) }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loadingProfile ? (
          <View style={dynamicStyles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={dynamicStyles.loadingText}>Carregando dados...</Text>
          </View>
        ) : (
          <View style={dynamicStyles.form}>
            {/* Avatar Picker */}
            <View style={dynamicStyles.avatarSection}>
              <TouchableOpacity
                onPress={pickImage}
                disabled={uploading}
                style={dynamicStyles.avatarWrapper}
                activeOpacity={0.9}
              >
                {photo ? (
                  <Image
                    source={{ uri: photo }}
                    style={dynamicStyles.avatar}
                  />
                ) : (
                  <View style={[dynamicStyles.avatar, dynamicStyles.avatarPlaceholder]}>
                    <User size={48} color={colors.textSecondary} />
                  </View>
                )}
                <View style={dynamicStyles.cameraIconContainer}>
                  {uploading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Camera size={16} color="#FFF" />
                  )}
                </View>
              </TouchableOpacity>
              <Text style={dynamicStyles.avatarTip}>Toque para alterar a foto</Text>
            </View>

            {/* Inputs */}
            <View style={dynamicStyles.inputContainer}>
              <Text style={dynamicStyles.label}>Nome Completo</Text>
              <View style={dynamicStyles.inputWrapper}>
                <User size={20} color={colors.textSecondary} style={dynamicStyles.inputIcon} />
                <Input
                  placeholder="Seu nome completo"
                  value={name}
                  onChangeText={setName}
                  error={errors.name}
                  style={dynamicStyles.inputWithIcon}
                />
              </View>
            </View>

            <View style={dynamicStyles.inputContainer}>
              <Text style={dynamicStyles.label}>E-mail</Text>
              <View style={dynamicStyles.inputWrapper}>
                <Mail size={20} color={colors.textSecondary} style={dynamicStyles.inputIcon} />
                <Input
                  placeholder="Seu e-mail"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                  style={dynamicStyles.inputWithIcon}
                />
              </View>
            </View>

            <View style={dynamicStyles.inputContainer}>
              <Text style={dynamicStyles.label}>Telefone</Text>
              <View style={dynamicStyles.inputWrapper}>
                <Phone size={20} color={colors.textSecondary} style={dynamicStyles.inputIcon} />
                <Input
                  placeholder="Telefone (opcional)"
                  value={phone}
                  onChangeText={(val) => setPhone(applyPhoneMask(val))}
                  keyboardType="phone-pad"
                  maxLength={15}
                  style={dynamicStyles.inputWithIcon}
                />
              </View>
            </View>

            <View style={dynamicStyles.inputContainer}>
              <Text style={dynamicStyles.label}>Experiência (anos)</Text>
              <View style={dynamicStyles.inputWrapper}>
                <Clock size={20} color={colors.textSecondary} style={dynamicStyles.inputIcon} />
                <Input
                  placeholder="Ex: 5"
                  value={experience}
                  onChangeText={setExperience}
                  keyboardType="numeric"
                  style={dynamicStyles.inputWithIcon}
                />
              </View>
            </View>

            <View style={dynamicStyles.inputContainer}>
              <Text style={dynamicStyles.label}>Descrição / Biografia</Text>
              <View style={dynamicStyles.inputWrapper}>
                <FileText size={20} color={colors.textSecondary} style={dynamicStyles.inputIconDescription} />
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Conte um pouco sobre sua experiência..."
                  placeholderTextColor={colors.textSecondary}
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={dynamicStyles.descriptionInput}
                />
              </View>
            </View>

            {/* Categorias / Especialidades */}
            <View style={dynamicStyles.inputContainer}>
              <Text style={dynamicStyles.label}>Especialidades / Categorias</Text>
              {loadingCategories ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <View style={dynamicStyles.categoriesContainer}>
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
                          dynamicStyles.categoryTag,
                          isSelected && dynamicStyles.categoryTagSelected
                        ]}
                      >
                        {isSelected && (
                          <Check size={14} color={colors.primary} style={{ marginRight: 6 }} />
                        )}
                        <Text
                          style={[
                            dynamicStyles.categoryTagText,
                            isSelected && dynamicStyles.categoryTagTextSelected
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

            <View style={dynamicStyles.saveBtn}>
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
                    <Text style={dynamicStyles.saveBtnText}>Salvar Alterações</Text>
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
