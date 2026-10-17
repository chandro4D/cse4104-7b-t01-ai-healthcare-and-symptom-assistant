const router = require("express").Router();
const { protect } = require("../middleware/auth.middleware"); // use YOUR middleware's real name
const c = require("../controllers/ai.controller");

router.post("/symptom-check", protect, c.symptomCheck);
router.get("/conversations", protect, c.listConversations);
router.get("/conversations/:id", protect, c.getConversation);
router.delete("/conversations/:id", protect, c.deleteConversation);

module.exports = router;
