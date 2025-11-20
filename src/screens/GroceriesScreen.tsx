import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';

type GroceryItem = {
  id: string;
  name: string;
  done: boolean;
  addedBy: string;
};

type FavoriteItem = {
  id: string;
  name: string;
  emoji: string;
};

const FAVORITE_ITEMS: FavoriteItem[] = [
  { id: 'milk', name: 'Melk', emoji: '🥛' },
  { id: 'bread', name: 'Brood', emoji: '🍞' },
  { id: 'fruit', name: 'Appels', emoji: '🍎' },
];

const CONTRIBUTORS = ['Mama', 'Papa', 'Noor', 'Liam'];

const QuickAddPill = ({
  item,
  onSelect,
}: {
  item: FavoriteItem;
  onSelect: (item: FavoriteItem) => void;
}) => (
  <TouchableOpacity style={styles.quickAddPill} onPress={() => onSelect(item)}>
    <Text style={styles.quickAddEmoji}>{item.emoji}</Text>
    <Text style={styles.quickAddLabel}>{item.name}</Text>
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
}) => {
  const swipeRef = useRef<Swipeable | null>(null);

  const renderRightActions = () => (
    <View style={styles.deleteAction}>
      <Text style={styles.deleteActionText}>Verwijder</Text>
    </View>
  );

  const handleSwipeableOpen = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      onDelete();
      swipeRef.current?.close();
    }
  };

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      renderRightActions={renderRightActions}
      onSwipeableOpen={handleSwipeableOpen}>
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.listCard, item.done && styles.listCardDone]}
        onPress={onToggle}>
        <View style={[styles.cardDot, item.done && styles.cardDotDone]} />
        <View style={styles.cardTextGroup}>
          <Text style={[styles.cardTitle, item.done && styles.cardTitleDone]}>{item.name}</Text>
          <Text style={styles.cardSubtitle}>Toegevoegd door {item.addedBy}</Text>
        </View>
        {item.done && <Text style={styles.cardCheck}>✓</Text>}
      </TouchableOpacity>
    </Swipeable>
  );
};

const EmptyState = () => (
  <View style={styles.emptyState}>
    <View style={styles.emptyBadge}>
      <Text style={styles.emptyBadgeIcon}>✨</Text>
    </View>
    <Text style={styles.emptyTitle}>Alles geregeld</Text>
    <Text style={styles.emptySubtitle}>Typ hierboven om je lijst te vullen.</Text>
  </View>
);

