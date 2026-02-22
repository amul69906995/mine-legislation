import { useEffect, useState } from "react";
import "./fileinfo.css";

const FileInfoList = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const url = `${import.meta.env.VITE_BACKEND_URL}/file-info`;
                const res = await fetch(url);
                const data = await res.json();
                setFiles(data.files || []);
                setLoading(false);
            } catch (error) {
                setError("Failed to fetch files",error);
                setLoading(false);
            }
        };

        fetchFiles();
    }, []);

    if (loading) return <p>Loading files...</p>;
    if (error) return <p className="error-msg">{error}</p>;
    if (files.length === 0) return <p>No files uploaded yet.</p>;

    return (
        <div className="file-table-wrapper">
            <table className="file-table">
                <thead>
                    <tr>
                        <th className="col-number">#</th>
                        <th className="col-filename">File Name</th>
                        <th className="col-country">Country</th>
                        <th className="col-status">Status</th>
                        <th className="col-hash">Hash</th>
                        <th className="col-size">Size (MB)</th>
                        <th className="col-date">Created At</th>
                    </tr>
                </thead>

                <tbody>
                    {files.map((file, index) => {
                        const sizeInMB = (file.fileSize / (1024 * 1024)).toFixed(2);

                        const formattedDate = new Date(file.createdAt)
                            .toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            });

                        return (
                            <tr key={file._id}>
                                <td className="col-number">
                                    {index + 1}
                                </td>

                                <td className="truncate col-filename" title={file.filename}>
                                    {file.filename}
                                </td>

                                <td className="col-country">
                                    {file.country}
                                </td>

                                <td className="col-status">
                                    <span className={`status ${file.status}`}>
                                        {file.status}
                                    </span>
                                </td>

                                <td className="truncate col-hash" title={file.hash}>
                                    {file.hash}
                                </td>

                                <td className="col-size">{sizeInMB}</td>

                                <td className="col-date">
                                    {formattedDate}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default FileInfoList;