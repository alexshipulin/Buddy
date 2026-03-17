import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export type AppAlertAction = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
  testID?: string;
};

export type AppAlertOptions = {
  title: string;
  message?: string;
  actions?: AppAlertAction[];
  dismissible?: boolean;
};

export type AppAlertResult = {
  index: number;
  action: AppAlertAction | null;
};

type ShowAppAlert = (options: AppAlertOptions) => Promise<AppAlertResult>;

type AlertRequest = {
  title: string;
  message?: string;
  actions: AppAlertAction[];
  dismissible: boolean;
  resolve: (result: AppAlertResult) => void;
};

const AppAlertContext = React.createContext<ShowAppAlert | null>(null);

function normalizeActions(actions: AppAlertAction[] | undefined): AppAlertAction[] {
  if (!actions || actions.length === 0) return [{ text: 'OK', style: 'default' }];
  return actions.slice(0, 2);
}

function getActionVariant(
  action: AppAlertAction,
  index: number,
  total: number
): 'primary' | 'secondary' | 'destructive' {
  if (action.style === 'cancel') return 'secondary';
  if (action.style === 'destructive') return 'destructive';
  if (total === 1 || index === total - 1) return 'primary';
  return 'secondary';
}

export function AppAlertProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const queueRef = React.useRef<AlertRequest[]>([]);
  const [activeRequest, setActiveRequest] = React.useState<AlertRequest | null>(null);

  const flushQueue = React.useCallback(() => {
    setActiveRequest((prev) => {
      if (prev) return prev;
      return queueRef.current.shift() ?? null;
    });
  }, []);

  const showAlert = React.useCallback<ShowAppAlert>(
    (options) =>
      new Promise<AppAlertResult>((resolve) => {
        queueRef.current.push({
          title: options.title,
          message: options.message?.trim() ? options.message : undefined,
          actions: normalizeActions(options.actions),
          dismissible: Boolean(options.dismissible),
          resolve,
        });
        flushQueue();
      }),
    [flushQueue]
  );

  React.useEffect(() => {
    if (!activeRequest) flushQueue();
  }, [activeRequest, flushQueue]);

  const handleDismiss = React.useCallback(() => {
    if (!activeRequest) return;
    const request = activeRequest;
    setActiveRequest(null);
    request.resolve({ index: -1, action: null });
  }, [activeRequest]);

  const handleActionPress = React.useCallback(
    (index: number) => {
      if (!activeRequest) return;
      const request = activeRequest;
      const action = request.actions[index] ?? null;
      setActiveRequest(null);
      request.resolve({ index, action });
      if (action?.onPress) {
        Promise.resolve(action.onPress()).catch((error: unknown) => {
          console.warn('AppAlert action handler failed:', error);
        });
      }
    },
    [activeRequest]
  );

  return (
    <AppAlertContext.Provider value={showAlert}>
      {children}
      <Modal
        transparent
        visible={activeRequest != null}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (activeRequest?.dismissible) handleDismiss();
        }}
      >
        <View style={styles.backdrop} testID="app-alert-modal" accessibilityViewIsModal>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={activeRequest?.dismissible ? handleDismiss : undefined}
            accessibilityRole="button"
            accessibilityLabel="Dismiss alert"
          />
          <View style={styles.card} accessibilityRole="alert">
            <View style={styles.content}>
              <Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                {activeRequest?.title}
              </Text>
              {activeRequest?.message ? (
                <Text style={styles.message} maxFontSizeMultiplier={1.2}>
                  {activeRequest.message}
                </Text>
              ) : null}
            </View>
            <View style={styles.actionsRow}>
              {activeRequest?.actions.map((action, index) => {
                const total = activeRequest.actions.length;
                const variant = getActionVariant(action, index, total);
                const isSecondary = variant === 'secondary';
                const isDestructive = variant === 'destructive';
                return (
                  <Pressable
                    key={`${index}-${action.text}`}
                    testID={action.testID}
                    style={({ pressed }) => [
                      styles.actionButton,
                      total === 1
                        ? styles.actionButtonSingle
                        : isSecondary
                        ? styles.actionButtonSecondaryWidth
                        : styles.actionButtonPrimaryWidth,
                      isSecondary
                        ? styles.actionButtonSecondary
                        : isDestructive
                        ? styles.actionButtonDestructive
                        : styles.actionButtonPrimary,
                      pressed && styles.actionButtonPressed,
                    ]}
                    onPress={() => handleActionPress(index)}
                    accessibilityRole="button"
                    accessibilityLabel={action.text}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        isSecondary
                          ? styles.actionTextSecondary
                          : isDestructive
                          ? styles.actionTextDestructive
                          : styles.actionTextPrimary,
                      ]}
                      maxFontSizeMultiplier={1.2}
                    >
                      {action.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AppAlertContext.Provider>
  );
}

export function useAppAlert(): { showAlert: ShowAppAlert } {
  const context = React.useContext(AppAlertContext);
  if (!context) throw new Error('useAppAlert must be used within AppAlertProvider');
  return { showAlert: context };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
  },
  card: {
    width: '100%',
    maxWidth: 358,
    paddingHorizontal: 21,
    paddingVertical: 21,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    gap: 16,
  },
  content: {
    gap: 3,
  },
  title: {
    color: '#0F172A',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  message: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 19.25,
    fontWeight: '400',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    minHeight: 44,
    borderRadius: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonSingle: {
    flex: 1,
  },
  actionButtonSecondaryWidth: {
    flex: 1,
  },
  actionButtonPrimaryWidth: {
    flex: 1.93,
  },
  actionButtonPrimary: {
    backgroundColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  actionButtonSecondary: {
    backgroundColor: '#F1F5F9',
  },
  actionButtonDestructive: {
    backgroundColor: '#B91C1C',
    shadowColor: '#B91C1C',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  actionButtonPressed: {
    opacity: 0.88,
  },
  actionText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  actionTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionTextSecondary: {
    color: '#334155',
    fontWeight: '600',
  },
  actionTextDestructive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
