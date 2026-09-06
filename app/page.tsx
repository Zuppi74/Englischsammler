"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { businessWords } from "./business-words";
import { coreWords } from "./core-words";
import { dailyWords } from "./daily-words";

type WordStatus = "new" | "learning" | "learned";
type LearningDirection = "en-de" | "de-en" | "mixed";
type ReviewRating = "again" | "hard" | "known";
type DailyActivity = Record<string, { reviewed: number; correct: number; newReviewed: number }>;
type WordCard = {
  id: string;
  english: string;
  german: string;
  example: string;
  category: string;
  status: WordStatus;
  isNew: boolean;
  favorite: boolean;
  createdAt: number;
  dueAt: number;
  intervalDays: number;
  reviewCount: number;
  wrongCount: number;
  lastReviewedAt?: number;
};

const DAY = 24 * 60 * 60 * 1000;

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function learningStreak(activity: DailyActivity, now: number) {
  const cursor = new Date(now);
  if (!activity[localDateKey(cursor)]?.reviewed) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (activity[localDateKey(cursor)]?.reviewed) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const starterWords: WordCard[] = [
  {
    id: "starter-1",
    english: "to figure out",
    german: "herausfinden, verstehen",
    example: "I need to figure out how this works.",
    category: "Alltag",
    status: "learning",
    isNew: true,
    favorite: true,
    createdAt: 3,
    dueAt: 0,
    intervalDays: 0,
    reviewCount: 0,
    wrongCount: 0,
  },
  {
    id: "starter-2",
    english: "remarkable",
    german: "bemerkenswert",
    example: "She made remarkable progress.",
    category: "Arbeit",
    status: "new",
    isNew: true,
    favorite: false,
    createdAt: 2,
    dueAt: 0,
    intervalDays: 0,
    reviewCount: 0,
    wrongCount: 0,
  },
  {
    id: "starter-3",
    english: "eventually",
    german: "schliesslich, letztendlich",
    example: "Eventually, everything fell into place.",
    category: "Alltag",
    status: "learned",
    isNew: true,
    favorite: false,
    createdAt: 1,
    dueAt: 0,
    intervalDays: 0,
    reviewCount: 0,
    wrongCount: 0,
  },
];

const coreWordCards: WordCard[] = coreWords.map(([english, german], index) => ({
  id: `core-${index + 1}`,
  english,
  german,
  example: "",
  category: "Grundwortschatz",
  status: "new",
  isNew: true,
  favorite: false,
  createdAt: coreWords.length - index,
  dueAt: 0,
  intervalDays: 0,
  reviewCount: 0,
  wrongCount: 0,
}));

const businessWordCards: WordCard[] = businessWords.map(([category, english, german, example], index) => ({
  id: `business-${index + 1}`,
  english,
  german,
  example,
  category,
  status: "new",
  isNew: true,
  favorite: false,
  createdAt: businessWords.length - index,
  dueAt: 0,
  intervalDays: 0,
  reviewCount: 0,
  wrongCount: 0,
}));

const dailyWordCards: WordCard[] = dailyWords.map(([
  english,
  german,
  example,
  category = "Alltagssätze",
  status = "new",
  favorite = false,
], index) => ({
  id: `daily-${index + 1}`,
  english,
  german,
  example,
  category,
  status,
  isNew: true,
  favorite,
  createdAt: dailyWords.length - index,
  dueAt: 0,
  intervalDays: 0,
  reviewCount: 0,
  wrongCount: 0,
}));

const statusLabels: Record<WordStatus, string> = {
  new: "Wiederholen",
  learning: "Schwierig",
  learned: "Bekannt",
};

export default function Home() {
  const [words, setWords] = useState<WordCard[]>([]);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"collection" | "learn">("collection");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | WordStatus | "favorite" | "marked-new" | "problem">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [english, setEnglish] = useState("");
  const [german, setGerman] = useState("");
  const [example, setExample] = useState("");
  const [category, setCategory] = useState("Alltag");
  const [learnIndex, setLearnIndex] = useState(0);
  const [sessionWordIds, setSessionWordIds] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [direction, setDirection] = useState<LearningDirection>("mixed");
  const [goals, setGoals] = useState({ newCards: 10, reviews: 30 });
  const [activity, setActivity] = useState<DailyActivity>({});
  const [clock, setClock] = useState(() => Date.now());
  const [notice, setNotice] = useState("");
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("wortschatz-words");
    const savedWords: WordCard[] = saved ? JSON.parse(saved) : [];
    const isDemoCollection = savedWords.length === starterWords.length &&
      savedWords.every((word) => word.id.startsWith("starter-"));
    const initialWords: WordCard[] = !saved || isDemoCollection
      ? []
      : savedWords.map((word) => ({
        ...word,
        isNew: word.isNew !== false,
        dueAt: typeof word.dueAt === "number" ? word.dueAt : 0,
        intervalDays: typeof word.intervalDays === "number" ? word.intervalDays : 0,
        reviewCount: typeof word.reviewCount === "number" ? word.reviewCount : 0,
        wrongCount: typeof word.wrongCount === "number" ? word.wrongCount : 0,
      }));

    if (!saved || isDemoCollection || !window.localStorage.getItem("wortschatz-library-1103-v1")) {
      const normalizedEnglish = (word: WordCard) => word.english.trim().toLocaleLowerCase("en");
      const existingIds = new Set(initialWords.map((word) => word.id));
      const existingEnglish = new Set(initialWords.map(normalizedEnglish));

      const addCards = (cards: WordCard[], matchByEnglish: boolean) => {
        cards.forEach((word) => {
          const englishKey = normalizedEnglish(word);
          if (existingIds.has(word.id) || (matchByEnglish && existingEnglish.has(englishKey))) return;
          initialWords.push(word);
          existingIds.add(word.id);
          existingEnglish.add(englishKey);
        });
      };

      addCards(coreWordCards, true);
      addCards(businessWordCards, false);
      addCards(dailyWordCards, true);
      window.localStorage.setItem("wortschatz-library-1103-v1", "done");
    }

    const savedActivity = window.localStorage.getItem("wortschatz-activity");
    const savedGoals = window.localStorage.getItem("wortschatz-goals");
    const savedDirection = window.localStorage.getItem("wortschatz-direction");
    window.localStorage.setItem("wortschatz-core-500-v1", "done");
    const initialize = window.setTimeout(() => {
      setWords(initialWords);
      if (savedActivity) setActivity(JSON.parse(savedActivity));
      if (savedGoals) setGoals(JSON.parse(savedGoals));
      if (savedDirection === "en-de" || savedDirection === "de-en" || savedDirection === "mixed") setDirection(savedDirection);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(initialize);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("wortschatz-words", JSON.stringify(words));
    window.localStorage.setItem("wortschatz-activity", JSON.stringify(activity));
    window.localStorage.setItem("wortschatz-goals", JSON.stringify(goals));
    window.localStorage.setItem("wortschatz-direction", direction);
  }, [words, activity, goals, direction, ready]);

  const visibleWords = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return words.filter((word) => {
      const matchesText = !needle || [word.english, word.german, word.example, word.category]
        .some((value) => value.toLowerCase().includes(needle));
      const matchesFilter = filter === "all" ||
        (filter === "favorite" ? word.favorite :
          filter === "marked-new" ? word.isNew :
            filter === "problem" ? word.wrongCount >= 2 : word.status === filter);
      const matchesCategory = categoryFilter === "all" || word.category === categoryFilter;
      return matchesText && matchesFilter && matchesCategory;
    });
  }, [words, query, filter, categoryFilter]);

  const categories = useMemo(
    () => [...new Set(words.map((word) => word.category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "de")),
    [words],
  );
  const formCategories = useMemo(
    () => [...new Set(["Grundwortschatz", "Alltag", "Arbeit", "Reisen", "Gefühle", "Sonstiges", ...categories])],
    [categories],
  );

  const todayKey = localDateKey(new Date(clock));
  const todayActivity = activity[todayKey] ?? { reviewed: 0, correct: 0, newReviewed: 0 };
  const todayReviews = Math.max(0, todayActivity.reviewed - todayActivity.newReviewed);
  const dueWords = words.filter((word) => !word.isNew && word.dueAt <= clock);
  const problemWords = words.filter((word) => word.wrongCount >= 2);
  const totalActivity = Object.values(activity).reduce((sum, day) => ({
    reviewed: sum.reviewed + day.reviewed,
    correct: sum.correct + day.correct,
  }), { reviewed: 0, correct: 0 });
  const accuracy = totalActivity.reviewed ? Math.round(totalActivity.correct / totalActivity.reviewed * 100) : 0;
  const streak = learningStreak(activity, clock);
  const currentLearnWord = words.find((word) => word.id === sessionWordIds[learnIndex]);
  const activeDirection: Exclude<LearningDirection, "mixed"> = direction === "mixed"
    ? (learnIndex % 2 === 0 ? "de-en" : "en-de")
    : direction;

  function resetForm() {
    setEditingId(null);
    setEnglish("");
    setGerman("");
    setExample("");
    setCategory("Alltag");
  }

  function openNewForm() {
    resetForm();
    setFormOpen(true);
  }

  function goToStart() {
    setView("collection");
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  function startLearning() {
    const remainingNew = Math.max(0, goals.newCards - todayActivity.newReviewed);
    const remainingReviews = Math.max(0, goals.reviews - todayReviews);
    const due = words
      .filter((word) => !word.isNew && word.dueAt <= Date.now())
      .sort((a, b) => a.dueAt - b.dueAt)
      .slice(0, remainingReviews);
    const fresh = words
      .filter((word) => word.isNew)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, remainingNew);

    setSessionWordIds([...due, ...fresh].map((word) => word.id));
    setLearnIndex(0);
    setRevealed(false);
    setView("learn");
  }

  function openEditForm(word: WordCard) {
    setEditingId(word.id);
    setEnglish(word.english);
    setGerman(word.german);
    setExample(word.example);
    setCategory(word.category);
    setFormOpen(true);
  }

  function saveWord(event: FormEvent) {
    event.preventDefault();
    if (!english.trim() || !german.trim()) return;
    if (editingId) {
      setWords((current) => current.map((word) => word.id === editingId
        ? { ...word, english: english.trim(), german: german.trim(), example: example.trim(), category }
        : word));
    } else {
      setWords((current) => [{
        id: crypto.randomUUID(),
        english: english.trim(),
        german: german.trim(),
        example: example.trim(),
        category,
        status: "new",
        isNew: true,
        favorite: false,
        createdAt: Date.now(),
        dueAt: 0,
        intervalDays: 0,
        reviewCount: 0,
        wrongCount: 0,
      }, ...current]);
    }
    setFormOpen(false);
    resetForm();
  }

  function setWordStatus(id: string, status: WordStatus) {
    setWords((current) => current.map((word) => word.id === id ? { ...word, status } : word));
  }

  function reviewLearnCard(rating: ReviewRating) {
    if (!currentLearnWord) return;
    const now = Date.now();
    const wasNew = currentLearnWord.isNew;
    setWords((current) => current.map((word) => {
      if (word.id !== currentLearnWord.id) return word;
      const intervalDays = rating === "again"
        ? 0
        : rating === "hard"
          ? Math.max(1, Math.round(Math.max(1, word.intervalDays) * 1.5))
          : word.intervalDays > 0 ? Math.max(3, Math.round(word.intervalDays * 2.2)) : 3;
      const dueAt = rating === "again" ? now + 10 * 60 * 1000 : now + intervalDays * DAY;
      return {
        ...word,
        status: rating === "again" ? "new" : rating === "hard" ? "learning" : "learned",
        isNew: false,
        dueAt,
        intervalDays,
        reviewCount: word.reviewCount + 1,
        wrongCount: rating === "known" ? Math.max(0, word.wrongCount - 1) : word.wrongCount + 1,
        lastReviewedAt: now,
      };
    }));
    setActivity((current) => {
      const today = current[todayKey] ?? { reviewed: 0, correct: 0, newReviewed: 0 };
      return {
        ...current,
        [todayKey]: {
          reviewed: today.reviewed + 1,
          correct: today.correct + (rating === "known" ? 1 : 0),
          newReviewed: today.newReviewed + (wasNew ? 1 : 0),
        },
      };
    });
    setRevealed(false);
    setLearnIndex((index) => index + 1);
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  async function exportWords() {
    const date = new Date().toISOString().slice(0, 10);
    const fileName = `wortschatz-${date}.json`;
    const contents = JSON.stringify({
      format: "wortschatz-export",
      version: 2,
      exportedAt: new Date().toISOString(),
      words,
      activity,
      goals,
      direction,
    }, null, 2);
    const file = new File([contents], fileName, { type: "application/json" });

    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "Meine Wortschatz-Sammlung", files: [file] });
        showNotice("Sammlung wurde zum Teilen bereitgestellt.");
        return;
      }
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      showNotice("Exportdatei wurde gespeichert.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showNotice("Der Export konnte nicht gestartet werden.");
    }
  }

  async function importWords(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as { words?: unknown; activity?: unknown; goals?: unknown; direction?: unknown } | unknown[];
      const imported = Array.isArray(parsed) ? parsed : parsed.words;
      if (!Array.isArray(imported) || !imported.every((word) =>
        word && typeof word === "object" &&
        typeof (word as WordCard).english === "string" &&
        typeof (word as WordCard).german === "string"
      )) throw new Error("Ungültiges Dateiformat");

      if (words.length && !window.confirm(`Die aktuelle Sammlung wird durch ${imported.length} importierte Karten ersetzt. Fortfahren?`)) return;

      const normalized: WordCard[] = imported.map((entry) => {
        const word = entry as Partial<WordCard>;
        return {
          id: typeof word.id === "string" ? word.id : crypto.randomUUID(),
          english: word.english?.trim() || "",
          german: word.german?.trim() || "",
          example: typeof word.example === "string" ? word.example : "",
          category: typeof word.category === "string" ? word.category : "Sonstiges",
          status: word.status === "learning" || word.status === "learned" ? word.status : "new",
          isNew: word.isNew !== false,
          favorite: word.favorite === true,
          createdAt: typeof word.createdAt === "number" ? word.createdAt : Date.now(),
          dueAt: typeof word.dueAt === "number" ? word.dueAt : 0,
          intervalDays: typeof word.intervalDays === "number" ? word.intervalDays : 0,
          reviewCount: typeof word.reviewCount === "number" ? word.reviewCount : 0,
          wrongCount: typeof word.wrongCount === "number" ? word.wrongCount : 0,
          lastReviewedAt: typeof word.lastReviewedAt === "number" ? word.lastReviewedAt : undefined,
        };
      });
      setWords(normalized);
      if (!Array.isArray(parsed) && parsed.activity && typeof parsed.activity === "object") setActivity(parsed.activity as DailyActivity);
      if (!Array.isArray(parsed) && parsed.goals && typeof parsed.goals === "object") setGoals(parsed.goals as { newCards: number; reviews: number });
      if (!Array.isArray(parsed) && (parsed.direction === "en-de" || parsed.direction === "de-en" || parsed.direction === "mixed")) setDirection(parsed.direction);
      setFilter("all");
      setCategoryFilter("all");
      setQuery("");
      showNotice(`${normalized.length} Karten wurden erfolgreich geladen.`);
    } catch {
      showNotice("Diese Datei ist keine gültige Wortschatz-Sammlung.");
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={goToStart} aria-label="Zur Sammlung und nach oben">
          <span className="brand-mark">W</span>
          <span><strong>Wortschatz</strong><small>Dein Englischsammler</small></span>
        </button>
        <nav aria-label="Hauptnavigation">
          <button className={view === "collection" ? "active" : ""} onClick={() => setView("collection")}>Sammlung</button>
          <button className={view === "learn" ? "active" : ""} onClick={startLearning}>Lernen</button>
        </nav>
        <div className="header-actions">
          <button className="file-action" onClick={() => importInput.current?.click()} title="Sammlung aus einer Datei laden"><span>↑</span><b>Import</b></button>
          <button className="file-action" onClick={exportWords} title="Sammlung als Datei sichern"><span>↓</span><b>Export</b></button>
          <button className="primary compact" onClick={openNewForm}><span>＋</span> Neues Wort</button>
          <input ref={importInput} className="visually-hidden" type="file" accept="application/json,.json" onChange={importWords} aria-label="Wortschatz-Datei auswählen" />
        </div>
      </header>

      {notice && <div className="notice" role="status">✓ {notice}</div>}

      {view === "collection" ? (
        <section className="content">
          <div className="hero">
            <div>
              <p className="eyebrow">Deine persönliche Sammlung</p>
              <h1>Wörter, die <em>bleiben.</em></h1>
              <p>Halte neue englische Wörter fest und mache sie Schritt für Schritt zu deinem Wortschatz.</p>
            </div>
            <div className="stats" aria-label="Lernfortschritt">
              <div><strong>{words.length}</strong><span>Wörter</span></div>
              <div><strong>{words.filter((word) => word.status === "learning").length}</strong><span>Schwierig</span></div>
              <div><strong>{words.filter((word) => word.status === "learned").length}</strong><span>Bekannt</span></div>
            </div>
          </div>

          <section className="learning-dashboard" aria-label="Heutiger Lernfortschritt">
            <div className="dashboard-heading">
              <div><p className="eyebrow">Heute lernen</p><h2>Dein Tagesplan</h2></div>
              <button className="primary" onClick={startLearning}>Jetzt lernen <span>→</span></button>
            </div>
            <div className="goal-grid">
              <div className="goal-card">
                <div><span>Neue Karten</span><strong>{Math.min(todayActivity.newReviewed, goals.newCards)} / {goals.newCards}</strong></div>
                <div className="progress-track"><span style={{ width: `${Math.min(100, todayActivity.newReviewed / Math.max(1, goals.newCards) * 100)}%` }} /></div>
                <label>Tagesziel <input type="number" min="1" max="100" value={goals.newCards} onChange={(event) => setGoals((current) => ({ ...current, newCards: Math.max(1, Number(event.target.value) || 1) }))} /></label>
              </div>
              <div className="goal-card">
                <div><span>Wiederholungen</span><strong>{Math.min(todayReviews, goals.reviews)} / {goals.reviews}</strong></div>
                <div className="progress-track"><span style={{ width: `${Math.min(100, todayReviews / Math.max(1, goals.reviews) * 100)}%` }} /></div>
                <label>Tagesziel <input type="number" min="1" max="200" value={goals.reviews} onChange={(event) => setGoals((current) => ({ ...current, reviews: Math.max(1, Number(event.target.value) || 1) }))} /></label>
              </div>
              <div className="metric-card"><span>Heute fällig</span><strong>{dueWords.length}</strong><small>automatisch geplant</small></div>
              <div className="metric-card"><span>Trefferquote</span><strong>{accuracy}%</strong><small>{totalActivity.reviewed} Antworten</small></div>
              <div className="metric-card"><span>Lernserie</span><strong>{streak}</strong><small>{streak === 1 ? "Tag" : "Tage"} in Folge</small></div>
              <button className="metric-card problem-link" onClick={() => setFilter("problem")}><span>Problemwörter</span><strong>{problemWords.length}</strong><small>zweimal oder öfter schwierig</small></button>
            </div>
          </section>

          <div className="toolbar">
            <label className="search">
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Wörter durchsuchen …" />
            </label>
            <label className="category-filter">
              <span>Kategorie</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="all">Alle Kategorien</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <div className="filters" aria-label="Karten filtern">
              {(["all", "marked-new", "problem", "new", "learning", "learned", "favorite"] as const).map((item) => (
                <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
                  {item === "all" ? "Alle" : item === "marked-new" ? "Neu" : item === "problem" ? "Problemwörter" : item === "favorite" ? "Favoriten" : statusLabels[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="section-heading">
            <h2>Meine Karten</h2>
            <span>{visibleWords.length} {visibleWords.length === 1 ? "Eintrag" : "Einträge"}</span>
          </div>

          <div className="card-grid">
            {visibleWords.map((word) => (
              <article
                className="word-card"
                key={word.id}
                title="Klicken, um diese Karte zu bearbeiten"
                onClick={(event) => {
                  if (!(event.target as HTMLElement).closest("button")) openEditForm(word);
                }}
              >
                <div className="card-top">
                  <div className="card-badges">
                    <span className={`status ${word.status}`}>{statusLabels[word.status]}</span>
                    <button
                      className={`new-marker ${word.isNew ? "selected" : ""}`}
                      aria-pressed={word.isNew}
                      aria-label={`${word.english} als neu markieren`}
                      onClick={() => setWords((current) => current.map((item) => item.id === word.id ? { ...item, isNew: !item.isNew } : item))}
                    >Neu</button>
                    {word.wrongCount >= 2 && <span className="problem-marker">Problemwort</span>}
                  </div>
                  <button className={`favorite ${word.favorite ? "selected" : ""}`} onClick={() => setWords((current) => current.map((item) => item.id === word.id ? { ...item, favorite: !item.favorite } : item))} aria-label="Favorit umschalten">{word.favorite ? "★" : "☆"}</button>
                </div>
                <h3>{word.english}</h3>
                <p className="translation">{word.german}</p>
                <div className="example"><span>“</span>{word.example || "Noch kein Beispielsatz."}</div>
                <div className="card-rating" aria-label={`Lernstatus für ${word.english}`}>
                  <button className={word.status === "new" ? "selected repeat" : "repeat"} aria-pressed={word.status === "new"} onClick={() => setWordStatus(word.id, "new")}><span>↻</span>Wiederholen</button>
                  <button className={word.status === "learning" ? "selected difficult" : "difficult"} aria-pressed={word.status === "learning"} onClick={() => setWordStatus(word.id, "learning")}><span>!</span>Schwierig</button>
                  <button className={word.status === "learned" ? "selected known" : "known"} aria-pressed={word.status === "learned"} onClick={() => setWordStatus(word.id, "learned")}><span>✓</span>Bekannt</button>
                </div>
                <div className="card-footer">
                  <span className="category">{word.category}</span>
                  <div className="card-actions">
                    <button onClick={() => openEditForm(word)} aria-label={`${word.english} bearbeiten`}>✎</button>
                    <button onClick={() => setWords((current) => current.filter((item) => item.id !== word.id))} aria-label={`${word.english} löschen`}>×</button>
                  </div>
                </div>
              </article>
            ))}
            <button className="add-card" onClick={openNewForm}><span>＋</span><strong>Neues Wort hinzufügen</strong><small>Erweitere deine Sammlung</small></button>
          </div>
        </section>
      ) : (
        <section className="learn-view">
          <p className="eyebrow">Lernmodus</p>
          <h1>Eine Karte nach der anderen.</h1>
          <div className="direction-picker" aria-label="Lernrichtung wählen">
            {(["de-en", "en-de", "mixed"] as const).map((item) => (
              <button key={item} className={direction === item ? "active" : ""} onClick={() => setDirection(item)}>
                {item === "de-en" ? "Deutsch → Englisch" : item === "en-de" ? "Englisch → Deutsch" : "Gemischt"}
              </button>
            ))}
          </div>
          {currentLearnWord ? (
            <>
              <p className="learn-progress">Karte {learnIndex + 1} von {sessionWordIds.length}</p>
              <button className={`learn-card ${revealed ? "revealed" : ""}`} onClick={() => setRevealed(true)}>
                <span className="learn-label">{activeDirection === "en-de" ? "Englisch" : "Deutsch"}</span>
                <strong>{activeDirection === "en-de" ? currentLearnWord.english : currentLearnWord.german}</strong>
                {revealed ? (
                  <span className="learn-answer"><i>{activeDirection === "en-de" ? "Deutsch" : "Englisch"}</i>{activeDirection === "en-de" ? currentLearnWord.german : currentLearnWord.english}<small>{currentLearnWord.example}</small></span>
                ) : <span className="reveal-hint">Tippen, um die Antwort zu zeigen</span>}
              </button>
              {revealed && <div className="learn-actions">
                <button className="again" onClick={() => reviewLearnCard("again")}><strong>Wiederholen</strong><small>in 10 Minuten</small></button>
                <button className="hard" onClick={() => reviewLearnCard("hard")}><strong>Schwierig</strong><small>morgen</small></button>
                <button className="known" onClick={() => reviewLearnCard("known")}><strong>Gewusst</strong><small>in {currentLearnWord.intervalDays > 0 ? Math.max(3, Math.round(currentLearnWord.intervalDays * 2.2)) : 3} Tagen</small></button>
              </div>}
            </>
          ) : <div className="empty-state"><strong>Tagesrunde geschafft!</strong><p>Deine heutigen neuen Karten und fälligen Wiederholungen sind erledigt.</p><button className="primary" onClick={goToStart}>Zur Übersicht</button></div>}
        </section>
      )}

      {formOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
          <form className="word-form" onSubmit={saveWord}>
            <div className="form-heading"><div><p className="eyebrow">Karteikarte</p><h2>{editingId ? "Wort bearbeiten" : "Neues Wort"}</h2></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Schliessen">×</button></div>
            <label>Englisches Wort oder Wendung<input autoFocus required value={english} onChange={(event) => setEnglish(event.target.value)} placeholder="z. B. to look forward to" /></label>
            <label>Deutsche Übersetzung<input required value={german} onChange={(event) => setGerman(event.target.value)} placeholder="z. B. sich freuen auf" /></label>
            <label>Beispielsatz <span>optional</span><textarea value={example} onChange={(event) => setExample(event.target.value)} placeholder="I look forward to seeing you." /></label>
            <label>Kategorie<select value={category} onChange={(event) => setCategory(event.target.value)}>{formCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <div className="form-actions"><button type="button" onClick={() => setFormOpen(false)}>Abbrechen</button><button className="primary" type="submit">{editingId ? "Änderungen speichern" : "Karte speichern"}</button></div>
          </form>
        </div>
      )}
    </main>
  );
}
