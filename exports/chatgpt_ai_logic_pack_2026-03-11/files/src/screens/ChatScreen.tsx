import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../app/navigation/types';
import { appTheme } from '../design/theme';
import { ChatMessage, MenuScanResult } from '../domain/models';
import { BETA_CHAT_OPEN, TEST_MODE } from '../config/flags';
import { askBuddy as askBuddyAI } from '../services/aiService';
import { chatRepo, historyRepo, trialRepo } from '../services/container';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

function formatResultMessage(result: MenuScanResult): string {
  const picks = result.topPicks.map((item) => item.name).join('\n');
  return `I've scanned the menu! Based on your goal, here are the best options:\n${picks}`;
}

function formatChatTimestamp(messages: ChatMessage[]): string {
  if (messages.length === 0) return 'Today';
  const last = messages[messages.length - 1];
  const date = new Date(last.createdAt);
  if (Number.isNaN(date.getTime())) return 'Today';
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `Today ${time}`;
}

function renderAssistantText(rawText: string): React.JSX.Element {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    <View style={styles.assistantTextBlock}>
      {lines.map((line, index) => {
        const isListLine = /^\d+\./.test(line) || /^[-•]/.test(line);
        const cleanLine = line.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '');
        return (
          <Text
            key={`${index}-${cleanLine}`}
            style={[styles.assistantText, isListLine && styles.assistantTextStrong]}
            maxFontSizeMultiplier={1.15}
          >
            {cleanLine}
          </Text>
        );
      })}
    </View>
  );
}

