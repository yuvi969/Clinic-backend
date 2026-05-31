const express = require("express");

const router = express.Router();

const protect = require(
  "../middleware/authMiddleware"
);

const authorizeRoles =
  require(
    "../middleware/roleMiddleware"
  );

const {
  getDoctorStats,
  getPatientStats,
} = require(
  "../controllers/dashboardController"
);

router.get(
  "/doctor",
  protect,
  authorizeRoles("doctor"),
  getDoctorStats
);

router.get(
  "/patient",
  protect,
  authorizeRoles("patient"),
  getPatientStats
);

module.exports = router;