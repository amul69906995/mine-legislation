const fs = require("fs");
const Chat=require('./model/chat_model')
const deleteLocalFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);

            console.log(`Deleted local file: ${filePath}`);
        }
    } catch (deleteErr) {
        console.error(
            "Failed to delete local file:",
            deleteErr
        );
    }
};
const getOrCreateChat= async (guestSessionId, currentCountry, currentModel) => {
    console.log("running getOrCreateChat... ",guestSessionId, currentCountry, currentModel)
   let chat = await Chat.findOne({ guestSessionId });

    if (!chat) {
        chat = await Chat.create({ guestSessionId, currentCountry, currentModel });
    } else {
        // Keep currentCountry and currentModel in sync with latest request
        chat.currentCountry = currentCountry;
        chat.currentModel = currentModel;
        await chat.save();
    }
    return chat;
}
const saveTurn= async (chat, { query, answer, errorMessage, model, country, ragSources, confidence }) => {
    chat.messages.push({
        query,
        answer:       answer       ?? null,
        errorMessage: errorMessage ?? null,
        model,
        country,
        ragSources:   ragSources   ?? [],
        confidence:   confidence   ?? { topScore: null, avgScore: null },
    });
    await chat.save();
    return chat.messages[chat.messages.length - 1];
}
module.exports = { deleteLocalFile , getOrCreateChat,saveTurn }