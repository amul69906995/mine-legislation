const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const MONGO_DB = process.env.MONGO_DB || 'minelegislation';
const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'chunks';
const { MongoClient } = require('mongodb');

const client = new MongoClient(MONGO_URI);

async function connectToDb() {
  await client.connect();
  console.log('Connected successfully to server');
}

async function saveToMongoDb(chunkObj) {
  const db = client.db(MONGO_DB);
  const col = db.collection(MONGO_COLLECTION);
  await col.insertOne(chunkObj);
  //console.log('saved chunk to mongo:', { doc_hint: chunkObj.doc_hint, chunk_index: chunkObj.chunk_index });
}

module.exports={saveToMongoDb,connectToDb}