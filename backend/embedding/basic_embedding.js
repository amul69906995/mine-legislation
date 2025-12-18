//will use basic pinecone auto embedder(llama-text-embed-v2)
const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config({ path: '../.env' })
const batchSize = 20;
const indexName = 'minelegislation';
const { fetchBatchChunk, fetchAllChunk, connectToDb, client, db, col, MONGO_COLLECTION } = require('./db')
//console.log(process.env.PINECONE_API_KEY_2)

connectToDb().then(() => console.log("data connected success")).catch(error => {
    console.log(error)
})
const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY_2
});
const namespace = pc.index(indexName, process.env.PINECONE_HOST).namespace(MONGO_COLLECTION);

//we create index only once so run this only once or if u deleted index on pinecone u can create using below code
// /*createPineConeIndex()*/

const createPineConeIndex = async () => {
    try {
        const res = await pc.createIndexForModel({
            name: indexName,
            cloud: 'aws',
            region: 'us-east-1',
            embed: {
                model: 'llama-text-embed-v2',
                fieldMap: { text: 'chunk_text' },
            },
            waitUntilReady: true,
        });
        console.log("pinecone index created.......", res)
    } catch (error) {
        console.log("error creating index........", error)
    }
}
const sendChunkToPineCone = async () => {
    while (true) {
        const docs = await col.find({ is_pinecone_upserted: { $ne: true } })
            .limit(batchSize)
            .toArray();
        //break out of loop if we upserted all doc                     
        if (!docs || docs.length === 0) {
            console.log("All chunks embedded — finished");
            break;
        }
        console.log(`Processing batch of ${docs.length}`, "Namespace:", MONGO_COLLECTION);

        // 2) Build Pinecone records (chunk_text must match fieldMap in createIndexForModel)
        const records = docs.map(d => ({
            chunk_text: d.text,
            id: String(d._id),
            snippet: d.snippet,
            doc_hint:d.doc_hint,
            section_title: d.section_title,
            split_reason: d.split_reason,
            chunk_index: d.chunk_index,
            jurisdiction_level: d.jurisdiction_level,
            mineral_scope: d.mineral_scope,
            file_name: d.file_name,
            source_path: d.source_path,
        }));
        console.log("records to be upsert......", records);
        // 3) Upsert into Pinecone (simple call)
        await namespace.upsertRecords(records)
        // 4) Mark chunks as processed
        const ids = docs.map(d => d._id);

        await col.updateMany(
            { _id: { $in: ids } },
            {
                $set: {
                    is_pinecone_upserted: true,
                    pinecone_upserted_at: new Date(),
                    pinecone_namespace: MONGO_COLLECTION
                }
            }
        );
        console.log(`Batch completed chunks embedded.`);
    }
}

sendChunkToPineCone().catch(e => {
    console.log(e)
})
// createPineConeIndex()
//we need to recursively call sendchunkTopine until we meet base condition i.e we don't have any chunk left
