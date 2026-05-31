const express = require("express");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const { body } = require("express-validator");
const validate = require("../middleware/validationMiddleware");

const {
  bookAppointment,
  getMyAppointments,
  getDoctorAppointments,
  updateAppointmentStatus,
   getDoctorQueue,
   nextPatient
} = require("../controllers/appointmentController");

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("patient"),

  body("slot_id")
    .isInt()
    .withMessage("slot_id must be a number"),

  body("reason")
    .notEmpty()
    .withMessage("Reason is required"),

  validate,

  bookAppointment
);

router.get(
  "/my",
  protect,
  authorizeRoles("patient"),
  getMyAppointments
);

router.get(
  "/doctor",
  protect,
  authorizeRoles("doctor"),
  getDoctorAppointments
);

router.put(
  "/:id/status",
  protect,
  authorizeRoles("doctor"),
  updateAppointmentStatus
);

router.get(
  "/queue/doctor",
  protect,
  authorizeRoles("doctor"),
  getDoctorQueue
);

router.post(
  "/next",
  protect,
  authorizeRoles("doctor"),
  nextPatient
);

module.exports = router;