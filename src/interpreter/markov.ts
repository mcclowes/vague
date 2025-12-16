// Markov chain text generator for realistic strings

// Training corpus - common English words for general text
const WORD_CORPUS = `
the quick brown fox jumps over the lazy dog
lorem ipsum dolor sit amet consectetur adipiscing elit
products services solutions technology innovation
enterprise software platform cloud infrastructure
payment invoice transaction account balance
customer client vendor supplier partner
shipping delivery logistics warehouse inventory
analytics dashboard reporting metrics performance
security authentication authorization access control
database server network storage compute
development testing deployment production staging
marketing sales support operations finance
annual monthly quarterly weekly daily
premium standard basic professional enterprise
`;

// Company name parts
const COMPANY_CORPUS = `
tech global systems solutions group
digital innovations services partners corp
north south east west central
blue green red silver gold
apex peak summit vertex prime
smart bright clear swift rapid
data cloud net web cyber
first premier elite pro max
`;

// Product/item descriptions
const PRODUCT_CORPUS = `
widget gadget device component module
service package bundle subscription plan
premium deluxe standard basic lite
professional enterprise business personal home
annual monthly quarterly weekly daily
small medium large extra jumbo
`;

export class MarkovChain {
  private transitions: Map<string, Map<string, number>> = new Map();
  private starters: string[] = [];
  private order: number;

  constructor(order = 2) {
    this.order = order;
  }

  train(text: string): void {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);

    for (let i = 0; i < words.length - this.order; i++) {
      const state = words.slice(i, i + this.order).join(" ");
      const next = words[i + this.order];

      if (i === 0 || words[i - 1].endsWith(".")) {
        this.starters.push(state);
      }

      if (!this.transitions.has(state)) {
        this.transitions.set(state, new Map());
      }

      const trans = this.transitions.get(state)!;
      trans.set(next, (trans.get(next) ?? 0) + 1);
    }
  }

  generate(minWords = 2, maxWords = 5): string {
    if (this.starters.length === 0) return "";

    const targetLength = Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;
    const result: string[] = [];

    // Pick random starter
    let state = this.starters[Math.floor(Math.random() * this.starters.length)];
    result.push(...state.split(" "));

    while (result.length < targetLength) {
      const trans = this.transitions.get(state);
      if (!trans || trans.size === 0) break;

      // Weighted random selection
      const total = Array.from(trans.values()).reduce((a, b) => a + b, 0);
      let r = Math.random() * total;

      let next = "";
      for (const [word, count] of trans) {
        r -= count;
        if (r <= 0) {
          next = word;
          break;
        }
      }

      if (!next) break;
      result.push(next);

      // Update state
      const stateWords = state.split(" ");
      stateWords.shift();
      stateWords.push(next);
      state = stateWords.join(" ");
    }

    return result.join(" ");
  }
}

// Character-level Markov for single words
export class CharMarkov {
  private transitions: Map<string, Map<string, number>> = new Map();
  private starters: string[] = [];
  private order: number;

  constructor(order = 2) {
    this.order = order;
  }

  train(words: string[]): void {
    for (const word of words) {
      const chars = word.toLowerCase();
      if (chars.length <= this.order) continue;

      this.starters.push(chars.slice(0, this.order));

      for (let i = 0; i < chars.length - this.order; i++) {
        const state = chars.slice(i, i + this.order);
        const next = chars[i + this.order];

        if (!this.transitions.has(state)) {
          this.transitions.set(state, new Map());
        }

        const trans = this.transitions.get(state)!;
        trans.set(next, (trans.get(next) ?? 0) + 1);
      }
    }
  }

