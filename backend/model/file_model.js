const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
    {
        filename: {
            type: String,
            required: true,
            trim: true,
        },

        country: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        filePath: {
            type: String,
            required: true,
        },

        hash: {
            type: String,
            required: true,
            // unique: true,
        },

        status: {
            type: String,
            enum: ["processing", "completed", "failed"],
            default: "processing",
        },

        errorMessage: {
            type: String,
            default: null,
        },

        fileSize: {
            type: Number,  
            required: true,
        },
        //cloudinary url
        cloudinaryUrl: {
            type: String,
            default: null,
        },

        // Needed for delete/update operations
        cloudinaryPublicId: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("FileModel", fileSchema);