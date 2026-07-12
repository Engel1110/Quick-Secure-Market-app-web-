const express = require("express");

const router = express.Router();

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const {
  uploadProfileImage
} = require(
  "../middleware/profileImageUpload.middleware"
);

const {
  getMe,
  updateMe,
  updateProfilePhoto,
  deleteProfilePhoto
} = require(
  "../controllers/user.controller"
);

/*
|--------------------------------------------------------------------------
| Perfil del usuario autenticado
|--------------------------------------------------------------------------
*/

router.get(
  "/me",
  authMiddleware,
  getMe
);

router.patch(
  "/me",
  authMiddleware,
  updateMe
);

/*
|--------------------------------------------------------------------------
| Foto de perfil
|--------------------------------------------------------------------------
| El frontend debe enviar FormData con el campo:
|
| profilePhoto
|--------------------------------------------------------------------------
*/

router.patch(
  "/me/avatar",
  authMiddleware,
  ...uploadProfileImage,
  updateProfilePhoto
);

router.delete(
  "/me/avatar",
  authMiddleware,
  deleteProfilePhoto
);

module.exports = router;