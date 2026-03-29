const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const DEFAULT_MCQ_QUESTIONS = (teamA, teamB) => [
  { id: 'q1', text: 'WHO WILL WIN THE MATCH?', type: 'options', options: [teamA || 'TEAM A', teamB || 'TEAM B'] },
  { id: 'q2', text: 'WHO WILL WIN THE TOSS?', type: 'options', options: [teamA || 'TEAM A', teamB || 'TEAM B'] },
  { id: 'q3', text: 'WHO WILL BE THE PLAYER OF THE MATCH?', type: 'options', options: ['Player 1', 'Player 2', 'Player 3', 'Player 4'] },
  { id: 'q4', text: 'WHO WILL BE THE TOP RUN SCORER?', type: 'options', options: ['Player A', 'Player B', 'Player C', 'Player D'] },
  { id: 'q5', text: 'WHO WILL TAKE THE MOST WICKETS?', type: 'options', options: ['Bowler A', 'Bowler B', 'Bowler C', 'Bowler D'] },
  { id: 'q6', text: 'HOW MANY SIXES WILL BE HIT IN THE MATCH?', type: 'options', options: ['0-5', '6-10', '11-15', '16+'] },
  { id: 'q7', text: 'MOST SIXES IN THE MATCH?', type: 'options', options: [teamA || 'TEAM A', teamB || 'TEAM B', 'DRAW'] },
  { id: 'q8', text: 'TOTAL RUNS SCORED BY BOTH TEAMS?', type: 'options', options: ['0-300', '301-350', '351-400', '401+'] },
  { id: 'q9', text: 'TOTAL WICKETS FALLEN?', type: 'options', options: ['0-5', '6-10', '11-15', '16+'] },
  { id: 'q10', text: 'TOTAL FOURS IN THE MATCH?', type: 'options', options: ['0-10', '11-20', '21-30', '31+'] },
];

router.post('/generate', authMiddleware, async (req, res) => {
  const { teamA, teamB, format, arenaTier } = req.body;

  if (!GEMINI_API_KEY) {
    console.warn('[AI] Missing GEMINI_API_KEY, returning default questions.');
    return res.json({ questions: DEFAULT_MCQ_QUESTIONS(teamA, teamB) });
  }

  try {
    const prompt = `
      Generate 8-10 cricket prediction questions for a ${arenaTier === 'ipl' ? 'IPL' : format} match between ${teamA} and ${teamB}.
      
      STRICT RULES:
      1. ALL questions MUST be MCQ.
      2. Set "type" to "options" for every question.
      3. REQUIRED QUESTIONS to include:
         - Match Winner (exactly ["${teamA}", "${teamB}"])
         - Toss Winner (exactly ["${teamA}", "${teamB}"])
         - Top Run Scorer (4-6 player names as options)
         - Leading Wicket Taker (4-6 player names as options)
         - Total Sixes (ranges as options, e.g., ["0-5", "6-10", "11-15", "16+"])
      
      Format as JSON array:
      [
        {
          "text": "QUESTION IN UPPERCASE",
          "type": "options",
          "options": ["Option 1", "Option 2", ...]
        }
      ]
      
      Return ONLY the raw JSON array.
    `;

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    let questionsText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    questionsText = questionsText.replace(/```json|```/g, '').trim();

    try {
      let rawQuestions = JSON.parse(questionsText);
      
      // Normalize to MCQ
      let questions = rawQuestions.map((q) => ({
        text: q.text || '',
        type: 'options',
        options: (q.options && q.options.length > 0) ? q.options : []
      }));

      // Ensure Required Questions
      const hasQ = (terms) => questions.some((q) => terms.some(term => q.text.toLowerCase().includes(term)));
      
      if (!hasQ(['win', 'winner']) && !hasQ(['match'])) {
        questions.push({ text: "WHO WILL WIN THE MATCH?", type: "options", options: [teamA, teamB] });
      }
      if (!hasQ(['toss'])) {
        questions.push({ text: "WHO WILL WIN THE TOSS?", type: "options", options: [teamA, teamB] });
      }

      // Fix Empty Options & Formatting
      questions = questions.map((q) => {
        const text = q.text.toUpperCase();
        let options = q.options;
        if (!options || options.length === 0) {
          if (text.includes("WIN") || text.includes("TOSS")) {
            options = [teamA, teamB];
          } else {
            options = ["Option A", "Option B", "Option C", "Option D"];
          }
        }
        return { ...q, text, options };
      });

      // Remove Duplicates
      questions = questions.filter((q, index, self) =>
        index === self.findIndex(item => item.text === q.text)
      );

      // Adjust Count (8-10)
      if (questions.length > 10) {
        questions = questions.slice(0, 10);
      }

      // Add final IDs
      const finalQuestions = questions.map((q, idx) => ({
        ...q,
        id: `ai-${Date.now()}-${idx}`
      }));

      return res.json({ success: true, questions: finalQuestions });
    } catch (parseError) {
      console.error('[AI] Parse Error:', parseError, questionsText);
      return res.json({ success: false, questions: DEFAULT_MCQ_QUESTIONS(teamA, teamB), error: 'PARSE_FAILURE' });
    }

  } catch (error) {
    console.error('[AI] Generation Error:', error);
    return res.status(500).json({ 
      success: false, 
      questions: DEFAULT_MCQ_QUESTIONS(teamA, teamB), 
      error: error.message || 'INTERNAL_ERROR' 
    });
  }
});

module.exports = router;
