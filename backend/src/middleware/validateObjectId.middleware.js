const mongoose = require("mongoose");

const validateObjectId = (paramName = "id") => {
  return (req, res, next) => {
    try {
      const value = req.params[paramName];

      if (!value) {
        return res.status(400).json({
          success: false,
          message: `El parámetro ${paramName} es obligatorio`
        });
      }

      if (!mongoose.Types.ObjectId.isValid(value)) {
        return res.status(400).json({
          success: false,
          message: `El parámetro ${paramName} no es un ObjectId válido`
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error validando ObjectId",
        error: error.message
      });
    }
  };
};

module.exports = validateObjectId;