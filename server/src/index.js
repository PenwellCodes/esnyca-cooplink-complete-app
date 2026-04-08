import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getPool, sql } from "./db.js";
import { signToken, requireAuth } from "./auth.js";
import { uploadToImgBB } from "./imgbb.js";

const app = express();

// ================== MIDDLEWARE ==================
app.use(cors());
app.use(express.json({ limit: "20mb" }));

// ================== HEALTH CHECKS ==================
app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/health/db", async (_req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query("SELECT 1 AS ok");

    return res.json({
      ok: true,
      db: "connected",
      server: process.env.MSSQL_SERVER || null,
      database: process.env.MSSQL_DATABASE || null,
      port: process.env.MSSQL_PORT ? Number(process.env.MSSQL_PORT) : null,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      db: "disconnected",
      error: error?.message || "Database connection failed",
      code: error?.code || null,
    });
  }
});

// ================== AUTHENTICATION ==================
app.post("/auth/register", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    displayName: z.string().min(1),
    role: z.enum(["individual", "cooperative"]).default("individual"),
    phoneNumber: z.string().optional(),
    region: z.string().optional(),
    registrationNumber: z.string().optional(),
    physicalAddress: z.string().optional(),
    content: z.string().optional(),
    companyAddress: z.string().optional(),
    profilePicBase64: z.string().optional(),
    profilePicName: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data = parsed.data;

  try {
    const pool = await getPool();

    const existing = await pool
      .request()
      .input("Email", sql.NVarChar(320), data.email.toLowerCase())
      .query("SELECT TOP 1 Id FROM dbo.Users WHERE Email = @Email");
    
    if (existing.recordset.length) {
      return res.status(409).json({ error: "Email already in use" });
    }

    let profilePicUrl = null;
    if (data.profilePicBase64) {
      const uploaded = await uploadToImgBB({
        base64: data.profilePicBase64,
        name: data.profilePicName,
      });
      profilePicUrl = uploaded.url;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const insert = await pool
      .request()
      .input("Email", sql.NVarChar(320), data.email.toLowerCase())
      .input("PasswordHash", sql.NVarChar(255), passwordHash)
      .input("Role", sql.NVarChar(32), data.role)
      .input("DisplayName", sql.NVarChar(120), data.displayName)
      .input("PhoneNumber", sql.NVarChar(40), data.phoneNumber ?? null)
      .input("Region", sql.NVarChar(40), data.region ?? null)
      .input("RegistrationNumber", sql.NVarChar(80), data.registrationNumber ?? null)
      .input("PhysicalAddress", sql.NVarChar(255), data.physicalAddress ?? null)
      .input("Content", sql.NVarChar(sql.MAX), data.content ?? null)
      .input("ProfilePicUrl", sql.NVarChar(2048), profilePicUrl)
      .input("CompanyAddress", sql.NVarChar(255), data.companyAddress ?? null)
      .query(`
        INSERT INTO dbo.Users
          (Email, PasswordHash, Role, DisplayName, PhoneNumber, Region, RegistrationNumber, PhysicalAddress, Content, ProfilePicUrl, CompanyAddress)
        OUTPUT inserted.Id, inserted.Email, inserted.Role, inserted.DisplayName, inserted.ProfilePicUrl
        VALUES
          (@Email, @PasswordHash, @Role, @DisplayName, @PhoneNumber, @Region, @RegistrationNumber, @PhysicalAddress, @Content, @ProfilePicUrl, @CompanyAddress)
      `);

    const user = insert.recordset[0];
    const token = signToken({ userId: user.Id, email: user.Email, role: user.Role });
    return res.json({ token, user });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

app.post("/auth/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const pool = await getPool();
    const r = await pool
      .request()
      .input("Email", sql.NVarChar(320), parsed.data.email.toLowerCase())
      .query(
        "SELECT TOP 1 Id, Email, PasswordHash, Role, DisplayName, ProfilePicUrl FROM dbo.Users WHERE Email = @Email"
      );
    if (!r.recordset.length) return res.status(401).json({ error: "Invalid credentials" });

    const user = r.recordset[0];
    const ok = await bcrypt.compare(parsed.data.password, user.PasswordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken({ userId: user.Id, email: user.Email, role: user.Role });
    delete user.PasswordHash;
    return res.json({ token, user });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

// ================== UPLOADS & DATA ==================
app.post("/upload/image", requireAuth, async (req, res) => {
  const schema = z.object({
    base64: z.string().min(1),
    name: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const uploaded = await uploadToImgBB({ base64: parsed.data.base64, name: parsed.data.name });
    return res.json(uploaded);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Upload failed" });
  }
});

app.get("/news", async (_req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query("SELECT TOP 50 * FROM dbo.News ORDER BY CreatedAt DESC");
    return res.json({ items: r.recordset });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

// ================== SERVER START ==================
const PORT = Number(process.env.PORT || 4001);

// We use "0.0.0.0" to allow the server to accept connections from 
// any device (phone, laptop, etc.) targeting this server's IP.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is running!`);
  console.log(`Local Access:   http://localhost:${PORT}`);
  console.log(`Network Access: http://207.180.254.163:${PORT}`);
});
