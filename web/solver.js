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

function renderGuess() {
  guessWordEl.innerHTML = "";
  if (!currentGuess) return;
  for (const ch of currentGuess.alphabet) {
    const div = document.createElement("div");
    div.className = "tile";
    div.textContent = ch;
    guessWordEl.appendChild(div);
  }
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

function pickSoftWord() {
  if (!allWords || allWords.length === 0) return null;
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
  if (candidates.length === 0) {
    return null;
  }
  const idx = Math.floor(Math.random() * candidates.length);
  return new Word5(candidates[idx]);
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

function setCurrentGuessFromWord(wordStr) {
  const word = Word5.makeWord(wordStr.trim());
  if (!word) {
    statusText.textContent = "Please enter a valid 5-letter word.";
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
    return;
  }

  if (bank.isEmpty()) {
    statusText.textContent = "No candidates remain. The answer may be outside the dictionary.";
    applyFeedbackBtn.disabled = true;
    if (hardGuessBtn) hardGuessBtn.disabled = true;
    if (softGuessBtn) softGuessBtn.disabled = true;
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
