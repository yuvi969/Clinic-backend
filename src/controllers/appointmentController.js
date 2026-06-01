const pool = require("../db/index");
const { getIO } = require("../socket");
const { sendEmail } = require(
  "../utils/emailService"
);

const bookAppointment = async (req, res) => {

  const client = await pool.connect();

  try {

    
    await client.query("BEGIN");

    const { slot_id, reason } = req.body;

    const user_id = req.user.id;

    const userResult = await client.query(
  `
  SELECT name, email
  FROM users
  WHERE id = $1
  `,
  [user_id]
);

const patientName =
  userResult.rows[0].name;

const patientEmail =
  userResult.rows[0].email;

    const patientResult = await client.query(
      `
      SELECT id FROM patients
      WHERE user_id = $1
      `,
      [user_id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        message: "Patient profile not found",
      });
    }

    const patient_id = patientResult.rows[0].id;

    // Check slot exists
    const slotResult = await client.query(
      `
      SELECT * FROM slots
      WHERE id = $1
      `,
      [slot_id]
    );

    if (slotResult.rows.length === 0) {
      return res.status(404).json({
        message: "Slot not found",
      });
    }

    const slot = slotResult.rows[0];

    // Check already booked
    if (slot.is_booked) {
      return res.status(400).json({
        message: "Slot already booked",
      });
    }

    // Generate token
    const tokenResult = await client.query(
      `
      SELECT COUNT(*) FROM appointments
      WHERE DATE(created_at) = CURRENT_DATE
      `
    );

    const token_number =
      parseInt(tokenResult.rows[0].count) + 1;

    // Create appointment
    const appointmentResult = await client.query(
      `
      INSERT INTO appointments
      (patient_id, slot_id, reason, token_number)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        patient_id,
        slot_id,
        reason,
        token_number,
      ]
    );

    // Lock slot
    await client.query(
      `
      UPDATE slots
      SET is_booked = true
      WHERE id = $1
      `,
      [slot_id]
    );

    await client.query("COMMIT");
    const doctorResult =
  await client.query(
    `
    SELECT
      u.name AS doctor_name
    FROM doctors d
    JOIN users u
      ON d.user_id = u.id
    WHERE d.id = $1
    `,
    [slot.doctor_id]
  );

  sendEmail({
  to: patientEmail,

  subject:
    "Appointment Confirmed",

  text: `
Hello ${patientName},

Your appointment has been booked successfully.

Doctor:
${doctorResult.rows[0].doctor_name}

Token Number:
${token_number}

Reason:
${reason}

Date:
${slot.slot_date}

Time:
${slot.start_time} - ${slot.end_time}

Thank you.
`,
}).catch((err) => {
  console.error(
    "Email error:",
    err
  );
});

         const io = getIO();

console.log(
  "Emitting queueUpdated to",
  `doctor_${slot.doctor_id}`
);

io.to(`doctor_${slot.doctor_id}`).emit(
  "queueUpdated",
  {
    message: "Queue updated",
    appointment: appointmentResult.rows[0],
  }
);

    res.status(201).json({
      message: "Appointment booked",
      appointment: appointmentResult.rows[0],
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });

  } finally {

    client.release();

  }
};

const getMyAppointments = async (req, res) => {
  try {

    const user_id = req.user.id;

    const patientResult = await pool.query(
      `
      SELECT id
      FROM patients
      WHERE user_id = $1
      `,
      [user_id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        message: "Patient profile not found",
      });
    }

    const patient_id = patientResult.rows[0].id;

    const appointments = await pool.query(
  `
  SELECT
    appointments.*,
    slots.slot_date,
    slots.start_time,
    slots.end_time,
    users.name AS doctor_name,
    doctors.specialization
  FROM appointments
  JOIN slots
    ON appointments.slot_id = slots.id
  JOIN doctors
    ON slots.doctor_id = doctors.id
  JOIN users
    ON doctors.user_id = users.id
  WHERE appointments.patient_id = $1
  ORDER BY appointments.created_at DESC
  `,
  [patient_id]
);

    res.json(appointments.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });

  }
};

const getDoctorAppointments = async (req, res) => {
  try {
    const { status, date } = req.query;

    const user_id = req.user.id;

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

    let query = `
  SELECT
    appointments.*,
    patients.id AS patient_id,
    slots.slot_date,
    slots.start_time,
    slots.end_time
  FROM appointments
  JOIN patients
    ON appointments.patient_id = patients.id
  JOIN slots
    ON appointments.slot_id = slots.id
  WHERE slots.doctor_id = $1
`;

const values = [doctor_id];

values.push(status);

query += `
  AND appointments.status = $${values.length}
`;

if (date) {
  values.push(date);

  query += `
    AND slots.slot_date = $${values.length}
  `;
}

query += `
  ORDER BY slots.slot_date, slots.start_time
`;

const appointments = await pool.query(query, values);

    res.json(appointments.rows);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const updateAppointmentStatus = async (req, res) => {
  try {

    const { id } = req.params;
    const { status } = req.body;

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
      [id, doctor_id]
    );

    if (appointmentCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Appointment not found for this doctor",
      });
    }

    if (status === "completed") {

  const prescriptionResult =
    await pool.query(
      `
      SELECT id
      FROM prescriptions
      WHERE appointment_id = $1
      `,
      [id]
    );

  if (
    prescriptionResult.rows.length === 0
  ) {
    return res.status(400).json({
      message:
        "Prescription must be created before completing consultation",
    });
  }
}

    // Update appointment status
    const updatedAppointment = await pool.query(
      `
      UPDATE appointments
      SET status = $1
      WHERE id = $2
      RETURNING *
      `,
      [status, id]
    );

    // Emit realtime queue update
    const io = getIO();

    io.to(`doctor_${doctor_id}`).emit("queueUpdated", {
      message: "Queue updated",
    });

    res.json({
      message: "Appointment updated",
      appointment: updatedAppointment.rows[0],
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });

  }
};

const getDoctorQueue = async (req, res) => {
  try {

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

    // Current consultation
    const currentConsultationResult = await pool.query(
      `
     SELECT
  appointments.id,
  appointments.token_number,
  appointments.status,
  appointments.reason,
  slots.slot_date,
  slots.start_time,
  patients.id AS patient_id,
  users.name AS patient_name
FROM appointments
JOIN slots
  ON appointments.slot_id = slots.id
JOIN patients
  ON appointments.patient_id = patients.id
JOIN users
  ON patients.user_id = users.id
WHERE slots.doctor_id = $1
AND appointments.status = 'in_consultation'
LIMIT 1
      `,
      [doctor_id]
    );

    // Waiting queue
    const waitingResult = await pool.query(
      `
      SELECT
  appointments.id,
  appointments.token_number,
  appointments.status,
  appointments.reason,
  slots.slot_date,
  slots.start_time,
  patients.id AS patient_id,
  users.name AS patient_name
FROM appointments
JOIN slots
  ON appointments.slot_id = slots.id
JOIN patients
  ON appointments.patient_id = patients.id
JOIN users
  ON patients.user_id = users.id
WHERE slots.doctor_id = $1
AND appointments.status = 'pending'
ORDER BY appointments.token_number
      `,
      [doctor_id]
    );

    // Recently completed
    const completedResult = await pool.query(
      `
      SELECT
  appointments.id,
  appointments.token_number,
  appointments.status,
  appointments.reason,
  slots.slot_date,
  slots.start_time,
  patients.id AS patient_id,
  users.name AS patient_name
FROM appointments
JOIN slots
  ON appointments.slot_id = slots.id
JOIN patients
  ON appointments.patient_id = patients.id
JOIN users
  ON patients.user_id = users.id
WHERE slots.doctor_id = $1
AND appointments.status = 'completed'
ORDER BY appointments.created_at DESC
LIMIT 5
      `,
      [doctor_id]
    );

    res.json({
      current_consultation:
        currentConsultationResult.rows[0] || null,

      waiting: waitingResult.rows,

      recent_completed: completedResult.rows,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });

  }
};

const nextPatient = async (req, res) => {
  try {

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

    // Check existing active consultation
    const activeConsultation = await pool.query(
      `
      SELECT appointments.id
      FROM appointments
      JOIN slots
        ON appointments.slot_id = slots.id
      WHERE slots.doctor_id = $1
      AND appointments.status = 'in_consultation'
      `,
      [doctor_id]
    );

    if (activeConsultation.rows.length > 0) {
      return res.status(400).json({
        message: "Complete current consultation first",
      });
    }

    // Find next pending patient
    const nextAppointment = await pool.query(
      `
      SELECT appointments.*
      FROM appointments
      JOIN slots
        ON appointments.slot_id = slots.id
      WHERE slots.doctor_id = $1
      AND appointments.status = 'pending'
      ORDER BY appointments.token_number
      LIMIT 1
      `,
      [doctor_id]
    );

    if (nextAppointment.rows.length === 0) {
      return res.status(404).json({
        message: "No pending patients",
      });
    }

    const appointment = nextAppointment.rows[0];

    // Mark as in consultation
    const updatedAppointment = await pool.query(
      `
      UPDATE appointments
      SET status = 'in_consultation'
      WHERE id = $1
      RETURNING *
      `,
      [appointment.id]
    );

    // Emit realtime update
    const io = getIO();

    io.to(`doctor_${doctor_id}`).emit("queueUpdated", {
      message: "Queue updated",
    });

    res.json({
      message: "Next patient called",
      appointment: updatedAppointment.rows[0],
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });

  }
};



module.exports = {
  bookAppointment,
  getMyAppointments,
  getDoctorAppointments,
  updateAppointmentStatus,
    getDoctorQueue,
    nextPatient
};