import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors, radius, spacing, textStyles } from '@/lib/theme';
import { useActiveHousehold, useSession } from '@/state/sessionStore';
import { logSupabaseError } from '@/utils/logging';
import { toast } from '@/utils/toast';

type FeatherIconName = ComponentProps<typeof Feather>['name'];

type QuickAction = {
  id: string;
  title: string;
  description: string;
  icon: FeatherIconName;
  accent: string;
  route?: string;
};

type InspirationCard = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  background: string;
};

type AgendaItem = {
  id: string;
  day: string;
  time: string;
  title: string;
  owner: string;
  note: string;
  accent: string;
  location?: string;
};

type HouseholdSnapshot = {
  name: string;
  memberCount: number;
  listName?: string | null;
  openItems?: number | null;
};

type FamilyMission = {
  id: string;
  title: string;
  detail: string;
  owner: string;
  progress: number;
  tag: string;
  accent: string;
};

type ConnectionCard = {
  id: string;
  emoji: string;
  title: string;
  note: string;
  footnote: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'groceries',
    title: 'Boodschappen',
    description: 'Check samen wat er nog nodig is.',
    icon: 'shopping-bag',
    accent: '#3DDC84',
    route: '/(tabs)/groceries',
  },
  {
    id: 'planner',
    title: 'Gezinsplanner',
    description: 'Snel een gezinsmoment vastleggen.',
    icon: 'calendar',
    accent: '#7E57C2',
  },
  {
    id: 'moments',
    title: 'Moment delen',
    description: 'Deel een foto of highlight van de week.',
    icon: 'camera',
    accent: '#F9A826',
  },
  {
    id: 'checkin',
    title: 'Check-in',
    description: 'Laat een lief bericht achter.',
    icon: 'message-circle',
    accent: '#26C6DA',
  },
];

const INSPIRATION_CARDS: InspirationCard[] = [
  {
    id: 'pasta',
    emoji: '🍝',
    title: 'Pasta avond',
    description: 'Laat iedereen een ingrediënt kiezen voor het menu.',
    background: '#FFF3E0',
  },
  {
    id: 'game',
    emoji: '🎲',
    title: 'Speelavond',
    description: 'Organiseer een mini-toernooi met prijzen.',
    background: '#E3F2FD',
  },
  {
    id: 'walk',
    emoji: '🚲',
    title: 'Buitenmoment',
    description: 'Plan een wandeling of fietstocht met de hele groep.',
    background: '#E8F5E9',
  },
];

const SHARED_AGENDA: AgendaItem[] = [
  {
    id: 'wednesday-dinner',
    day: 'Woensdag',
    time: '18:00',
    title: 'Kookclub: taco night',
    owner: 'Gezins-team',
    location: 'Keuken',
    note: 'Laat ieder een topping kiezen en check de groentelijst.',
    accent: '#FFE082',
  },
  {
    id: 'friday-movie',
    day: 'Vrijdag',
    time: '20:00',
    title: 'Filmavond & popcorn',
    owner: 'Ouders',
    location: 'Woonkamer',
    note: 'Stem vanmiddag op de film en leg dekentjes klaar.',
    accent: '#CFD8DC',
  },
  {
    id: 'sunday-visit',
    day: 'Zondag',
    time: '11:00',
    title: 'Koffie met opa & oma',
    owner: 'Iedereen',
    location: 'Bij jullie thuis',
    note: 'Bak samen iets lekkers als verrassing.',
    accent: '#DCEDC8',
  },
];

const FAMILY_MISSIONS: FamilyMission[] = [
  {
    id: 'meal-plan',
    title: 'Menu bedenken',
    detail: 'Iedereen pitcht één gerecht voor het weekend.',
    owner: 'Gezamenlijk',
    progress: 0.65,
    tag: 'Weekend',
    accent: '#FFB74D',
  },
  {
    id: 'clean-up',
    title: 'Kamers opruimen',
    detail: '15-minuten sprint na het avondeten.',
    owner: 'Kids',
    progress: 0.3,
    tag: 'Vanavond',
    accent: '#4DD0E1',
  },
  {
    id: 'outing',
    title: 'Zondag uitje kiezen',
    detail: 'Stemmen tussen boswandeling of museum.',
    owner: 'Ouders',
    progress: 0.5,
    tag: 'Planning',
    accent: '#81C784',
  },
];

