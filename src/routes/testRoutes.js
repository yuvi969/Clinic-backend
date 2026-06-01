const express = require("express");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  sendEmail,
} = require("../utils/emailService");

const router = express.Router();

router.get(
  "/protected",
  protect,
  (req, res) => {

    res.json({
      message:
        "Protected route accessed",
      user: req.user,
    });

  }
);

router.get(
  "/doctor-only",
  protect,
  authorizeRoles("doctor"),
  (req, res) => {

    res.json({
      message:
        "Doctor route accessed",
    });

  }
);

router.get(
  "/test-email",
  async (req, res) => {

    try {

      await sendEmail({
        to:
          "pawaryuvraj334@gmail.com",
        subject:
          "Clinic App Test",
        text:
          "Nodemailer is working!",
      });

      res.json({
        message:
          "Email sent successfully",
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Email failed",
      });

    }

  }
);

module.exports = router;