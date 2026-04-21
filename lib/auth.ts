import "server-only"

import { randomBytes } from "node:crypto"

import { compare, hash } from "bcryptjs"
import { MongoServerError, ObjectId, type WithId } from "mongodb"

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth-constants"
import { DEMO_NAME, DEMO_PASSWORD, DEMO_USERNAME } from "@/lib/demo-credentials"
import { getDatabase } from "@/lib/db"
import {
  decryptCloudCredentials,
  encryptCloudCredentials,
} from "@/lib/security/credentials-crypto"
import type { CloudCredentials, DataSourceType } from "@/lib/types"

const USERS_COLLECTION = "users"
const SESSIONS_COLLECTION = "sessions"

interface DbUserDocument {
  username: string
  name: string
  passwordHash: string
  createdAt: Date
}

interface DbSessionDocument {
  token: string
  userId: ObjectId
  createdAt: Date
  expiresAt: Date
  dataSource: DataSourceType
  cloudCredentialsEncrypted: string | null
  updatedAt: Date
}

export interface AuthUser {
  id: string
  username: string
  name: string
}

export interface AuthSessionContext {
  user: AuthUser
  dataSource: DataSourceType
  cloudCredentials: CloudCredentials | null
}

let indexesReady = false
let demoUserReady = false

function normalizeUsername(username: string) {
  return username.trim().toLowerCase()
}

function sanitizeUser(user: WithId<DbUserDocument>): AuthUser {
  return {
    id: user._id.toHexString(),
    username: user.username,
    name: user.name,
  }
}

async function ensureIndexes() {
  if (indexesReady) {
    return
  }

  const db = await getDatabase()

  await db.collection<DbUserDocument>(USERS_COLLECTION).createIndex(
    { username: 1 },
    {
      unique: true,
      name: "users_unique_username",
    }
  )

  await db.collection<DbSessionDocument>(SESSIONS_COLLECTION).createIndex(
    { token: 1 },
    {
      unique: true,
      name: "sessions_unique_token",
    }
  )

  await db.collection<DbSessionDocument>(SESSIONS_COLLECTION).createIndex(
    { expiresAt: 1 },
    {
      expireAfterSeconds: 0,
      name: "sessions_ttl_expiresAt",
    }
  )

  indexesReady = true
}

async function ensureDemoUser() {
  if (demoUserReady) {
    return
  }

  await ensureIndexes()

  const db = await getDatabase()
  const users = db.collection<DbUserDocument>(USERS_COLLECTION)
  const normalizedDemoUsername = normalizeUsername(DEMO_USERNAME)

  const existingUser = await users.findOne({ username: normalizedDemoUsername })

  if (!existingUser) {
    const passwordHash = await hash(DEMO_PASSWORD, 10)

    await users
      .insertOne({
        username: normalizedDemoUsername,
        name: DEMO_NAME,
        passwordHash,
        createdAt: new Date(),
      })
      .catch((error: unknown) => {
        if (error instanceof MongoServerError && error.code === 11000) {
          return
        }

        throw error
      })
  }

  demoUserReady = true
}

export async function createUser(input: {
  username: string
  password: string
  name?: string
}) {
  await ensureIndexes()

  const db = await getDatabase()
  const users = db.collection<DbUserDocument>(USERS_COLLECTION)

  const normalizedUsername = normalizeUsername(input.username)
  const passwordHash = await hash(input.password, 10)
  const normalizedName = input.name?.trim() || normalizedUsername

  const userDoc: DbUserDocument = {
    username: normalizedUsername,
    name: normalizedName,
    passwordHash,
    createdAt: new Date(),
  }

  try {
    const result = await users.insertOne(userDoc)
    return {
      id: result.insertedId.toHexString(),
      username: userDoc.username,
      name: userDoc.name,
    }
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new Error("USERNAME_TAKEN")
    }

    throw error
  }
}

export async function verifyCredentials(username: string, password: string) {
  await ensureDemoUser()
  await ensureIndexes()

  const db = await getDatabase()
  const users = db.collection<DbUserDocument>(USERS_COLLECTION)

  const normalizedUsername = normalizeUsername(username)
  const user = await users.findOne({ username: normalizedUsername })

  if (!user) {
    return null
  }

  const passwordMatches = await compare(password, user.passwordHash)

  if (!passwordMatches) {
    return null
  }

  return sanitizeUser(user)
}

export async function createSession(userId: string) {
  await ensureIndexes()

  const db = await getDatabase()
  const sessions = db.collection<DbSessionDocument>(SESSIONS_COLLECTION)

  const token = randomBytes(32).toString("hex")
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000)

  const sessionDoc: DbSessionDocument = {
    token,
    userId: new ObjectId(userId),
    createdAt: now,
    expiresAt,
    dataSource: "demo",
    cloudCredentialsEncrypted: null,
    updatedAt: now,
  }

  await sessions.insertOne(sessionDoc)

  return { token, expiresAt }
}

export async function getUserBySessionToken(token: string) {
  const context = await getSessionContextByToken(token)
  return context?.user ?? null
}

export async function getSessionContextByToken(
  token: string
): Promise<AuthSessionContext | null> {
  await ensureIndexes()

  const db = await getDatabase()
  const sessions = db.collection<DbSessionDocument>(SESSIONS_COLLECTION)
  const users = db.collection<DbUserDocument>(USERS_COLLECTION)

  const session = await sessions.findOne({ token })

  if (!session) {
    return null
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await sessions.deleteOne({ _id: session._id })
    return null
  }

  const user = await users.findOne({ _id: session.userId })

  if (!user) {
    return null
  }

  return {
    user: sanitizeUser(user),
    dataSource: session.dataSource ?? "demo",
    cloudCredentials: decryptCloudCredentials(session.cloudCredentialsEncrypted),
  }
}

export async function setSessionCloudConnection(
  token: string,
  input: {
    dataSource: DataSourceType
    cloudCredentials?: CloudCredentials | null
  }
): Promise<AuthSessionContext | null> {
  await ensureIndexes()

  const db = await getDatabase()
  const sessions = db.collection<DbSessionDocument>(SESSIONS_COLLECTION)

  const cloudCredentials =
    input.dataSource === "demo" ? null : input.cloudCredentials ?? null
  const cloudCredentialsEncrypted = cloudCredentials
    ? encryptCloudCredentials(cloudCredentials)
    : null

  const updateResult = await sessions.updateOne(
    { token },
    {
      $set: {
        dataSource: input.dataSource,
        cloudCredentialsEncrypted,
        updatedAt: new Date(),
      },
    }
  )

  if (updateResult.matchedCount === 0) {
    return null
  }

  return getSessionContextByToken(token)
}

export async function deleteSession(token: string) {
  await ensureIndexes()

  const db = await getDatabase()
  await db.collection<DbSessionDocument>(SESSIONS_COLLECTION).deleteOne({ token })
}

export function sessionCookieConfig() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  }
}
