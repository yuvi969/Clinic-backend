const pool = require("../db");

const getMyProfile = async (req, res) => {
  try {

    const user_id = req.user.id;

    const userResult = await pool.query(
      `
      SELECT id, name, email, role
      FROM users
      WHERE id = $1
      `,
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const user = userResult.rows[0];

    if (user.role === "doctor") {

      const doctorResult =
        await pool.query(
          `
          SELECT
            specialization,
            consultation_fee
          FROM doctors
          WHERE user_id = $1
          `,
          [user_id]
        );

      return res.json({
        ...user,
        ...doctorResult.rows[0],
      });

    }

    if (user.role === "patient") {

      const patientResult =
        await pool.query(
          `
          SELECT
            age,
            gender,
            phone
          FROM patients
          WHERE user_id = $1
          `,
          [user_id]
        );

      return res.json({
        ...user,
        ...patientResult.rows[0],
      });

    }

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });

  }
};

const updateMyProfile = async (
  req,
  res
) => {
  try {

    const user_id = req.user.id;

    const userResult = await pool.query(
      `
      SELECT role
      FROM users
      WHERE id = $1
      `,
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const role =
      userResult.rows[0].role;

    if (role === "doctor") {

      const {
        name,
        specialization,
        consultation_fee,
      } = req.body;

      if (
        !name ||
        !specialization ||
        !consultation_fee
      ) {
        return res.status(400).json({
          message:
            "name, specialization and consultation_fee are required",
        });
      }

      await pool.query(
        `
        UPDATE users
        SET name = $1
        WHERE id = $2
        `,
        [name, user_id]
      );

      await pool.query(
        `
        UPDATE doctors
        SET
          specialization = $1,
          consultation_fee = $2
        WHERE user_id = $3
        `,
        [
          specialization,
          consultation_fee,
          user_id,
        ]
      );

    }

    if (role === "patient") {

      const {
        name,
        age,
        gender,
        phone,
      } = req.body;

      if (
        !name ||
        !age ||
        !gender ||
        !phone
      ) {
        return res.status(400).json({
          message:
            "name, age, gender and phone are required",
        });
      }

      await pool.query(
        `
        UPDATE users
        SET name = $1
        WHERE id = $2
        `,
        [name, user_id]
      );

      await pool.query(
        `
        UPDATE patients
        SET
          age = $1,
          gender = $2,
          phone = $3
        WHERE user_id = $4
        `,
        [
          age,
          gender,
          phone,
          user_id,
        ]
      );

    }

    res.json({
      message:
        "Profile updated successfully",
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });

  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
};