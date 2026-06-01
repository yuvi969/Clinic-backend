const cron = require("node-cron");
const pool = require("../db");

const {
  sendEmail,
} = require("../utils/emailService");

const startReminderJob = () => {

  cron.schedule(
    "0 9 * * *", // every minute for testing
    async () => {

      try {

      
      const appointments =
          await pool.query(
            `
            SELECT
  appointments.id,
  users.name,
  users.email,
  slots.slot_date,
  slots.start_time
FROM appointments
JOIN patients
  ON appointments.patient_id =
     patients.id
JOIN users
  ON patients.user_id =
     users.id
JOIN slots
  ON appointments.slot_id =
     slots.id
WHERE DATE(slots.slot_date) =
      CURRENT_DATE + 1
AND appointments.reminder_sent = FALSE
AND appointments.status = 'pending'
            `
          );

     for (
  const appointment
  of appointments.rows
) {

  await sendEmail({
    to: appointment.email,

    subject:
      "Appointment Reminder",

    text: `
Hello ${appointment.name},

This is a reminder that you have an appointment tomorrow.

Date:
${appointment.slot_date}

Time:
${appointment.start_time}

Please login for more details.

https://clinic-frontend-seven-vert.vercel.app/

Thank you.
`,
  });

  await pool.query(
    `
    UPDATE appointments
    SET reminder_sent = TRUE
    WHERE id = $1
    `,
    [appointment.id]
  );

}

        console.log(
          appointments.rows
        );

      } catch (error) {

        console.error(error);

      }

    }
  );

};

module.exports = {
  startReminderJob,
};