# WordleAssist

A powerful, free Wordle helper and solver tool that runs entirely in your browser. Get smart word suggestions with advanced power scoring to help you solve Wordle puzzles more efficiently.

🌐 **Live Web App**: [https://hrishinene.github.io/WordleAssist/web/](https://hrishinene.github.io/WordleAssist/web/)

## Features

### 🎯 Multiple Word Selection Modes

- **Hard Mode Word**: Suggests words from the remaining valid candidates that match all your previous feedback
- **Soft Mode Word**: Suggests words using only unused letters (or letters known to be present but in wrong positions), helping you explore new letter combinations
- **Power Word**: Finds the soft word with the highest power score - the word that eliminates the most possibilities even in worst-case scenarios
- **Manual Input**: Type your own 5-letter word guess

### 📊 Power Scoring System

Each suggested word displays a **Power** score (0-100%) that indicates how effective the word is at eliminating possibilities. The power is calculated using the minimum elimination strategy - showing how many words would be eliminated even in the worst-case feedback scenario.

### 🔍 Dictionary Integration

- **Hover** over any suggested word to see its definition instantly
- **Click** on any word to open it in Merriam-Webster dictionary
- Validates that manually entered words exist in the dictionary

### 🔒 Privacy-First

- Runs **100% client-side** - no backend server required
- All processing happens in your browser
- No data is sent to any server
- Completely private and secure

### 📱 Responsive Design

Modern, dark-themed UI that works beautifully on desktop and mobile devices.

## How to Use

1. **Start a Wordle game** on [Wordle](https://www.nytimes.com/games/wordle) or any Wordle-like game
2. **Open WordleAssist** in another tab/window
3. **Get your first suggestion**:
   - Click "Power word" for the optimal starting word (defaults to SALET)
   - Or use "Hard mode word" / "Soft mode word" for other strategies
4. **Enter your guess** in the Wordle game
5. **Provide feedback** in WordleAssist:
   - **X** = Letter not in word
   - **C** = Letter in correct position
   - **I** = Letter in word but wrong position
6. **Click "Apply feedback"** to update the word list
7. **Repeat** steps 3-6 until you solve the puzzle!

## Technical Details

### Architecture

- **Frontend**: Pure JavaScript (ES6+), HTML5, CSS3
- **No Dependencies**: Zero external libraries required
- **Dictionary**: Uses a comprehensive 5-letter word dictionary (12,977 words)
- **Algorithm**: Implements predicate-based word filtering with priority-based constraint application

### Word Selection Strategies

1. **Hard Mode**: Selects from words that satisfy all known constraints (correct positions, present letters, absent letters)
2. **Soft Mode**: Selects words that:
   - Use only unique letters (no duplicates)
   - Avoid letters already confirmed at correct positions
   - Avoid letters known to be absent
   - Prefer unused letters, but allow letters known to be present (in wrong positions)
   - Respect known incorrect positions for letters

### Power Calculation

The power score uses Strategy C (Minimum Elimination):
- For each possible feedback combination (243 total), calculates how many words would be eliminated
- Uses the minimum elimination value (worst-case scenario)
- Converts to percentage: `Power = 100 * (min_elimination) / N`
- Excludes feedback patterns that would eliminate all words (invalid scenarios)

## Project Structure

```
WordleAssist/
├── web/                    # Web application
│   ├── index.html         # Main HTML file
│   ├── solver.js          # Core solver logic
│   ├── styles.css         # Styling
│   ├── sitemap.xml        # SEO sitemap
│   └── robots.txt         # Search engine directives
├── src/                    # Original Java implementation
│   └── com/hvn/game/wordle/
│       ├── Word5.java
│       ├── WordBank.java
│       ├── WordProcessor.java
│       └── WordReducerPredicate.java
└── dictionary5.txt        # 5-letter word dictionary
```

## Development

### Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/hrishinene/WordleAssist.git
   cd WordleAssist
   ```

2. Serve the web directory using any static file server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (http-server)
   npx http-server web -p 8000
   
   # Using PHP
   php -S localhost:8000 -t web
   ```

3. Open `http://localhost:8000/web/` in your browser

### Java Version

The original Java implementation can be compiled and run:
```bash
javac src/com/hvn/game/wordle/*.java
java -cp src com.hvn.game.wordle.Wordleassist
```

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## License

See [LICENSE](LICENSE) file for details.

## Acknowledgments

- Wordle game by Josh Wardle
- Dictionary data from various open sources
- Algorithm inspired by information theory and constraint satisfaction

## Keywords

Wordle helper, Wordle solver, Wordle assistant, Wordle tool, Wordle guess generator, free Wordle solver, Wordle assistance online, browser-based Wordle helper, Wordle power word, Wordle hard mode, Wordle soft mode

---

**Enjoy solving Wordle puzzles! 🎮**
