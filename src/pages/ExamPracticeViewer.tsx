import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  Trophy,
  ArrowLeft,
  Award,
  AlertTriangle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { SEO, buildQuizSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ALL_EXAM_DUMPS_DATA, REDIS_DEVELOPER_EXAM, ExamQuestion, ExamDumpData } from "@/data/redis-cert-questions";
import { trackEvent } from "@/lib/analytics";

export default function ExamPracticeViewer() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Resolve exam data or fallback to Redis exam
  const examData: ExamDumpData = useMemo(() => {
    if (slug && ALL_EXAM_DUMPS_DATA[slug.toLowerCase()]) {
      return ALL_EXAM_DUMPS_DATA[slug.toLowerCase()];
    }
    return REDIS_DEVELOPER_EXAM;
  }, [slug]);

  // Mode: "study" (instant answer & explanations) | "exam" (timed mock test)
  const [mode, setMode] = useState<"study" | "exam">("study");
  const [selectedDomain, setSelectedDomain] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Current active question index (in the filtered question list)
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // User responses: questionId -> array of selected option letters ['A', 'C']
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [flaggedForReview, setFlaggedForReview] = useState<Set<string>>(new Set());

  // Filter state for reviewing mistakes only
  const [reviewMistakesOnly, setReviewMistakesOnly] = useState<boolean>(false);

  // Exam timer (seconds remaining)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(examData.timeLimitMinutes * 60);
  const [isExamSubmitted, setIsExamSubmitted] = useState<boolean>(false);
  const [showScoreModal, setShowScoreModal] = useState<boolean>(false);

  // Analytics: track exam simulator access
  useEffect(() => {
    trackEvent("download", "ExamDump", slug || "redis", {
      name: examData.title,
      provider: examData.provider,
    });
  }, [slug, examData.title, examData.provider]);

  // Anti-piracy: intercept copy and right-click context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.setData("text/plain", "Protected material | Yatri Cloud Practice Hub");
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "p", "u", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      if (e.key === "F12") e.preventDefault();
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("copy", handleCopy);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Reset exam state when switching modes or exams
  const resetExam = () => {
    setUserAnswers({});
    setRevealedAnswers({});
    setFlaggedForReview(new Set());
    setSecondsRemaining(examData.timeLimitMinutes * 60);
    setIsExamSubmitted(false);
    setShowScoreModal(false);
    setCurrentIndex(0);
    setReviewMistakesOnly(false);
  };

  // Timer countdown in exam mode
  useEffect(() => {
    if (mode !== "exam" || isExamSubmitted) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, isExamSubmitted]);

  // Filter questions by domain, search query, or mistake review
  const filteredQuestions = useMemo(() => {
    let list = examData.questions;

    if (selectedDomain !== "All") {
      list = list.filter((q) => q.domain === selectedDomain);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.codeSnippet && item.codeSnippet.toLowerCase().includes(q)) ||
          item.options.some((opt) => opt.text.toLowerCase().includes(q))
      );
    }

    if (reviewMistakesOnly && isExamSubmitted) {
      list = list.filter((q) => {
        const userAns = (userAnswers[q.id] || []).sort().join(",");
        const correctAns = [...q.correctAnswers].sort().join(",");
        return userAns !== correctAns;
      });
    }

    return list;
  }, [examData, selectedDomain, searchQuery, reviewMistakesOnly, isExamSubmitted, userAnswers]);

  // Keep index within bounds
  useEffect(() => {
    if (currentIndex >= filteredQuestions.length) {
      setCurrentIndex(0);
    }
  }, [filteredQuestions.length, currentIndex]);

  const currentQuestion: ExamQuestion | undefined = filteredQuestions[currentIndex];

  // Handle option selection
  const handleSelectOption = (letter: string) => {
    if (!currentQuestion) return;

    setUserAnswers((prev) => {
      const currentSelected = prev[currentQuestion.id] || [];
      if (currentQuestion.chooseCount === 1) {
        return { ...prev, [currentQuestion.id]: [letter] };
      } else {
        // Multi-select
        if (currentSelected.includes(letter)) {
          return { ...prev, [currentQuestion.id]: currentSelected.filter((l) => l !== letter) };
        } else {
          if (currentSelected.length >= currentQuestion.chooseCount) {
            return { ...prev, [currentQuestion.id]: [...currentSelected.slice(1), letter] };
          }
          return { ...prev, [currentQuestion.id]: [...currentSelected, letter] };
        }
      }
    });
  };

  const toggleBookmark = (qId: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const toggleFlagForReview = (qId: string) => {
    setFlaggedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const handleSubmitExam = () => {
    setIsExamSubmitted(true);
    setShowScoreModal(true);
  };

  // Calculate score & domain stats
  const scoreResults = useMemo(() => {
    let correctCount = 0;
    const domainStats: Record<string, { total: number; correct: number }> = {};

    examData.domains.forEach((d) => {
      domainStats[d] = { total: 0, correct: 0 };
    });

    examData.questions.forEach((q) => {
      if (!domainStats[q.domain]) {
        domainStats[q.domain] = { total: 0, correct: 0 };
      }
      domainStats[q.domain].total += 1;

      const userAns = (userAnswers[q.id] || []).sort().join(",");
      const correctAns = [...q.correctAnswers].sort().join(",");
      if (userAns === correctAns && userAns !== "") {
        correctCount += 1;
        domainStats[q.domain].correct += 1;
      }
    });

    const percent = Math.round((correctCount / examData.totalQuestions) * 100);
    const passed = percent >= examData.passingScorePercent;

    return {
      correctCount,
      totalCount: examData.totalQuestions,
      percent,
      passed,
      domainStats,
    };
  }, [examData, userAnswers]);

  // Format timer
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const answeredCount = Object.keys(userAnswers).filter(
    (k) => userAnswers[k] && userAnswers[k].length > 0
  ).length;

  return (
    <div className="min-h-screen bg-background text-foreground select-none pb-24">
      <SEO
        title={`${examData.title} Practice Questions & Simulator | Yatri Cloud`}
        description={`Interactive practice questions and mock exam simulator for ${examData.title}. Real questions, instant answer keys, and comprehensive explanations.`}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Practice Exams", url: "/examdumps" },
          { name: examData.title, url: `/examdumps/practice/${slug || "redis"}` },
        ]}
        jsonLd={buildQuizSchema(
          examData.title,
          `Practice questions for ${examData.title} certification with instant validation.`,
          examData.totalQuestions
        )}
      />

      <Navbar />

      <main className="pt-24 px-4 max-w-7xl mx-auto">
        {/* Top Header Bar */}
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-border/80">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              asChild
              className="h-10 w-10 rounded-xl"
            >
              <Link to="/examdumps">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2.5 py-1 rounded-md shadow-2xs">
                  {examData.provider}
                </span>
                <span className="text-xs font-semibold text-muted-foreground font-mono">
                  {examData.examCode}
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Verified Questions
                </span>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight mt-1.5">
                {examData.title}
              </h1>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
            <div className="inline-flex rounded-xl bg-muted p-1 border border-border">
              <button
                type="button"
                onClick={() => { setMode("study"); resetExam(); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === "study"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Study Mode
              </button>
              <button
                type="button"
                onClick={() => { setMode("exam"); resetExam(); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === "exam"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Mock Exam
              </button>
            </div>

            {mode === "exam" && !isExamSubmitted && (
              <div className="flex items-center bg-muted text-foreground px-3.5 py-2 rounded-xl border border-border text-sm font-mono font-bold">
                Time: {formatTime(secondsRemaining)}
              </div>
            )}
          </div>
        </div>

        {/* Study Mode Filter Bar */}
        {mode === "study" && (
          <div className="mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 md:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => { setSelectedDomain("All"); setCurrentIndex(0); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all border ${
                  selectedDomain === "All"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card text-foreground/80 border-border hover:bg-primary hover:text-primary-foreground hover:border-primary"
                }`}
              >
                All Domains ({examData.totalQuestions})
              </button>
              {examData.domains.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setSelectedDomain(d); setCurrentIndex(0); }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all border ${
                    selectedDomain === d
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card text-foreground/80 border-border hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); }}
                placeholder="Search questions…"
                className="h-9 pl-9 text-xs rounded-xl"
              />
            </div>
          </div>
        )}

        {/* Main Grid: Question Canvas & Minimal Palette */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Question View Column */}
          <div className="lg:col-span-8 space-y-6">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-24 border border-border rounded-2xl bg-card p-8">
                <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold">No questions found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Try changing your domain filter or search query.
                </p>
                <Button
                  onClick={() => { setSelectedDomain("All"); setSearchQuery(""); setReviewMistakesOnly(false); }}
                  className="mt-4 rounded-xl bg-primary text-primary-foreground shadow-inset-btn"
                >
                  Reset Filters
                </Button>
              </div>
            ) : currentQuestion ? (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="rounded-2xl border border-border/80 bg-card p-6 md:p-8 shadow-xs relative"
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-bold text-primary-foreground bg-primary px-3 py-1 rounded-lg shadow-2xs">
                        Q{currentQuestion.questionNumber} of {examData.totalQuestions}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {currentQuestion.domain}
                      </span>
                      {currentQuestion.chooseCount > 1 && (
                        <span className="text-xs font-bold text-foreground bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                          Choose {currentQuestion.chooseCount} answers
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleBookmark(currentQuestion.id)}
                    className={`h-8 w-8 rounded-lg ${
                      bookmarkedIds.has(currentQuestion.id) ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
                    }`}
                    aria-label="Bookmark question"
                  >
                    <Bookmark className="h-4 w-4" />
                  </Button>
                </div>

                {/* Question Title */}
                <h2 className="text-lg md:text-xl font-bold leading-relaxed text-foreground mb-4">
                  {currentQuestion.title}
                </h2>

                {/* Code Block if present */}
                {currentQuestion.codeSnippet && (
                  <div className="my-4 rounded-xl border border-border/70 bg-[#0d1117] text-slate-100 p-4 font-mono text-xs overflow-x-auto leading-relaxed">
                    <pre>
                      <code>{currentQuestion.codeSnippet}</code>
                    </pre>
                  </div>
                )}

                {currentQuestion.leadInText && (
                  <p className="text-sm text-foreground/90 font-medium my-3">
                    {currentQuestion.leadInText}
                  </p>
                )}

                {/* Options List */}
                <div className="space-y-3 mt-6">
                  {currentQuestion.options.map((opt) => {
                    const isSelected = (userAnswers[currentQuestion.id] || []).includes(opt.letter);
                    const isCorrect = currentQuestion.correctAnswers.includes(opt.letter);
                    const isRevealed =
                      mode === "study"
                        ? !!revealedAnswers[currentQuestion.id]
                        : isExamSubmitted;

                    let cardStyle = "border-border/80 bg-card text-foreground hover:border-primary/50";
                    let badgeStyle = "border border-border bg-muted/60 text-muted-foreground font-bold";

                    if (isSelected) {
                      cardStyle = "border-primary bg-primary text-primary-foreground font-medium shadow-xs";
                      badgeStyle = "bg-white text-primary font-extrabold border-white shadow-2xs";
                    }

                    if (isRevealed) {
                      if (isCorrect) {
                        cardStyle = "border-emerald-600 bg-emerald-600 text-white font-medium shadow-xs";
                        badgeStyle = "bg-white text-emerald-700 font-extrabold border-white shadow-2xs";
                      } else if (isSelected && !isCorrect) {
                        cardStyle = "border-rose-600 bg-rose-600 text-white font-medium shadow-xs";
                        badgeStyle = "bg-white text-rose-700 font-extrabold border-white shadow-2xs";
                      }
                    }

                    return (
                      <div
                        key={opt.letter}
                        onClick={() => {
                          if (!isExamSubmitted) handleSelectOption(opt.letter);
                        }}
                        className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer ${cardStyle}`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs transition-all ${badgeStyle}`}
                        >
                          {opt.letter}
                        </span>
                        <div className="flex-1 text-sm leading-relaxed pt-0.5">
                          {opt.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Study Mode: Reveal Answer Toggle */}
                {mode === "study" && (
                  <div className="mt-6 pt-5 border-t border-border/80 flex flex-col gap-3">
                    <Button
                      onClick={() => {
                        setRevealedAnswers((prev) => ({
                          ...prev,
                          [currentQuestion.id]: !prev[currentQuestion.id],
                        }));
                      }}
                      className={`w-full sm:w-auto font-semibold rounded-xl min-h-[42px] transition ${
                        revealedAnswers[currentQuestion.id]
                          ? "bg-card text-foreground border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary"
                          : "bg-primary text-primary-foreground shadow-inset-btn hover:bg-brand-600"
                      }`}
                    >
                      {revealedAnswers[currentQuestion.id]
                        ? "Hide Answer & Explanation"
                        : "Show Correct Answer"}
                    </Button>

                    <AnimatePresence>
                      {revealedAnswers[currentQuestion.id] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="rounded-xl bg-card border border-border p-4 text-xs space-y-2 mt-2 shadow-xs"
                        >
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">
                            Correct Answer: {currentQuestion.correctAnswers.join(", ")}
                          </div>
                          <p className="text-foreground/90 leading-relaxed">
                            {currentQuestion.explanation}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Exam Mode Feedback after Submission */}
                {mode === "exam" && isExamSubmitted && (
                  <div className="mt-6 pt-5 border-t border-border/80">
                    <div className="rounded-xl bg-card border border-border p-4 text-xs space-y-2">
                      <div className="font-bold text-foreground">
                        Correct Answer:{" "}
                        <span className="text-emerald-600 font-extrabold">
                          {currentQuestion.correctAnswers.join(", ")}
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : null}

            {/* Bottom Navigation Controls */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <Button
                variant="outline"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="rounded-xl font-semibold min-h-[44px] border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition"
              >
                <ChevronLeft className="h-4 w-4 mr-1.5" /> Previous
              </Button>

              {mode === "exam" && !isExamSubmitted && currentQuestion && (
                <Button
                  variant="outline"
                  onClick={() => toggleFlagForReview(currentQuestion.id)}
                  className={`rounded-xl text-xs font-semibold border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition ${
                    flaggedForReview.has(currentQuestion.id)
                      ? "border-amber-500 text-amber-700 bg-amber-500/10"
                      : ""
                  }`}
                >
                  <Bookmark className="h-3.5 w-3.5 mr-1.5" />
                  {flaggedForReview.has(currentQuestion.id) ? "Flagged" : "Flag for Review"}
                </Button>
              )}

              {currentIndex < filteredQuestions.length - 1 ? (
                <Button
                  onClick={() =>
                    setCurrentIndex((prev) => Math.min(filteredQuestions.length - 1, prev + 1))
                  }
                  className="rounded-xl font-semibold bg-primary text-primary-foreground shadow-inset-btn hover:bg-brand-600 min-h-[44px]"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1.5" />
                </Button>
              ) : mode === "exam" && !isExamSubmitted ? (
                <Button
                  onClick={handleSubmitExam}
                  className="rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md min-h-[44px]"
                >
                  Submit Exam
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex(0)}
                  className="rounded-xl font-semibold"
                >
                  Back to Q1
                </Button>
              )}
            </div>
          </div>

          {/* Minimal Clean Question Palette */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs sticky top-28">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Questions</h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {answeredCount} / {examData.totalQuestions}
                </span>
              </div>

              {/* Minimal Numbers Grid */}
              <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-6 gap-1.5 max-h-[380px] overflow-y-auto pr-1">
                {examData.questions.map((q, idx) => {
                  const isAnswered = userAnswers[q.id] && userAnswers[q.id].length > 0;
                  const isFlagged = flaggedForReview.has(q.id);
                  const isCurrent = currentQuestion && currentQuestion.id === q.id;

                  let btnStyle = "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent";
                  if (isAnswered) {
                    btnStyle = "bg-primary text-primary-foreground font-bold border-primary";
                  }
                  if (isFlagged) {
                    btnStyle = "bg-amber-500 text-white font-bold border-amber-600";
                  }
                  if (isCurrent) {
                    btnStyle += " ring-2 ring-foreground ring-offset-1 text-foreground font-bold";
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setSelectedDomain("All");
                        setSearchQuery("");
                        setReviewMistakesOnly(false);
                        const matchIdx = examData.questions.findIndex((item) => item.id === q.id);
                        if (matchIdx !== -1) setCurrentIndex(matchIdx);
                      }}
                      className={`h-8 w-full rounded-md text-xs font-medium transition-all flex items-center justify-center ${btnStyle}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Action in Exam Mode */}
              {mode === "exam" && !isExamSubmitted && (
                <div className="mt-4 pt-3 border-t border-border">
                  <Button
                    onClick={handleSubmitExam}
                    className="w-full rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md min-h-[40px]"
                  >
                    Submit Exam ({answeredCount}/{examData.totalQuestions})
                  </Button>
                </div>
              )}

              {/* Result Summary in Exam Mode when Submitted */}
              {mode === "exam" && isExamSubmitted && (
                <div className="mt-4 pt-3 border-t border-border space-y-2">
                  <div className="text-center p-2.5 rounded-xl bg-muted/60">
                    <div className="text-xl font-bold font-display">
                      {scoreResults.percent}%
                    </div>
                    <div className="text-xs font-semibold mt-0.5">
                      {scoreResults.passed ? (
                        <span className="text-emerald-600">Passed (≥{examData.passingScorePercent}%)</span>
                      ) : (
                        <span className="text-rose-600">Failed (&lt;{examData.passingScorePercent}%)</span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setReviewMistakesOnly(!reviewMistakesOnly);
                      setCurrentIndex(0);
                    }}
                    className="w-full text-xs font-semibold rounded-xl"
                  >
                    {reviewMistakesOnly ? "Show All Questions" : "Review Incorrect Answers"}
                  </Button>

                  <Button
                    onClick={resetExam}
                    className="w-full text-xs font-semibold rounded-xl bg-primary text-primary-foreground shadow-inset-btn"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Retake Mock Exam
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Score Modal on Exam Submission */}
      <Dialog open={showScoreModal} onOpenChange={setShowScoreModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-primary">
              {scoreResults.passed ? (
                <Trophy className="h-7 w-7 text-emerald-600" />
              ) : (
                <Award className="h-7 w-7 text-amber-600" />
              )}
            </div>
            <DialogTitle className="text-center text-2xl font-bold font-display">
              {scoreResults.passed ? "Congratulations! You Passed!" : "Exam Completed"}
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              You scored{" "}
              <strong className="text-foreground">
                {scoreResults.correctCount} / {scoreResults.totalCount} ({scoreResults.percent}%)
              </strong>
              . Passing requirement is {examData.passingScorePercent}%.
            </DialogDescription>
          </DialogHeader>

          {/* Domain Breakdown */}
          <div className="space-y-2.5 my-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Performance by Domain
            </h4>
            {Object.entries(scoreResults.domainStats).map(([dom, stats]) => {
              const domPercent = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
              return (
                <div key={dom} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="truncate pr-2">{dom}</span>
                    <span className="font-mono font-bold">
                      {stats.correct}/{stats.total} ({domPercent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        domPercent >= examData.passingScorePercent ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${domPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowScoreModal(false);
                setReviewMistakesOnly(true);
                setCurrentIndex(0);
              }}
              className="w-full rounded-xl"
            >
              Review Mistakes
            </Button>
            <Button
              onClick={() => setShowScoreModal(false)}
              className="w-full rounded-xl bg-primary text-primary-foreground shadow-inset-btn"
            >
              Review All Answers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
