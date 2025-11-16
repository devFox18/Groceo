import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type GroceryItem = {
  id: string;
  name: string;
  quantity: number;
  done: boolean;
};

type RecentItem = {
  id: string;
  name: string;
  emoji: string;
};

const DEFAULT_RECENT_ITEMS: RecentItem[] = [
  { id: 'cheese', name: 'Kaas', emoji: '🧀' },
  { id: 'milk', name: 'Melk', emoji: '🥛' },
  { id: 'bread', name: 'Vers brood', emoji: '🍞' },
  { id: 'coffee', name: 'Koffiebonen', emoji: '☕️' },
];

const BottomNav = () => (
  <View style={styles.navBar}>
    <TouchableOpacity style={styles.navItem}>
      <Text style={styles.navLabel}>Home</Text>
    </TouchableOpacity>
    <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
      <Text style={[styles.navLabel, styles.navLabelActive]}>Boodschappen</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.navItem}>
      <Text style={styles.navLabel}>Profiel</Text>
    </TouchableOpacity>
  </View>
);

const StatusPill = ({ label }: { label: string }) => (
  <View style={styles.statusPill}>
    <Text style={styles.statusText}>{label}</Text>
  </View>
);

const RecentItemPill = ({
  item,
  onSelect,
}: {
  item: RecentItem;
  onSelect: (item: RecentItem) => void;
}) => (
  <TouchableOpacity style={styles.recentPill} onPress={() => onSelect(item)}>
    <Text style={styles.recentEmoji}>{item.emoji}</Text>
    <Text style={styles.recentLabel}>{item.name}</Text>
  </TouchableOpacity>
);

const ListItemCard = ({
  item,
  onToggle,
  onDelete,
}: {
  item: GroceryItem;
  onToggle: () => void;
  onDelete: () => void;
}) => (
  <View style={[styles.listCard, item.done && styles.listCardDone]}>
    <TouchableOpacity style={styles.checkbox} onPress={onToggle}>
      <Text style={styles.checkboxIcon}>{item.done ? '✔︎' : ''}</Text>
    </TouchableOpacity>
    <View style={styles.listCardContent}>
      <Text style={[styles.listCardTitle, item.done && styles.listCardTitleDone]}>{item.name}</Text>
      <Text style={styles.listCardSubtitle}>x{item.quantity}</Text>
    </View>
    <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
      <Text style={styles.deleteIcon}>🗑</Text>
    </TouchableOpacity>
  </View>
);

