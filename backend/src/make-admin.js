require("dotenv").config();

const mongoose = require("mongoose");
const User = require("./src/models/User");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOneAndUpdate(
    { email: "juan@test.com" },
    {
      role: "SENIOR_ADMIN",
      status: "ACTIVE"
    },
    { new: true }
  );

  console.log(
    user
      ? { email: user.email, role: user.role, status: user.status }
      : "Usuario no encontrado"
  );

  await mongoose.disconnect();
}

run();