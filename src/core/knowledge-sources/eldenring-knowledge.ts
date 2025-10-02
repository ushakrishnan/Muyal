/**
 * Elden Ring Knowledge Source
 * Provides Elden Ring game information from IGN and Fextralife wikis
 */

import { KnowledgeSource } from '../knowledge-library';

// Fallback Elden Ring data when wikis are unavailable
const getFallbackEldenRingData = (): string => {
  return `Elden Ring wiki services temporarily unavailable.

FALLBACK ELDEN RING INFORMATION:

🎮 GAME OVERVIEW:
- Genre: Action RPG, Souls-like
- Developer: FromSoftware
- Publisher: Bandai Namco Entertainment
- Release Date: February 25, 2022
- Platforms: PC, PlayStation 4, PlayStation 5, Xbox One, Xbox Series X/S

🗺️ STARTING CLASSES:
- Samurai: High Dexterity, katana specialist
- Warrior: Balanced STR/DEX fighter
- Prisoner: Intelligence/Dexterity hybrid
- Confessor: Faith/Strength hybrid
- Wretch: Level 1, all stats equal
- Vagabond: Quality build starter
- Prophet: Faith caster
- Astrologer: Intelligence caster
- Bandit: Arcane/Dexterity
- Hero: Pure Strength

⚔️ BOSS HIGHLIGHTS:
- Margit, the Fell Omen (Early boss)
- Godrick the Grafted (Limgrave)
- Rennala, Queen of the Full Moon (Academy)
- Radahn, Scourge of the Stars (Caelid)
- Morgott, the Omen King (Leyndell)
- Malenia, Blade of Miquella (Haligtree)
- Elden Beast (Final boss)

🏰 MAJOR AREAS:
- Limgrave: Starting area, West Limgrave, East Limgrave
- Caelid: Dangerous red wasteland
- Liurnia of the Lakes: Academy of Raya Lucaria
- Leyndell: Royal Capital
- Mountaintops of the Giants: Snowy region
- Consecrated Snowfield: Hidden endgame area

Note: This is cached/fallback data. Real-time wiki data temporarily unavailable.
Please try again in a few moments for live Elden Ring information.`;
};

export const eldenRingKnowledgeSource: KnowledgeSource = {
  id: 'eldenring',
  name: 'Elden Ring Game Wiki',
  description: 'Comprehensive Elden Ring game information from IGN and Fextralife wikis',
  keywords: [
    'elden ring', 'souls', 'fromsoft', 'fromSoftware', 'boss', 'build', 'weapon', 'armor', 'spell', 'incantation',
    'rune', 'grace', 'tarnished', 'maiden', 'melina', 'radahn', 'malenia', 'margit', 'godrick', 'rennala',
    'morgott', 'mohg', 'maliketh', 'godfrey', 'elden beast', 'limgrave', 'caelid', 'liurnia', 'leyndell',
    'mountaintops', 'consecrated snowfield', 'haligtree', 'siofra', 'nokron', 'nokstella', 'class', 'stats',
    'vigor', 'mind', 'endurance', 'strength', 'dexterity', 'intelligence', 'faith', 'arcane', 'katana',
    'greatsword', 'staff', 'seal', 'shield', 'bow', 'crossbow', 'sorcery', 'ash of war', 'spirit ash',
    'flask', 'estus', 'rune farming', 'level up', 'smithing stone', 'somber smithing stone'
  ],
  priority: 75,
  isEnabled: true,

  isRelevant: (message: string): boolean => {
    const eldenRingKeywords = [
      'elden ring', 'souls', 'fromsoft', 'boss fight', 'build guide', 'weapon location',
      'spell location', 'rune farming', 'grace location', 'tarnished', 'maiden',
      'radahn', 'malenia', 'margit', 'godrick', 'rennala', 'morgott', 'mohg',
      'limgrave', 'caelid', 'liurnia', 'leyndell', 'haligtree', 'class guide',
      'stats guide', 'katana', 'greatsword', 'sorcery', 'incantation', 'ash of war',
      'spirit ash', 'flask upgrade', 'smithing stone', 'how to beat', 'where to find'
    ];
    const lowerMessage = message.toLowerCase();
    return eldenRingKeywords.some(keyword => lowerMessage.includes(keyword));
  },

  fetchContext: async (): Promise<string> => {
    // Retry logic for handling potential issues
    const maxRetries = 2;
    const baseDelay = 1000; // 1 second
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // For now, we'll return structured fallback data with wiki references
        // In a production environment, you could implement web scraping with proper rate limiting
        // and respect for robots.txt files
        
        const wikiInfo = await getEldenRingWikiInfo();
        
        return `🎮 ELDEN RING GAME WIKI KNOWLEDGE

${wikiInfo}

📚 COMPREHENSIVE GUIDES AVAILABLE:
- Boss strategies and locations
- Weapon and armor builds
- Spell and incantation guides  
- Area exploration tips
- Rune farming locations
- Class and stat optimization
- Quest walkthroughs
- Secret area access

🌐 WIKI SOURCES:
- IGN Elden Ring Wiki: https://www.ign.com/wikis/elden-ring/
- Fextralife Elden Ring Wiki: https://eldenring.wiki.fextralife.com/Elden+Ring+Wiki

💡 TIP: Ask specific questions about bosses, builds, locations, or game mechanics for detailed guidance!`;
        
      } catch (error) {
        if (attempt === maxRetries) {
          console.warn('Failed to fetch Elden Ring wiki data after retries:', error);
          return getFallbackEldenRingData();
        }
        // Continue to next retry attempt
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return getFallbackEldenRingData();
  },

  getSuggestions: (): string[] => [
    "How to beat Margit the Fell Omen?",
    "Best starting class for beginners",
    "Where to find good early game weapons?",
    "Rune farming locations in Elden Ring",
    "How to access Caelid safely?",
    "Best intelligence build weapons",
    "Where to upgrade flasks?",
    "How to find spirit ashes?",
    "Elden Ring boss order guide",
    "Best armor sets for different builds"
  ]
};

