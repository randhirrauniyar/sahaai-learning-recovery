import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from pydantic import BaseModel


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not configured."
    )


# ============================================================
# GEMINI CLIENT
# ============================================================

client = genai.Client(
    api_key=API_KEY
)


# ============================================================
# CURRICULUM KNOWLEDGE BASE
# ============================================================

CURRICULUM_FILE = (
    Path(__file__).parent
    / "curriculum"
    / "grade2_mathematics.json"
)


def load_curriculum():

    try:

        with open(
            CURRICULUM_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            return json.load(file)

    except FileNotFoundError:

        raise RuntimeError(
            "Curriculum file was not found: "
            f"{CURRICULUM_FILE}"
        )

    except json.JSONDecodeError:

        raise RuntimeError(
            "Curriculum JSON file contains invalid JSON."
        )


curriculum = load_curriculum()


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="SahaAI AI Engine"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://sahaai-learning-recovery.web.app",
        "https://sahaai-learning-recovery.firebaseapp.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REQUEST MODEL
# ============================================================

class RecoveryRequest(BaseModel):

    student_name: str
    grade: str
    subject: str
    missed_lesson: str


# ============================================================
# ROOT / HEALTH CHECK
# ============================================================

@app.get("/")
def root():

    return {
        "message": "SahaAI AI Engine is running"
    }


# ============================================================
# CURRICULUM LESSON RETRIEVAL
# ============================================================

def get_lesson_context(lesson_name):

    for lesson in curriculum.get(
        "lessons",
        []
    ):

        curriculum_lesson = (
            lesson.get(
                "lesson",
                ""
            )
            .strip()
            .lower()
        )

        requested_lesson = (
            lesson_name
            .strip()
            .lower()
        )

        if curriculum_lesson == requested_lesson:

            return lesson

    return None


# ============================================================
# GENERATE AI RECOVERY PLAN
# ============================================================

@app.post("/generate-recovery")
def generate_recovery(
    request: RecoveryRequest
):

    # --------------------------------------------------------
    # RETRIEVE LESSON FROM CURRICULUM
    # --------------------------------------------------------

    lesson_context = get_lesson_context(
        request.missed_lesson
    )

    if not lesson_context:

        raise HTTPException(
            status_code=404,
            detail=(
                "Selected lesson was not found "
                "in the curriculum knowledge base."
            )
        )


    # --------------------------------------------------------
    # CONVERT CURRICULUM TO JSON CONTEXT
    # --------------------------------------------------------

    curriculum_context = json.dumps(
        lesson_context,
        indent=2,
        ensure_ascii=False
    )


    # --------------------------------------------------------
    # AI PROMPT
    # --------------------------------------------------------

    prompt = f"""
You are the AI learning-recovery engine for SahaAI.

Your job is to help a teacher support a student who
missed a classroom lesson.

Student:
{request.student_name}

Grade:
{request.grade}

Subject:
{request.subject}

Selected Lesson:
{request.missed_lesson}


============================================================
CURRICULUM KNOWLEDGE BASE
============================================================

The following information was retrieved from SahaAI's
curriculum knowledge base for the selected lesson.

Use this curriculum information as the PRIMARY grounding
source for the recovery plan.

Do not introduce unrelated concepts.

CURRICULUM DATA:

{curriculum_context}


============================================================
TASK
============================================================

Generate a short, age-appropriate learning recovery plan
for the student.

The recovery plan should help the student understand the
missed lesson without requiring the teacher to stop the
entire classroom lesson.


============================================================
REQUIRED JSON FORMAT
============================================================

The response MUST be valid JSON.

Use exactly this structure:

{{
  "student": "student name",
  "missed_lesson": "lesson",
  "missed_concepts": [
    "concept 1",
    "concept 2"
  ],
  "prerequisites": [
    "prerequisite 1",
    "prerequisite 2"
  ],
  "learning_steps": [
    {{
      "step": 1,
      "title": "short title",
      "description": "simple explanation"
    }}
  ],
  "practice_questions": [
    {{
      "question": "question",
      "options": [
        "A",
        "B",
        "C",
        "D"
      ],
      "answer": "correct option"
    }}
  ],
  "teacher_note": "short teacher-facing recommendation"
}}


============================================================
RULES
============================================================

1. Keep the content appropriate for the student's grade.

2. Use simple language suitable for a Grade 2 student.

3. Stay focused on the selected lesson.

4. Use the provided curriculum data as the primary
   source of concepts, prerequisites, objectives and
   activities.

5. Do not invent unrelated curriculum topics.

6. Create 3 to 5 learning steps.

7. Create exactly 3 practice questions.

8. Each practice question must have exactly 4 options.

9. The answer field must contain the exact correct option.

10. Practice questions must test concepts covered in the
    recovery steps.

11. The teacher note should identify whether the student
    may need additional support.

12. Keep the recovery pathway short and practical.

13. Return JSON only.

14. Do not return Markdown.

15. Do not include ```json or ``` around the response.
"""


    # ========================================================
    # GEMINI REQUEST WITH FALLBACK
    # ========================================================

    models_to_try = [
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite"
    ]

    response = None
    successful_model = None
    last_error = None


    for model_name in models_to_try:

        try:

            print(
                "----------------------------------------"
            )

            print(
                f"Trying Gemini model: {model_name}"
            )

            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )

            successful_model = model_name

            print(
                f"Gemini success: {model_name}"
            )

            print(
                "----------------------------------------"
            )

            break


        except Exception as error:

            last_error = error

            print(
                f"Gemini model failed: {model_name}"
            )

            print(
                f"Error type: {type(error).__name__}"
            )

            print(
                f"Error: {str(error)}"
            )

            print(
                "Trying next model..."
            )


    # --------------------------------------------------------
    # IF ALL MODELS FAILED
    # --------------------------------------------------------

    if response is None:

        print(
            "========================================"
        )

        print(
            "ALL GEMINI MODELS FAILED"
        )

        print(
            f"Last error: {str(last_error)}"
        )

        print(
            "========================================"
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "Gemini AI service is temporarily "
                "unavailable. Please try again."
            )
        )


    # ========================================================
    # READ GEMINI RESPONSE
    # ========================================================

    try:

        raw_text = response.text.strip()

    except Exception as error:

        print(
            "Unable to read Gemini response."
        )

        print(
            str(error)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to read the AI response."
            )
        )


    # --------------------------------------------------------
    # LOG MODEL USED
    # --------------------------------------------------------

    print(
        f"AI model used: {successful_model}"
    )


    # ========================================================
    # REMOVE MARKDOWN CODE FENCES
    # ========================================================

    if raw_text.startswith("```"):

        raw_text = raw_text.replace(
            "```json",
            ""
        )

        raw_text = raw_text.replace(
            "```",
            ""
        )

        raw_text = raw_text.strip()


    # ========================================================
    # CONVERT AI RESPONSE TO JSON
    # ========================================================

    try:

        result = json.loads(
            raw_text
        )

    except json.JSONDecodeError:

        print(
            "========== JSON ERROR =========="
        )

        print(
            "Gemini returned:"
        )

        print(
            raw_text
        )

        print(
            "================================"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "AI returned an invalid structured response."
            )
        )


    # ========================================================
    # BASIC RESPONSE VALIDATION
    # ========================================================

    required_fields = [
        "student",
        "missed_lesson",
        "missed_concepts",
        "prerequisites",
        "learning_steps",
        "practice_questions",
        "teacher_note"
    ]


    missing_fields = [
        field
        for field in required_fields
        if field not in result
    ]


    if missing_fields:

        raise HTTPException(
            status_code=500,
            detail=(
                "AI response is missing required fields: "
                + ", ".join(missing_fields)
            )
        )


    # ========================================================
    # VALIDATE LEARNING STEPS
    # ========================================================

    if not isinstance(
        result["learning_steps"],
        list
    ):

        raise HTTPException(
            status_code=500,
            detail=(
                "AI learning_steps must be a list."
            )
        )


    if not (
        3 <= len(result["learning_steps"]) <= 5
    ):

        raise HTTPException(
            status_code=500,
            detail=(
                "AI must generate between "
                "3 and 5 learning steps."
            )
        )


    # ========================================================
    # VALIDATE PRACTICE QUESTIONS
    # ========================================================

    if not isinstance(
        result["practice_questions"],
        list
    ):

        raise HTTPException(
            status_code=500,
            detail=(
                "AI practice_questions "
                "must be a list."
            )
        )


    if len(result["practice_questions"]) != 3:

        raise HTTPException(
            status_code=500,
            detail=(
                "AI must generate exactly "
                "3 practice questions."
            )
        )


    # ========================================================
    # VALIDATE EACH QUESTION
    # ========================================================

    for question in result["practice_questions"]:

        if not isinstance(
            question,
            dict
        ):

            raise HTTPException(
                status_code=500,
                detail=(
                    "Invalid practice question format."
                )
            )


        if "question" not in question:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Practice question is missing "
                    "'question'."
                )
            )


        if "options" not in question:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Practice question is missing "
                    "'options'."
                )
            )


        if "answer" not in question:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Practice question is missing "
                    "'answer'."
                )
            )


        if not isinstance(
            question["options"],
            list
        ):

            raise HTTPException(
                status_code=500,
                detail=(
                    "Practice question options "
                    "must be a list."
                )
            )


        if len(question["options"]) != 4:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Each practice question must "
                    "have exactly 4 options."
                )
            )


        if question["answer"] not in question["options"]:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Practice question answer "
                    "must match one of its options."
                )
            )


    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    result["_ai_model"] = successful_model

    return result
# ============================================================
# CLOUD RUN STARTUP
# ============================================================

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
    )