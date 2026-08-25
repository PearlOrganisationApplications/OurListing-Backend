import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const geminiApiKey = process.env.GOOGLE_GEMINI_KEY;

if (!geminiApiKey) {
  console.error("❌ GOOGLE_GEMINI_KEY is not defined in .env");
  throw new Error("GOOGLE_GEMINI_KEY is not defined in .env");
}

console.log("🔑 Gemini API Key loaded successfully");

const ai = new GoogleGenAI({ apiKey: geminiApiKey });

console.log("✅ Gemini AI initialized successfully");

export default ai;