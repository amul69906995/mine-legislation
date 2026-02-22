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
            unique: true,
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
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("FileModel", fileSchema);