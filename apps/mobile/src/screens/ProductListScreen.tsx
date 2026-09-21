import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchProducts } from '../api/mockApi';
import {
  getItemCount,
  getOrderTotalCents,
  initialOrderState,
  orderReducer,
  type OrderAction,
} from '../state/orderReducer';
import type { Product, ProductCategory } from '../types';

type Status = 'loading' | 'error' | 'ready';

type Section = {
  title: ProductCategory;
  data: Product[];
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

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

type ProductRowProps = {
  product: Product;
  quantity: number;
  dispatch: (action: OrderAction) => void;
};

function ProductRow({ product, quantity, dispatch }: ProductRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={[styles.rowName, !product.isAvailable && styles.rowNameUnavailable]}>
          {product.name}
        </Text>
        <Text style={styles.rowPrice}>{formatCents(product.priceCents)}</Text>
      </View>

      {!product.isAvailable ? (
        <Text style={styles.soldOut}>Sold out</Text>
      ) : quantity === 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${product.name}`}
          style={styles.addButton}
          onPress={() => dispatch({ type: 'add', product })}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      ) : (
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove one ${product.name}`}
            style={styles.stepperButton}
            onPress={() => dispatch({ type: 'decrement', productId: product.id })}>
            <Text style={styles.stepperButtonText}>−</Text>
          </Pressable>

          <Text style={styles.stepperQuantity} accessibilityLabel={`${product.name} quantity`}>
            {quantity}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add another ${product.name}`}
            style={styles.stepperButton}
            onPress={() => dispatch({ type: 'increment', productId: product.id })}>
            <Text style={styles.stepperButtonText}>+</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
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

  const sections = useMemo(() => buildSections(products), [products]);

  const quantityByProductId = useMemo(() => {
    const quantities = new Map<string, number>();

    for (const line of order) {
      quantities.set(line.product.id, line.quantity);
    }

    return quantities;
  }, [order]);

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
          accessibilityLabel="Retry"
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
        contentContainerStyle={
          sections.length === 0 ? styles.emptyContent : styles.listContent
        }
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <ProductRow
            product={item}
            quantity={quantityByProductId.get(item.id) ?? 0}
            dispatch={dispatch}
          />
        )}
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
            onPress={() => dispatch({ type: 'clear' })}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  centeredText: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#b00020',
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#1d4ed8',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyContent: {
    flexGrow: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: 16,
    color: '#111',
  },
  rowNameUnavailable: {
    color: '#999',
  },
  rowPrice: {
    marginTop: 2,
    fontSize: 14,
    color: '#666',
  },
  soldOut: {
    fontSize: 14,
    color: '#999',
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1d4ed8',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
  },
  stepperButtonText: {
    fontSize: 20,
    lineHeight: 24,
    color: '#1d4ed8',
  },
  stepperQuantity: {
    minWidth: 20,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  clearText: {
    fontSize: 15,
    color: '#1d4ed8',
    fontWeight: '600',
  },
});
