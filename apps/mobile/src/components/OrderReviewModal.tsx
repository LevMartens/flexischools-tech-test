import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { submitOrder, type OrderConfirmation } from '../api/mockApi';
import { getItemCount, getOrderTotalCents, type OrderState } from '../state/orderReducer';
import { MIN_TOUCH_TARGET, colors, fontSize, radius, spacing } from '../theme';
import { formatCents } from '../utils/money';

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export type OrderReviewModalProps = {
  visible: boolean;
  order: OrderState;
  onClose: () => void;
  /** Called once the order has been accepted, so the menu can clear it. */
  onOrderSubmitted: () => void;
};

export function OrderReviewModal({
  visible,
  order,
  onClose,
  onOrderSubmitted,
}: OrderReviewModalProps) {
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);

  // `status` only updates on the next render, so two taps in the same tick can
  // both see 'idle'. The ref flips synchronously and blocks the second one.
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setStatus('idle');
      setErrorMessage('');
      setConfirmation(null);
      inFlightRef.current = false;
    }
  }, [visible]);

  const handleSubmit = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setStatus('submitting');

    try {
      const result = await submitOrder(order);

      setConfirmation(result);
      setStatus('success');
      onOrderSubmitted();
    } catch (error) {
      // The order is left untouched, so Retry resubmits exactly what failed.
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong.');
      setStatus('error');
    } finally {
      inFlightRef.current = false;
    }
  }, [order, onOrderSubmitted]);

  const isSubmitting = status === 'submitting';
  const itemCount = getItemCount(order);
  const totalCents = getOrderTotalCents(order);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={isSubmitting ? undefined : onClose}>
      {/* A Modal renders in its own native view hierarchy, so it needs its own
          provider rather than inheriting the app's insets. */}
      <SafeAreaProvider>
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {status === 'success' ? 'Order placed' : 'Review order'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={status === 'success' ? 'Back to menu' : 'Close review'}
              accessibilityState={{ disabled: isSubmitting }}
              disabled={isSubmitting}
              style={styles.headerButton}
              onPress={onClose}>
              <Text style={[styles.headerButtonText, isSubmitting && styles.textDisabled]}>
                {status === 'success' ? 'Done' : 'Close'}
              </Text>
            </Pressable>
          </View>

          {status === 'success' && confirmation ? (
            <View style={styles.centered}>
              <Text style={styles.successText}>Thanks! Your order is confirmed.</Text>
              <Text style={styles.confirmationDetail}>Order {confirmation.orderId}</Text>
              <Text style={styles.confirmationDetail}>
                Total paid {formatCents(confirmation.totalCents)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to menu"
                style={styles.primaryButton}
                onPress={onClose}>
                <Text style={styles.primaryButtonText}>Back to menu</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <ScrollView contentContainerStyle={styles.lines}>
                {order.map((line) => (
                  <View key={line.product.id} style={styles.line}>
                    <Text style={styles.lineName}>
                      {line.quantity} × {line.product.name}
                    </Text>
                    <Text style={styles.linePrice}>
                      {formatCents(line.product.priceCents * line.quantity)}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.footer}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    Total · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </Text>
                  <Text style={styles.totalValue}>{formatCents(totalCents)}</Text>
                </View>

                {status === 'error' && (
                  <Text style={styles.errorText} accessibilityLiveRegion="polite">
                    {errorMessage}
                  </Text>
                )}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    status === 'error' ? 'Retry submitting order' : 'Submit order'
                  }
                  accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
                  disabled={isSubmitting}
                  style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
                  onPress={handleSubmit}>
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {status === 'error' ? 'Retry' : 'Submit order'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  headerButton: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.primary,
  },
  textDisabled: {
    color: colors.textDisabled,
  },
  lines: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  lineName: {
    flex: 1,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  linePrice: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
  },
  totalValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.danger,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  successText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  confirmationDetail: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
  },
  primaryButton: {
    minHeight: MIN_TOUCH_TARGET,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.textDisabled,
  },
  primaryButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.onPrimary,
  },
});
