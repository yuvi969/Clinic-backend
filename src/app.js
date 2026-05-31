const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const slotRoutes = require("./routes/slotRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const prescriptionRoutes = require(
  "./routes/prescriptionRoutes"
);

const profileRoutes = require(
  "./routes/profileRoutes"
);
const dashboardRoutes =
  require(
    "./routes/dashboardRoutes"
  );

const app = express();

app.use(
  cors({
  origin:
    process.env.NODE_ENV === "production"
      ? process.env.CLIENT_URL
      : "http://localhost:5173",
  credentials: true,
})
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use(
  "/api/prescriptions",
  prescriptionRoutes
);
app.use(
  "/api/profile",
  profileRoutes
);
app.use(
  "/api/dashboard",
  dashboardRoutes
);
app.get("/", (req, res) => {
  res.send("API is running...");
});

module.exports = app;