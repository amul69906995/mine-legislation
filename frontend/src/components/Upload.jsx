import { useState, useEffect } from "react";
import FileInfoList from "./FileInfo";
import './upload.css'
const Upload = () => {
    const [file, setFile] = useState(null);
    const [country, setCountry] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [previewUrl, setPreviewUrl] = useState(null);

    const MAX_SIZE = 100 * 1024 * 1024; // 100MB

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];

        setError("");
        setSuccess("");

        if (!selectedFile) return;

        if (selectedFile.type !== "application/pdf") {
            setError("Only PDF files are allowed.");
            return;
        }

        if (selectedFile.size > MAX_SIZE) {
            setError("File size must be less than 100MB.");
            return;
        }

        setFile(selectedFile);

        // Create preview URL
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
    };

    const handlePreview = () => {
        if (previewUrl) {
            window.open(previewUrl, "_blank");
        }
    };

    const handleUpload = async () => {
        setError("");
        setSuccess("");

        if (!file) {
            setError("Please select a PDF file first.");
            return;
        }

        if (!country) {
            setError("Please select a country.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("country", country);

        try {
            const url = `${import.meta.env.VITE_BACKEND_URL}/upload`;
            const response = await fetch(url, {
                method: "POST",
                body: formData,
            });
            const data = await response.json();  // 👈 read body always

            if (!response.ok) {
                throw new Error(data.message || "Upload failed. Please try again.");
            }

            setSuccess("File uploaded successfully!");
            setFile(null);
            setCountry("");
            setPreviewUrl(null);
        } catch (error) {
            console.log("this error is in upload file", error.message);
            setError(error.message);
        }
    };

    return (
        <div className="page-container">

            <div className="upload-card">
                <h1>Upload New Legislation Data</h1>

                <div className="info-box">
                    <strong>⚠ Important:</strong>
                    <ul>
                        <li>Upload only unique PDF files.</li>
                        <li>Duplicate files create redundant embeddings.</li>
                        <li>Use meaningful file names.</li>
                        <li>Example: <em>"Mines Act 1952.pdf"</em></li>
                    </ul>
                </div>

                <div className="form-group">
                    <label>Select Country</label>
                    <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                    >
                        <option value="">-- Select Country --</option>
                        <option value="india">India</option>
                        <option value="australia">Australia</option>
                        <option value="canada">Canada</option>
                        <option value="russia">Russia</option>
                        <option value="usa">USA</option>
                        <option value="south africa">South Africa</option>
                    </select>
                </div>

                <div className="form-group">
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                    />
                </div>

                {file && (
                    <p className="selected-file">
                        Selected: <strong>{file.name}</strong>
                    </p>
                )}

                <div className="button-group">
                    <button
                        onClick={handlePreview}
                        disabled={!file}
                        className="btn secondary"
                    >
                        Preview
                    </button>

                    <button
                        onClick={handleUpload}
                        className="btn primary"
                    >
                        Upload
                    </button>
                </div>

                {error && <p className="error-msg">{error}</p>}
                {success && <p className="success-msg">{success}</p>}
            </div>

            <div className="documents-section">
                <h2>Uploaded Documents</h2>
                <FileInfoList />
            </div>

        </div>
    );
};

export default Upload;