const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

const imageFolder = path.join(
    __dirname,
    "../../uploads/products/images"
);

const videoFolder = path.join(
    __dirname,
    "../../uploads/products/videos"
);

fs.mkdirSync(imageFolder, { recursive: true });
fs.mkdirSync(videoFolder, { recursive: true });

const storage = multer.diskStorage({

    destination(req, file, cb) {

        if (file.mimetype.startsWith("image")) {

            return cb(null, imageFolder);

        }

        if (file.mimetype.startsWith("video")) {

            return cb(null, videoFolder);

        }

        cb(new Error("Tipo de archivo no soportado"));

    },

    filename(req, file, cb) {

        const extension = path.extname(file.originalname);

        cb(
            null,
            Date.now() +
            "-" +
            Math.round(Math.random() * 1000000) +
            extension
        );

    }

});

const upload = multer({

    storage,

    limits: {

        fileSize: 100 * 1024 * 1024

    },

    fileFilter(req, file, cb) {

        if (

            file.mimetype.startsWith("image") ||

            file.mimetype.startsWith("video")

        ) {

            return cb(null, true);

        }

        cb(new Error("Solo imágenes y videos"));

    }

});

router.post(

    "/",

    authMiddleware,

    upload.fields([

        {

            name: "images",

            maxCount: 8

        },

        {

            name: "video",

            maxCount: 1

        }

    ]),

    (req, res) => {

        const images = [];

        let video = null;

        if (req.files.images) {

            req.files.images.forEach(file => {

                images.push(

                    "/uploads/products/images/" +

                    file.filename

                );

            });

        }

        if (

            req.files.video &&

            req.files.video.length

        ) {

            video = {

                url:

                    "/uploads/products/videos/" +

                    req.files.video[0].filename,

                thumbnail: "",

                duration: 0

            };

        }

        res.json({

            success: true,

            images,

            video

        });

    }

);

module.exports = router;