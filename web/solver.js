// Simple port of core WordleAssist logic to client-side JS

class Word5 {
  constructor(str) {
    if (!str || str.length !== 5) {
      throw new Error("Only 5 letter word please!");
    }
    this.string = str.toUpperCase();
    this.alphabet = this.string.split("");
  }

  contains(ch) {
    return this.string.indexOf(String(ch).toUpperCase()) >= 0;
  }

  containsAt(ch, index) {
    return this.alphabet[index] === String(ch).toUpperCase();
  }

  uniqueAlphabet() {
    for (let i = 0; i < this.alphabet.length; i++) {
      for (let j = i + 1; j < this.alphabet.length; j++) {
        if (this.alphabet[i] === this.alphabet[j]) return false;
      }
    }
    return true;
  }

  toString() {
    return this.string;
  }

  static makeWord(feedback) {
    try {
      return new Word5(feedback);
    } catch (e) {
      return null;
    }
  }
}

class WordReducerPredicate {
  // Abstract base in JS
  getChar() {
    throw new Error("Not implemented");
  }
  pass(word) {
    throw new Error("Not implemented");
  }
  getPriority() {
    throw new Error("Not implemented");
  }
}

class CharBasedEliminator extends WordReducerPredicate {
  constructor(ch) {
    super();
    this.ch = ch;
  }
  getChar() {
    return this.ch;
  }
  pass(word) {
    return !word.contains(this.ch);
  }
  getPriority() {
    return 3;
  }
  toString() {
    return `[${this.ch}] - X`;
  }
}

class PositionalKeeper extends WordReducerPredicate {
  constructor(index, ch) {
    super();
    this.index = index;
    this.ch = ch;
  }
  getChar() {
    return this.ch;
  }
  pass(word) {
    return word.containsAt(this.ch, this.index);
  }
  getPriority() {
    return 1;
  }
  toString() {
    return `[${this.ch}] - C`;
  }
}

class DisPositionalKeeper extends WordReducerPredicate {
  constructor(index, ch) {
    super();
    this.index = index;
    this.ch = ch;
  }
  getChar() {
    return this.ch;
  }
  pass(word) {
    if (!word.contains(this.ch)) return false;
    return !word.containsAt(this.ch, this.index);
  }
  getPriority() {
    return 2;
  }
  toString() {
    return `[${this.ch}] - I`;
  }
}

class WordBank {
  constructor(words) {
    // words: array of 5-letter strings
    this.wordList = words.map((w) => new Word5(w.trim()));
  }

  isEmpty() {
    return !this.wordList || this.wordList.length === 0;
  }

  getWordList() {
    return this.wordList;
  }

  nextGuess(uniqueAlphabet = false) {
    if (this.wordList.length === 0) return null;

    const size = this.wordList.length;
    const idx = Math.floor(Math.random() * size);

    if (!uniqueAlphabet) {
      return this.wordList[idx];
    }

    let i = 0;
    for (const word of this.wordList) {
      if (i++ < idx) continue;
      if (word.uniqueAlphabet()) return word;
    }

    console.log("== Unique word not found ==");
    return this.nextGuess(false);
  }

  reduce(predicateOrList) {
    if (Array.isArray(predicateOrList)) {
      for (const p of predicateOrList) {
        this.reduce(p);
      }
      return;
    }
    const predicate = predicateOrList;
    const newList = [];
    for (const word of this.wordList) {
      if (predicate.pass(word)) newList.push(word);
    }
    this.wordList = newList;
  }
}

class WordProcessor {
  constructor(bank) {
    this.bank = bank;
    this.guess = null;
    this.predicates = null;
  }

  nextGuess() {
    if (this.guess) return this.guess;
    // In the UI we always use bank.nextGuess(true) as a good default.
    this.guess = this.bank.nextGuess(true) || this.bank.nextGuess(false);
    return this.guess;
  }

  // In the web version we build predicates directly from UI feedback
  setFeedbackPredicates(predicates) {
    this.predicates = predicates;
  }

