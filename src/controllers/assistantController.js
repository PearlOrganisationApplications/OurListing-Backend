import ai from "../config/gemini.js";
import { getToolsForRole } from "../ai assistant/toolDefinition.js";
import { executeTool } from "../ai assistant/toolExecutor.js";

function buildSystemPrompt(user) {
  return `You are a helpful real estate assistant for our app.

The current user is logged in with:
- role: ${user.role}
- name: ${user.name}

Answer ONLY using data returned by your tools -- never invent property details,
financial figures, or statuses. Tools are already scoped to what this user is
allowed to see, so you don't need to ask for their ID.

Tailor your tone to their role:
- buyer: helpful property search assistant
- OWNER: focused on their own listings and performance
- BROKER: focused on their leads, assigned properties, and commissions
- LENDER: focused on applications and loan pipeline
- ADMIN: focused on platform-wide stats

If a tool returns no results, say so clearly and suggest a next step rather
than guessing.`;
}

async function runToolLoop(chat, message, userContext, maxIterations = 5) {
  let response = await chat.sendMessage({ message });

  for (let i = 0; i < maxIterations; i++) {
    const functionCalls = response.functionCalls;
    if (!functionCalls || functionCalls.length === 0) {
      return response.text;
    }

    const functionResponseParts = await Promise.all(
      functionCalls.map(async (call) => ({
        functionResponse: {
          name: call.name,
          response: await executeTool(call.name, call.args, userContext),
        },
      }))
    );

    response = await chat.sendMessage({ message: functionResponseParts });
  }

  return "I'm having trouble finding an answer — could you rephrase your question?";
}

export async function chatWithAssistant(req, res) {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: "message is required" });

    const user = req.user; 
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const userContext = { userId: user._id.toString(), role: user.role };

    const chat = ai.chats.create({
      model: "gemini-3.6-flash",
      history,
      config: {
        systemInstruction: buildSystemPrompt(user),
        tools: getToolsForRole(user.role),
          thinkingConfig: { thinkingLevel: "low" },
      },
    });

    const reply = await runToolLoop(chat, message, userContext);
    const updatedHistory = chat.getHistory();

    res.json({ reply, history: updatedHistory });
  } catch (err) {
    console.error("AI assistant error:", err);
    res.status(500).json({ error: "Something went wrong processing your request." });
  }
}