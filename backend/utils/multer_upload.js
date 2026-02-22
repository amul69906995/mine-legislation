const multer = require("multer");
const MAX_SIZE = 100 * 1024 * 1024; // 100MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_SIZE },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
            return cb(new Error("Only PDF files allowed"));
        }
        cb(null, true);
    },
});
module.exports=upload