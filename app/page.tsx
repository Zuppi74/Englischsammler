"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type WordStatus = "new" | "learning" | "learned";
type WordCard = {
  id: string;
  english: string;
  german: string;
  example: string;
  category: string;
  status: WordStatus;
  favorite: boolean;
  createdAt: number;
};

const starterWords: WordCard[] = [
  {
    id: "starter-1",
    english: "to figure out",
    german: "herausfinden, verstehen",
    example: "I need to figure out how this works.",
    category: "Alltag",
    status: "learning",
    favorite: true,
    createdAt: 3,
  },
  {
    id: "starter-2",
    english: "remarkable",
    german: "bemerkenswert",
    example: "She made remarkable progress.",
    category: "Arbeit",
    status: "new",
    favorite: false,
    createdAt: 2,
  },
  {
    id: "starter-3",
    english: "eventually",
    german: "schliesslich, letztendlich",
    example: "Eventually, everything fell into place.",
    category: "Alltag",
    status: "learned",
    favorite: false,
    createdAt: 1,
  },
];

const statusLabels: Record<WordStatus, string> = {
  new: "Neu",
  learning: "Am Lernen",
  learned: "Gelernt",
};

export default function Home() {
  const [words, setWords] = useState<WordCard[]>([]);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"collection" | "learn">("collection");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | WordStatus | "favorite">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [english, setEnglish] = useState("");
  const [german, setGerman] = useState("");
  const [example, setExample] = useState("");
  const [category, setCategory] = useState("Alltag");
  const [learnIndex, setLearnIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("wortschatz-words");
    setWords(saved ? JSON.parse(saved) : starterWords);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem("wortschatz-words", JSON.stringify(words));
  }, [words, ready]);

  const visibleWords = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return words.filter((word) => {
      const matchesText = !needle || [word.english, word.german, word.example, word.category]
        .some((value) => value.toLowerCase().includes(needle));
      const matchesFilter = filter === "all" ||
        (filter === "favorite" ? word.favorite : word.status === filter);
      return matchesText && matchesFilter;
    });
  }, [words, query, filter]);

  const learningWords = words.filter((word) => word.status !== "learned");
  const currentLearnWord = learningWords[learnIndex % Math.max(learningWords.length, 1)];

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
        favorite: false,
        createdAt: Date.now(),
      }, ...current]);
    }
    setFormOpen(false);
    resetForm();
  }

  function setWordStatus(id: string, status: WordStatus) {
    setWords((current) => current.map((word) => word.id === id ? { ...word, status } : word));
  }

  function nextLearnCard(status?: WordStatus) {
    if (currentLearnWord && status) setWordStatus(currentLearnWord.id, status);
    setRevealed(false);
    setLearnIndex((index) => index + 1);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("collection")} aria-label="Zur Sammlung">
          <span className="brand-mark">W</span>
          <span><strong>Wortschatz</strong><small>Dein Englischsammler</small></span>
        </button>
        <nav aria-label="Hauptnavigation">
          <button className={view === "collection" ? "active" : ""} onClick={() => setView("collection")}>Sammlung</button>
          <button className={view === "learn" ? "active" : ""} onClick={() => { setView("learn"); setRevealed(false); }}>Lernen</button>
        </nav>
        <button className="primary compact" onClick={openNewForm}><span>＋</span> Neues Wort</button>
      </header>

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
              <div><strong>{words.filter((word) => word.status === "learning").length}</strong><span>Am Lernen</span></div>
              <div><strong>{words.filter((word) => word.status === "learned").length}</strong><span>Gelernt</span></div>
            </div>
          </div>

          <div className="toolbar">
            <label className="search">
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Wörter durchsuchen …" />
            </label>
            <div className="filters" aria-label="Karten filtern">
              {(["all", "new", "learning", "learned", "favorite"] as const).map((item) => (
                <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
                  {item === "all" ? "Alle" : item === "favorite" ? "Favoriten" : statusLabels[item]}
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
              <article className="word-card" key={word.id}>
                <div className="card-top">
                  <span className={`status ${word.status}`}>{statusLabels[word.status]}</span>
                  <button className={`favorite ${word.favorite ? "selected" : ""}`} onClick={() => setWords((current) => current.map((item) => item.id === word.id ? { ...item, favorite: !item.favorite } : item))} aria-label="Favorit umschalten">{word.favorite ? "★" : "☆"}</button>
                </div>
                <h3>{word.english}</h3>
                <p className="translation">{word.german}</p>
                <div className="example"><span>“</span>{word.example || "Noch kein Beispielsatz."}</div>
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
          {currentLearnWord ? (
            <>
              <p className="learn-progress">Karte {(learnIndex % learningWords.length) + 1} von {learningWords.length}</p>
              <button className={`learn-card ${revealed ? "revealed" : ""}`} onClick={() => setRevealed(true)}>
                <span className="learn-label">Englisch</span>
                <strong>{currentLearnWord.english}</strong>
                {revealed ? (
                  <span className="learn-answer"><i>Deutsch</i>{currentLearnWord.german}<small>{currentLearnWord.example}</small></span>
                ) : <span className="reveal-hint">Tippen, um die Antwort zu zeigen</span>}
              </button>
              {revealed && <div className="learn-actions">
                <button className="again" onClick={() => nextLearnCard("new")}>Nochmals</button>
                <button className="hard" onClick={() => nextLearnCard("learning")}>Schwierig</button>
                <button className="known" onClick={() => nextLearnCard("learned")}>Gewusst</button>
              </div>}
            </>
          ) : <div className="empty-state"><strong>Alles gelernt!</strong><p>Du hast im Moment keine offenen Karten.</p></div>}
        </section>
      )}

      {formOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
          <form className="word-form" onSubmit={saveWord}>
            <div className="form-heading"><div><p className="eyebrow">Karteikarte</p><h2>{editingId ? "Wort bearbeiten" : "Neues Wort"}</h2></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Schliessen">×</button></div>
            <label>Englisches Wort oder Wendung<input autoFocus required value={english} onChange={(event) => setEnglish(event.target.value)} placeholder="z. B. to look forward to" /></label>
            <label>Deutsche Übersetzung<input required value={german} onChange={(event) => setGerman(event.target.value)} placeholder="z. B. sich freuen auf" /></label>
            <label>Beispielsatz <span>optional</span><textarea value={example} onChange={(event) => setExample(event.target.value)} placeholder="I look forward to seeing you." /></label>
            <label>Kategorie<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Alltag</option><option>Arbeit</option><option>Reisen</option><option>Gefühle</option><option>Sonstiges</option></select></label>
            <div className="form-actions"><button type="button" onClick={() => setFormOpen(false)}>Abbrechen</button><button className="primary" type="submit">{editingId ? "Änderungen speichern" : "Karte speichern"}</button></div>
          </form>
        </div>
      )}
    </main>
  );
}