  getPredicates() {
    const retval = [];
    const chars = [];
    const predicates = [...(this.predicates || [])];

    // Sort by priority like Java version
    predicates.sort((a, b) => {
      if (a.getPriority() === b.getPriority()) return 0;
      return a.getPriority() > b.getPriority() ? 1 : -1;
    });

    for (const p of predicates) {
      if (p instanceof CharBasedEliminator && chars.includes(p.getChar())) {
        continue;
      }
      retval.push(p);
      chars.push(p.getChar());
    }

    return retval;
  }

  isSolved() {
    if (!this.predicates) return false;
    for (const p of this.predicates) {
      if (!(p instanceof PositionalKeeper)) return false;
    }
    return true;
  }
}

// --- UI Wiring ---

const statusText = document.getElementById("statusText");
const remainingCountEl = document.getElementById("remainingCount");
const hardGuessBtn = document.getElementById("hardGuessBtn");
const softGuessBtn = document.getElementById("softGuessBtn");
const powerWordBtn = document.getElementById("powerWordBtn");
const guessWordEl = document.getElementById("guessWord");
const feedbackGrid = document.getElementById("feedbackGrid");
const applyFeedbackBtn = document.getElementById("applyFeedbackBtn");
const candidatesListEl = document.getElementById("candidatesList");
const manualGuessInput = document.getElementById("manualGuessInput");
const useManualGuessBtn = document.getElementById("useManualGuessBtn");

let bank = null;
let processor = null;
let currentGuess = null;
let allWords = [];

let feedbackState = ["X", "X", "X", "X", "X"]; // default to X
// Tracking across attempts with confirmed feedback
let triedLetters = new Set();       // all letters from words where feedback was provided
let presentLetters = new Set();     // letters confirmed to exist (C or I in feedback)
let correctLetters = new Set();     // letters confirmed correct at some position (C)
let absentLetters = new Set();      // letters confirmed absent (only X feedback)
// For soft mode: track indices that are known wrong for a letter (from 'I' feedback)
const incorrectPositionsByLetter = new Map(); // key: uppercase letter, value: Set of indices

let definitionCache = new Map();
let currentTooltip = null;
let tooltipTimeout = null;

async function fetchDefinition(word) {
  const wordLower = word.toLowerCase();
  if (definitionCache.has(wordLower)) {
    return definitionCache.get(wordLower);
  }
  
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordLower}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    if (data && data.length > 0 && data[0].meanings && data[0].meanings.length > 0) {
      const meaning = data[0].meanings[0];
      const definition = meaning.definitions && meaning.definitions.length > 0
        ? meaning.definitions[0].definition
        : null;
      definitionCache.set(wordLower, definition);
      return definition;
    }
    return null;
  } catch (e) {
    console.error("Failed to fetch definition:", e);
    return null;
  }
}

function showTooltip(element, word) {
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
  }
  
  tooltipTimeout = setTimeout(async () => {
    const definition = await fetchDefinition(word);
    if (!definition) return;
    
    const tooltip = document.createElement("div");
    tooltip.className = "dictionary-tooltip";
    tooltip.textContent = definition;
    tooltip.setAttribute("role", "tooltip");
    document.body.appendChild(tooltip);
    currentTooltip = tooltip;
    
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    let left = rect.left + rect.width / 2;
    let top = rect.bottom + 8;
    
    // Keep tooltip on screen (calculate after tooltip is rendered)
    if (left + tooltipRect.width / 2 > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width / 2 - 16;
    }
    if (left - tooltipRect.width / 2 < 0) {
      left = tooltipRect.width / 2 + 16;
    }
    if (top + tooltipRect.height > window.innerHeight) {
      top = rect.top - tooltipRect.height - 8;
    }
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.transform = "translateX(-50%)";
  }, 300); // Small delay to avoid flickering
}

function hideTooltip() {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = null;
  }
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
}

