const mongoose = require("mongoose");
 
const messageSchema = new mongoose.Schema(
    {
        // ── What the user asked ───────────────────────────────────────────────
        query: {
            type: String,
            required: true,
            trim: true,
        },
 
        // ── What the bot replied ──────────────────────────────────────────────
        answer: {
            type: String,
            default: null,
            trim: true,
        },
 
        // ── If something went wrong on this turn ──────────────────────────────
        errorMessage: {
            type: String,
            default: null,
            trim: true,
        },
 
        // ── model and country for this turn ─────────────────────────────────────────────
        model: {
            type: String,
            enum: ["rag", "ragadv", "trained"],
            required: true,
        },
        country: {
            type: String,
            required: true,
        },
 
        // ── User feedback on the answer ───────────────────────────────────────
        feedback: {
            type: String,
            enum: ["like", "unlike"],
            default: null,
        },
 
        // ── RAG-specific fields ───────────────────────────────────────────────
        ragSources: {
            type: Array,
            default: [],
        },
        confidence: {
            topScore: { type: Number, default: null },
            avgScore: { type: Number, default: null },
        },
    },
    { timestamps: true }
);
 
const chatSchema = new mongoose.Schema(
    {
        guestSessionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        currentCountry: {
            type: String,
            required: true,
        },
        currentModel: {
            type: String,
            enum: ["rag", "ragadv", "trained"],
            required: true,
            default: "ragadv",
        },
        title: {
            type: String,
            default: "New Chat",
            trim: true,
        },
        messages: [messageSchema],
    },
    { timestamps: true }
);
 
module.exports = mongoose.model("Chat", chatSchema);
 