import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { appTheme } from '../design/theme';
import { ChatMessage, MenuScanResult } from '../domain/models';
import { askBuddy as askBuddyAI } from '../services/aiService';
import { chatRepo, historyRepo, trialRepo } from '../services/container';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;
function formatResultMessage(result: MenuScanResult): string {
  return `${result.summaryText}\nTop picks:\n${result.topPicks.map((item, i) => `${i + 1}. ${item.name}`).join('\n')}`;
}

export function ChatScreen({ navigation, route }: Props): React.JSX.Element {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [isPremium, setIsPremium] = React.useState(false);
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
    if (!question) return;
    if (!isPremium) return navigation.navigate('Paywall', { source: 'chat' });
    await chatRepo.addMessage('user', question);
    const context = route.params?.resultId ? await historyRepo.getScanResultById(route.params.resultId) : undefined;
    const response = await askBuddyAI(question, context);
    await chatRepo.addMessage('assistant', response);
    setInput('');
    setMessages(await chatRepo.listMessages());
  };
  return (
    <AppScreen>
      <View style={styles.wrap}>
        <Text style={styles.title}>Chat with Buddy</Text>
        <Text style={styles.subtitle}>Your food history stays here</Text>
        <ScrollView contentContainerStyle={styles.messages}>
          {messages.length === 0 ? <Card><Text style={styles.systemMessage}>No messages yet.</Text></Card> : messages.map((m) => (
            <View key={m.id} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.systemBubble]}>
              <Text style={[styles.bubbleText, m.role === 'user' ? styles.userText : styles.systemText]}>{m.text}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="Ask Buddy about your meals..." />
          <PrimaryButton title={isPremium ? 'Ask Buddy' : 'Upgrade to ask Buddy...'} onPress={() => void askBuddy()} />
        </View>
        <Text style={styles.disclaimer}>Educational guidance only. Not medical advice.</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: appTheme.spacing.sm },
  title: { fontSize: appTheme.typography.h2, color: appTheme.colors.textPrimary, fontWeight: '700' },
  subtitle: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small },
  messages: { gap: appTheme.spacing.sm, paddingVertical: appTheme.spacing.sm, flexGrow: 1 },
  bubble: { maxWidth: '90%', borderRadius: appTheme.radius.md, paddingHorizontal: appTheme.spacing.sm, paddingVertical: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: appTheme.colors.accent, borderTopRightRadius: 8 },
  systemBubble: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: appTheme.colors.border, borderTopLeftRadius: 8 },
  bubbleText: { fontSize: appTheme.typography.body },
  userText: { color: '#FFFFFF' },
  systemText: { color: appTheme.colors.textPrimary },
  systemMessage: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small },
  composer: { gap: appTheme.spacing.sm, marginTop: appTheme.spacing.sm },
  input: { borderWidth: 1, borderColor: appTheme.colors.border, borderRadius: appTheme.radius.md, paddingHorizontal: appTheme.spacing.sm, paddingVertical: 10, backgroundColor: '#FFFFFF' },
  disclaimer: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small },
});
