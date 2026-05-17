const fs = require("fs");

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
module.exports={deleteLocalFile}