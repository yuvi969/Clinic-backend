const express = require("express");

const router = express.Router();

const {
  createPrescription,
  getPrescriptionByAppointment,
  updatePrescription,
  getPatientPrescription
} = require(
  "../controllers/prescriptionController"
);

const protect = require(
  "../middleware/authMiddleware"
);

const authorizeRoles = require(
  "../middleware/roleMiddleware"
);

router.post(
  "/",
  protect,
  authorizeRoles("doctor"),
  createPrescription
);

router.get(
  "/appointment/:appointmentId",
  protect,
  authorizeRoles("doctor"),
  getPrescriptionByAppointment
);

router.put(
  "/appointment/:appointmentId",
  protect,
  authorizeRoles("doctor"),
  updatePrescription
);

router.get(
  "/patient/appointment/:appointmentId",
  protect,
  authorizeRoles("patient"),
  getPatientPrescription
);

module.exports = router;