export default function GroceriesScreen() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [recentPurchasedItems] = useState<RecentItem[]>(DEFAULT_RECENT_ITEMS);

  const remainingCount = useMemo(() => items.filter((item) => !item.done).length, [items]);
  const doneCount = useMemo(() => items.filter((item) => item.done).length, [items]);

  const handleAddItem = useCallback(
    (nameOverride?: string, quantityOverride?: number) => {
      const name = (nameOverride ?? inputValue).trim();
      const qty = quantityOverride ?? quantity;
      if (!name) {
        return;
      }
      const newItem: GroceryItem = {
        id: Date.now().toString(),
        name,
        quantity: qty,
        done: false,
      };
      setItems((prev) => [newItem, ...prev]);
      setInputValue('');
      setQuantity(1);
    },
    [inputValue, quantity],
  );

  const handleToggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    );
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleClearList = useCallback(() => {
    setItems([]);
  }, []);

  const handleRecentSelect = useCallback(
    (recentItem: RecentItem) => {
      setInputValue(recentItem.name);
      handleAddItem(recentItem.name, 1);
    },
    [handleAddItem],
  );

  const decrementQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const incrementQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundCard}>
        <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Boodschappen</Text>
              <Text style={styles.subtitle}>Samen bijhouden wat er nog moet</Text>
            </View>
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => {
                console.log('Open history');
              }}>
              <Text style={styles.historyButtonText}>🕓 Historie</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusRow}>
            <StatusPill label={`${remainingCount} items open`} />
            <StatusPill label={`${doneCount} klaar`} />
          </View>

          <View style={styles.addCard}>
            <View style={styles.inputRow}>
              <View style={styles.inputIconBubble}>
                <Text style={styles.inputIcon}>🔍</Text>
              </View>
              <TextInput
                placeholder="Wat moet er mee?"
                placeholderTextColor="rgba(63,31,30,0.4)"
                style={styles.input}
                value={inputValue}
                onChangeText={setInputValue}
                returnKeyType="done"
                onSubmitEditing={() => handleAddItem()}
              />
              <TouchableOpacity style={styles.circleButton} onPress={() => handleAddItem()}>
                <Text style={styles.circleButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.quantityRow}>
              <Text style={styles.quantityLabel}>Aantal</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepperButton} onPress={decrementQuantity}>
                  <Text style={styles.stepperText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{quantity}</Text>
                <TouchableOpacity style={styles.stepperButton} onPress={incrementQuantity}>
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.primaryButton} onPress={() => handleAddItem()}>
                <Text style={styles.primaryButtonText}>Toevoegen</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recentSection}>
              <Text style={styles.recentTitle}>Recent gekocht</Text>
              <View style={styles.recentList}>
                {recentPurchasedItems.map((recentItem) => (
                  <RecentItemPill key={recentItem.id} item={recentItem} onSelect={handleRecentSelect} />
                ))}
              </View>
            </View>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBubble}>
                <Text style={styles.emptyIcon}>🛒</Text>
              </View>
              <Text style={styles.emptyTitle}>Nog niets op de lijst</Text>
              <Text style={styles.emptySubtitle}>Typ een product en druk op toevoegen.</Text>
            </View>
          ) : (
            <>
              <View style={styles.listSection}>
                <FlatList
                  data={items}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <ListItemCard
                      item={item}
                      onToggle={() => handleToggleItem(item.id)}
                      onDelete={() => handleDeleteItem(item.id)}
                    />
                  )}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
                />
              </View>
              <TouchableOpacity style={styles.clearButton} onPress={handleClearList}>
                <Text style={styles.clearButtonText}>🗑 Lijst leegmaken</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  backgroundCard: {
    flex: 1,
    backgroundColor: '#FFF5EA',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  contentContainer: {
    paddingBottom: 120,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2F1F1E',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: 'rgba(47,31,30,0.7)',
  },
  historyButton: {
    backgroundColor: '#FFE5CC',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  historyButtonText: {
    fontWeight: '600',
    color: '#3A1F0F',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusPill: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statusText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#3F2E2C',
  },
  addCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#D8BCA5',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    gap: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEFE2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  inputIcon: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2F1F1E',
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFB267',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2F1F1E',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityLabel: {
    fontWeight: '600',
    color: '#3F2E2C',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E8',
    borderRadius: 999,
    paddingHorizontal: 10,
  },
  stepperButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stepperText: {
    fontSize: 18,
    color: '#3F2E2C',
  },
  stepperValue: {
    minWidth: 24,
    textAlign: 'center',
    fontWeight: '600',
    color: '#3F2E2C',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#FF914D',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#FF914D',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  recentSection: {
    gap: 12,
  },
  recentTitle: {
    fontWeight: '700',
    color: '#3F2E2C',
  },
  recentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
  },
  recentEmoji: {
    fontSize: 16,
  },
  recentLabel: {
    fontWeight: '600',
    color: '#3F2E2C',
  },
  listSection: {
    gap: 12,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  listCardDone: {
    opacity: 0.6,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FF914D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxIcon: {
    fontSize: 14,
    color: '#FF914D',
  },
  listCardContent: {
    flex: 1,
  },
  listCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F1F1E',
  },
  listCardTitleDone: {
    textDecorationLine: 'line-through',
    color: 'rgba(47,31,30,0.6)',
  },
  listCardSubtitle: {
    marginTop: 2,
    color: 'rgba(47,31,30,0.6)',
  },
  deleteButton: {
    padding: 8,
  },
  deleteIcon: {
    fontSize: 18,
  },
  listSeparator: {
    height: 12,
  },
  clearButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FFECE0',
  },
  clearButtonText: {
    fontWeight: '600',
    color: '#3F2E2C',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyIconBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFE5D1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 34,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2F1F1E',
  },
  emptySubtitle: {
    color: 'rgba(47,31,30,0.7)',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2D5CA',
  },
  navItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  navItemActive: {
    backgroundColor: 'rgba(58,175,96,0.15)',
  },
  navLabel: {
    fontWeight: '600',
    color: '#7B6A64',
  },
  navLabelActive: {
    color: '#2F8F4E',
  },
});
