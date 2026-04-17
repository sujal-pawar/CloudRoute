import "server-only"

import { MongoClient } from "mongodb"

const globalForMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>
}

function createMongoClient() {
  const mongoUri = process.env.MONGODB_URI

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set. Add it to your environment variables.")
  }

  return new MongoClient(mongoUri)
}

export function getMongoClient() {
  if (!globalForMongo._mongoClientPromise) {
    const client = createMongoClient()
    globalForMongo._mongoClientPromise = client.connect()
  }

  return globalForMongo._mongoClientPromise
}

export async function getDatabase() {
  const client = await getMongoClient()
  const dbName = process.env.MONGODB_DB_NAME || "cloudroute"

  return client.db(dbName)
}
