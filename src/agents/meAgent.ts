/**
 * Groceo agents.me-agent
 *
 * Deze agent behandelt natuurlijke taalroutines rond boodschappenlijsten:
 * 1) Ontleed gebruikersinvoer naar een intentie (toevoegen, tonen, leegmaken).
 * 2) Voer Supabase-calls uit als die beschikbaar zijn; val terug op een in-memory store voor lokaal gebruik.
 * 3) Geef een compacte samenvatting terug die direct in UI of logs gebruikt kan worden.
 *
 * Flow van input naar output:
 * - Input: AgentRequest met tekst + lijstId.
 * - Parsing: resolveIntent() detecteert intenties/keywords en extraheert items.
 * - Actie: performIntent() routeert naar addItems(), fetchItems() of clearList().
 * - Output: AgentResponse met status, samenvatting, optioneel actuele items en debug-informatie.
 *
 * Hoe op te zetten/te gebruiken:
 * - Importeer groceoAgent en roep handle(request) aan wanneer een gebruiker een boodschap-commando typt.
 * - Voor supabase-productie: geef een geldig listId door zodat items in de database worden bijgehouden.
 * - Voor demo/dev zonder supabase: laat listId leeg of gebruik een willekeurige string; de fallback store wordt gebruikt.
 *
 * Voorbeeldinteracties (zie EXAMPLE_INTERACTIONS):
 * - "Zet melk en eieren op de lijst" -> intent addItems, plaatst twee items.
 * - "Wat staat er open?" -> intent summarizeList, retourneert lopende items.
 * - "Maak de lijst leeg" -> intent clearList, verwijdert alle items.
 */

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { type GroceryItem } from '@/components/ItemRow';

type AgentIntent = 'addItems' | 'summarizeList' | 'clearList' | 'unknown';

export type AgentRequest = {
  /** Vrije tekst van de gebruiker, bijvoorbeeld "voeg melk x2 toe". */
  text: string;
  /** Vereist voor persistente opslag; bij ontbreken wordt lokale fallback gebruikt. */
  listId?: string | null;
  /** Optioneel voor logging/metrics. */
  userId?: string;
};

export type AgentResponse = {
  status: 'success' | 'error';
  /** Beknopte uitleg voor UI/logging. */
  summary: string;
  /** Actuele items na de uitgevoerde actie (indien van toepassing). */
  items?: GroceryItem[];
  /** Extra metadata om debugging te vergemakkelijken. */
  debug?: {
    intent: AgentIntent;
    matchedKeywords?: string[];
    offlineFallback: boolean;
  };
  error?: string;
};

type ParsedIntent = {
  intent: AgentIntent;
  matchedKeywords: string[];
  items?: Array<{ name: string; quantity: number }>;
};

const INTENT_KEYWORDS: Record<AgentIntent, string[]> = {
  addItems: ['toevoeg', 'add', 'zet', 'plaats', 'op de lijst'],
  summarizeList: ['wat staat', 'toon', 'bekijk', 'overzicht', 'open items'],
  clearList: ['leeg', 'clear', 'opruimen', 'wis alles', 'verwijder alles'],
  unknown: [],
};

const DEFAULT_LIST_ID = 'offline-list';
const offlineStore = new Map<string, GroceryItem[]>();

/**
 * AgentsMeAgent bundelt de volledige agent-implementatie en documentatie.
 * De class is bewust stateless; state zit in Supabase of de offlineStore.
 */
class AgentsMeAgent {
  /**
   * Hoofdingang voor de agent. Handelt parsing, routering en error handling af.
   */
  async handle(request: AgentRequest): Promise<AgentResponse> {
    const targetListId = request.listId ?? DEFAULT_LIST_ID;

    try {
      const parsedIntent = this.resolveIntent(request.text);
      if (parsedIntent.intent === 'unknown') {
        return {
          status: 'success',
          summary:
            'Ik begrijp je bericht niet helemaal. Zeg bijvoorbeeld "voeg melk toe" of "wat staat er open?".',
          debug: { intent: parsedIntent.intent, matchedKeywords: parsedIntent.matchedKeywords, offlineFallback: !isSupabaseConfigured },
        };
      }

      const result = await this.performIntent(parsedIntent, targetListId);
      return {
        status: 'success',
        summary: result.summary,
        items: result.items,
        debug: {
          intent: parsedIntent.intent,
          matchedKeywords: parsedIntent.matchedKeywords,
          offlineFallback: result.offlineFallback,
        },
      };
    } catch (error) {
      // Centrale errorafvang zodat consumers een voorspelbare payload krijgen.
      const message = error instanceof Error ? error.message : 'Onbekende fout in agent.';
      return {
        status: 'error',
        summary: 'Er ging iets mis bij het uitvoeren van de actie.',
        error: message,
        debug: { intent: 'unknown', offlineFallback: !isSupabaseConfigured },
      };
    }
  }

  /**
   * Breekt gebruikersinput op in intentie + items (bij add) voor downstream acties.
   */
  resolveIntent(text: string): ParsedIntent {
    const lower = text.toLowerCase();
    const hits: ParsedIntent['matchedKeywords'] = [];

    // Intentdetectie met eenvoudige keyword-scan. Kan later worden vervangen door NLU.
    const intent =
      (this.hasKeyword(lower, INTENT_KEYWORDS.addItems, hits) && 'addItems') ||
      (this.hasKeyword(lower, INTENT_KEYWORDS.summarizeList, hits) && 'summarizeList') ||
      (this.hasKeyword(lower, INTENT_KEYWORDS.clearList, hits) && 'clearList') ||
      'unknown';

    const items =
      intent === 'addItems'
        ? this.extractItems(lower)
        : undefined;

    return { intent, matchedKeywords: hits, items };
  }

