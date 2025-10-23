const { Pinecone } =require('@pinecone-database/pinecone');
require('dotenv').config({path:'../.env'})
// console.log(process.env.PINECONE_API_KEY)
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

