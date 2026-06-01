const pool = require("../db/index");
const {
  sendEmail,
} = require("../utils/emailService");

const createPrescription = async (req, res) => {
  try {
    const {
      appointment_id,
      diagnosis,
      medications,
      notes,
    } = req.body;

    const user_id = req.user.id;

    // Basic validation
    if (
      !appointment_id ||
      !diagnosis ||
      !medications
    ) {
      return res.status(400).json({
        message:
          "appointment_id, diagnosis and medications are required",
      });
    }

    // Find doctor profile
    const doctorResult = await pool.query(
      `
      SELECT id
      FROM doctors
      WHERE user_id = $1
      `,
      [user_id]
    );

    if (doctorResult.rows.length === 0) {
      return res.status(404).json({
        message: "Doctor profile not found",
      });
    }

    const doctor_id = doctorResult.rows[0].id;

    // Verify appointment belongs to doctor
    const appointmentResult = await pool.query(
      `
      SELECT
        appointments.id,
        appointments.patient_id,
        appointments.status,
        slots.doctor_id
      FROM appointments
      JOIN slots
        ON appointments.slot_id = slots.id
      WHERE appointments.id = $1
      `,
      [appointment_id]
    );

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    const appointment =
      appointmentResult.rows[0];

    // Ownership check
    if (
      appointment.doctor_id !== doctor_id
    ) {
      return res.status(403).json({
        message:
          "You can only create prescriptions for your own appointments",
      });
    }

    // Must be in consultation
    if (
      appointment.status !==
      "in_consultation"
    ) {
      return res.status(400).json({
        message:
          "Prescription can only be created during consultation",
      });
    }

    // Check if prescription already exists
    const existingPrescription =
      await pool.query(
        `
        SELECT id
        FROM prescriptions
        WHERE appointment_id = $1
        `,
        [appointment_id]
      );

    if (
      existingPrescription.rows.length > 0
    ) {
      return res.status(400).json({
        message:
          "Prescription already exists for this appointment",
      });
    }

    // Create prescription
    const prescriptionResult =
      await pool.query(
        `
        INSERT INTO prescriptions
        (
          appointment_id,
          doctor_id,
          patient_id,
          diagnosis,
          medications,
          notes
        )
        VALUES
        ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [
          appointment_id,
          doctor_id,
          appointment.patient_id,
          diagnosis,
          medications,
          notes,
        ]
      );

      const patientInfo =
  await pool.query(
    `
    SELECT
      users.name,
      users.email
    FROM patients
    JOIN users
      ON patients.user_id = users.id
    WHERE patients.id = $1
    `,
    [appointment.patient_id]
  );

const doctorInfo =
  await pool.query(
    `
    SELECT
      users.name
    FROM doctors
    JOIN users
      ON doctors.user_id = users.id
    WHERE doctors.id = $1
    `,
    [doctor_id]
  );

const patientName =
  patientInfo.rows[0].name;

const patientEmail =
  patientInfo.rows[0].email;

const doctorName =
  doctorInfo.rows[0].name;

sendEmail({
  to: patientEmail,

  subject:
    "Prescription Available",

  text: `
Hello ${patientName},

Dr. ${doctorName} has created your prescription.

You can view it securely by logging into the Clinic App:

https://clinic-frontend-seven-vert.vercel.app/

Thank you.
`,
}).catch((err) => {
  console.error(
    "Prescription email error:",
    err
  );
});

    res.status(201).json({
      message:
        "Prescription created successfully",
      prescription:
        prescriptionResult.rows[0],
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });

  }
};

const getPrescriptionByAppointment = async (
  req,
  res
) => {
  try {

    const { appointmentId } = req.params;

    const user_id = req.user.id;

    // Find doctor profile
    const doctorResult = await pool.query(
      `
      SELECT id
FROM doctors
WHERE user_id = $1
      `,
      [user_id]
    );

    if (doctorResult.rows.length === 0) {
      return res.status(404).json({
        message: "Doctor profile not found",
      });
    }

    const doctor_id = doctorResult.rows[0].id;

    // Verify appointment belongs to doctor
    const appointmentCheck = await pool.query(
      `
      SELECT appointments.id
      FROM appointments
      JOIN slots
        ON appointments.slot_id = slots.id
      WHERE appointments.id = $1
      AND slots.doctor_id = $2
      `,
      [appointmentId, doctor_id]
    );

    if (appointmentCheck.rows.length === 0) {
      return res.status(404).json({
        message:
          "Appointment not found for this doctor",
      });
    }

    // Get prescription
    const prescriptionResult = await pool.query(
  `
  SELECT
    prescriptions.*,
    appointments.status,
    slots.doctor_id
  FROM prescriptions
  JOIN appointments
    ON prescriptions.appointment_id = appointments.id
  JOIN slots
    ON appointments.slot_id = slots.id
  WHERE prescriptions.appointment_id = $1
  `,
  [appointmentId]
);

    if (prescriptionResult.rows.length === 0) {
      return res.json({
        prescription: null,
      });
    }

    res.json({
      prescription:
        prescriptionResult.rows[0],
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });

  }
};

const updatePrescription = async (req, res) => {
  try {

    const { appointmentId } = req.params;

    const {
      diagnosis,
      medications,
      notes,
    } = req.body;

    const user_id = req.user.id;

    // Validation
    if (
      !diagnosis ||
      !medications
    ) {
      return res.status(400).json({
        message:
          "diagnosis and medications are required",
      });
    }

    // Find doctor profile
    const doctorResult = await pool.query(
      `
      SELECT id
      FROM doctors
      WHERE user_id = $1
      `,
      [user_id]
    );

    if (doctorResult.rows.length === 0) {
      return res.status(404).json({
        message: "Doctor profile not found",
      });
    }

    const doctor_id = doctorResult.rows[0].id;

    // Get prescription + ownership + status info
    const prescriptionResult = await pool.query(
      `
      SELECT
        prescriptions.*,
        appointments.status,
        slots.doctor_id
      FROM prescriptions
      JOIN appointments
        ON prescriptions.appointment_id = appointments.id
      JOIN slots
        ON appointments.slot_id = slots.id
      WHERE prescriptions.appointment_id = $1
      `,
      [appointmentId]
    );

    if (prescriptionResult.rows.length === 0) {
      return res.status(404).json({
        message: "Prescription not found",
      });
    }

    const prescription =
      prescriptionResult.rows[0];

    // Ownership check
    if (
      prescription.doctor_id !== doctor_id
    ) {
      return res.status(404).json({
        message:
          "Prescription not found for this doctor",
      });
    }

    // Can only edit during consultation
    if (
      prescription.status !==
      "in_consultation"
    ) {
      return res.status(400).json({
        message:
          "Completed prescriptions cannot be edited",
      });
    }

    // Update prescription
    const updatedPrescription =
      await pool.query(
        `
        UPDATE prescriptions
        SET
          diagnosis = $1,
          medications = $2,
          notes = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE appointment_id = $4
        RETURNING *
        `,
        [
          diagnosis,
          medications,
          notes,
          appointmentId,
        ]
      );

    res.json({
      message:
        "Prescription updated successfully",
      prescription:
        updatedPrescription.rows[0],
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });

  }
};

const getPatientPrescription = async (
  req,
  res
) => {
  try {

    const { appointmentId } = req.params;

    const user_id = req.user.id;

    // Find patient profile
    const patientResult =
      await pool.query(
        `
        SELECT id
        FROM patients
        WHERE user_id = $1
        `,
        [user_id]
      );

    if (
      patientResult.rows.length === 0
    ) {
      return res.status(404).json({
        message:
          "Patient profile not found",
      });
    }

    const patient_id =
      patientResult.rows[0].id;

    // Verify appointment belongs to patient
    const appointmentCheck =
      await pool.query(
        `
        SELECT id
        FROM appointments
        WHERE id = $1
        AND patient_id = $2
        `,
        [
          appointmentId,
          patient_id,
        ]
      );

    if (
      appointmentCheck.rows.length === 0
    ) {
      return res.status(404).json({
        message:
          "Appointment not found",
      });
    }

    const prescriptionResult =
      await pool.query(
        `
        SELECT
          diagnosis,
          medications,
          notes,
          created_at
        FROM prescriptions
        WHERE appointment_id = $1
        `,
        [appointmentId]
      );

    if (
      prescriptionResult.rows.length === 0
    ) {
      return res.status(404).json({
        message:
          "Prescription not found"
      });
    }

    res.json({
      prescription:
        prescriptionResult.rows[0],
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });

  }
};

module.exports = {
  createPrescription,
  getPrescriptionByAppointment,
  updatePrescription,
  getPatientPrescription
};