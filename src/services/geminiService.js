const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in environment variables");
}

console.log(
  "[AI] Gemini key loaded:",
  process.env.GEMINI_API_KEY.slice(0, 8) + "..."
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

/**
 * Generates content using Gemini API with a structured prompt
 * @param {string} prompt 
 * @returns {Promise<string>}
 */
const generateContent = async (prompt) => {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Clean up JSON if Gemini wraps it in markdown blocks
    text = text.replace(/```json|```/g, '').trim();
    return text;
  } catch (error) {
    console.error("[GEMINI] Error generating content:", error);
    throw error;
  }
};

module.exports = {
  generateContent
};