const CONNECTION_BOARD: ConnectionCard[] = [
  {
    id: 'moment',
    emoji: '📸',
    title: 'Hoogtepunt',
    note: 'Mila heeft haar voetbalmedaille laten zien.',
    footnote: 'Geplaatst • gisteren',
  },
  {
    id: 'shoutout',
    emoji: '💬',
    title: 'Shout-out',
    note: 'Papa bedankte iedereen voor het meehelpen met koken.',
    footnote: 'Gezinschat • 2h geleden',
  },
  {
    id: 'reminder',
    emoji: '⏰',
    title: 'Gentle reminder',
    note: 'Tandenborstels vervangen voor het weekend.',
    footnote: 'Checklist',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { activeHouseholdId } = useActiveHousehold();
  const [snapshot, setSnapshot] = useState<HouseholdSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSnapshot = async () => {
      if (!session || !activeHouseholdId || !supabase || !isSupabaseConfigured) {
        if (isMounted) {
          setSnapshot(null);
          setLoadingSnapshot(false);
        }
        return;
      }

      setLoadingSnapshot(true);

      try {
        const [
          { data: householdData, error: householdError },
          { count: memberCount, error: memberError },
        ] = await Promise.all([
          supabase.from('households').select('id, name').eq('id', activeHouseholdId).maybeSingle(),
          supabase
            .from('members')
            .select('id', { head: true, count: 'exact' })
            .eq('household_id', activeHouseholdId),
        ]);

        if (householdError) {
          logSupabaseError('households.select', householdError, {
            screen: 'Home',
            activeHouseholdId,
          });
        }

        if (memberError) {
          logSupabaseError('members.select', memberError, {
            screen: 'Home',
            activeHouseholdId,
          });
        }

        let listName: string | null = null;
        let openItems: number | null = null;

        if (householdData && !householdError) {
          const { data: listData, error: listError } = await supabase
            .from('lists')
            .select('id, name')
            .eq('household_id', activeHouseholdId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (listError) {
            logSupabaseError('lists.select', listError, {
              screen: 'Home',
              activeHouseholdId,
            });
          } else if (listData) {
            listName = listData.name;

            const { count, error: countError } = await supabase
              .from('items')
              .select('id', { head: true, count: 'exact' })
              .eq('list_id', listData.id)
              .eq('checked', false);

            if (countError) {
              logSupabaseError('items.select', countError, {
                screen: 'Home',
                listId: listData.id,
              });
            } else {
              openItems = count ?? 0;
            }
          }
        }

        if (isMounted) {
          setSnapshot(
            householdData
              ? {
                  name: householdData.name,
                  memberCount: memberCount ?? 1,
                  listName,
                  openItems,
                }
              : null,
          );
        }
      } catch (error) {
        console.error('[Home] Failed to load household snapshot', error);
      } finally {
        if (isMounted) {
          setLoadingSnapshot(false);
        }
      }
    };

    void loadSnapshot();

    return () => {
      isMounted = false;
    };
  }, [session, activeHouseholdId]);

  const greetingName = useMemo(() => {
    const metadataName = (session?.user?.user_metadata?.full_name as string | undefined)?.trim();
    if (metadataName) {
      return metadataName.split(' ')[0];
    }
    const emailName = session?.user?.email?.split('@')[0];
    return emailName ?? 'familie';
  }, [session]);

  const now = useMemo(() => new Date(), []);
  const weekday = useMemo(
    () => now.toLocaleDateString('nl-NL', { weekday: 'long' }).replace(/^(.)/, (m) => m.toUpperCase()),
    [now],
  );
  const dateLabel = useMemo(
    () => now.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' }),
    [now],
  );

  const heroSubtitle = activeHouseholdId
    ? `${weekday} ${dateLabel} • samen vooruit.`
    : 'Maak een huishouden aan en nodig de rest van de familie uit.';

  const handleNavigateToGroceries = () => {
    router.push('/(tabs)/groceries');
  };

  const handleActionPress = (action: QuickAction) => {
    if (action.route) {
      router.push(action.route);
      return;
    }
    toast('Deze functie komt binnenkort beschikbaar.');
  };

  const quickRows = useMemo(() => {
    const rows: QuickAction[][] = [];
    for (let i = 0; i < QUICK_ACTIONS.length; i += 2) {
      rows.push(QUICK_ACTIONS.slice(i, i + 2));
    }
    return rows;
  }, []);

  const inspirationRows = useMemo(() => {
    const rows: InspirationCard[][] = [];
    for (let i = 0; i < INSPIRATION_CARDS.length; i += 2) {
      rows.push(INSPIRATION_CARDS.slice(i, i + 2));
    }
    return rows;
  }, []);

  const emptyStateLabel = !session
    ? 'Log in om jouw gezinsoverzicht te zien.'
    : 'Geen huishouden gekoppeld. Ga naar je profiel om er een te kiezen of te maken.';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={['#1B5E20', '#0F3815']} style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroChip}>
              <Feather name="sun" color={colors.surface} size={14} />
              <Text style={styles.heroChipText}>{weekday}</Text>
            </View>
            <View style={styles.heroChip}>
              <Feather name="clock" color={colors.surface} size={14} />
              <Text style={styles.heroChipText}>Gezinsmodus</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Hoi {greetingName} 👋</Text>
          <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Open boodschappen</Text>
              <Text style={styles.heroStatValue}>{snapshot?.openItems ?? '—'}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Gezinsleden</Text>
              <Text style={styles.heroStatValue}>{snapshot?.memberCount ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.heroButtonWrapper}>
            <Button title="Open boodschappenlijst" onPress={handleNavigateToGroceries} />
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gezinskompas</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
              <Text style={styles.linkText}>Huishouden beheren</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.summaryCard}>
            {!session || !activeHouseholdId ? (
              <>
                <Text style={styles.summaryText}>{emptyStateLabel}</Text>
                <View style={styles.buttonWrapper}>
                  <Button
                    title={session ? 'Ga naar profiel' : 'Inloggen'}
                    onPress={() => router.push('/(tabs)/profile')}
                    variant="ghost"
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.summaryRow}>
                  <View>
                    <Text style={styles.summaryLabel}>Actief huishouden</Text>
                    <Text style={styles.summaryPrimary}>{snapshot?.name ?? 'Huishouden'}</Text>
                  </View>
                  {loadingSnapshot && <ActivityIndicator color={colors.primaryDark} />}
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statBubble}>
                    <Feather name="users" size={18} color={colors.primaryDark} />
                    <Text style={styles.statText}>
                      {snapshot?.memberCount ?? '—'} gezinsleden
                    </Text>
                  </View>
                  <View style={styles.statBubble}>
                    <Feather name="shopping-cart" size={18} color={colors.primaryDark} />
                    <Text style={styles.statText}>
                      {snapshot?.openItems ?? 0} open boodschappen
                    </Text>
                  </View>
                </View>
                <Text style={styles.summaryHint}>
                  {snapshot?.listName
                    ? `Laatste lijst: ${snapshot.listName}`
                    : 'Maak een lijst in het boodschappen-tabje om te beginnen.'}
                </Text>
                <TouchableOpacity
                  style={styles.inlineLink}
                  onPress={handleNavigateToGroceries}
                  accessibilityRole="button">
                  <Text style={styles.inlineLinkText}>Spring naar boodschappenlijst</Text>
                  <Feather name="arrow-right" size={16} color={colors.primaryDark} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gezinssprint</Text>
            <TouchableOpacity onPress={() => toast('Planning binnenkort beschikbaar') }>
              <Text style={styles.linkText}>Plan samen</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.missionList}>
            {FAMILY_MISSIONS.map((mission) => (
              <View key={mission.id} style={styles.missionCard}>
                <View style={[styles.missionTag, { backgroundColor: mission.accent }] }>
                  <Text style={styles.missionTagText}>{mission.tag}</Text>
                </View>
                <Text style={styles.missionTitle}>{mission.title}</Text>
                <Text style={styles.missionDetail}>{mission.detail}</Text>
                <Text style={styles.missionOwner}>Eigenaar: {mission.owner}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${mission.progress * 100}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Snelle acties</Text>
            <Text style={styles.sectionHint}>Pak direct een taakje op</Text>
          </View>
          <View style={styles.quickGrid}>
            {quickRows.map((row, rowIndex) => (
              <View style={styles.quickRow} key={`quick-row-${rowIndex}`}>
                {row.map((action) => (
                  <TouchableOpacity
                    key={action.id}
                    style={styles.quickAction}
                    onPress={() => handleActionPress(action)}
                    activeOpacity={0.85}>
                    <View style={[styles.quickIcon, { backgroundColor: action.accent }]}>
                      <Feather name={action.icon} size={18} color="#fff" />
                    </View>
                    <Text style={styles.quickTitle}>{action.title}</Text>
                    <Text style={styles.quickDescription}>{action.description}</Text>
                  </TouchableOpacity>
                ))}
                {row.length < 2 ? <View style={[styles.quickAction, styles.quickPlaceholder]} /> : null}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gezinsbord</Text>
            <Text style={styles.sectionHint}>Bewaar leuke momenten en reminders</Text>
          </View>
          <View style={styles.connectionList}>
            {CONNECTION_BOARD.map((card) => (
              <View key={card.id} style={styles.connectionCard}>
                <Text style={styles.connectionEmoji}>{card.emoji}</Text>
                <View style={styles.connectionBody}>
                  <Text style={styles.connectionTitle}>{card.title}</Text>
                  <Text style={styles.connectionNote}>{card.note}</Text>
                  <Text style={styles.connectionFootnote}>{card.footnote}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gezamenlijke agenda</Text>
            <Text style={styles.sectionHint}>Weekoverzicht voor het hele gezin</Text>
          </View>
          <View style={styles.timeline}>
            {SHARED_AGENDA.map((item, index) => (
              <View key={item.id} style={styles.timelineRow}>
                <View style={styles.timelineBulletWrapper}>
                  <View style={styles.timelineLineTop}>
                    {index !== 0 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={[styles.timelineBullet, { backgroundColor: item.accent }]} />
                  <View style={styles.timelineLineBottom}>
                    {index !== SHARED_AGENDA.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                </View>
                <View style={[styles.timelineCard, { backgroundColor: item.accent }]}>
                  <View style={styles.agendaMetaRow}>
                    <Text style={styles.agendaDay}>{item.day}</Text>
                    <Text style={styles.agendaTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.highlightTitle}>{item.title}</Text>
                  <Text style={styles.agendaOwner}>Organisator: {item.owner}</Text>
                  {item.location ? <Text style={styles.agendaLocation}>📍 {item.location}</Text> : null}
                  <Text style={styles.agendaNote}>{item.note}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gezellige inspiratie</Text>
            <Text style={styles.sectionHint}>Voor als je even iets leuks wilt plannen</Text>
          </View>
          <View style={styles.inspirationGrid}>
            {inspirationRows.map((row, rowIndex) => (
              <View style={styles.inspirationRow} key={`inspiration-row-${rowIndex}`}>
                {row.map((card) => (
                  <View
                    key={card.id}
                    style={[styles.inspirationCard, { backgroundColor: card.background }]}>
                    <Text style={styles.inspirationEmoji}>{card.emoji}</Text>
                    <Text style={styles.inspirationTitle}>{card.title}</Text>
                    <Text style={styles.inspirationDescription}>{card.description}</Text>
                  </View>
                ))}
                {row.length < 2 ? (
                  <View style={[styles.inspirationCard, styles.inspirationPlaceholder]} />
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.xl,
  },
  hero: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  heroChipText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.surface,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  heroStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroStatValue: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: '700',
    marginTop: spacing.xs / 2,
  },
  heroButtonWrapper: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...textStyles.subtitle,
    fontSize: 20,
    fontWeight: '700',
  },
  sectionHint: {
    ...textStyles.caption,
    textAlign: 'right',
  },
  linkText: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#00000012',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryLabel: {
    ...textStyles.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryPrimary: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  summaryText: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  statText: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summaryHint: {
    ...textStyles.caption,
  },
  inlineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inlineLinkText: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  buttonWrapper: {
    alignSelf: 'flex-start',
  },
  missionList: {
    gap: spacing.md,
  },
  missionCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  missionTag: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  missionTagText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  missionDetail: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  missionOwner: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  quickGrid: {
    gap: spacing.md,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickPlaceholder: {
    opacity: 0,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickTitle: {
    fontWeight: '600',
    fontSize: 16,
    color: colors.textPrimary,
  },
  quickDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  connectionList: {
    gap: spacing.sm,
  },
  connectionCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  connectionEmoji: {
    fontSize: 28,
  },
  connectionBody: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  connectionTitle: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  connectionNote: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  connectionFootnote: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  timeline: {
    gap: spacing.md,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineBulletWrapper: {
    alignItems: 'center',
  },
  timelineBullet: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  timelineLineTop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  timelineLineBottom: {
    flex: 1,
  },
  timelineLine: {
    width: 2,
    backgroundColor: colors.border,
    flex: 1,
  },
  timelineCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  agendaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agendaDay: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  agendaTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  agendaOwner: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  agendaLocation: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  agendaNote: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  highlightDetail: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  highlightSuggestion: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  inspirationGrid: {
    gap: spacing.md,
  },
  inspirationRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inspirationCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  inspirationPlaceholder: {
    opacity: 0,
  },
  inspirationEmoji: {
    fontSize: 32,
  },
  inspirationTitle: {
    fontWeight: '600',
    fontSize: 16,
    color: colors.textPrimary,
  },
  inspirationDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
