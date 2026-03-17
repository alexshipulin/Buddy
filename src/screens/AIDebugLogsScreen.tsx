import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import {
  buildAIDebugReport,
  buildAIDebugReportByAnalysisId,
  clearAIDebugLogs,
  getAIDebugLogs,
} from '../ai/aiDebugLog';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../ui/components/Card';
import { Screen } from '../ui/components/Screen';
import { useAppAlert } from '../ui/components/AppAlertProvider';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'AIDebugLogs'>;
const REPORT_LIMIT = 1200;

export function AIDebugLogsScreen({ navigation }: Props): React.JSX.Element {
  const { showAlert } = useAppAlert();
  const [loading, setLoading] = React.useState(true);
  const [report, setReport] = React.useState('');
  const [count, setCount] = React.useState(0);
  const [analysisIdInput, setAnalysisIdInput] = React.useState('');

  const loadLogs = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const entries = await getAIDebugLogs(REPORT_LIMIT);
      setCount(entries.length);
      setReport(await buildAIDebugReport(REPORT_LIMIT));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadLogs();
      return undefined;
    }, [loadLogs])
  );

  const onShare = React.useCallback(async (): Promise<void> => {
    if (!report.trim()) return;
    await Share.share({ message: report });
  }, [report]);

  const onClear = React.useCallback(async (): Promise<void> => {
    await clearAIDebugLogs();
    await loadLogs();
  }, [loadLogs]);

  const onShareByScanId = React.useCallback(async (): Promise<void> => {
    const parsed = Number(analysisIdInput.trim());
    const analysisId = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
    if (analysisId <= 0) {
      await showAlert({
        title: 'Invalid scan ID',
        message: 'Enter a valid numeric scan ID.',
      });
      return;
    }

    const reportById = await buildAIDebugReportByAnalysisId(analysisId);
    if (!/\nEntries:\s*0\b/.test(reportById)) {
      await Share.share({ message: reportById, title: `AI debug report #${analysisId}` });
      return;
    }
    await showAlert({
      title: 'No logs for this ID',
      message: `No saved logs found for scan #${analysisId}.`,
    });
  }, [analysisIdInput, showAlert]);

  return (
    <Screen safeTop={false}>
      <ScreenHeader onBack={() => navigation.goBack()} title="AI Logs" />
      <Card style={styles.topCard}>
        <Text style={styles.metaText} maxFontSizeMultiplier={1.2}>
          Entries: {count}
        </Text>
        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn} onPress={() => void loadLogs()}>
            <Text style={styles.actionBtnText} maxFontSizeMultiplier={1.2}>Refresh</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => void onShare()}>
            <Text style={styles.actionBtnText} maxFontSizeMultiplier={1.2}>Share</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, styles.clearBtn]} onPress={() => void onClear()}>
            <Text style={[styles.actionBtnText, styles.clearBtnText]} maxFontSizeMultiplier={1.2}>Clear</Text>
          </Pressable>
        </View>
        <Text style={styles.hintText} maxFontSizeMultiplier={1.2}>
          You can long-press the log text below and copy it.
        </Text>
        <View style={styles.shareByIdRow}>
          <TextInput
            style={styles.scanInput}
            value={analysisIdInput}
            onChangeText={setAnalysisIdInput}
            keyboardType="number-pad"
            placeholder="Scan ID"
            placeholderTextColor={appTheme.colors.muted}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <Pressable style={styles.actionBtn} onPress={() => void onShareByScanId()}>
            <Text style={styles.actionBtnText} maxFontSizeMultiplier={1.2}>Share by ID</Text>
          </Pressable>
        </View>
      </Card>

      <Card style={styles.logsCard}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={appTheme.colors.accent} />
            <Text style={styles.loadingText} maxFontSizeMultiplier={1.2}>Loading logs…</Text>
          </View>
        ) : report.trim() ? (
          <ScrollView style={styles.scroll}>
            <Text style={styles.logText} selectable>
              {report}
            </Text>
          </ScrollView>
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.2}>No AI logs yet</Text>
            <Text style={styles.emptySubtitle} maxFontSizeMultiplier={1.2}>
              Start scan or nutrition analysis to collect diagnostics.
            </Text>
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topCard: {
    gap: spec.spacing[8],
    marginBottom: spec.spacing[12],
  },
  metaText: {
    ...typography.bodySemibold,
    color: appTheme.colors.textPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spec.spacing[8],
  },
  actionBtn: {
    minHeight: 40,
    borderRadius: spec.inputRadius,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    paddingHorizontal: spec.spacing[12],
    justifyContent: 'center',
    backgroundColor: appTheme.colors.surface,
  },
  actionBtnText: {
    ...typography.caption,
    color: appTheme.colors.textPrimary,
    fontWeight: '600',
  },
  clearBtn: {
    borderColor: appTheme.colors.danger,
  },
  clearBtnText: {
    color: appTheme.colors.danger,
  },
  hintText: {
    ...typography.caption,
    color: appTheme.colors.muted,
  },
  shareByIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spec.spacing[8],
  },
  scanInput: {
    ...typography.body,
    flex: 1,
    minHeight: 40,
    borderRadius: spec.inputRadius,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
    paddingHorizontal: spec.spacing[12],
  },
  logsCard: {
    flex: 1,
    minHeight: 320,
    padding: spec.spacing[12],
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spec.spacing[8],
  },
  loadingText: {
    ...typography.caption,
    color: appTheme.colors.muted,
  },
  scroll: {
    flex: 1,
  },
  logText: {
    fontFamily: 'Menlo',
    fontSize: 12,
    lineHeight: 18,
    color: appTheme.colors.textPrimary,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spec.spacing[8],
  },
  emptyTitle: {
    ...typography.h2,
    color: appTheme.colors.textPrimary,
  },
  emptySubtitle: {
    ...typography.body,
    color: appTheme.colors.muted,
    textAlign: 'center',
  },
});