function buildPredicatesForFeedbackPattern(word, feedbackPattern) {
  // feedbackPattern is an array of 5 codes: ['X', 'C', 'I', ...]
  const predicates = [];
  word.alphabet.forEach((ch, idx) => {
    const code = feedbackPattern[idx];
    if (code === "X") {
      predicates.push(new CharBasedEliminator(ch));
    } else if (code === "C") {
      predicates.push(new PositionalKeeper(idx, ch));
    } else if (code === "I") {
      predicates.push(new DisPositionalKeeper(idx, ch));
    }
  });
  return predicates;
}

function calculateWordPower(word, wordBank) {
  if (!word || !wordBank || wordBank.isEmpty()) return 0;
  
  const N = wordBank.getWordList().length;
  if (N === 0) return 0;
  
  // Generate all possible feedback combinations (3^5 = 243)
  const feedbackCodes = ["X", "C", "I"];
  const allCombinations = [];
  
  function generateCombinations(pattern, depth) {
    if (depth === 5) {
      allCombinations.push([...pattern]);
      return;
    }
    for (const code of feedbackCodes) {
      pattern[depth] = code;
      generateCombinations(pattern, depth + 1);
    }
  }
  
  generateCombinations([], 0);
  
  // For each combination, calculate eliminations
  let totalEliminations = 0;
  const numPatterns = allCombinations.length;
  const eliminations = []; // Store all eliminations for debugging
  let validPatterns = 0; // Count patterns that don't eliminate everything
  
  console.log(`\n=== Calculating Power for word: ${word.string} ===`);
  console.log(`N (initial word count): ${N}`);
  console.log(`Number of feedback patterns: ${numPatterns}`);
  
  for (let i = 0; i < allCombinations.length; i++) {
    const feedbackPattern = allCombinations[i];
    
    // Create predicates for this feedback pattern
    const predicates = buildPredicatesForFeedbackPattern(word, feedbackPattern);
    
    // Create a copy of the word bank to test
    const testBank = new WordBank(
      wordBank.getWordList().map((w) => w.string)
    );
    
    // Apply predicates (using the same logic as WordProcessor.getPredicates)
    const sortedPredicates = [...predicates].sort((a, b) => {
      if (a.getPriority() === b.getPriority()) return 0;
      return a.getPriority() > b.getPriority() ? 1 : -1;
    });
    
    const chars = [];
    const finalPredicates = [];
    for (const p of sortedPredicates) {
      if (p instanceof CharBasedEliminator && chars.includes(p.getChar())) {
        continue;
      }
      finalPredicates.push(p);
      chars.push(p.getChar());
    }
    
    testBank.reduce(finalPredicates);
    
    const remaining = testBank.getWordList().length;
    const eliminated = N - remaining;
    
    // Only consider patterns that don't eliminate all words (remaining > 0)
    if (remaining > 0) {
      eliminations.push(eliminated);
      totalEliminations += eliminated;
      validPatterns++;
      
      // Log first 10 and last 10 valid patterns for debugging
      if (validPatterns <= 10 || validPatterns > eliminations.length - 10) {
        console.log(`Pattern ${i + 1} [${feedbackPattern.join('')}]: n${validPatterns} = ${eliminated}, remaining = ${remaining}`);
      }
    } else {
      // Log skipped patterns
      if (i < 10 || i >= numPatterns - 10) {
        console.log(`Pattern ${i + 1} [${feedbackPattern.join('')}]: SKIPPED (eliminated all, remaining = 0)`);
      }
    }
  }
  
  // Log summary statistics
  console.log(`\nElimination statistics:`);
  console.log(`Valid patterns (remaining > 0): ${validPatterns} out of ${numPatterns}`);
  console.log(`Total eliminations (sum): ${totalEliminations}`);
  if (validPatterns > 0) {
    console.log(`Average elimination: ${(totalEliminations / validPatterns).toFixed(2)}`);
    console.log(`Min elimination: ${Math.min(...eliminations)}`);
    console.log(`Max elimination: ${Math.max(...eliminations)}`);
    if (eliminations.length > 0) {
      const showCount = Math.min(20, eliminations.length);
      console.log(`First ${showCount} eliminations: [${eliminations.slice(0, showCount).join(', ')}]`);
      if (eliminations.length > showCount) {
        console.log(`Last ${showCount} eliminations: [${eliminations.slice(-showCount).join(', ')}]`);
      }
    }
  }
  
  // Strategy C: 100 * (min(n)) / N
  // Power = minimum elimination across all valid patterns, as percentage
  if (validPatterns === 0) {
    console.log(`Power calculation: No valid patterns (all eliminate everything), returning 0`);
    console.log(`=== End Power Calculation ===\n`);
    return 0;
  }
  
  const minElimination = Math.min(...eliminations);
  const power = (100 * minElimination) / N;
  
  console.log(`\nPower calculation (Strategy C - Minimum):`);
  console.log(`Minimum elimination: ${minElimination}`);
  console.log(`Power: 100 * ${minElimination} / ${N} = ${power.toFixed(2)}%`);
  console.log(`=== End Power Calculation ===\n`);
  
  return power;
}

