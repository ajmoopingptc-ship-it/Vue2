import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import mysql from "mysql2/promise";
import { z } from "zod";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const cookieName = "grove_session";
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be set to at least 32 characters.");
}

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "db",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "grove_app",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ?? "grove",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const emailSchema = z
  .string()
  .trim()
  .email("กรุณากรอกอีเมลให้ถูกต้อง")
  .max(254)
  .transform((value) => value.toLowerCase());

const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "กรุณากรอกชื่อ").max(80),
    lastName: z.string().trim().min(1, "กรุณากรอกนามสกุล").max(80),
    username: z
      .string()
      .trim()
      .min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร")
      .max(30)
      .regex(/^[a-zA-Z0-9._-]+$/, "ใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดกลาง และขีดล่าง")
      .transform((value) => value.toLowerCase()),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s()-]{8,20}$/, "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง")
      .transform((value) => value.replace(/[\s()-]/g, "")),
    password: z
      .string()
      .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
      .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "รหัสผ่านยาวเกินไป"),
  })
  .strict();

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "12kb" }));
app.use(cookieParser());
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "มีการลองทำรายการหลายครั้งเกินไป กรุณารอสักครู่" },
  }),
);

function publicUser(row) {
  return {
    id: String(row.id),
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    email: row.email,
    phone: row.phone,
  };
}

function setSessionCookie(response, userId) {
  const token = jwt.sign({ sub: String(userId) }, jwtSecret, { expiresIn: "1d" });
  response.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "strict",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(response) {
  response.clearCookie(cookieName, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "strict",
    path: "/",
  });
}

app.get("/api/health", async (_request, response) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok" });
  } catch {
    response.status(503).json({ status: "unavailable" });
  }
});

app.post("/api/auth/register", async (request, response) => {
  const result = registerSchema.safeParse(request.body);
  if (!result.success) {
    return response.status(400).json({
      message: "กรุณาตรวจสอบข้อมูลที่กรอก",
      fields: result.error.flatten().fieldErrors,
    });
  }

  const { firstName, lastName, username, email, phone, password } = result.data;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const [insertResult] = await pool.execute(
      `INSERT INTO users (first_name, last_name, username, email, phone, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, username, email, phone, passwordHash],
    );
    const [rows] = await pool.execute(
      `SELECT id, first_name, last_name, username, email, phone
       FROM users WHERE id = ?`,
      [insertResult.insertId],
    );

    setSessionCookie(response, insertResult.insertId);
    return response.status(201).json({ user: publicUser(rows[0]) });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return response.status(409).json({ message: "อีเมลหรือชื่อผู้ใช้นี้ถูกใช้แล้ว" });
    }
    console.error("Registration failed:", error.message);
    return response.status(500).json({ message: "ไม่สามารถสมัครสมาชิกได้ในขณะนี้" });
  }
});

app.post("/api/auth/login", async (request, response) => {
  const result = loginSchema.safeParse(request.body);
  if (!result.success) {
    return response.status(400).json({ message: "กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน" });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, first_name, last_name, username, email, phone, password_hash
       FROM users WHERE email = ? LIMIT 1`,
      [result.data.email],
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(result.data.password, user.password_hash))) {
      return response.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    setSessionCookie(response, user.id);
    return response.json({ user: publicUser(user) });
  } catch (error) {
    console.error("Login failed:", error.message);
    return response.status(500).json({ message: "ไม่สามารถเข้าสู่ระบบได้ในขณะนี้" });
  }
});

app.get("/api/auth/me", async (request, response) => {
  const token = request.cookies[cookieName];
  if (!token) {
    return response.status(401).json({ message: "ยังไม่ได้เข้าสู่ระบบ" });
  }

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    clearSessionCookie(response);
    return response.status(401).json({ message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" });
  }

  if (typeof payload === "string" || typeof payload.sub !== "string") {
    clearSessionCookie(response);
    return response.status(401).json({ message: "เซสชันไม่ถูกต้อง" });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, first_name, last_name, username, email, phone
       FROM users WHERE id = ? LIMIT 1`,
      [payload.sub],
    );
    if (!rows[0]) {
      clearSessionCookie(response);
      return response.status(401).json({ message: "ไม่พบบัญชีผู้ใช้" });
    }
    return response.json({ user: publicUser(rows[0]) });
  } catch (error) {
    console.error("Session lookup failed:", error.message);
    return response.status(500).json({ message: "ไม่สามารถตรวจสอบบัญชีได้ในขณะนี้" });
  }
});

app.post("/api/auth/logout", (_request, response) => {
  clearSessionCookie(response);
  response.status(204).end();
});

app.use((error, _request, response, _next) => {
  console.error("Unhandled API error:", error.message);
  response.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Grove API listening on port ${port}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
