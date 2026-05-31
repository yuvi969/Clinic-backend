const pool = require("../db");

const getDoctorStats = async (
  req,
  res
) => {
  try {

    const user_id = req.user.id;

    const doctorResult =
      await pool.query(
        `
        SELECT id
        FROM doctors
        WHERE user_id = $1
        `,
        [user_id]
      );

    if (
      doctorResult.rows.length === 0
    ) {
      return res.status(404).json({
        message:
          "Doctor profile not found",
      });
    }

    const doctor_id =
      doctorResult.rows[0].id;

    const waitingResult =
      await pool.query(
        `
        SELECT COUNT(*)
        FROM appointments
        JOIN slots
          ON appointments.slot_id = slots.id
        WHERE
          slots.doctor_id = $1
          AND appointments.status = 'pending'
        `,
        [doctor_id]
      );

    const currentResult =
      await pool.query(
        `
        SELECT COUNT(*)
        FROM appointments
        JOIN slots
          ON appointments.slot_id = slots.id
        WHERE
          slots.doctor_id = $1
          AND appointments.status =
            'in_consultation'
        `,
        [doctor_id]
      );

    const completedResult =
      await pool.query(
        `
        SELECT COUNT(*)
        FROM appointments
        JOIN slots
          ON appointments.slot_id = slots.id
        WHERE
          slots.doctor_id = $1
          AND appointments.status =
            'completed'
          AND slots.slot_date =
            CURRENT_DATE
        `,
        [doctor_id]
      );

    res.json({
      waiting:
        Number(
          waitingResult.rows[0]
            .count
        ),
      current:
        Number(
          currentResult.rows[0]
            .count
        ),
      completed_today:
        Number(
          completedResult.rows[0]
            .count
        ),
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });

  }
};


const getPatientStats = async (
  req,
  res
) => {
  try {

    const user_id = req.user.id;

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

    const totalResult =
      await pool.query(
        `
        SELECT COUNT(*)
        FROM appointments
        WHERE patient_id = $1
        `,
        [patient_id]
      );

    const pendingResult =
      await pool.query(
        `
        SELECT COUNT(*)
        FROM appointments
        WHERE
          patient_id = $1
          AND status = 'pending'
        `,
        [patient_id]
      );

    const completedResult =
      await pool.query(
        `
        SELECT COUNT(*)
        FROM appointments
        WHERE
          patient_id = $1
          AND status = 'completed'
        `,
        [patient_id]
      );

    res.json({
      total:
        Number(
          totalResult.rows[0].count
        ),
      pending:
        Number(
          pendingResult.rows[0].count
        ),
      completed:
        Number(
          completedResult.rows[0].count
        ),
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });

  }
};

module.exports = {
  getDoctorStats,
   getPatientStats,
};