function renderGuess() {
  hideTooltip(); // Clear any existing tooltip
  guessWordEl.innerHTML = "";
  if (!currentGuess) return;
  const tilesContainer = document.createElement("div");
  tilesContainer.className = "guess-word-tiles";
  for (const ch of currentGuess.alphabet) {
    const div = document.createElement("div");
    div.className = "tile";
    div.textContent = ch;
    tilesContainer.appendChild(div);
  }
  guessWordEl.appendChild(tilesContainer);
  
  // Calculate and display word power (Strategy C - Minimum)
  if (bank && !bank.isEmpty()) {
    const power = calculateWordPower(currentGuess, bank);
    const powerDisplay = document.createElement("div");
    powerDisplay.className = "word-power";
    powerDisplay.textContent = `Power: ${power.toFixed(1)}%`;
    guessWordEl.appendChild(powerDisplay);
  }
  
  // Add hoverable word container for tooltip
  const wordContainer = document.createElement("div");
  wordContainer.className = "word-with-tooltip";
  wordContainer.textContent = currentGuess.string.toLowerCase();
  wordContainer.title = "";
  wordContainer.addEventListener("mouseenter", () => {
    showTooltip(wordContainer, currentGuess.string);
  });
  wordContainer.addEventListener("mouseleave", () => {
    hideTooltip();
  });
  wordContainer.addEventListener("click", () => {
    window.open(
      `https://www.merriam-webster.com/dictionary/${currentGuess.string.toLowerCase()}`,
      "_blank",
      "noopener,noreferrer"
    );
  });
  guessWordEl.appendChild(wordContainer);
}

function renderCandidates() {
  candidatesListEl.innerHTML = "";
  if (!bank) return;
  const list = bank.getWordList();
  remainingCountEl.textContent = `Remaining words: ${list.length}`;
  const maxToShow = 200;
  list.slice(0, maxToShow).forEach((w) => {
    const span = document.createElement("span");
    span.textContent = w.string.toLowerCase();
    candidatesListEl.appendChild(span);
  });
  if (list.length > maxToShow) {
    const more = document.createElement("div");
    more.style.marginTop = "6px";
    more.style.color = "var(--muted)";
    more.textContent = `…and ${list.length - maxToShow} more`;
    candidatesListEl.appendChild(more);
  }
}

function renderFeedbackControls() {
  feedbackGrid.innerHTML = "";
  if (!currentGuess) return;
  feedbackState = ["X", "X", "X", "X", "X"]; // reset each round
  currentGuess.alphabet.forEach((ch, idx) => {
    const cell = document.createElement("div");
    cell.className = "feedback-cell";

    const letterDiv = document.createElement("div");
    letterDiv.className = "feedback-letter";
    letterDiv.textContent = ch;

    const btnContainer = document.createElement("div");
    btnContainer.className = "feedback-buttons";

    ["X", "C", "I"].forEach((code) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "feedback-btn";
      btn.textContent = code;
      btn.addEventListener("click", () => {
        feedbackState[idx] = code;
        // update selection styles
        Array.from(btnContainer.children).forEach((b) => {
          b.classList.remove("selected-X", "selected-C", "selected-I");
        });
        btn.classList.add(`selected-${code}`);
      });
      if (code === "X") {
        btn.classList.add("selected-X");
      }
      btnContainer.appendChild(btn);
    });

    cell.appendChild(letterDiv);
    cell.appendChild(btnContainer);
    feedbackGrid.appendChild(cell);
  });
}

