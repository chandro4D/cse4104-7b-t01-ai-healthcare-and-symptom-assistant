const express = require("express");
const router = express.Router();
const { symptomCheck, chatWithAI } = require("../controllers/ai.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/symptom-check", protect, symptomCheck);
router.post("/chat", protect, chatWithAI);

module.exports = router;