  generate(minLen = 4, maxLen = 12): string {
    if (this.starters.length === 0) return "";

    const targetLen = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;

    let state = this.starters[Math.floor(Math.random() * this.starters.length)];
    let result = state;

    while (result.length < targetLen) {
      const trans = this.transitions.get(state);
      if (!trans || trans.size === 0) break;

      const total = Array.from(trans.values()).reduce((a, b) => a + b, 0);
      let r = Math.random() * total;

      let next = "";
      for (const [char, count] of trans) {
        r -= count;
        if (r <= 0) {
          next = char;
          break;
        }
      }

      if (!next) break;
      result += next;
      state = state.slice(1) + next;
    }

    return result;
  }
}

// Pre-trained generators
const wordGenerator = new MarkovChain(1);
wordGenerator.train(WORD_CORPUS);

const companyGenerator = new MarkovChain(1);
companyGenerator.train(COMPANY_CORPUS);

const productGenerator = new MarkovChain(1);
productGenerator.train(PRODUCT_CORPUS);

// Character-level for names
const nameCorpus = [
  "james", "john", "robert", "michael", "william", "david", "richard", "joseph",
  "thomas", "charles", "mary", "patricia", "jennifer", "linda", "elizabeth",
  "barbara", "susan", "jessica", "sarah", "karen", "smith", "johnson", "williams",
  "brown", "jones", "garcia", "miller", "davis", "rodriguez", "martinez",
  "anderson", "taylor", "thomas", "hernandez", "moore", "martin", "jackson",
];
const nameGenerator = new CharMarkov(2);
nameGenerator.train(nameCorpus);

// Company suffix words
const companyCorpus = [
  "acme", "apex", "atlas", "beacon", "bright", "central", "clarity", "cloud",
  "core", "cyber", "data", "delta", "digital", "dynamic", "edge", "elite",
  "ember", "enable", "evergreen", "flex", "flow", "forge", "forward", "fusion",
  "global", "grid", "harbor", "horizon", "hub", "infinity", "innova", "insight",
  "integral", "kinetic", "launch", "leap", "legacy", "link", "logic", "lumina",
  "matrix", "nexus", "nimble", "nova", "omega", "omni", "onyx", "optimal",
  "orbit", "paradigm", "peak", "pinnacle", "pivot", "prime", "prism", "pulse",
  "quantum", "quest", "radiant", "rapid", "reach", "realm", "relay", "resolve",
  "ridge", "ripple", "scale", "scope", "shift", "signal", "silver", "skyline",
  "smart", "ソlaris", "spark", "spectrum", "sphere", "sprint", "stellar", "strata",
  "stream", "stride", "summit", "surge", "swift", "sync", "synergy", "titan",
  "trace", "trail", "trend", "trust", "ultra", "unity", "uplift", "vanguard",
  "vector", "velocity", "venture", "vertex", "vibe", "vigor", "virtue", "vision",
  "vista", "vital", "vivid", "wave", "weave", "zenith", "zephyr", "zone",
];
const companyNameGenerator = new CharMarkov(2);
companyNameGenerator.train(companyCorpus);

export function generateText(type: "word" | "company" | "product" | "name" = "word"): string {
  switch (type) {
    case "company":
      return capitalizeWords(companyGenerator.generate(2, 3));
    case "product":
      return capitalizeWords(productGenerator.generate(2, 4));
    case "name":
      return capitalize(nameGenerator.generate(4, 10));
    default:
      return wordGenerator.generate(2, 5);
  }
}

export function generateCompanyName(): string {
  const name = companyNameGenerator.generate(4, 10);
  const suffixes = ["Inc", "LLC", "Corp", "Ltd", "Co", "Group", "Systems", "Solutions", "Tech"];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${capitalize(name)} ${suffix}`;
}

export function generateProductName(): string {
  return capitalizeWords(productGenerator.generate(2, 3));
}

export function generatePersonName(): string {
  const first = nameGenerator.generate(4, 8);
  const last = nameGenerator.generate(5, 10);
  return `${capitalize(first)} ${capitalize(last)}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function capitalizeWords(s: string): string {
  return s.split(" ").map(capitalize).join(" ");
}
