const express = require("express");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/protected", protect, (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: req.user,
  });
});

router.get(
  "/doctor-only",
  protect,
  authorizeRoles("doctor"),
  (req, res) => {
    res.json({
      message: "Doctor route accessed",
    });
  }
);

module.exports = router;