  /**
   * Routeert naar de juiste actie op basis van intent.
   */
  private async performIntent(
    parsed: ParsedIntent,
    listId: string,
  ): Promise<{ summary: string; items?: GroceryItem[]; offlineFallback: boolean }> {
    switch (parsed.intent) {
      case 'addItems': {
        const addedCount = await this.addItems(listId, parsed.items ?? []);
        const items = await this.fetchItems(listId);
        return {
          summary: addedCount > 0 ? `Toegevoegd: ${addedCount} item(s).` : 'Geen nieuwe items gevonden om toe te voegen.',
          items,
          offlineFallback: !isSupabaseConfigured,
        };
      }
      case 'summarizeList': {
        const items = await this.fetchItems(listId);
        const open = items.filter((item) => !item.checked);
        const label = open.length === 0 ? 'Lijst is leeg.' : `Nog open: ${open.length} item(s).`;
        return {
          summary: label,
          items,
          offlineFallback: !isSupabaseConfigured,
        };
      }
      case 'clearList': {
        await this.clearList(listId);
        return {
          summary: 'Lijst geleegd.',
          items: [],
          offlineFallback: !isSupabaseConfigured,
        };
      }
      default:
        return { summary: 'Geen actie uitgevoerd.', offlineFallback: !isSupabaseConfigured };
    }
  }

  /**
   * Controleer of keywords voorkomen in de input en houd bij welke keywords matchen.
   */
  private hasKeyword(input: string, keywords: string[], hits: string[]): boolean {
    const matched = keywords.find((keyword) => input.includes(keyword));
    if (matched) {
      hits.push(matched);
      return true;
    }
    return false;
  }

  /**
   * Eenvoudige parser om "melk x2, brood" naar item-lijst te vertalen.
   */
  private extractItems(text: string): Array<{ name: string; quantity: number }> {
    return text
      .split(/[,.]/)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const quantityMatch = chunk.match(/x(\d+)/);
        const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;
        const name = chunk.replace(/x\d+/, '').replace(/toevoeg(en)?/, '').trim();
        return { name: name || chunk, quantity };
      })
      .filter((candidate) => candidate.name.length > 0);
  }

  /**
   * Voeg items toe via Supabase of via de offline fallback.
   */
  private async addItems(listId: string, itemsToAdd: Array<{ name: string; quantity: number }>): Promise<number> {
    if (itemsToAdd.length === 0) {
      return 0;
    }

    if (isSupabaseConfigured && supabase) {
      const payload = itemsToAdd.map((item) => ({
        list_id: listId,
        name: item.name,
        quantity: item.quantity || 1,
        checked: false,
      }));

      // Insert + select zodat de actuele records beschikbaar zijn voor de response.
      const { error } = await supabase.from('items').insert(payload);
      if (error) {
        throw new Error(`Supabase insert mislukt: ${error.message}`);
      }
      return payload.length;
    }

    // Offline fallback: voeg toe aan in-memory list.
    const current = offlineStore.get(listId) ?? [];
    const additions: GroceryItem[] = itemsToAdd.map((item, index) => ({
      id: `${Date.now()}-${index}`,
      name: item.name,
      quantity: item.quantity || 1,
      checked: false,
    }));
    offlineStore.set(listId, [...current, ...additions]);
    return additions.length;
  }

  /**
   * Haal de actuele lijst op uit Supabase of vanuit de fallback-store.
   */
  private async fetchItems(listId: string): Promise<GroceryItem[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('items')
        .select('id,name,quantity,checked,category')
        .eq('list_id', listId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Supabase fetch mislukt: ${error.message}`);
      }

      return (data ?? []).map((row) => ({
        id: String(row.id),
        name: row.name ?? '',
        quantity: row.quantity ?? 1,
        checked: row.checked ?? false,
        category: row.category,
      }));
    }

    return offlineStore.get(listId) ?? [];
  }

  /**
   * Wis alle items voor de gegeven lijst.
   */
  private async clearList(listId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('items').delete().eq('list_id', listId);
      if (error) {
        throw new Error(`Supabase clear mislukt: ${error.message}`);
      }
      return;
    }
    offlineStore.set(listId, []);
  }
}

/**
 * Direct inzetbare instantie van de agent.
 */
export const groceoAgent = new AgentsMeAgent();

/**
 * Voorbeeldscenario's om de agent snel te testen of te tonen in documentatie/UI.
 */
export const EXAMPLE_INTERACTIONS: Array<{ input: AgentRequest['text']; description: string }> = [
  {
    input: 'Zet melk x2 en brood op de lijst',
    description: 'Voegt melk (2) en brood toe en retourneert een samenvatting plus de actuele lijst.',
  },
  {
    input: 'Wat staat er open?',
    description: 'Geeft een overzicht van open items zonder mutaties door te voeren.',
  },
  {
    input: 'Maak de lijst leeg',
    description: 'Verwijdert alle items voor het huidige listId (Supabase of offline).',
  },
];

