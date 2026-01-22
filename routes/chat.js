const express = require("express");
const router = express.Router();

const authUser = require("../middlewares/authUser");
const adminAuth = require("../middlewares/adminAuth")
const chatAccess = require("../middlewares/chatAccess");

const { searchUsers } = require("../controllers/chat/search");
const { openConversation } = require("../controllers/chat/openConversation");
const { sendMessage } = require("../controllers/chat/sendMessage");
const { getConversations } = require("../controllers/chat/getConversations");
const chatRoleAdapter = require("../middlewares/chatRoleAdapter");



/**
 * AUTH (admin OR user)
 */
router.use((req, res, next) => {
  adminAuth(req, res, err => {
    if (!err && req.user) return next();
    authUser()(req, res, next);
  });
});

/**
 * CHAT ROLE NORMALIZATION (SAFE)
 */
router.use(chatRoleAdapter);

/**
 * PUBLIC CHAT ROUTES (auth only)
 */
router.get("/conversations", getConversations);

/**
 * RESTRICTED CHAT ROUTES
 */
router.use(chatAccess);

router.get("/search", searchUsers);
router.post("/open", openConversation);
router.post("/message", sendMessage);

module.exports = router;
