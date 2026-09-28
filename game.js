(() => {
  "use strict";

  const WORD_LENGTH = 5;
  const MAX_GUESSES = 6;
  const DAY_ZERO = "2021-06-19";
  const GAME_PREFIX = "wordle-daily-v1:";
  const PREFS_KEY = "wordle-prefs-v1";
  const STATS_KEY = "wordle-stats-v1";
  const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
  const ANSWERS = WORD_BANK.answers;
  const VALID_GUESSES = new Set(WORD_BANK.valid);

  const board = document.querySelector("#board");
  const keyboard = document.querySelector("#keyboard");
  const message = document.querySelector("#status-message");
  const dateLabel = document.querySelector("#puzzle-date");
  const shareButton = document.querySelector("#share-button");
  const backdrop = document.querySelector("#modal-backdrop");
  const modal = document.querySelector("#modal");
  const modalContent = document.querySelector("#modal-content");
  const toast = document.querySelector("#toast");

  const today = localDateKey();
  const dayNumber = Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${DAY_ZERO}T00:00:00Z`)) / 86_400_000);
  const answer = ANSWERS[((dayNumber % ANSWERS.length) + ANSWERS.length) % ANSWERS.length];
  let prefs = load(PREFS_KEY, { hardMode: false, darkMode: false, highContrast: false });
  let stats = load(STATS_KEY, { played: 0, wins: 0, streak: 0, maxStreak: 0, distribution: [0, 0, 0, 0, 0, 0] });
  let game = load(`${GAME_PREFIX}${today}`, { guesses: [], status: "playing" });
  let draft = "";
  let toastTimer;
  let revealGuessIndex = -1;

  if (!Array.isArray(game.guesses) || !["playing", "won", "lost"].includes(game.status)) game = { guesses: [], status: "playing" };
  if (game.guesses.length >= MAX_GUESSES && game.status === "playing") game.status = "lost";

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function load(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* The game still works when storage is disabled. */ }
  }

  function applyPrefs() {
    document.body.classList.toggle("dark", Boolean(prefs.darkMode));
    document.body.classList.toggle("high-contrast", Boolean(prefs.highContrast));
  }

  function tileEvaluation(guess) {
    const marks = Array(WORD_LENGTH).fill("absent");
    const remaining = answer.split("");
    for (let i = 0; i < WORD_LENGTH; i += 1) {
      if (guess[i] === remaining[i]) {
        marks[i] = "correct";
        remaining[i] = null;
      }
    }
    for (let i = 0; i < WORD_LENGTH; i += 1) {
      if (marks[i] === "correct") continue;
      const match = remaining.indexOf(guess[i]);
      if (match >= 0) {
        marks[i] = "present";
        remaining[match] = null;
      }
    }
    return marks;
  }

  function renderBoard() {
    board.replaceChildren();
    const currentRow = game.guesses.length;
    for (let rowIndex = 0; rowIndex < MAX_GUESSES; rowIndex += 1) {
      const row = document.createElement("div");
      row.className = "board-row";
      row.setAttribute("role", "row");
      const guess = game.guesses[rowIndex] || (rowIndex === currentRow && game.status === "playing" ? draft : "");
      const marks = game.guesses[rowIndex] ? tileEvaluation(guess) : [];
      for (let column = 0; column < WORD_LENGTH; column += 1) {
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.setAttribute("role", "gridcell");
        if (guess[column]) {
          tile.textContent = guess[column];
          if (game.guesses[rowIndex]) {
            tile.classList.add("submitted", marks[column]);
            if (rowIndex === revealGuessIndex) {
              tile.classList.add("reveal");
              tile.style.setProperty("--index", column);
            }
          } else {
            tile.classList.add("filled");
          }
        }
        if (game.status === "won" && rowIndex === game.guesses.length - 1) {
          tile.classList.add("win");
          tile.style.setProperty("--index", column);
        }
        const clue = marks[column] === "correct" ? "correct spot" : marks[column] === "present" ? "in the word, different spot" : "not in the word";
        tile.setAttribute("aria-label", guess[column]
          ? `Row ${rowIndex + 1}, letter ${guess[column]}${game.guesses[rowIndex] ? `, ${clue}` : ""}`
          : `Row ${rowIndex + 1}, empty`);
        row.append(tile);
      }
      board.append(row);
    }
  }

  function renderKeyboard() {
    keyboard.replaceChildren();
    const keyStates = new Map();
    const priority = { absent: 1, present: 2, correct: 3 };
    for (const guess of game.guesses) {
      tileEvaluation(guess).forEach((mark, index) => {
        const letter = guess[index];
        if (!keyStates.has(letter) || priority[mark] > priority[keyStates.get(letter)]) keyStates.set(letter, mark);
      });
    }
    KEY_ROWS.forEach((letters, rowIndex) => {
      const row = document.createElement("div");
      row.className = "keyboard-row";
      if (rowIndex === 2) row.append(createKey("enter", "Enter", true));
      for (const letter of letters) row.append(createKey(letter, letter, false, keyStates.get(letter)));
      if (rowIndex === 2) row.append(createKey("backspace", "⌫", true));
      keyboard.append(row);
    });
  }

  function createKey(value, label, wide, state) {
    const key = document.createElement("button");
    key.type = "button";
    key.className = `key${wide ? " wide" : ""}${state ? ` ${state}` : ""}`;
    key.dataset.key = value;
    key.textContent = label;
    key.setAttribute("aria-label", value === "backspace" ? "Backspace" : value === "enter" ? "Enter guess" : label);
    key.addEventListener("click", () => handleKey(value));
    return key;
  }

  function render() {
    applyPrefs();
    dateLabel.textContent = `DAILY PUZZLE · ${today}`;
    renderBoard();
    renderKeyboard();
    shareButton.hidden = game.status === "playing";
    if (game.status === "won") message.textContent = ["Brilliant!", "Lovely work.", "A sharp solve.", "Nicely done.", "Word wizard.", "Just in time."][game.guesses.length - 1];
    else if (game.status === "lost") message.textContent = `The word was ${answer.toUpperCase()}.`;
    else message.textContent = "";
    save(`${GAME_PREFIX}${today}`, game);
    revealGuessIndex = -1;
  }

  function handleKey(key) {
    if (game.status !== "playing") return;
    if (key === "enter") { submitGuess(); return; }
    if (key === "backspace") { draft = draft.slice(0, -1); renderBoard(); return; }
    if (/^[a-z]$/.test(key) && draft.length < WORD_LENGTH) {
      draft += key;
      renderBoard();
    }
  }

  function submitGuess() {
    if (draft.length !== WORD_LENGTH) { shakeCurrentRow(); showToast("Not enough letters"); return; }
    if (!VALID_GUESSES.has(draft)) { shakeCurrentRow(); showToast("Not in word list"); return; }
    if (prefs.hardMode && !obeysHardMode(draft)) return;

    game.guesses.push(draft);
    revealGuessIndex = game.guesses.length - 1;
    const won = draft === answer;
    draft = "";
    if (won) finishGame("won");
    else if (game.guesses.length === MAX_GUESSES) finishGame("lost");
    render();
  }

  function obeysHardMode(guess) {
    const found = new Map();
    const excluded = new Map();
    for (const past of game.guesses) {
      const marks = tileEvaluation(past);
      for (let index = 0; index < WORD_LENGTH; index += 1) {
        const letter = past[index];
        if (marks[index] === "correct") found.set(index, letter);
        if (marks[index] === "present") {
          if (!excluded.has(index)) excluded.set(index, new Set());
          excluded.get(index).add(letter);
        }
      }
    }
    for (const [index, letter] of found) {
      if (guess[index] !== letter) { showToast(`Keep ${letter.toUpperCase()} in spot ${index + 1}`); return false; }
    }
    for (const [index, letters] of excluded) {
      if (letters.has(guess[index])) { showToast(`Move ${guess[index].toUpperCase()} to a different spot`); return false; }
    }
    const presentLetters = new Set();
    for (const past of game.guesses) tileEvaluation(past).forEach((mark, index) => { if (mark === "present") presentLetters.add(past[index]); });
    for (const letter of presentLetters) {
      if (!guess.includes(letter)) { showToast(`Use the ${letter.toUpperCase()} from your clues`); return false; }
    }
    return true;
  }

  function finishGame(status) {
    game.status = status;
    stats.played += 1;
    if (status === "won") {
      stats.wins += 1;
      stats.streak += 1;
      stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      stats.distribution[game.guesses.length - 1] += 1;
    } else {
      stats.streak = 0;
    }
    save(STATS_KEY, stats);
  }

  function shakeCurrentRow() {
    const row = board.children[game.guesses.length];
    if (!row) return;
    row.classList.remove("shake");
    void row.offsetWidth;
    row.classList.add("shake");
  }

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1600);
  }

  function openModal(content) {
    modalContent.innerHTML = content;
    backdrop.hidden = false;
    modal.focus();
  }

  function closeModal() { backdrop.hidden = true; }

  function showHelp() {
    openModal(`<h2 id="modal-title">How to play</h2>
      <p class="intro">Find the hidden word in six tries. A fresh five-letter puzzle arrives every day.</p>
      <ul class="rule-list">
        <li><span>1.</span><span>Each guess must be a valid five-letter word.</span></li>
        <li><span>2.</span><span>The color of each tile shows how close you are.</span></li>
      </ul>
      <div class="mini-tiles" aria-label="Example: one correct, one present, one absent"><span class="mini-tile correct">S</span><span class="mini-tile">T</span><span class="mini-tile present">O</span><span class="mini-tile">N</span><span class="mini-tile absent">E</span></div>
      <h3>Example</h3>
      <ul class="rule-list">
        <li><span class="mini-tile correct">S</span><span><strong>Green</strong> means the letter is in the word and in the right spot.</span></li>
        <li><span class="mini-tile present">O</span><span><strong>Gold</strong> means the letter is in the word, in a different spot.</span></li>
        <li><span class="mini-tile absent">E</span><span><strong>Gray</strong> means the letter is not in the word.</span></li>
      </ul>
      <button class="modal-action" data-close-modal>Got it</button>`);
  }

  function showSettings() {
    openModal(`<h2 id="modal-title">Settings</h2>
      <p class="intro">Make the game comfortable for you.</p>
      <div class="settings-list">
        ${settingRow("hardMode", "Hard mode", "Clues you reveal must be used in later guesses.")}
        ${settingRow("darkMode", "Dark theme", "A softer palette for low-light play.")}
        ${settingRow("highContrast", "High contrast", "Stronger tile colors for clearer clues.")}
      </div>`);
    modalContent.querySelectorAll("[data-setting]").forEach((button) => {
      button.addEventListener("click", () => {
        const name = button.dataset.setting;
        prefs[name] = !prefs[name];
        save(PREFS_KEY, prefs);
        applyPrefs();
        button.setAttribute("aria-checked", String(prefs[name]));
        if (name === "hardMode" && game.guesses.length === 0 && game.status === "playing") showToast(prefs[name] ? "Hard mode on" : "Hard mode off");
      });
    });
  }

  function settingRow(name, title, description) {
    const enabled = Boolean(prefs[name]);
    return `<div class="setting-row"><div class="setting-copy"><strong>${title}</strong><span>${description}</span></div><button class="switch" role="switch" aria-label="${title}" aria-checked="${enabled}" data-setting="${name}"></button></div>`;
  }

  function showStats() {
    const distribution = Array.isArray(stats.distribution) ? stats.distribution : [0, 0, 0, 0, 0, 0];
    const max = Math.max(1, ...distribution);
    const best = distribution.indexOf(max);
    const rows = distribution.map((count, index) => `<div class="distribution-row"><span class="distribution-label">${index + 1}</span><div class="distribution-bar${index === best && count > 0 ? " best" : ""}" style="width:${Math.max(24, Math.round((count / max) * 100))}%">${count}</div></div>`).join("");
    const winRate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
    openModal(`<h2 id="modal-title">Your stats</h2>
      <p class="intro">A little look at how you play.</p>
      <div class="stats-hero">
        ${statBlock(stats.played, "Played")}${statBlock(winRate, "Win %")}${statBlock(stats.streak, "Current streak")}${statBlock(stats.maxStreak, "Best streak")}
      </div>
      <h3>Guess distribution</h3>
      <div class="distribution">${rows}</div>
      ${game.status === "playing" ? "" : `<button class="modal-action" data-share-modal>Share result</button>`}`);
    const share = modalContent.querySelector("[data-share-modal]");
    if (share) share.addEventListener("click", shareResult);
  }

  function statBlock(value, label) { return `<div class="stat"><span class="stat-value">${value}</span><span class="stat-label">${label}</span></div>`; }

  function shareText() {
    const outcome = game.status === "won" ? `${game.guesses.length}/6` : "X/6";
    const squares = game.guesses.map((guess) => tileEvaluation(guess).map((mark) => mark === "correct" ? "🟩" : mark === "present" ? "🟨" : "⬛").join("")).join("\n");
    return `Wordle ${dayNumber + 1} ${outcome}\n\n${squares}\n\nwordle · ${today}`;
  }

  async function shareResult() {
    const text = shareText();
    try {
      if (navigator.share) {
        await navigator.share({ text });
        showToast("Result shared");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        showToast("Result copied to clipboard");
      } else {
        copyFallback(text);
        showToast("Result copied to clipboard");
      }
    } catch (error) {
      if (error?.name !== "AbortError") showToast("Could not share result");
    }
  }

  function copyFallback(text) {
    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }

  document.querySelector("#help-button").addEventListener("click", showHelp);
  document.querySelector("#settings-button").addEventListener("click", showSettings);
  document.querySelector("#stats-button").addEventListener("click", showStats);
  document.querySelector("#modal-close").addEventListener("click", closeModal);
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop || event.target.closest("[data-close-modal]")) closeModal(); });
  shareButton.addEventListener("click", shareResult);
  document.addEventListener("keydown", (event) => {
    if (!backdrop.hidden) {
      if (event.key === "Escape") closeModal();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === "Enter") { event.preventDefault(); handleKey("enter"); }
    else if (event.key === "Backspace") { event.preventDefault(); handleKey("backspace"); }
    else if (/^[a-zA-Z]$/.test(event.key)) handleKey(event.key.toLowerCase());
  });

  render();
  try {
    if (!localStorage.getItem("wordle-seen-help-v1")) {
      localStorage.setItem("wordle-seen-help-v1", "1");
      showHelp();
    }
  } catch { /* First-run help is optional when browser storage is unavailable. */ }
})();
