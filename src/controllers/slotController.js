const pool = require("../db/index");

const createSlot = async (req, res) => {
  try {

    const {
  slot_date,
  start_time,
  end_time,
} = req.body;

const user_id = req.user.id;

const doctorResult = await pool.query(
  `
  SELECT id FROM doctors
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

    const newSlot = await pool.query(
      `
      INSERT INTO slots
      (doctor_id, slot_date, start_time, end_time)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        doctor_id,
        slot_date,
        start_time,
        end_time,
      ]
    );

    res.status(201).json({
      message: "Slot created",
      slot: newSlot.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const getAvailableSlots = async (req, res) => {
  try {

    const slots = await pool.query(
  `
 SELECT
  slots.id,
  slots.slot_date,
  slots.start_time,
  slots.end_time,
  doctors.id AS doctor_id,
  users.name AS doctor_name,
  doctors.specialization,
  doctors.consultation_fee
FROM slots
JOIN doctors
  ON slots.doctor_id = doctors.id
JOIN users
  ON doctors.user_id = users.id
WHERE slots.is_booked = false
ORDER BY slots.slot_date, slots.start_time
  `
);

    res.json(slots.rows);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const generateSlots = async (req, res) => {
  try {

    const {
      slot_date,
      start_time,
      end_time,
      duration,
    } = req.body;

    const user_id = req.user.id;

    // Find doctor profile
    const doctorResult = await pool.query(
      `
      SELECT id FROM doctors
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

    // Convert times
    let currentTime = new Date(
      `1970-01-01T${start_time}:00`
    );

    const finishTime = new Date(
      `1970-01-01T${end_time}:00`
    );

    const createdSlots = [];
    let skipped = 0;

while (currentTime < finishTime) {

  const slotStart = currentTime
    .toTimeString()
    .slice(0, 8);

  currentTime.setMinutes(
    currentTime.getMinutes() + duration
  );

  const slotEnd = currentTime
    .toTimeString()
    .slice(0, 8);

  if (currentTime > finishTime) break;

  const existingSlot = await pool.query(
    `
    SELECT * FROM slots
    WHERE doctor_id = $1
      AND slot_date = $2
      AND start_time = $3
      AND end_time = $4
    `,
    [
      doctor_id,
      slot_date,
      slotStart,
      slotEnd,
    ]
  );

  if (existingSlot.rows.length > 0) {
    skipped++;
    continue;
  }

  const newSlot = await pool.query(
    `
    INSERT INTO slots
    (doctor_id, slot_date, start_time, end_time)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [
      doctor_id,
      slot_date,
      slotStart,
      slotEnd,
    ]
  );

  createdSlots.push(newSlot.rows[0]);
}

  const message =
  createdSlots.length > 0
    ? "Slots generated successfully"
    : "All slots already existed. Duplicate slots skipped.";

res.status(201).json({
  message,
  total_slots: createdSlots.length,
  skipped_duplicates: skipped,
  slots: createdSlots,
});

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });

  }
};

module.exports = {
  createSlot,
  getAvailableSlots,
  generateSlots,
};