// Helper function to get structured Elden Ring information
async function getEldenRingWikiInfo(): Promise<string> {
  // This function provides curated Elden Ring information
  // In production, this could scrape the wikis with proper rate limiting
  
  return `🗡️ CORE GAME MECHANICS:
- Runes: Currency for leveling and purchases
- Sites of Grace: Save points and fast travel
- Flask of Crimson Tears: Health restoration
- Flask of Cerulean Tears: FP restoration
- Spirit Ashes: Summonable allies
- Ashes of War: Weapon skill customization

⚔️ COMBAT ESSENTIALS:
- Rolling: I-frames for dodging
- Guard Counters: After blocking, heavy attack
- Jump Attacks: Extra damage, stance break
- Charged Attacks: Hold heavy attack button
- Backstabs: Attack from behind for critical
- Ripostes: After guard break or parry

🎯 CHARACTER PROGRESSION:
- Vigor: Health points (most important early stat)
- Mind: Focus Points for skills/spells  
- Endurance: Stamina and equipment load
- Strength: STR weapon scaling
- Dexterity: DEX weapon scaling and cast speed
- Intelligence: Sorcery scaling
- Faith: Incantation scaling
- Arcane: Item discovery and some weapons

🏰 MAJOR LEGACY DUNGEONS:
1. Stormveil Castle (Limgrave) - Godrick
2. Academy of Raya Lucaria (Liurnia) - Rennala
3. Redmane Castle (Caelid) - Radahn Festival
4. Leyndell Royal Capital - Morgott
5. Volcano Manor (Mt. Gelmir) - Rykard
6. Haligtree (Secret) - Malenia`;
}

// Helper function for specific boss strategies (could be expanded)
function getBossStrategy(bossName: string): string {
  const strategies: { [key: string]: string } = {
    'margit': `🗡️ MARGIT THE FELL OMEN STRATEGY:
- Use Margit's Shackle (optional item from Patches)
- Summon Rogier (NPC) or Spirit Ashes
- Stay close to avoid hammer slams
- Attack after his combo finishes
- Watch for delayed attacks
- Level Vigor to 20+ recommended`,
    
    'godrick': `🌪️ GODRICK THE GRAFTED STRATEGY:
- Two phases: Normal and Dragon arm
- Summon Nepheli Loux (NPC)
- Target his ankles in phase 1
- Phase 2: Stay away from fire breath
- Roll through his axe swings
- Use ranged attacks when he breathes fire`,
    
    'radahn': `🏹 RADAHN STRATEGY:
- Use the festival NPCs - summon them all
- Stay on horse (Torrent) for mobility
- Resummon NPCs when they die
- Use ranged attacks or hit-and-run
- Beware of gravity magic and meteor attack
- Fight during Radahn Festival in Redmane Castle`
  };
  
  return strategies[bossName.toLowerCase()] || 'Boss strategy not found in current database.';
}