import { useState } from "react";
import "./App.css";

const students = [
  {
    id: 1,
    name: "Aarav Sharma",
    grade: "Grade 2",
    status: "Absent",
  },
  {
    id: 2,
    name: "Diya Patel",
    grade: "Grade 2",
    status: "Present",
  },
  {
    id: 3,
    name: "Rahul Kumar",
    grade: "Grade 2",
    status: "Present",
  },
  {
    id: 4,
    name: "Meera Singh",
    grade: "Grade 2",
    status: "Present",
  },
];

const lessons = [
  "Counting to 100",
  "Addition within 20",
  "Subtraction within 20",
];

function App() {
  const [mode, setMode] = useState("teacher");

  const [selectedStudent, setSelectedStudent] = useState(
    students[0].name
  );

  const [selectedLesson, setSelectedLesson] = useState(
    lessons[0]
  );

  const [recoveryPlan, setRecoveryPlan] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [currentStep, setCurrentStep] = useState(0);

  const [answers, setAnswers] = useState({});

  const [completed, setCompleted] = useState(false);

  const [score, setScore] = useState(0);

  const [recoveryStatus, setRecoveryStatus] = useState("");

  // ============================================================
  // GENERATE RECOVERY PLAN
  // ============================================================

  const generateRecoveryPlan = async () => {
    setLoading(true);
    setError("");
    setRecoveryPlan(null);
    setCurrentStep(0);
    setAnswers({});
    setCompleted(false);
    setScore(0);
    setRecoveryStatus("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/generate-recovery",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_name: selectedStudent,
            grade: "Grade 2",
            subject: "Mathematics",
            missed_lesson: selectedLesson,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to generate recovery plan."
        );
      }

      setRecoveryPlan(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // PRACTICE ANSWER
  // ============================================================

  const selectAnswer = (questionIndex, option) => {
    if (completed) return;

    setAnswers((previous) => ({
      ...previous,
      [questionIndex]: option,
    }));
  };

  // ============================================================
  // CHECK PRACTICE
  // ============================================================

  const checkPractice = () => {
    if (!recoveryPlan) return;

    let correct = 0;

    recoveryPlan.practice_questions.forEach(
      (question, index) => {
        if (answers[index] === question.answer) {
          correct += 1;
        }
      }
    );

    const percentage =
      (correct / recoveryPlan.practice_questions.length) *
      100;

    let status = "";

    if (percentage >= 80) {
      status = "Recovered";
    } else if (percentage >= 50) {
      status = "Improving";
    } else {
      status = "Needs Support";
    }

    setScore(correct);
    setRecoveryStatus(status);
    setCompleted(true);
  };

  // ============================================================
  // START STUDENT MODE
  // ============================================================

  const openStudentMode = () => {
    if (!recoveryPlan) {
      setError(
        "Generate a recovery plan first."
      );
      return;
    }

    setMode("student");
    setCurrentStep(0);
    setAnswers({});
    setCompleted(false);
    setScore(0);
    setRecoveryStatus("");
    setError("");
  };

  // ============================================================
  // BACK TO TEACHER
  // ============================================================

  const openTeacherMode = () => {
    setMode("teacher");
  };

  // ============================================================
  // STUDENT MODE
  // ============================================================

  if (mode === "student" && recoveryPlan) {
    return (
      <div className="app student-app">

        <header className="topbar">
          <div>
            <h1>SahaAI</h1>
            <p>Student Learning Recovery</p>
          </div>

          <button
            className="secondary-button"
            onClick={openTeacherMode}
          >
            ← Teacher Dashboard
          </button>
        </header>

        <main className="student-container">

          <section className="student-hero">
            <div>
              <span className="eyebrow">
                YOUR RECOVERY JOURNEY
              </span>

              <h2>
                Welcome, {recoveryPlan.student}! 👋
              </h2>

              <p>
                Let's catch up on the lesson you missed.
                Learn at your own pace and complete the
                short practice activity.
              </p>
            </div>

            <div className="student-lesson-card">
              <span>Missed Lesson</span>
              <strong>
                {recoveryPlan.missed_lesson}
              </strong>
            </div>
          </section>

          {/* ------------------------------------------------ */}
          {/* PROGRESS BAR */}
          {/* ------------------------------------------------ */}

          <section className="progress-section">

            <div className="progress-header">
              <span>Recovery Progress</span>

              <span>
                {completed
                  ? "Complete"
                  : `${Math.min(
                      currentStep + 1,
                      recoveryPlan.learning_steps.length
                    )} of ${
                      recoveryPlan.learning_steps.length
                    }`}
              </span>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: completed
                    ? "100%"
                    : `${
                        ((currentStep + 1) /
                          (recoveryPlan.learning_steps.length +
                            1)) *
                        100
                      }%`,
                }}
              />
            </div>

          </section>

          {/* ------------------------------------------------ */}
          {/* MISSED CONCEPTS */}
          {/* ------------------------------------------------ */}

          <section className="student-card">

            <div className="section-heading">
              <span className="section-icon">🧠</span>

              <div>
                <h3>What You Missed</h3>

                <p>
                  These are the important ideas from
                  your missed lesson.
                </p>
              </div>
            </div>

            <div className="concept-grid">

              {recoveryPlan.missed_concepts.map(
                (concept, index) => (
                  <div
                    className="concept-card"
                    key={index}
                  >
                    <span>{index + 1}</span>
                    <p>{concept}</p>
                  </div>
                )
              )}

            </div>

          </section>

          {/* ------------------------------------------------ */}
          {/* LEARNING STEP */}
          {/* ------------------------------------------------ */}

          {!completed && (
            <section className="student-card">

              <div className="section-heading">
                <span className="section-icon">📖</span>

                <div>
                  <h3>Learn</h3>

                  <p>
                    Follow each step and understand
                    the idea before moving forward.
                  </p>
                </div>
              </div>

              {recoveryPlan.learning_steps[
                currentStep
              ] && (
                <div className="learning-step">

                  <div className="step-number">
                    {
                      recoveryPlan.learning_steps[
                        currentStep
                      ].step
                    }
                  </div>

                  <div className="step-content">

                    <span className="step-label">
                      STEP{" "}
                      {
                        recoveryPlan.learning_steps[
                          currentStep
                        ].step
                      }
                    </span>

                    <h3>
                      {
                        recoveryPlan.learning_steps[
                          currentStep
                        ].title
                      }
                    </h3>

                    <p>
                      {
                        recoveryPlan.learning_steps[
                          currentStep
                        ].description
                      }
                    </p>

                  </div>

                </div>
              )}

              <div className="navigation-buttons">

                <button
                  className="secondary-button"
                  disabled={currentStep === 0}
                  onClick={() =>
                    setCurrentStep(
                      (step) => step - 1
                    )
                  }
                >
                  ← Previous
                </button>

                {currentStep <
                recoveryPlan.learning_steps.length -
                  1 ? (
                  <button
                    className="primary-button"
                    onClick={() =>
                      setCurrentStep(
                        (step) => step + 1
                      )
                    }
                  >
                    Next Step →
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    onClick={() =>
                      setCurrentStep(
                        recoveryPlan.learning_steps.length
                      )
                    }
                  >
                    Start Practice →
                  </button>
                )}

              </div>

            </section>
          )}

          {/* ------------------------------------------------ */}
          {/* PRACTICE */}
          {/* ------------------------------------------------ */}

          {!completed &&
            currentStep >=
              recoveryPlan.learning_steps.length && (
              <section className="student-card">

                <div className="section-heading">
                  <span className="section-icon">🎯</span>

                  <div>
                    <h3>Practice</h3>

                    <p>
                      Answer these questions to check
                      what you learned.
                    </p>
                  </div>
                </div>

                <div className="practice-list">

                  {recoveryPlan.practice_questions.map(
                    (question, questionIndex) => (
                      <div
                        className="practice-question"
                        key={questionIndex}
                      >

                        <div className="question-number">
                          Question {questionIndex + 1}
                        </div>

                        <h3>
                          {question.question}
                        </h3>

                        <div className="options">

                          {question.options.map(
                            (option, optionIndex) => {

                              const selected =
                                answers[
                                  questionIndex
                                ] === option;

                              return (
                                <button
                                  key={optionIndex}
                                  className={`option ${
                                    selected
                                      ? "selected"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    selectAnswer(
                                      questionIndex,
                                      option
                                    )
                                  }
                                >
                                  <span>
                                    {String.fromCharCode(
                                      65 +
                                        optionIndex
                                    )}
                                  </span>

                                  {option}
                                </button>
                              );
                            }
                          )}

                        </div>

                      </div>
                    )
                  )}

                </div>

                <button
                  className="primary-button full-button"
                  onClick={checkPractice}
                  disabled={
                    Object.keys(answers).length !==
                    recoveryPlan.practice_questions.length
                  }
                >
                  Check My Answers
                </button>

              </section>
            )}

          {/* ------------------------------------------------ */}
          {/* RESULT */}
          {/* ------------------------------------------------ */}

          {completed && (
            <section className="result-card">

              <div className="result-icon">
                {recoveryStatus === "Recovered"
                  ? "🎉"
                  : recoveryStatus === "Improving"
                  ? "🌱"
                  : "💪"}
              </div>

              <span className="eyebrow">
                RECOVERY CHECK
              </span>

              <h2>
                {recoveryStatus === "Recovered"
                  ? "Great job!"
                  : recoveryStatus === "Improving"
                  ? "You're making progress!"
                  : "Let's keep practicing!"}
              </h2>

              <p>
                You scored{" "}
                <strong>
                  {score}/
                  {
                    recoveryPlan.practice_questions
                      .length
                  }
                </strong>{" "}
                in the recovery check.
              </p>

              <div
                className={`status-badge ${recoveryStatus
                  .toLowerCase()
                  .replace(" ", "-")}`}
              >
                {recoveryStatus}
              </div>

              <div className="teacher-note">

                <strong>
                  Teacher recommendation
                </strong>

                <p>
                  {recoveryPlan.teacher_note}
                </p>

              </div>

              <button
                className="primary-button"
                onClick={openTeacherMode}
              >
                Return to Teacher Dashboard
              </button>

            </section>
          )}

        </main>

      </div>
    );
  }

  // ============================================================
  // TEACHER MODE
  // ============================================================

  return (
    <div className="app">

      <header className="topbar">

        <div>
          <h1>SahaAI</h1>

          <p>
            AI-Powered Learning Recovery
          </p>
        </div>

        {recoveryPlan && (
          <button
            className="student-mode-button"
            onClick={openStudentMode}
          >
            🎓 Open Student Recovery
          </button>
        )}

      </header>

      <main className="container">

        {/* -------------------------------------------------- */}
        {/* PAGE HEADER */}
        {/* -------------------------------------------------- */}

        <section className="page-header">

          <div>

            <span className="eyebrow">
              TEACHER DASHBOARD
            </span>

            <h2>
              Grade 2 Mathematics
            </h2>

            <p>
              Help students recover missed learning
              without stopping the class.
            </p>

          </div>

        </section>

        {/* -------------------------------------------------- */}
        {/* STATISTICS */}
        {/* -------------------------------------------------- */}

        <section className="stats-grid">

          <div className="stat-card">
            <span>👩‍🎓</span>

            <div>
              <strong>24</strong>
              <p>Total Students</p>
            </div>
          </div>

          <div className="stat-card">
            <span>⚠️</span>

            <div>
              <strong>1</strong>
              <p>Needs Recovery</p>
            </div>
          </div>

          <div className="stat-card">
            <span>📚</span>

            <div>
              <strong>3</strong>
              <p>Lessons Available</p>
            </div>
          </div>

          <div className="stat-card">
            <span>🤖</span>

            <div>
              <strong>AI</strong>
              <p>Recovery Engine</p>
            </div>
          </div>

        </section>

        {/* -------------------------------------------------- */}
        {/* STUDENT LIST */}
        {/* -------------------------------------------------- */}

        <section className="dashboard-card">

          <div className="card-header">

            <div>
              <h3>Students</h3>

              <p>
                Monitor attendance and learning
                recovery.
              </p>
            </div>

          </div>

          <div className="student-list">

            {students.map((student) => (

              <div
                className={`student-row ${
                  selectedStudent === student.name
                    ? "active-student"
                    : ""
                }`}
                key={student.id}
              >

                <div className="student-avatar">
                  {student.name.charAt(0)}
                </div>

                <div className="student-info">

                  <strong>
                    {student.name}
                  </strong>

                  <span>
                    {student.grade}
                  </span>

                </div>

                <span
                  className={`attendance ${
                    student.status === "Absent"
                      ? "absent"
                      : "present"
                  }`}
                >
                  {student.status}
                </span>

              </div>

            ))}

          </div>

        </section>

        {/* -------------------------------------------------- */}
        {/* RECOVERY GENERATOR */}
        {/* -------------------------------------------------- */}

        <section className="generator-card">

          <div className="card-header">

            <div>

              <span className="eyebrow">
                AI RECOVERY ENGINE
              </span>

              <h3>
                Generate a Learning Recovery Plan
              </h3>

              <p>
                Select an absent student and the
                lesson they missed.
              </p>

            </div>

            <div className="ai-badge">
              ✨ Gemini AI
            </div>

          </div>

          <div className="form-grid">

            <div className="form-group">

              <label>
                Student
              </label>

              <select
                value={selectedStudent}
                onChange={(event) =>
                  setSelectedStudent(
                    event.target.value
                  )
                }
              >

                {students
                  .filter(
                    (student) =>
                      student.status === "Absent"
                  )
                  .map((student) => (
                    <option
                      key={student.id}
                      value={student.name}
                    >
                      {student.name}
                    </option>
                  ))}

              </select>

            </div>

            <div className="form-group">

              <label>
                Missed Lesson
              </label>

              <select
                value={selectedLesson}
                onChange={(event) =>
                  setSelectedLesson(
                    event.target.value
                  )
                }
              >

                {lessons.map((lesson) => (
                  <option
                    key={lesson}
                    value={lesson}
                  >
                    {lesson}
                  </option>
                ))}

              </select>

            </div>

          </div>

          <button
            className="primary-button generate-button"
            onClick={generateRecoveryPlan}
            disabled={loading}
          >
            {loading
              ? "Generating Recovery Plan..."
              : "Generate Recovery Plan ✨"}
          </button>

        </section>

        {/* -------------------------------------------------- */}
        {/* ERROR */}
        {/* -------------------------------------------------- */}

        {error && (
          <div className="error-box">
            <strong>
              Something went wrong
            </strong>

            <p>
              {error}
            </p>
          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* AI RECOVERY RESULT */}
        {/* -------------------------------------------------- */}

        {recoveryPlan && (

          <section className="dashboard-card recovery-result">

            <div className="card-header">

              <div>

                <span className="eyebrow">
                  AI RECOVERY PLAN
                </span>

                <h3>
                  {recoveryPlan.student}
                </h3>

                <p>
                  {recoveryPlan.missed_lesson}
                </p>

              </div>

              <div className="status-badge improving">
                Ready
              </div>

            </div>

            <div className="result-grid">

              <div className="result-section">

                <h4>
                  🧠 Missed Concepts
                </h4>

                <ul>
                  {recoveryPlan.missed_concepts.map(
                    (concept, index) => (
                      <li key={index}>
                        {concept}
                      </li>
                    )
                  )}
                </ul>

              </div>

              <div className="result-section">

                <h4>
                  🔑 Prerequisites
                </h4>

                <ul>
                  {recoveryPlan.prerequisites.map(
                    (item, index) => (
                      <li key={index}>
                        {item}
                      </li>
                    )
                  )}
                </ul>

              </div>

            </div>

            <div className="learning-preview">

              <h4>
                📖 Recovery Journey
              </h4>

              <div className="journey-list">

                {recoveryPlan.learning_steps.map(
                  (step) => (

                    <div
                      className="journey-item"
                      key={step.step}
                    >

                      <span>
                        {step.step}
                      </span>

                      <div>

                        <strong>
                          {step.title}
                        </strong>

                        <p>
                          {step.description}
                        </p>

                      </div>

                    </div>

                  )
                )}

              </div>

            </div>

            <div className="teacher-recommendation">

              <strong>
                👩‍🏫 Teacher Recommendation
              </strong>

              <p>
                {recoveryPlan.teacher_note}
              </p>

            </div>

            <button
              className="student-mode-button large"
              onClick={openStudentMode}
            >
              🎓 Open Student Recovery Experience
            </button>

          </section>

        )}

      </main>

      <footer>
        <p>
          SahaAI • AI prepares the recovery plan;
          teachers remain responsible for instructional
          decisions.
        </p>
      </footer>

    </div>
  );
}

export default App;