function buildPredicatesFromFeedback() {
  if (!currentGuess) return [];
  const predicates = [];
  currentGuess.alphabet.forEach((ch, idx) => {
    const code = feedbackState[idx];
    const up = String(ch).toUpperCase();
    // Any letter that we have feedback for counts as "tried" for soft-mode elimination rules
    triedLetters.add(up);
    if (code === "X") {
      predicates.push(new CharBasedEliminator(ch));
      // Only mark absent if we have no evidence it's present
      if (!presentLetters.has(up)) {
        absentLetters.add(up);
      }
    } else if (code === "C") {
      predicates.push(new PositionalKeeper(idx, ch));
      presentLetters.add(up);
      correctLetters.add(up);
      // A C overrides any prior assumption of absence
      absentLetters.delete(up);
    } else if (code === "I") {
      predicates.push(new DisPositionalKeeper(idx, ch));
      presentLetters.add(up);
      // An I also means the letter is present somewhere
      absentLetters.delete(up);
      // Remember that this letter cannot be at this index
      if (!incorrectPositionsByLetter.has(up)) {
        incorrectPositionsByLetter.set(up, new Set());
      }
      incorrectPositionsByLetter.get(up).add(idx);
    }
  });
  return predicates;
}

async function loadDictionary() {
  try {
    const res = await fetch("../dictionary5.txt");
    if (!res.ok) throw new Error("Failed to load dictionary");
    const text = await res.text();
    const words = text
      .split(/\r?\n/)
      .map((w) => w.trim())
      .filter((w) => w.length === 5);

    allWords = words;
    bank = new WordBank(words);
    processor = new WordProcessor(bank);
    statusText.textContent =
      "Dictionary loaded. Choose Hard mode, Soft mode, or type your own word.";
    remainingCountEl.textContent = `Remaining words: ${bank.getWordList().length}`;
    if (hardGuessBtn) hardGuessBtn.disabled = false;
    if (softGuessBtn) softGuessBtn.disabled = false;
    if (powerWordBtn) powerWordBtn.disabled = false;
    if (useManualGuessBtn) {
      useManualGuessBtn.disabled = false;
    }
    renderCandidates();
  } catch (e) {
    console.error(e);
    statusText.textContent = "Error loading dictionary. See console.";
  }
}

if (hardGuessBtn) {
  hardGuessBtn.addEventListener("click", () => {
    if (!processor) return;
    // Fresh hard-mode suggestion from remaining valid candidates
    processor.guess = null;
    currentGuess = processor.nextGuess();
    if (!currentGuess) {
      statusText.textContent = "No words available. Unable to guess.";
      return;
    }
    statusText.textContent = "Provide feedback for this Hard mode guess.";
    renderGuess();
    renderFeedbackControls();
    applyFeedbackBtn.disabled = false;
  });
}

function getAllSoftWordCandidates() {
  if (!allWords || allWords.length === 0) return [];
  const candidates = allWords.filter((w) => {
    const up = w.toUpperCase();
    if (up.length !== 5) return false;
    // 1) All alphabets must be different
    const uniq = new Set(up);
    if (uniq.size !== 5) return false;

    for (let i = 0; i < up.length; i++) {
      const ch = up[i];
      // 2) Do not use any alphabet that is already identified at right location
      if (correctLetters.has(ch)) return false;
      // Also avoid letters known to be absent from the word
      if (absentLetters.has(ch)) return false;
      // Prefer truly new letters: if tried before and not confirmed present, skip
      if (triedLetters.has(ch) && !presentLetters.has(ch)) return false;
      // 3) Do not use any positionally incorrect alphabet at the same position
      const badPositions = incorrectPositionsByLetter.get(ch);
      if (badPositions && badPositions.has(i)) return false;
    }
    return true;
  });
  return candidates.map((w) => new Word5(w));
}

