import { Router } from "express";
import { chatWithAssistant } from "../controllers/assistantController.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/chat", protect,chatWithAssistant);

export default router;