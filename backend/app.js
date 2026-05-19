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
const FileModel = require('./model/file_model')
const { spawn } = require("child_process");
const cloudinary = require("cloudinary").v2;
const { deleteLocalFile } = require('./helper')


//db connections
connectToDb()

//cors
const corsOrigin = process.env.FRONTEND_URL || true;
app.use(cors({ origin: corsOrigin }))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())


//cloudinary invoke
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

//pinecone
const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY_2 || process.env.PINECONE_API_KEY
});
const index = pc.index(
    process.env.PINECONE_INDEX, process.env.PINECONE_HOST);

// allowed countries (mirrors frontend Sidebar/Upload options)
const ALLOWED_COUNTRIES = new Set([
    "india", "australia", "canada", "russia", "usa", "south africa"
]);

//routes
app.get('/', (req, res) => {
    res.send("good to go!!")
})
app.post('/chat', async (req, res, next) => {
    try {
        const { country, query, model } = req.body;
        console.log(country, query, model)
        if (!query) return next(new appError("query required", 400));
        if (!model) return next(new appError("model required", 400));
        if (model === "rag") {
            if (!country || !ALLOWED_COUNTRIES.has(country)) {
                return next(new appError("invalid country", 400));
            }
            const namespace = index.namespace(country);
            const response = await namespace.searchRecords({
                query: {
                    topK: 5,
                    inputs: { text: query },
                },
                fields: ["chunk_text", "file_name", "country", "mongoIdForFileName"],
            });
            console.log("this is response from pinecone", response)
            //23.6%, 38.2%, 50%, 61.8%, 78.6%
            //score level above .236
            const MIN_CHUNK_SCORE = 0.236;
            const hits = response?.result?.hits || [];
            console.log("hits", hits)
            const validHits = hits.filter(h => h._score >= MIN_CHUNK_SCORE);

            if (validHits.length === 0) {
                return res.json({
                    message: "Your query does not relate to mining legislation.",
                    rag_source: [],
                });
            }
            const topScore = validHits[0]._score;
            const avgScore = validHits.reduce((sum, h) => sum + h._score, 0) / validHits.length;
            console.log("topScore:", topScore, "avgScore:", avgScore);

            let selectedHits;
            if (avgScore < 0.382) {
                selectedHits = validHits;
            } else {
                selectedHits = validHits.filter(h => h._score >= 0.382);
            }
            if (selectedHits.length === 0) {
                selectedHits = validHits.slice(0, 1);
            }
            //console.log(selectedHits);
            const llmResponse = await getLlmResponse(query, selectedHits);
            //console.log(llmResponse)
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
            console.log(response)
            const { answer } = await response.json();
            console.log(answer);

            res.json({ message: answer })
        }
        else if (model === "trained") {
            console.log("here we will invoke trained model with user query and country")
            res.json({ message: "here we will invoke trained model with user query and country still training..." })
        }
        else {
            return next(new appError(`unknown model: ${model}`, 400));
        }
    } catch (err) {
        console.log("error from model", err)
        next(err);
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
        if (!country || !ALLOWED_COUNTRIES.has(country)) {
            return next(new appError("invalid country", 400));
        }

        // strip any path components from filename to prevent path traversal
        const safeName = path.basename(file.originalname);
        if (!safeName || safeName.startsWith(".") || !safeName.toLowerCase().endsWith(".pdf")) {
            return next(new appError("invalid filename", 400));
        }

        // 🔥 Generate SHA256 hash
        const hash = crypto
            .createHash("sha256")
            .update(file.buffer)
            .digest("hex");

        const isFileExist = await FileModel.findOne({
            hash,
            status: { $in: ["processing", "completed"] }
        });
        console.log("isFileExist inside /upload", isFileExist)

        if (isFileExist) {
            return next(new appError(`File already ${isFileExist.status}`, 400));
        }

        // Create country folder
        const uploadDir = path.join(__dirname, "data", country);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, safeName);

        fs.writeFileSync(filePath, file.buffer);

        // Reuse failed record if hash already exists, otherwise create fresh
        const newFile = await FileModel.findOneAndUpdate(
            { hash },
            {
                filename: safeName,
                country,
                filePath,
                hash,
                fileSize: file.size,
                status: "processing",
                errorMessage: null,
                processedAt: null,
            },
            { upsert: true, returnDocument: "after" }
        );
        // 🔥 Invoke Python processing here (background)
        // spawn(...) etc.
        //change status of that file and save document to db
        // SPAWN PYTHON PROCESS


        // override with PYTHON_BIN env var (e.g. "python" on Windows, "python3" on macOS)
        console.log(process.env.PYTHON_BIN)
        const pythonProcess = spawn(process.env.PYTHON_BIN || "python3", [
            "-u", // unbuffered stdout so Python print()s stream live
            path.join(
                __dirname,
                "..",
                "aman_aditya_training_model",
                "data_pipeline",
                "vd_fill.py"
            ),

            filePath,

            country.toLowerCase(),

            newFile._id.toString()
        ]);
        pythonProcess.stdout.on("data", (data) => {

            console.log(
                `PYTHON STDOUT: ${data.toString()}`
            );
        });
        pythonProcess.stderr.on("data", (data) => {

            console.error(
                `PYTHON STDERR: ${data.toString()}`
            );
        });
        pythonProcess.on("close", async (code) => {
            console.log(`Python exited with code ${code}`);

            if (code !== 0) {
                deleteLocalFile(filePath);

                await FileModel.findByIdAndUpdate(newFile._id, {
                    status: "failed",
                    errorMessage: "Pipeline processing failed"
                });

                return;
            }

            // ✅ Python succeeded → now handle upload separately
            try {
                const uniqueFileName = `${newFile._id}.pdf`;

                const cloudinaryResponse = await cloudinary.uploader.upload(
                    filePath,
                    {
                        resource_type: "raw",
                        folder: `mine-legislation/${country}`,
                        public_id: uniqueFileName,
                        overwrite: true,
                    }
                );

                console.log("Cloudinary upload success:", cloudinaryResponse.secure_url);

                await FileModel.findByIdAndUpdate(newFile._id, {
                    status: "completed",
                    processedAt: new Date(),
                    cloudinaryUrl: cloudinaryResponse.secure_url,
                    cloudinaryPublicId: cloudinaryResponse.public_id,
                });

            } catch (err) {
                console.error("Cloudinary upload failed:", err);

                // ✅ IMPORTANT: mark as failed due to upload
                await FileModel.findByIdAndUpdate(newFile._id, {
                    status: "completed",
                    errorMessage: "Cloudinary upload failed"
                });
            } finally {
                // ✅ Always clean up
                deleteLocalFile(filePath);
            }
        });
        return res.json({ success: true, message: "File uploaded successfully. Processing started.", fileId: newFile._id });
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