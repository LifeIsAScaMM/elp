import React, { useEffect, useState, useRef } from "react";

/*
  Listening Fill-in-the-Blanks (Input-based + Admin Mode)
  --------------------------------------------------
  - Users type answers directly into blanks (no drag-drop)
  - Admin mode: unlock via secret code
    • Add new questions by pasting transcript with [answers]
    • Upload audio file URL
    • System parses blanks automatically
  - Questions persist in localStorage
  - Manage Questions: view, edit, delete
*/

function Button({ children, className = "", variant = "solid", ...rest }) {
  const base =
    "px-4 py-2 rounded-2xl text-sm font-semibold transition shadow-sm focus:outline-none focus:ring disabled:opacity-50";
  const styles = {
    solid: "bg-black text-white hover:opacity-90",
    soft: "bg-gray-100 hover:bg-gray-200",
    ghost: "hover:bg-gray-100",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

function Progress({ value }) {
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-black"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function formatTime(sec) {
  if (!sec || Number.isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function AudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  const speedOptions = [0.25, 0.5, 0.75, 1, 2, 4, 5, 10];

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => setCurrent(a.currentTime);
    const onLoaded = () => setDuration(isFinite(a.duration) ? a.duration : 0);
    const onEnded = () => setPlaying(false);

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnded);

    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnded);
    };
  }, [src]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.play().catch(() => setPlaying(false));
    } else {
      a.pause();
    }
  }, [playing]);

  useEffect(() => {
    // reset state when source changes
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
  }, [src]);

  const togglePlay = () => setPlaying((p) => !p);
  const seek = (v) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = v;
    setCurrent(v);
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow flex flex-col gap-2">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow hover:scale-105 transition"
        >
          {playing ? "❚❚" : "➤"}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-12 text-left">{formatTime(current)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step="0.1"
              value={Math.min(current, duration || 0)}
              onChange={(e) => seek(Number(e.target.value))}
              className="flex-1 h-1 bg-gray-200 rounded-lg accent-black"
            />
            <span className="text-xs text-gray-600 w-12 text-right">{formatTime(duration)}</span>
          </div>
        </div>
      </div>
      <div className="flex justify-end items-center gap-2">
        <label className="text-xs text-gray-500">Speed</label>
        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="border rounded px-2 py-1 text-sm"
        >
          {speedOptions.map((s) => (
            <option key={s} value={s}>{s}×</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function ListeningFIBApp() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [adminSection, setAdminSection] = useState("panel"); // panel | manage
  const [secretInput, setSecretInput] = useState("");
  const [questions, setQuestions] = useState(() => {
    const saved = localStorage.getItem("fib-questions");
    return saved ? JSON.parse(saved) : SAMPLE_QUESTIONS;
  });
  const [editQuestion, setEditQuestion] = useState(null);

  const q = questions[index];
  const blanksCount = q.blanks.length;

  useEffect(() => {
    setAnswers({});
    setChecked(false);
    setTimeLeft(q.timeLimitSec ?? null);
    setScore(0);
  }, [index, q]);

  useEffect(() => {
    if (!timeLeft) return;
    if (timeLeft < 0) return;
    const id = setInterval(() => setTimeLeft((t) => (t == null ? null : t - 1)), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && !checked) handleCheck();
  }, [timeLeft, checked]);
 
  function isCorrect(i) {
    return (
      answers[i] && answers[i].trim().toLowerCase() === q.blanks[i].trim().toLowerCase()
    );
  }

  function handleCheck() {
    let c = 0;
    for (let i = 0; i < blanksCount; i++) if (isCorrect(i)) c++;
    setScore(c);
    setChecked(true);
  }

  function handleShowAnswers() {
    const filled = {};
    q.blanks.forEach((ans, i) => (filled[i] = ans));
    setAnswers(filled);
    setChecked(true);
  }

  function handleReset() {
    setAnswers({});
    setChecked(false);
    setScore(0);
    setTimeLeft(q.timeLimitSec ?? null);
  }

  function nextQ() {
    setIndex((i) => Math.min(questions.length - 1, i + 1));
  }
  function prevQ() {
    setIndex((i) => Math.max(0, i - 1));
  }

  function tryUnlockAdmin() {
    if (secretInput === "asthehourspassiwillletyouknowthatineedtoaskbeforeimalone") {
      setAdmin(true);
      setSecretInput("");
    } else alert("Wrong code");
  }

  function exitAdmin() {
    setAdmin(false);
    setAdminSection("panel");
  }

  async function saveQuestions(newQ) {
    setQuestions(newQ);
    localStorage.setItem('fib-questions', JSON.stringify(newQ));
    try {
      const res = await fetch('http://localhost:4000/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQ),
      });
      if (!res.ok) console.warn('Server save returned', res.status);
    } catch (err) {
      console.warn('Could not save to server:', err);
    }
  }

  function addQuestion({ title, transcript, audioUrl, timeLimitSec }) {
    const tokens = [];
    const blanks = [];
    const regex = /\[(.+?)\]/g;
    let lastIndex = 0;
    let m;
    while ((m = regex.exec(transcript))) {
      if (m.index > lastIndex) tokens.push(transcript.slice(lastIndex, m.index));
      tokens.push({ blank: blanks.length });
      blanks.push(m[1]);
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < transcript.length) tokens.push(transcript.slice(lastIndex));

    const newQ = {
      id: "q" + Date.now(),
      title: title || "Custom question",
      audioUrl,
      timeLimitSec,
      tokens,
      blanks,
    };
    const newQuestions = [...questions, newQ];
    saveQuestions(newQuestions);
  }

  function updateQuestion(id, { title, transcript, audioUrl, timeLimitSec }) {
    const tokens = [];
    const blanks = [];
    const regex = /\[(.+?)\]/g;
    let lastIndex = 0;
    let m;
    while ((m = regex.exec(transcript))) {
      if (m.index > lastIndex) tokens.push(transcript.slice(lastIndex, m.index));
      tokens.push({ blank: blanks.length });
      blanks.push(m[1]);
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < transcript.length) tokens.push(transcript.slice(lastIndex));

    const updated = questions.map((q) =>
      q.id === id ? { ...q, title: title || q.title, audioUrl, timeLimitSec, tokens, blanks } : q
    );
    saveQuestions(updated);
  }

  function deleteQuestion(id) {
    const filtered = questions.filter((q) => q.id !== id);
    saveQuestions(filtered);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 text-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {!admin ? (
          <>
            <header className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold">Listening: Fill in the Blanks</h1>
                <p className="text-sm text-gray-600">Question {index + 1} of {questions.length}</p>
              </div>
              <div className="w-48"><Progress value={((index + 1) / questions.length) * 100} /></div>
            </header>

            <div className="bg-white rounded-2xl shadow p-4 md:p-6">
              <h2 className="text-lg font-semibold">{q.title}</h2>

              {/* New audio player */}
              <div className="my-4">
                <AudioPlayer src={q.audioUrl} />
              </div>

              <div className="mt-4 leading-8 text-[1.05rem]">
                {q.tokens.map((t, i) =>
                  typeof t === "string" ? (
                    <span key={i}>{t}</span>
                  ) : (
                    <BlankInput
                      key={i}
                      index={t.blank}
                      value={answers[t.blank] || ""}
                      correct={checked ? isCorrect(t.blank) : null}
                      onChange={(val) => setAnswers((a) => ({ ...a, [t.blank]: val }))}
                    />
                  )
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={handleCheck} disabled={checked}>Check answers</Button>
                <Button variant="soft" onClick={handleShowAnswers}>Show answers</Button>
                <Button variant="ghost" onClick={handleReset}>Reset</Button>
                <div className="ml-auto text-sm text-gray-600">
                  Score: {checked ? `${score}/${blanksCount}` : "—"}
                </div>
              </div>
            </div>

            <section className="flex items-center justify-between mt-6">
              <Button variant="soft" onClick={prevQ} disabled={index === 0}>Previous</Button>
              <Button variant="solid" onClick={nextQ} disabled={index === questions.length - 1}>Next</Button>
            </section>

            <div className="mt-10 flex gap-2">
              <input
                type="password"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                placeholder="Admin code"
                className="border rounded-xl px-3 py-2 text-sm"
              />
              <Button onClick={tryUnlockAdmin}>Enter</Button>
            </div>
          </>
        ) : adminSection === "panel" ? (
          <AdminPanel
            addQuestion={addQuestion}
            exitAdmin={exitAdmin}
            goManage={() => setAdminSection("manage")}
            editQuestion={editQuestion}
            updateQuestion={updateQuestion}
            clearEdit={() => setEditQuestion(null)}
          />
        ) : (
          <ManageQuestions
            questions={questions}
            setEditQuestion={(q) => { setEditQuestion(q); setAdminSection("panel"); }}
            deleteQuestion={deleteQuestion}
            back={() => setAdminSection("panel")}
          />
        )}
      </div>
    </div>
  );
}

function BlankInput({ value, correct, onChange }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`mx-1 px-2 py-1 border-b focus:outline-none focus:border-black ${
        correct == null
          ? "border-gray-400"
          : correct
          ? "border-green-500 text-green-700"
          : "border-red-500 text-red-700"
      }`}
      placeholder="..."
    />
  );
}

function AdminPanel({ addQuestion, exitAdmin, goManage, editQuestion, updateQuestion, clearEdit }) {
  const [title, setTitle] = useState(editQuestion ? editQuestion.title : "");
  const [transcript, setTranscript] = useState(
    editQuestion ? editQuestion.tokens.map(t => typeof t === "string" ? t : `[${editQuestion.blanks[t.blank]}]`).join("") : ""
  );
  const [audioUrl, setAudioUrl] = useState(editQuestion ? editQuestion.audioUrl : "");
  const [timeLimit, setTimeLimit] = useState(editQuestion ? editQuestion.timeLimitSec : 90);

  function handleSave() {
    if (!transcript || !audioUrl || !title) return alert("Need title, transcript and audio URL");
    if (editQuestion) {
      updateQuestion(editQuestion.id, { title, transcript, audioUrl, timeLimitSec: Number(timeLimit) });
      clearEdit();
      alert("Question updated!");
    } else {
      addQuestion({ title, transcript, audioUrl, timeLimitSec: Number(timeLimit) });
      alert("Question added and saved!");
    }
    setTitle("");
    setTranscript("");
    setAudioUrl("");
    setTimeLimit(90);
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow space-y-4">
      <h2 className="text-xl font-bold">{editQuestion ? "Edit Question" : "Admin Mode"}</h2>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Question title"
        className="w-full border rounded-xl p-2 text-sm"
      />
      <textarea
        className="w-full border rounded-xl p-2 text-sm"
        rows={5}
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Type transcript here. Mark answers with [brackets]."
      />
      <input
        type="text"
        value={audioUrl}
        onChange={(e) => setAudioUrl(e.target.value)}
        placeholder="Audio file URL"
        className="w-full border rounded-xl p-2 text-sm"
      />
      <input
        type="number"
        value={timeLimit}
        onChange={(e) => setTimeLimit(e.target.value)}
        placeholder="Time limit (seconds)"
        className="w-full border rounded-xl p-2 text-sm"
      />
      <div className="flex gap-3">
        <Button onClick={handleSave}>{editQuestion ? "Save Changes" : "Add Question"}</Button>
        <Button variant="soft" onClick={goManage}>Manage Questions</Button>
        <Button variant="ghost" onClick={exitAdmin}>Exit Admin</Button>
      </div>
    </div>
  );
}

function ManageQuestions({ questions, setEditQuestion, deleteQuestion, back }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow space-y-4">
      <h2 className="text-xl font-bold">Manage Questions</h2>
      {questions.map((q) => (
        <div key={q.id} className="flex items-center justify-between border-b py-2">
          <span className="text-sm truncate max-w-xs">{q.title}</span>
          <div className="flex gap-2">
            <Button variant="soft" onClick={() => setEditQuestion(q)}>Edit</Button>
            <Button variant="ghost" onClick={() => deleteQuestion(q.id)}>Delete</Button>
          </div>
        </div>
      ))}
      <div className="flex gap-3 mt-4">
        <Button onClick={back}>Back to Admin</Button>
      </div>
    </div>
  );
}

// ----------- Sample data -----------
const SAMPLE_QUESTIONS = [
  {
    id: "q1",
    title: "Urban parks audio clip",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    timeLimitSec: 90,
    tokens: [
      "City parks provide vital ", { blank: 0 }, " for residents, offering spaces for ", { blank: 1 },
      ", relaxation, and community events.",
    ],
    blanks: ["amenities", "exercise"],
  },
];