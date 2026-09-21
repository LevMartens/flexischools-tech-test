import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH_TARGET, colors, fontSize, radius, spacing } from '../theme';
import type { Product } from '../types';
import { formatCents } from '../utils/money';

export type ProductRowProps = {
  product: Product;
  /** How many of this product are already in the order; 0 when it is not. */
  quantity: number;
  onAdd: (product: Product) => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
};

function ProductRowComponent({
  product,
  quantity,
  onAdd,
  onIncrement,
  onDecrement,
}: ProductRowProps) {
  const isUnavailable = !product.isAvailable;

  return (
    <View style={styles.row}>
      <View style={styles.details}>
        <Text style={[styles.name, isUnavailable && styles.textDisabled]}>{product.name}</Text>
        <Text style={[styles.price, isUnavailable && styles.textDisabled]}>
          {formatCents(product.priceCents)}
        </Text>
        {isUnavailable && <Text style={styles.availability}>Sold out</Text>}
      </View>

      {quantity === 0 || isUnavailable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${product.name} to order`}
          accessibilityState={{ disabled: isUnavailable }}
          disabled={isUnavailable}
          style={[styles.addButton, isUnavailable && styles.addButtonDisabled]}
          onPress={() => onAdd(product)}>
          <Text style={[styles.addButtonText, isUnavailable && styles.textDisabled]}>Add</Text>
        </Pressable>
      ) : (
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Decrease quantity of ${product.name}`}
            style={styles.stepperButton}
            onPress={() => onDecrement(product.id)}>
            <Text style={styles.stepperButtonText}>−</Text>
          </Pressable>

          <Text style={styles.quantity} accessibilityLabel={`Quantity of ${product.name}`}>
            {quantity}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Increase quantity of ${product.name}`}
            style={styles.stepperButton}
            onPress={() => onIncrement(product.id)}>
            <Text style={styles.stepperButtonText}>+</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export const ProductRow = memo(ProductRowComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.lg,
    color: colors.text,
  },
  price: {
    marginTop: spacing.xs / 2,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  availability: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textDisabled,
  },
  textDisabled: {
    color: colors.textDisabled,
  },
  addButton: {
    minWidth: MIN_TOUCH_TARGET * 1.5,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  addButtonDisabled: {
    backgroundColor: colors.disabledSurface,
  },
  addButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
  },
  stepperButtonText: {
    fontSize: fontSize.xl,
    lineHeight: 24,
    color: colors.primary,
  },
  quantity: {
    minWidth: spacing.xl,
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
});
