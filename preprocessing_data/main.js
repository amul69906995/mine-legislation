const allFiles = require('./file_config.json');
const { connectToDb } = require('./db_helpers')
const { processAFile } = require('./process_file');


const main = async () => {
   await connectToDb()

    for (let file of allFiles) {
        console.log(file)
        await processAFile(file);
    }
};

main();
