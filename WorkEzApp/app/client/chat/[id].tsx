import { useState, useRef, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, AlertCircle, User } from 'lucide-react-native';
import { View, Text, TouchableOpacity, Image, TextInput, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../../constants/theme';
import { useFetch } from '../../../hooks/useFetch';
import { useAuth } from '../../../contexts/AuthContext';

interface Message {
  id: string;
  sender: 'professional' | 'client';
  text: string;
  time: string;
}

interface ConversationData {
  id: string;
  professionalName: string;
  professionalPhoto: string;
  status: 'Online' | 'Offline';
  messages: Message[];
}

export default function ClientChat() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const { data: conversation, loading, error } = useFetch<ConversationData>(
    id ? `/api/Conversations/${id}` : null
  );

  useEffect(() => {
    // Scroll to bottom on messages load
    if (conversation?.messages) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [conversation?.messages]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <ArrowLeft size={24} color={WorkEzTheme.colors.text} />
          </TouchableOpacity>
          {conversation?.professionalPhoto ? (
            <Image
              source={{ uri: conversation.professionalPhoto }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }]}>
              <User size={20} color={WorkEzTheme.colors.textSecondary} />
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.professionalName}>{conversation?.professionalName || 'Profissional'}</Text>
            <Text style={styles.statusText}>{conversation?.status || 'Online'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.alertBanner}>
        <View style={styles.alertRow}>
          <AlertCircle size={16} color="#2563EB" style={styles.alertIcon} />
          <Text style={styles.alertText}>
            <Text style={{ fontWeight: '600' }}>Para sua segurança:</Text> Mantenha o pagamento e a comunicação dentro do app.
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={styles.loadingText}>Carregando mensagens...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          conversation?.messages?.map((msg) => {
            const isClient = msg.sender === 'client';
            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  isClient ? styles.messageRowRight : styles.messageRowLeft
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isClient ? styles.messageBubbleClient : styles.messageBubblePro
                  ]}
                >
                  <Text style={[
                    styles.messageText,
                    isClient ? styles.messageTextClient : styles.messageTextPro
                  ]}>
                    {msg.text}
                  </Text>
                  <Text style={[
                    styles.messageTime,
                    isClient ? styles.messageTimeClient : styles.messageTimePro
                  ]}>
                    {msg.time}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.inputRow}>
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Digite sua mensagem..."
            style={styles.input}
            placeholderTextColor="#94A3B8"
          />
          <TouchableOpacity
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            disabled={!messageText.trim()}
          >
            <Send size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
  },
  header: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    paddingHorizontal: WorkEzTheme.spacing.lg,
    paddingVertical: WorkEzTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: WorkEzTheme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: WorkEzTheme.spacing.sm,
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
    borderRadius: WorkEzTheme.borderRadius.lg,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  headerInfo: {
    flex: 1,
  },
  professionalName: {
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
  },
  statusText: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.primary,
  },
  alertBanner: {
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  alertIcon: {
    marginTop: 2,
  },
  alertText: {
    flex: 1,
    ...WorkEzTheme.typography.xs,
    color: '#1D4ED8',
    lineHeight: 18,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 24,
    gap: 16,
  },
  centerContainer: {
    padding: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: WorkEzTheme.colors.textSecondary,
  },
  errorText: {
    color: WorkEzTheme.colors.danger,
    textAlign: 'center',
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageBubbleClient: {
    backgroundColor: '#2563EB',
  },
  messageBubblePro: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
  },
  messageText: {
    ...WorkEzTheme.typography.sm,
  },
  messageTextClient: {
    color: '#FFFFFF',
  },
  messageTextPro: {
    color: WorkEzTheme.colors.text,
  },
  messageTime: {
    ...WorkEzTheme.typography.xs,
    marginTop: 4,
  },
  messageTimeClient: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimePro: {
    color: WorkEzTheme.colors.textSecondary,
  },
  footer: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: WorkEzTheme.colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.text,
  },
  sendButton: {
    width: 48,
    height: 48,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
