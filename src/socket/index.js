let io;

const initSocket = (server) => {
  const { Server } = require("socket.io");

  io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      process.env.CLIENT_URL,
    ],
    credentials: true,
  },
});

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join doctor queue room
    socket.on("joinQueue", (doctorId) => {
      socket.join(`doctor_${doctorId}`);

      console.log(`Socket joined doctor_${doctorId}`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

// Access io anywhere
const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }

  return io;
};

module.exports = {
  initSocket,
  getIO,
};