export function ChatScreen({ navigation, route }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [isPremium, setIsPremium] = React.useState(false);
  const listRef = React.useRef<FlatList<ChatMessage>>(null);

  const headerTopPadding = Math.max(insets.top, 12);
  const headerHeight = headerTopPadding + 48 + 9;
  const composerBottomPadding = Math.max(insets.bottom, 16);
  const isChatAllowed = isPremium || TEST_MODE || BETA_CHAT_OPEN;
  const canAsk = isChatAllowed && input.trim().length > 0 && !sending;
  const timestampLabel = React.useMemo(() => formatChatTimestamp(messages), [messages]);

  const scrollToBottom = React.useCallback((animated: boolean): void => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
  }, []);

  const loadData = React.useCallback(async (): Promise<void> => {
    const trial = await trialRepo.getTrial();
    setIsPremium(trial.isPremium);
    if (route.params?.resultId) {
      const result = await historyRepo.getScanResultById(route.params.resultId);
      if (result) await chatRepo.addSystemMessageIfMissing(`result_${result.id}`, formatResultMessage(result));
    }
    if (route.params?.systemMessage) await chatRepo.addSystemMessageIfMissing(`route_${route.params.systemMessage}`, route.params.systemMessage);
    setMessages(await chatRepo.listMessages());
  }, [route.params?.resultId, route.params?.systemMessage]);
  useFocusEffect(React.useCallback(() => { void loadData(); return undefined; }, [loadData]));
  const askBuddy = async (): Promise<void> => {
    const question = input.trim();
    if (!question || sending) return;
    if (!isChatAllowed) {
      navigation.navigate('Paywall', { source: 'chat' });
      return;
    }
    setSending(true);
    try {
      await chatRepo.addMessage('user', question);
      const context = route.params?.resultId ? await historyRepo.getScanResultById(route.params.resultId) : undefined;
      const response = await askBuddyAI(question, context);
      await chatRepo.addMessage('assistant', response);
      setInput('');
      const updatedMessages = await chatRepo.listMessages();
      setMessages(updatedMessages);
      scrollToBottom(true);
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      throw e;
    } finally {
      setSending(false);
    }
  };

  React.useEffect(() => {
    if (!messages.length) return;
    scrollToBottom(false);
  }, [messages.length, scrollToBottom]);

  const handleSendPress = (): void => {
    if (!isChatAllowed) {
      navigation.navigate('Paywall', { source: 'chat' });
      return;
    }
    if (!canAsk) return;
    void askBuddy();
  };

  const renderMessage = ({ item: m }: { item: ChatMessage }): React.JSX.Element => {
    if (m.role === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={styles.userBubble}>
            <Text style={styles.userText} maxFontSizeMultiplier={1.15}>
              {m.text}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.assistantRow}>
        <View style={styles.avatarCircle}>
          <MaterialIcons name="business-center" size={14} color="#8C2BEE" />
        </View>
        <View style={styles.assistantBubble}>{renderAssistantText(m.text)}</View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <View style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: headerTopPadding, height: headerHeight }]}>
          <View style={styles.headerRow}>
            <Pressable
              style={styles.backBtn}
              hitSlop={8}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <MaterialIcons name="chevron-left" size={24} color="#64748B" />
            </Pressable>
            <Text style={styles.headerTitle} maxFontSizeMultiplier={1.15}>
              Chat with Buddy
            </Text>
            <View style={styles.backBtnPlaceholder} />
          </View>
        </View>
        <KeyboardAvoidingView
          style={styles.chatContent}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.messagesContainer,
              {
                paddingTop: headerHeight + 24,
                paddingBottom: 24,
              },
            ]}
            ListHeaderComponent={
              <View style={styles.timestampRow}>
                <Text style={styles.timestampText} maxFontSizeMultiplier={1.1}>
                  {timestampLabel}
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText} maxFontSizeMultiplier={1.15}>
                  Ask Buddy about your meals and menu scans.
                </Text>
              </View>
            }
            renderItem={renderMessage}
          />

          <View style={[styles.composerContainer, { paddingBottom: composerBottomPadding }]}>
            <View style={styles.composerPill}>
              <Pressable
                style={styles.leadingCircle}
                onPress={() => {
                  if (!isChatAllowed) navigation.navigate('Paywall', { source: 'chat' });
                }}
                disabled={isChatAllowed}
                accessibilityRole="button"
                accessibilityLabel={isChatAllowed ? 'Chat status' : 'Open premium'}
              >
                <MaterialIcons
                  name={isChatAllowed ? 'auto-awesome' : 'lock-outline'}
                  size={20}
                  color={isChatAllowed ? '#8C2BEE' : '#94A3B8'}
                />
              </Pressable>

              {isChatAllowed ? (
                <TextInput
                  style={styles.input}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask Buddy about your meals..."
                  placeholderTextColor="#94A3B8"
                  editable={!sending}
                  onSubmitEditing={handleSendPress}
                  returnKeyType="send"
                  onFocus={() => scrollToBottom(true)}
                />
              ) : (
                <Pressable
                  style={styles.upgradeTextWrap}
                  onPress={() => navigation.navigate('Paywall', { source: 'chat' })}
                  accessibilityRole="button"
                  accessibilityLabel="Upgrade to ask Buddy"
                >
                  <Text style={styles.upgradeText} maxFontSizeMultiplier={1.1}>
                    Upgrade to ask Buddy...
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={[styles.sendCircle, sending && styles.sendCircleDisabled]}
                onPress={handleSendPress}
                disabled={sending || (isChatAllowed && !input.trim())}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#8C2BEE" />
                ) : (
                  <MaterialIcons name="north" size={16} color="#8C2BEE" />
                )}
              </Pressable>
            </View>

            {!isChatAllowed ? (
              <Text style={styles.premiumHint} maxFontSizeMultiplier={1.1}>
                Unlock unlimited AI chat with Premium
              </Text>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FDFBFC',
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 16,
    paddingBottom: 9,
    backgroundColor: 'rgba(253,251,252,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    zIndex: 20,
  },
  headerRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  backBtnPlaceholder: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: -0.27,
    fontWeight: '700',
    color: '#0F172A',
  },
  list: { flex: 1 },
  chatContent: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  timestampRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timestampText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(140,43,238,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  assistantBubble: {
    maxWidth: 304,
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 40,
    borderBottomRightRadius: 40,
    borderBottomLeftRadius: 40,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  assistantTextBlock: {
    gap: 4,
  },
  assistantText: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 24.38,
    letterSpacing: -0.225,
    fontWeight: '400',
  },
  assistantTextStrong: {
    color: '#334155',
    fontWeight: '700',
  },
  userRow: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  userBubble: {
    maxWidth: 304,
    borderRadius: 40,
    backgroundColor: '#8C2BEE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...appTheme.shadows.hairline,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22.5,
    letterSpacing: -0.225,
    fontWeight: '400',
  },
  emptyState: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  emptyStateText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
  composerContainer: {
    paddingTop: 17,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  composerPill: {
    minHeight: 58,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 9,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  leadingCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 12,
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  upgradeTextWrap: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  upgradeText: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  sendCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(140,43,238,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCircleDisabled: {
    opacity: 0.6,
  },
  premiumHint: {
    marginTop: 8,
    color: '#94A3B8',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
});
