import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  LinearProgress,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import quizData from "./dummydata.json";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Answer {
  id: number;
  text: string;
  order: number;
}

interface Question {
  id: number;
  text: string;
  mandatory: boolean;
  randomizeAnswerOrder: boolean;
  answers: Answer[];
}

interface QuizResponse {
  questionId: number;
  answerId: number;
  answerOrder: number;
}

interface TypePercentage {
  type: number;
  label: string;
  percentage: number;
  count: number;
  color: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPERAMENT_LABELS: Record<number, string> = {
  1: "Melancólico",
  2: "Sanguíneo",
  3: "Colérico",
  4: "Fleumático",
};

const TEMPERAMENT_COLORS: Record<number, string> = {
  1: "#7C3AED",
  2: "#F59E0B",
  3: "#EF4444",
  4: "#10B981",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const BG = "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)";

// ─── Component ────────────────────────────────────────────────────────────────

const QuizHomePage: React.FC = () => {
  const questions: Question[] = quizData.questions as Question[];
  const totalQuestions = questions.length;

  const shuffledQuestions = useMemo(
    () => questions.map((q) => ({ ...q, answers: shuffleArray(q.answers) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, Answer>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [results, setResults] = useState<{
    responses: QuizResponse[];
    percentages: TypePercentage[];
  } | null>(null);

  // Ref keeps selectedAnswers fresh inside the keyboard effect closure
  const selectedAnswersRef = useRef(selectedAnswers);
  useEffect(() => { selectedAnswersRef.current = selectedAnswers; }, [selectedAnswers]);

  const currentQuestion = shuffledQuestions[currentIndex];
  const selectedAnswer = selectedAnswers[currentQuestion?.id];
  const progress = ((currentIndex + (selectedAnswer ? 1 : 0)) / totalQuestions) * 100;

  // ─── Actions ──────────────────────────────────────────────────────────────

  const selectAnswer = (answer: Answer) => {
    setSelectedAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));
  };

  const goBack = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const finishQuiz = (snapshot: Record<number, Answer>) => {
    const responses: QuizResponse[] = questions.map((q) => {
      const chosen = snapshot[q.id];
      return { questionId: q.id, answerId: chosen.id, answerOrder: chosen.order };
    });

    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    responses.forEach(({ answerOrder }) => {
      counts[answerOrder] = (counts[answerOrder] || 0) + 1;
    });

    const percentages: TypePercentage[] = [1, 2, 3, 4].map((type) => ({
      type,
      label: TEMPERAMENT_LABELS[type],
      count: counts[type],
      percentage: Math.round((counts[type] / totalQuestions) * 100),
      color: TEMPERAMENT_COLORS[type],
    }));

    console.group("🧠 Quiz Finalizado");
    console.log("📋 Respostas (formato dummyquizresponse.json):");
    console.log(JSON.stringify(responses, null, 2));
    console.log("\n📊 Percentuais por Temperamento:");
    percentages.forEach(({ label, count, percentage }) => {
      console.log(`  ${label}: ${count}/${totalQuestions} → ${percentage}%`);
    });
    console.groupEnd();

    setResults({ responses, percentages });
    setIsFinished(true);
  };

  const goNext = (answersSnapshot: Record<number, Answer>) => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      finishQuiz(answersSnapshot);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setIsFinished(false);
    setResults(null);
  };

  // ─── Keyboard Navigation ──────────────────────────────────────────────────
  // 1–4   → select answer by position
  // Enter / → → advance (or finish)
  // ←         → go back

  useEffect(() => {
    if (isFinished) return;

    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in an input
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 4) {
        const answer = currentQuestion.answers[num - 1];
        if (answer) {
          setSelectedAnswers((prev) => {
            const next = { ...prev, [currentQuestion.id]: answer };
            selectedAnswersRef.current = next;
            return next;
          });
        }
      }

      if (e.key === "Enter" || e.key === "ArrowRight") {
        const current = selectedAnswersRef.current[currentQuestion.id];
        if (!current) return;
        goNext(selectedAnswersRef.current);
      }

      if (e.key === "ArrowLeft") {
        goBack();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished, currentQuestion, currentIndex, totalQuestions]);

  // ─── Results Screen ────────────────────────────────────────────────────────

  if (isFinished && results) {
    const sorted = [...results.percentages].sort((a, b) => b.percentage - a.percentage);
    const dominant = sorted[0];
    const sub = sorted[1];

    return (
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          background: BG,
          overflowY: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 4,
          px: 2,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 720 }}>
          <Box
            sx={{
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 4,
              p: { xs: 3, sm: 5 },
              color: "#fff",
            }}
          >
            <Box textAlign="center" mb={4}>
              <CheckCircleOutlineIcon sx={{ fontSize: 64, color: dominant.color, mb: 1 }} />
              <Typography
                sx={{ color: "#fff", fontWeight: 700, fontSize: "clamp(1.5rem, 3vw, 2rem)", mb: 1 }}
              >
                Resultado
              </Typography>
              <Typography sx={{ opacity: 0.65, fontSize: "clamp(0.85rem, 1.5vw, 1rem)", mb: 2 }}>
                Seu perfil de temperamento
              </Typography>

              <Box display="flex" justifyContent="center" alignItems="center" gap={2} flexWrap="wrap">
                <Box textAlign="center">
                  <Typography variant="caption" sx={{ opacity: 0.5, display: "block", mb: 0.5 }}>
                    Temperamento
                  </Typography>
                  <Chip
                    label={dominant.label}
                    sx={{ fontSize: "0.95rem", fontWeight: 700, px: 2, height: 36, backgroundColor: dominant.color, color: "#fff" }}
                  />
                </Box>
                <Typography sx={{ opacity: 0.3, fontSize: "1.5rem", mt: 2.5 }}>+</Typography>
                <Box textAlign="center">
                  <Typography variant="caption" sx={{ opacity: 0.5, display: "block", mb: 0.5 }}>
                    Subtemperamento
                  </Typography>
                  <Chip
                    label={sub.label}
                    variant="outlined"
                    sx={{ fontSize: "0.95rem", fontWeight: 700, px: 2, height: 36, borderColor: sub.color, borderWidth: 2, color: sub.color }}
                  />
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              {sorted.map(({ type, label, percentage, color }) => (
                <Box key={type}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography sx={{ fontWeight: 600, fontSize: "clamp(0.82rem, 1.2vw, 0.95rem)" }}>
                      {label}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, color, fontSize: "clamp(0.82rem, 1.2vw, 0.95rem)" }}>
                      {percentage}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={percentage}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: "rgba(255,255,255,0.08)",
                      "& .MuiLinearProgress-bar": { borderRadius: 5, backgroundColor: color },
                    }}
                  />
                </Box>
              ))}
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={handleRestart}
              sx={{
                mt: 4, py: 1.5, borderRadius: 3, fontWeight: 700,
                fontSize: "clamp(0.85rem, 1.2vw, 1rem)",
                background: "linear-gradient(90deg, #7C3AED, #3B82F6)",
                "&:hover": { background: "linear-gradient(90deg, #6D28D9, #2563EB)" },
              }}
            >
              Refazer Quiz
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  // ─── Quiz Screen ───────────────────────────────────────────────────────────
  //
  // Layout strategy:
  //   • position: fixed + inset: 0          → zero body overflow
  //   • Container is a flex column          → fills full height
  //   • Card: flex: 1 + minHeight: 0        → takes remaining space after header/nav/dots
  //   • Answers area: flex col              → each of the 4 buttons gets flex: 1 (equal height)
  //   • No hard-coded pixel heights         → adapts to any viewport
  //
  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        background: BG,
        display: "flex",
        alignItems: "stretch",
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          display: "flex",
          flexDirection: "column",
          py: { xs: 1.5, sm: 2 },
          overflow: "hidden",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <Box textAlign="center" mb={{ xs: 0.75, sm: 1 }} flexShrink={0}>
          <Typography
            sx={{
              color: "rgba(255,255,255,0.4)",
              letterSpacing: 3,
              fontSize: "clamp(0.6rem, 0.8vw, 0.72rem)",
              textTransform: "uppercase",
            }}
          >
            Questionário de Temperamento
          </Typography>
        </Box>

        {/* ── Progress ────────────────────────────────────────────────── */}
        <Box mb={{ xs: 0.75, sm: 1 }} flexShrink={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(0.65rem, 0.9vw, 0.78rem)" }}>
              Questão {currentIndex + 1} de {totalQuestions}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(0.65rem, 0.9vw, 0.78rem)" }}>
              {Math.round(progress)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.08)",
              "& .MuiLinearProgress-bar": {
                borderRadius: 2,
                background: "linear-gradient(90deg, #7C3AED, #3B82F6)",
              },
            }}
          />
        </Box>

        {/* ── Card (flex: 1 → fills all remaining vertical space) ─────── */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            background: "rgba(255,255,255,0.055)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          {/* Question header — visually prominent, larger than answer text */}
          <Box
            sx={{
              flexShrink: 0,
              px: { xs: 2.5, sm: 4 },
              py: { xs: 1.75, sm: 2.5 },
              background: "linear-gradient(180deg, rgba(124,58,237,0.14) 0%, rgba(124,58,237,0.04) 100%)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            {/* Question number pill */}
            <Box
              sx={{
                flexShrink: 0,
                width: { xs: 28, sm: 32 },
                height: { xs: 28, sm: 32 },
                borderRadius: "50%",
                background: "rgba(124,58,237,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "clamp(0.65rem, 1vw, 0.8rem)",
                  lineHeight: 1,
                }}
              >
                {currentIndex + 1}
              </Typography>
            </Box>

            <Typography
              sx={{
                color: "#fff",
                fontWeight: 700,
                lineHeight: 1.45,
                textAlign: "left",
                // Larger than answer text — the key hierarchy
                fontSize: "clamp(0.9rem, 1.4vw + 0.3rem, 1.25rem)",
              }}
              dangerouslySetInnerHTML={{ __html: currentQuestion.text }}
            />
          </Box>

          {/* Answers — flex column, each button gets flex:1 (equal height) */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: { xs: "6px", sm: "8px" },
              p: { xs: "10px 14px", sm: "14px 20px" },
            }}
          >
            {currentQuestion.answers.map((answer, idx) => {
              const isSelected = selectedAnswer?.id === answer.id;
              return (
                <Box
                  key={answer.id}
                  onClick={() => selectAnswer(answer)}
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 1, sm: 1.5 },
                    px: { xs: 1.5, sm: 2 },
                    cursor: "pointer",
                    borderRadius: "12px",
                    border: isSelected
                      ? "2px solid #7C3AED"
                      : "2px solid rgba(255,255,255,0.07)",
                    background: isSelected
                      ? "rgba(124,58,237,0.18)"
                      : "rgba(255,255,255,0.04)",
                    boxShadow: isSelected
                      ? "0 4px 20px rgba(124,58,237,0.28), inset 0 1px 0 rgba(255,255,255,0.12)"
                      : "0 2px 8px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
                    transition:
                      "transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease",
                    userSelect: "none",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: isSelected
                        ? "0 8px 28px rgba(124,58,237,0.38), inset 0 1px 0 rgba(255,255,255,0.18)"
                        : "0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
                      borderColor: isSelected ? "#9D5FFF" : "rgba(255,255,255,0.18)",
                    },
                    "&:active": { transform: "translateY(0px)" },
                  }}
                >
                  {/* Number key badge */}
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: { xs: 24, sm: 28 },
                      height: { xs: 24, sm: 28 },
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isSelected ? "#7C3AED" : "rgba(255,255,255,0.1)",
                      transition: "background 0.18s ease",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "#fff",
                        fontWeight: 700,
                        lineHeight: 1,
                        fontSize: "clamp(0.6rem, 0.9vw, 0.72rem)",
                      }}
                    >
                      {idx + 1}
                    </Typography>
                  </Box>

                  {/* Answer text */}
                  <Typography
                    sx={{
                      color: "#fff",
                      lineHeight: 1.5,
                      flex: 1,
                      textAlign: "justify",
                      // Smaller than question title — clear hierarchy
                      fontSize: "clamp(0.65rem, 0.85vw + 0.25rem, 0.85rem)",
                      // Clamp to 3 lines on very small viewports if needed
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      WebkitLineClamp: 4,
                    }}
                    dangerouslySetInnerHTML={{ __html: answer.text }}
                  />
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* ── Navigation ──────────────────────────────────────────────── */}
        <Box display="flex" gap={1.5} mt={{ xs: 1, sm: 1.5 }} flexShrink={0}>
          <Button
            variant="outlined"
            onClick={goBack}
            disabled={currentIndex === 0}
            sx={{
              flex: 1,
              py: { xs: 1, sm: 1.25 },
              borderRadius: 3,
              fontWeight: 600,
              fontSize: "clamp(0.75rem, 1vw, 0.9rem)",
              color: "rgba(255,255,255,0.65)",
              borderColor: "rgba(255,255,255,0.18)",
              "&:hover": { borderColor: "rgba(255,255,255,0.38)", background: "rgba(255,255,255,0.04)" },
              "&.Mui-disabled": { opacity: 0.22 },
            }}
          >
            ← Voltar
          </Button>
          <Button
            variant="contained"
            onClick={() => goNext(selectedAnswersRef.current)}
            disabled={!selectedAnswer}
            sx={{
              flex: 2.5,
              py: { xs: 1, sm: 1.25 },
              borderRadius: 3,
              fontWeight: 700,
              fontSize: "clamp(0.8rem, 1.1vw, 0.95rem)",
              background: "linear-gradient(90deg, #7C3AED, #3B82F6)",
              "&:hover": { background: "linear-gradient(90deg, #6D28D9, #2563EB)", transform: "translateY(-1px)" },
              "&.Mui-disabled": { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)" },
            }}
          >
            {currentIndex === totalQuestions - 1 ? "Ver Resultado →" : "Próxima →"}
          </Button>
        </Box>

        {/* ── Step dots + keyboard hint ────────────────────────────────── */}
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          mt={{ xs: 0.75, sm: 1 }}
          flexShrink={0}
          gap={0.75}
        >
          <Box display="flex" justifyContent="center" flexWrap="wrap" gap={0.5}>
            {questions.map((_, i) => {
              const answered = selectedAnswers[questions[i].id];
              return (
                <Box
                  key={i}
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    transition: "background 0.3s",
                    backgroundColor:
                      i === currentIndex
                        ? "#7C3AED"
                        : answered
                        ? "rgba(124,58,237,0.45)"
                        : "rgba(255,255,255,0.13)",
                  }}
                />
              );
            })}
          </Box>
          <Typography
            sx={{
              color: "rgba(255,255,255,0.22)",
              fontSize: "clamp(0.55rem, 0.7vw, 0.65rem)",
              letterSpacing: 0.5,
            }}
          >
            Use as teclas <strong>1–4</strong> para selecionar · <strong>Enter</strong> ou <strong>→</strong> para avançar · <strong>←</strong> para voltar
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default QuizHomePage;
