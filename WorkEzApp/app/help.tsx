import React, { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { MessageCircle, Mail, Phone, HelpCircle } from 'lucide-react-native';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAppTheme } from '../contexts/ThemeContext';

export default function Help() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const faqs = [
    {
      question: 'Como funciona o pagamento?',
      answer: 'O pagamento é feito pelo app após a conclusão do serviço.',
    },
    {
      question: 'Posso cancelar um chamado?',
      answer: 'Sim, você pode cancelar antes do profissional chegar.',
    },
    {
      question: 'O que é a garantia da plataforma?',
      answer: 'Proteção em caso de problemas com o serviço executado.',
    },
  ];

  const accentBlue = isDark ? '#60A5FA' : '#2563EB';

  return (
    <View style={styles.container}>
      <ScreenHeader title="Ajuda e suporte" showBack />

      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 32 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrap}>
          {/* Banner Azul Principal */}
          <View style={styles.heroBanner}>
            <View style={styles.heroIconCircle}>
              <HelpCircle size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>Como podemos ajudar?</Text>
            <Text style={styles.heroSubtitle}>
              Estamos aqui para resolver suas dúvidas e garantir sua segurança.
            </Text>
          </View>

          {/* Card Perguntas Frequentes */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Perguntas frequentes
            </Text>

            <View style={styles.faqList}>
              {faqs.map((faq, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.faqItem, 
                    index === faqs.length - 1 && styles.faqItemLast
                  ]}
                >
                  <Text style={styles.faqQuestion}>
                    {faq.question}
                  </Text>
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Card Fale Conosco */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Fale conosco
            </Text>

            <View style={styles.channelsList}>
              <TouchableOpacity 
                style={styles.channelItem}
                activeOpacity={0.7}
              >
                <View style={styles.channelIconWrap}>
                  <MessageCircle size={20} color={accentBlue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.channelTitle}>Chat ao vivo</Text>
                  <Text style={styles.channelSubtitle}>Seg-Sex, 8h-18h</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.channelItem}
                activeOpacity={0.7}
              >
                <View style={styles.channelIconWrap}>
                  <Mail size={20} color={accentBlue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.channelTitle}>E-mail</Text>
                  <Text style={styles.channelSubtitle}>suporte@workez.com.br</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.channelItem}
                activeOpacity={0.7}
              >
                <View style={styles.channelIconWrap}>
                  <Phone size={20} color={accentBlue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.channelTitle}>Telefone</Text>
                  <Text style={styles.channelSubtitle}>0800 123 4567</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
    },
    contentWrap: {
      padding: 16,
      maxWidth: 720,
      width: '100%',
      alignSelf: 'center',
    },
    heroBanner: {
      backgroundColor: '#2563EB',
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      marginBottom: 16,
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    heroIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    heroTitle: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 6,
      textAlign: 'center',
    },
    heroSubtitle: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 320,
    },
    card: {
      backgroundColor: colors.backgroundCard,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 14,
    },
    faqList: {
      gap: 12,
    },
    faqItem: {
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    faqItemLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    faqQuestion: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    faqAnswer: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
    },
    channelsList: {
      gap: 10,
    },
    channelItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.backgroundAlt,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    channelIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(37, 99, 235, 0.16)' : '#EFF6FF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#DBEAFE',
    },
    channelTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    channelSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 1,
    },
  });
