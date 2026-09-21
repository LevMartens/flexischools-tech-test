import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type SectionListRenderItem,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchProducts } from '../api/mockApi';
import { ProductRow } from '../components/ProductRow';
import {
  getItemCount,
  getOrderTotalCents,
  initialOrderState,
  orderReducer,
} from '../state/orderReducer';
import { MIN_TOUCH_TARGET, colors, fontSize, radius, spacing } from '../theme';
import type { Product, ProductCategory } from '../types';
import { formatCents } from '../utils/money';

type Status = 'loading' | 'error' | 'ready';

type Section = {
  title: ProductCategory;
  data: Product[];
};

/** Groups products by category, keeping the order the categories first appear in. */
function buildSections(products: Product[]): Section[] {
  const sections: Section[] = [];

  for (const product of products) {
    const section = sections.find((candidate) => candidate.title === product.category);

    if (section) {
      section.data.push(product);
    } else {
      sections.push({ title: product.category, data: [product] });
    }
  }

  return sections;
}

export default function ProductListScreen() {
  const [order, dispatch] = useReducer(orderReducer, initialOrderState);
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // Ignores the response of any request that a newer one has superseded.
  const latestRequestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;

    setStatus('loading');

    try {
      const result = await fetchProducts();

      if (latestRequestRef.current !== requestId) {
        return;
      }

      setProducts(result);
      setStatus('ready');
    } catch (error) {
      if (latestRequestRef.current !== requestId) {
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Stable across renders, so a memoised row only re-renders when its own
  // product or quantity changes.
  const handleAdd = useCallback((product: Product) => {
    dispatch({ type: 'add', product });
  }, []);

  const handleIncrement = useCallback((productId: string) => {
    dispatch({ type: 'increment', productId });
  }, []);

  const handleDecrement = useCallback((productId: string) => {
    dispatch({ type: 'decrement', productId });
  }, []);

  const handleClear = useCallback(() => {
    dispatch({ type: 'clear' });
  }, []);

  const sections = useMemo(() => buildSections(products), [products]);

  const quantityByProductId = useMemo(() => {
    const quantities = new Map<string, number>();

    for (const line of order) {
      quantities.set(line.product.id, line.quantity);
    }

    return quantities;
  }, [order]);

  const renderItem = useCallback<SectionListRenderItem<Product, Section>>(
    ({ item }) => (
      <ProductRow
        product={item}
        quantity={quantityByProductId.get(item.id) ?? 0}
        onAdd={handleAdd}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
      />
    ),
    [quantityByProductId, handleAdd, handleIncrement, handleDecrement]
  );

  const itemCount = getItemCount(order);
  const totalCents = getOrderTotalCents(order);

  if (status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" accessibilityLabel="Loading menu" />
        <Text style={styles.centeredText}>Loading menu…</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry loading the menu"
          style={styles.retryButton}
          onPress={load}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SectionList
        sections={sections}
        keyExtractor={(product) => product.id}
        contentContainerStyle={sections.length === 0 ? styles.emptyContent : styles.listContent}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.centeredText}>No products are on the menu today.</Text>
          </View>
        }
      />

      {itemCount > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'} · {formatCents(totalCents)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear order"
            style={styles.clearButton}
            onPress={handleClear}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  centeredText: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.danger,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  retryButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  emptyContent: {
    flexGrow: 1,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  summaryText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  clearButton: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
});
