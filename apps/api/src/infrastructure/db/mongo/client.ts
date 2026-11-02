import { MongoClient, type Db } from 'mongodb';

export const createMongo = async (url: string, dbName?: string): Promise<{ client: MongoClient; db: Db }> => {
  // directConnection: sem isso o driver tenta descobrir um replica set e demora a desistir em um nó único.
  const client = new MongoClient(url, { directConnection: true, serverSelectionTimeoutMS: 5_000 });
  await client.connect();
  return { client, db: client.db(dbName) };
};