function pickSoftWord() {
  const candidates = getAllSoftWordCandidates();
  if (candidates.length === 0) {
    return null;
  }
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx];
}

function pickPowerWord() {
  if (!bank || bank.isEmpty()) return null;
  
  // Check if it's the first attempt (no feedback constraints yet)
  const isFirstAttempt = triedLetters.size === 0 && 
                         presentLetters.size === 0 && 
                         correctLetters.size === 0 && 
                         absentLetters.size === 0 && 
                         incorrectPositionsByLetter.size === 0;
  
  if (isFirstAttempt) {
    // Default to SALET for first attempt (known to be a good starting word)
    console.log(`\n=== First Attempt: Using default Power Word SALET ===\n`);
    const salet = Word5.makeWord("SALET");
    if (salet) {
      return salet;
    }
  }
  
  const softCandidates = getAllSoftWordCandidates();
  const remainingWords = bank.getWordList();
  const remainingCount = remainingWords.length;
  
  // Build set of soft candidate strings for fast lookup
  const softCandidateStrings = new Set(softCandidates.map(w => w.string));
  
  // Collect all candidates for power calculation
  let allCandidates = [...softCandidates];
  let additionalCandidatesCount = 0;
  
  // If soft words < 10 AND remaining words < 20, include additional words
  if (softCandidates.length < 10 && remainingCount < 20) {
    // Extract unique letters from remaining words
    const remainingLetters = new Set();
    for (const word of remainingWords) {
      for (const ch of word.alphabet) {
        remainingLetters.add(ch);
      }
    }
    
    console.log(`\n=== Finding Power Word ===`);
    console.log(`Soft candidates: ${softCandidates.length}, Remaining words: ${remainingCount}`);
    console.log(`Condition met: Adding additional candidates with at least 2 letters from remaining words`);
    console.log(`Unique letters in remaining words: ${Array.from(remainingLetters).sort().join('')}`);
    
    // Find words from allWords that:
    // - Are NOT soft candidates
    // - Contain at least 2 letters from remaining words
    for (const wordStr of allWords) {
      const up = wordStr.toUpperCase().trim();
      if (up.length !== 5) continue;
      
      // Skip if it's already a soft candidate
      if (softCandidateStrings.has(up)) continue;
      
      // Count how many letters from this word are in the remaining letters set
      const wordLetters = new Set(up);
      let matchingLetters = 0;
      for (const ch of wordLetters) {
        if (remainingLetters.has(ch)) {
          matchingLetters++;
        }
      }
      
      // Include if at least 2 letters match
      if (matchingLetters >= 2) {
        const word = Word5.makeWord(up);
        if (word) {
          allCandidates.push(word);
          additionalCandidatesCount++;
        }
      }
    }
    
    console.log(`Added ${additionalCandidatesCount} additional candidates (not soft words)`);
    console.log(`Total candidates for power calculation: ${allCandidates.length}`);
  } else {
    console.log(`\n=== Finding Power Word ===`);
    console.log(`Evaluating ${softCandidates.length} soft word candidates...`);
  }
  
  if (allCandidates.length === 0) {
    return null;
  }
  
  let bestWord = null;
  let bestPower = -1;
  
  // Calculate power for each candidate
  for (let i = 0; i < allCandidates.length; i++) {
    const word = allCandidates[i];
    const power = calculateWordPower(word, bank);
    
    if (power > bestPower) {
      bestPower = power;
      bestWord = word;
    }
    
    // Log progress for first few and last few
    if (i < 5 || i >= allCandidates.length - 5) {
      const candidateType = softCandidateStrings.has(word.string) ? "soft" : "additional";
      console.log(`Candidate ${i + 1}/${allCandidates.length} [${candidateType}]: ${word.string} - Power: ${power.toFixed(2)}%`);
    }
  }
  
  if (bestWord) {
    const bestType = softCandidateStrings.has(bestWord.string) ? "soft" : "additional";
    console.log(`\nBest Power Word: ${bestWord.string} [${bestType}] with Power: ${bestPower.toFixed(2)}%`);
    console.log(`=== End Power Word Search ===\n`);
  }
  
  return bestWord;
}

