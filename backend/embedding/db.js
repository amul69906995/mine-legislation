const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const MONGO_DB = process.env.MONGO_DB || 'minelegislation';
const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'india';
const { MongoClient } = require('mongodb');

const client = new MongoClient(MONGO_URI);
const db = client.db(MONGO_DB);
const col = db.collection(MONGO_COLLECTION);
async function connectToDb() {
  await client.connect();
  console.log('Connected successfully to server');
}

async function fetchAllChunk() {
  const docs = await col.find({}).toArray();
  console.log(docs) 
  return docs;
}
async function fetchBatchChunk(batchSize=50){

  const docs = await col
    .find({ is_pinecone_upserted: { $ne: true } }) 
    .limit(batchSize)
    .toArray();
  if (!docs || docs.length === 0) return null;
  return docs;
}
module.exports={fetchAllChunk,connectToDb,fetchBatchChunk,client,db,col,MONGO_COLLECTION}