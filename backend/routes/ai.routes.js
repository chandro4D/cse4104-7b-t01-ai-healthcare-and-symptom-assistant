const express = require("express");
const router = express.Router();

const { symptomCheck, chatWithAI } = require("../controllers/ai.controller");

// const { protect } = require("../middleware/auth.middleware");

// AI symptom checker
router.post("/symptom-check", symptomCheck);

// General AI health chat
router.post("/chat",  chatWithAI);

module.exports = router;