export default function GroceriesScreen() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showFavorites, setShowFavorites] = useState(true);
  const [contributorIndex, setContributorIndex] = useState(0);

  const openItems = useMemo(() => items.filter((item) => !item.done), [items]);
  const checkedItems = useMemo(() => items.filter((item) => item.done), [items]);
  const sections = useMemo(() => {
    const next = [];
    if (openItems.length > 0) {
      next.push({ title: 'Nog nodig', data: openItems });
    }
    if (checkedItems.length > 0) {
      next.push({ title: 'In tas', data: checkedItems });
    }
    return next;
  }, [openItems, checkedItems]);

  const canSubmit = inputValue.trim().length > 0;
  const placeholder = items.length === 0 ? 'Wat moet er mee?' : 'Nog iets?';

  const handleAddItem = useCallback(
    (nameOverride?: string) => {
      const cleanName = (nameOverride ?? inputValue).trim();
      if (!cleanName) {
        return;
      }
      const author = CONTRIBUTORS[contributorIndex % CONTRIBUTORS.length];
      const newItem: GroceryItem = {
        id: Date.now().toString(),
        name: cleanName,
        done: false,
        addedBy: author,
      };
      setItems((prev) => [newItem, ...prev]);
      setInputValue('');
      setContributorIndex((prev) => (prev + 1) % CONTRIBUTORS.length);
      setShowFavorites(false);
      Keyboard.dismiss();
    },
    [contributorIndex, inputValue],
  );

  const handleToggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    );
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleQuickAdd = useCallback(
    (favorite: FavoriteItem) => {
      handleAddItem(favorite.name);
    },
    [handleAddItem],
  );

  const shouldShowFavorites = showFavorites && FAVORITE_ITEMS.length > 0 && items.length === 0;
  const canRevealFavorites = !shouldShowFavorites && items.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Lijst</Text>
          <Text style={styles.title}>Lijst van vandaag</Text>
          <Text style={styles.subtitle}>Alles wat nog moet op één plek.</Text>
          <View style={[styles.inputWrapper, canSubmit && styles.inputWrapperActive]}>
            <TextInput
              placeholder={placeholder}
              placeholderTextColor="rgba(21,24,35,0.35)"
              style={styles.input}
              value={inputValue}
              onChangeText={(text) => setInputValue(text)}
              returnKeyType="done"
              onSubmitEditing={() => handleAddItem()}
            />
            {canSubmit ? (
              <TouchableOpacity style={styles.addButton} onPress={() => handleAddItem()}>
                <Text style={styles.addButtonIcon}>+</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {shouldShowFavorites ? (
          <ScrollView
            horizontal
            contentContainerStyle={styles.quickAddRow}
            showsHorizontalScrollIndicator={false}>
            {FAVORITE_ITEMS.map((favorite) => (
              <QuickAddPill key={favorite.id} item={favorite} onSelect={handleQuickAdd} />
            ))}
          </ScrollView>
        ) : (
          canRevealFavorites && (
            <TouchableOpacity
              style={styles.revealFavoritesButton}
              onPress={() => setShowFavorites(true)}>
              <Text style={styles.revealFavoritesText}>Favorieten tonen</Text>
            </TouchableOpacity>
          )
        )}

        <View style={styles.listWrapper}>
          {sections.length === 0 ? (
            <EmptyState />
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.sectionContent}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              renderSectionHeader={({ section }) => (
                <Text style={styles.sectionHeader}>{section.title}</Text>
              )}
              renderItem={({ item }) => (
                <ListItemCard
                  item={item}
                  onToggle={() => handleToggleItem(item.id)}
                  onDelete={() => handleDeleteItem(item.id)}
                />
              )}
              stickySectionHeadersEnabled={false}
            />
          )}
        </View>
      </View>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {openItems.length} open • {checkedItems.length} klaar
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F0EA',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  hero: {
    gap: 6,
    marginBottom: 16,
  },
  kicker: {
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 12,
    color: '#7F7B75',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#141A24',
  },
  subtitle: {
    color: 'rgba(20,26,36,0.55)',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#141A24',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  inputWrapperActive: {
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#141A24',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#171E2B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonIcon: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '600',
  },
  quickAddRow: {
    gap: 12,
    paddingVertical: 2,
  },
  quickAddPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFF',
    shadowColor: '#141A24',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  quickAddEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  quickAddLabel: {
    fontWeight: '600',
    color: '#141A24',
  },
  revealFavoritesButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  revealFavoritesText: {
    color: '#5C4BFF',
    fontWeight: '600',
  },
  listWrapper: {
    flex: 1,
    marginTop: 12,
  },
  sectionContent: {
    paddingBottom: 120,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7B7F87',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  itemSeparator: {
    height: 12,
  },
  listCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#141A24',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  listCardDone: {
    backgroundColor: '#F0F0F2',
  },
  cardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#141A24',
  },
  cardDotDone: {
    backgroundColor: '#6AC48A',
  },
  cardTextGroup: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#141A24',
  },
  cardTitleDone: {
    color: 'rgba(20,26,36,0.4)',
    textDecorationLine: 'line-through',
  },
  cardSubtitle: {
    marginTop: 4,
    color: 'rgba(20,26,36,0.55)',
  },
  cardCheck: {
    fontSize: 18,
    color: '#6AC48A',
    fontWeight: '700',
  },
  deleteAction: {
    width: 120,
    backgroundColor: '#FFE3E3',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    marginVertical: 6,
    marginLeft: 12,
  },
  deleteActionText: {
    color: '#D64545',
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 16,
  },
  emptyBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#141A24',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  emptyBadgeIcon: {
    fontSize: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#141A24',
  },
  emptySubtitle: {
    color: 'rgba(20,26,36,0.55)',
  },
  statusBar: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,26,36,0.08)',
    backgroundColor: '#F5F2ED',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#141A24',
  },
});

