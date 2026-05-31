const express = require("express");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  createSlot,
  getAvailableSlots,
  generateSlots
} = require("../controllers/slotController");

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("doctor"),
  createSlot
);

router.post(
  "/generate",
  protect,
  authorizeRoles("doctor"),
  generateSlots
);



router.get("/", getAvailableSlots);

module.exports = router;