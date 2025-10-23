//db connection
const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config({ path: '../.env' })
// console.log(process.env.PINECONE_API_KEY)
const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});
//data file
// data\india\coal_bearing_area_acquisition_and_development_1957.pdf
// data\india\coal_mines_labour_welfare.pdf
// data\india\coal_mines_nationalisation_1973.pdf
// data\india\coal_mines_provident_fund.pdf
// data\india\coal_mines_regulation_2017.pdf
// data\india\coal_mines_special_provisions_act_2015.pdf
// data\india\indian_mines_act_1952.pdf
// data\india\mines_minerals_development_regulation_1957.pdf
// data\india\mines_rescue_rules_1985.pdf
// data\india\mines_rules_1955.pdf

//getting data
const fs = require('fs/promises');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function extractTextFromPDF(filePath) {
    const parser = new PDFParse({ url: filePath });
    const result = await parser.getText();
    console.log(result.text);
    return result.text
}

async function loadAllPDFs(folderPath) {
    const files = await fs.readdir(folderPath);
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));

    const allTexts = [];

    for (const file of pdfFiles) {
        const fullPath = path.join(folderPath, file);
        console.log(`📘 Extracting from: ${file}`);
        const text = await extractTextFromPDF(fullPath);
        allTexts.push({ file, text });
    }

    return allTexts;
}

(async () => {
    console.log(__dirname)
    const folderPathToData=path.join(__dirname,"..","data/india")
    const allTexts = await loadAllPDFs(folderPathToData);
   console.log(`✅ Loaded ${allTexts.length} PDF(s).`);
})();
