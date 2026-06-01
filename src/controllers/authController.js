const pool = require("../db");
const bcrypt = require("bcrypt");

const registerUser = async (req, res) => {


  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const { name, email, password, role } = req.body;

    // Check existing user
    const existingUser = await client.query(
      `
      SELECT *
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (existingUser.rows.length > 0) {

      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "User already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await client.query(
      `
      INSERT INTO users
      (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role
      `,
      [name, email, hashedPassword, role]
    );

    const user = newUser.rows[0];

    // Auto create doctor profile
    if (role === "doctor") {

      await client.query(
        `
        INSERT INTO doctors (user_id)
        VALUES ($1)
        `,
        [user.id]
      );
    }

    // Auto create patient profile
    if (role === "patient") {

      await client.query(
        `
        INSERT INTO patients (user_id)
        VALUES ($1)
        `,
        [user.id]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "User registered successfully",
      user,
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

const jwt = require("jsonwebtoken");

const loginUser = async (req, res) => {
  console.log("Login started");
  try {
    const { email, password } = req.body;

    console.log("Body parsed");
    console.log(req.body);

    // Find user
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }
    console.log("Query completed");

    const user = userResult.rows[0];

    // Compare passwords
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.cookie("token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite:
    process.env.NODE_ENV === "production"
      ? "none"
      : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

res.status(200).json({
  message: "Login successful",
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  },
});

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const logoutUser = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite:
      process.env.NODE_ENV === "production"
        ? "none"
        : "lax",
  });

  res.json({
    message: "Logged out successfully",
  });
};

const getCurrentUser = async (req, res) => {
  try {

    const userResult = await pool.query(
      `
      SELECT id, name, email, role
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const user = userResult.rows[0];

    // If doctor, include doctor_id
    if (user.role === "doctor") {

      const doctorResult = await pool.query(
        `
        SELECT id
        FROM doctors
        WHERE user_id = $1
        `,
        [user.id]
      );

      if (doctorResult.rows.length > 0) {
        user.doctor_id =
          doctorResult.rows[0].id;
      }
    }

    res.json(user);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });

  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
};