require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const User = require("../models/User");

const EMAIL = "angelfeliz2000@gmail.com";

const activateCustomer = async () => {
  try {
    await connectDB();

    const user = await User.findOne({
      email: EMAIL.trim().toLowerCase()
    }).select(
      "+password +permissions +departments"
    );

    if (!user) {
      throw new Error(
        `No existe un usuario con el correo ${EMAIL}`
      );
    }

    console.log("Estado anterior:", {
      email: user.email,
      status: user.status,
      accountType: user.accountType,
      buyerEnabled: user.buyerEnabled,
      verificationStatus:
        user.verificationStatus
    });

    user.status = "ACTIVE";
    user.accountType = "CUSTOMER";
    user.role = "USER";
    user.department = "CUSTOMER";
    user.buyerEnabled = true;
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;

    if (
      user.securityLevel === "LOCKED"
    ) {
      user.securityLevel = "NORMAL";
    }

    await user.save();

    console.log("✅ Cuenta activada:", {
      email: user.email,
      status: user.status,
      accountType: user.accountType,
      buyerEnabled: user.buyerEnabled,
      verificationStatus:
        user.verificationStatus
    });
  } catch (error) {
    console.error(
      "❌ No se pudo activar la cuenta:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    if (
      mongoose.connection.readyState !== 0
    ) {
      await mongoose.disconnect();
    }
  }
};

activateCustomer();