const { Pinecone } = require('@pinecone-database/pinecone');
const express = require('express');
const cors = require('cors')
const app = express();
const upload = require('./utils/multer_upload');
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
require('dotenv').config()
const getLlmResponse = require('./utils/getLlmResponse')
const connectToDb = require('./utils/db_connection')
const appError = require('./error/appError')
const FileModel=require('./model/file_model')

//db connections
connectToDb()

//cors
app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

//pinecone
const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY_2
});
const index = pc.index(
    process.env.PINECONE_INDEX, process.env.PINECONE_HOST);

//routes
app.get('/', (req, res) => {
    res.send("good to go!!")
})
app.post('/chat', async (req, res, next) => {
    const { country, query, model } = req.body;
    console.log(country, query, model)
    if (model === "rag") {
        const namespace = index.namespace(country);
        const response = await namespace.searchRecords({
            query: {
                topK: 5,
                inputs: { text: query },
            },
            fields: ["chunk_text", "section_title", "file_name", "jurisdiction_level", "mineral_scope"],
        });
        //23.6%, 38.2%, 50%, 61.8%, 78.6%
        //score level above .236
        const MIN_CHUNK_SCORE = 0.236;
        const hits = response?.result?.hits;
        console.log("hits", hits)
        const validHits = hits.filter(h => h._score >= MIN_CHUNK_SCORE);

        if (validHits.length === 0) {
            return res.json({
                message: "Your query does not relate to mining legislation.",
                rag_source: [],
            });
        }
        const topScore = validHits[0]._score;
        const avgScore = hits.reduce((sum, h) => sum + h._score, 0) / hits.length;
        console.log("topScore:", topScore, "avgScore:", avgScore);

        let selectedHits;
        if (avgScore < .236) {
            return res.json({
                message: "Your query does not relate to mining legislation.",
                rag_source: [],
            });
        }
        else if (avgScore < 0.382) {
            selectedHits = validHits.filter(h => h._score >= 0.236);
        } else {
            selectedHits = validHits.filter(h => h._score >= 0.382);
        }
        if (selectedHits.length === 0) {
            selectedHits = validHits.slice(0, 1);
        }
        //console.log(selectedHits);
        const llmResponse = await getLlmResponse(query, selectedHits);
        console.log(llmResponse)
        // const llmResponse = `dummy llm response`;
        return res.json({
            message: llmResponse,
            rag_source: selectedHits,
            confidence: {
                topScore,
                avgScore,
            },
        });
    }
    else if (model === "ragadv") {
        const response = await fetch(process.env.AMAN_BACKEND_URI, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query
            }),
        });

        const { answer } = await response.json();
        console.log(answer);

        res.json({ message: answer })
    }
    else if (model === "trained") {
        console.log("here we will invoke trained model with user query and country")
        res.json({ message: "here we will invoke trained model with user query and country" })
    }
})
app.get("/file-info", async (req, res, next) => {
    try {
        const files = await FileModel.find()
            .sort({ createdAt: -1 }) // latest first
            .select("-__v"); // remove unnecessary field

        res.json({
            count: files.length,
            files,
        });

    } catch (err) {
        next(err);
    }
});
app.post("/upload", upload.single("file"), async (req, res, next) => {
    try {
        const { country } = req.body;
        const file = req.file;
        console.log(file, country)
        if (!file) {
            return next(new appError("No file uploaded", 400));
        }
        if (!country) {
            return next(new appError("Country required", 400));
        }

        // 🔥 Generate SHA256 hash
        const hash = crypto
            .createHash("sha256")
            .update(file.buffer)
            .digest("hex");
        const isFileExist = await FileModel.findOne({ hash });
        console.log("isFileExist inside /upload",isFileExist)
        if (isFileExist) {
            return next(
                new appError("Duplicate file detected (same content already exists)", 400)
            );
        }
        // Create country folder
        const uploadDir = path.join(__dirname, "data", country);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, file.originalname);

        fs.writeFileSync(filePath, file.buffer);

        // 🔥 Save in DB
        const newFile = await FileModel.create({
            filename: file.originalname,
            country,
            filePath,
            hash,
            fileSize: file.size,
            status: "processing",
        });
        // 🔥 Invoke Python processing here (background)
        // spawn(...) etc.
             //change status of that file and save document to db
        res.json({
            message: "File uploaded successfully. Processing has started. Please refresh to check the latest status.",
            hash,
        });

    } catch (err) {
        next(err);
    }
});
app.use((err, req, res, next) => {
    const { message = "something went wrong/default message to debug u have to dig deepper", statusCode = 500 } = err
    console.log("**********error**************")
    console.log("**********error**************")
    console.log(message, statusCode)
    console.log("**********error**************")
    console.log("**********error**************")
    res.status(statusCode).json({ message })
})
//listening or starting the server
app.listen(process.env.PORT || 3000, () => {
    console.log(`starting the server successfully on ${process.env.PORT}`)
})