if (softGuessBtn) {
  softGuessBtn.addEventListener("click", () => {
    if (!processor) return;
    const word = pickSoftWord();
    if (!word) {
      statusText.textContent =
        "No unused-letter words remain for Soft mode. Try Hard mode or type your own.";
      return;
    }
    currentGuess = word;
    processor.guess = currentGuess;
    statusText.textContent = "Provide feedback for this Soft mode guess.";
    renderGuess();
    renderFeedbackControls();
    applyFeedbackBtn.disabled = false;
  });
}

if (powerWordBtn) {
  powerWordBtn.addEventListener("click", () => {
    if (!processor) return;
    statusText.textContent = "Calculating power for soft words...";
    powerWordBtn.disabled = true; // Disable while calculating
    
    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      const word = pickPowerWord();
      if (!word) {
        statusText.textContent =
          "No soft words available for power calculation. Try Hard mode or type your own.";
        powerWordBtn.disabled = false;
        return;
      }
      currentGuess = word;
      processor.guess = currentGuess;
      statusText.textContent = "Provide feedback for this Power word guess.";
      renderGuess();
      renderFeedbackControls();
      applyFeedbackBtn.disabled = false;
      powerWordBtn.disabled = false;
    }, 10);
  });
}

function setCurrentGuessFromWord(wordStr) {
  const word = Word5.makeWord(wordStr.trim());
  if (!word) {
    statusText.textContent = "Please enter a valid 5-letter word.";
    return;
  }
  // Check if word exists in dictionary
  const wordLower = word.string.toLowerCase();
  const exists = allWords.some((w) => w.trim().toLowerCase() === wordLower);
  if (!exists) {
    statusText.textContent = `"${word.string}" is not in the dictionary. Please try another word.`;
    return;
  }
  currentGuess = word;
  processor.guess = currentGuess;
  statusText.textContent = "Provide feedback for this guess.";
  renderGuess();
  renderFeedbackControls();
  applyFeedbackBtn.disabled = false;
}

if (useManualGuessBtn) {
  useManualGuessBtn.addEventListener("click", () => {
    if (!processor) return;
    const value = manualGuessInput.value || "";
    setCurrentGuessFromWord(value);
  });
}

if (manualGuessInput) {
  manualGuessInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!processor) return;
      setCurrentGuessFromWord(manualGuessInput.value || "");
    }
  });
}

applyFeedbackBtn.addEventListener("click", () => {
  if (!processor || !currentGuess) return;
  const rawPredicates = buildPredicatesFromFeedback();
  processor.setFeedbackPredicates(rawPredicates);
  const predicates = processor.getPredicates();

  bank.reduce(predicates);
  renderCandidates();

    if (processor.isSolved()) {
      statusText.textContent = "Solved! All letters are in correct positions.";
      applyFeedbackBtn.disabled = true;
      if (hardGuessBtn) hardGuessBtn.disabled = true;
      if (softGuessBtn) softGuessBtn.disabled = true;
      if (powerWordBtn) powerWordBtn.disabled = true;
      return;
    }

    if (bank.isEmpty()) {
      statusText.textContent = "No candidates remain. The answer may be outside the dictionary.";
      applyFeedbackBtn.disabled = true;
      if (hardGuessBtn) hardGuessBtn.disabled = true;
      if (softGuessBtn) softGuessBtn.disabled = true;
      if (powerWordBtn) powerWordBtn.disabled = true;
      return;
    }

  // Prepare for next guess
  currentGuess = null;
  processor.guess = null;
  statusText.textContent = "Guess updated. Click 'Get next guess' for another suggestion.";
  guessWordEl.innerHTML = "";
  feedbackGrid.innerHTML = "";
  applyFeedbackBtn.disabled = true;
});

loadDictionary();
