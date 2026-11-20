import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { defaultCategories } from "../utils/defaultCategories.js";
import { sendEmail } from "../utils/notifier.js";

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const RESET_TOKEN_TTL = "15m";

// Reset tokens use a derived secret so they can never be used as login tokens.
const resetSecret = () => `${process.env.JWT_SECRET}:password-reset`;

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });

export const register = async (req, res) => {
  const { name, email, password, currency = "USD" } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Name, email, and password are required",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters",
    });
  }

  const client = await pool.connect();

  try {
    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    await client.query("BEGIN");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, currency)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, currency, created_at`,
      [name, email, passwordHash, currency],
    );

    const user = userResult.rows[0];

    for (const cat of defaultCategories) {
      await client.query(
        `INSERT INTO categories (user_id, name, type, icon, color, is_default)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [user.id, cat.name, cat.type, cat.icon, cat.color],
      );
    }

    await client.query("COMMIT");

    const token = signToken(user.id);

    res.status(201).json({
      user,
      token,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Register error:", error);

    res.status(500).json({
      message: "Server error",
    });
  } finally {
    client.release();
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, email, password_hash, currency FROM users WHERE email = $1",
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const token = signToken(user.id);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, currency, created_at FROM users WHERE id = $1",
      [req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("GetMe error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const findUserByEmail = async (rawEmail) => {
  const email = String(rawEmail || "").trim();
  if (!email || !email.includes("@")) return { error: "Enter a valid email address" };
  const result = await pool.query(
    "SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)",
    [email],
  );
  return { user: result.rows[0] };
};

const GENERIC_SENT_MESSAGE =
  "If an account exists for that email, an OTP has been sent.";

export const forgotPassword = async (req, res) => {
  try {
    const { user, error } = await findUserByEmail(req.body.email);
    if (error) return res.status(400).json({ message: error });

    // Don't reveal whether the account exists.
    if (!user) return res.json({ message: GENERIC_SENT_MESSAGE });

    const recent = await pool.query(
      `SELECT created_at FROM password_resets
       WHERE user_id = $1 AND created_at > NOW() - make_interval(secs => $2)
       ORDER BY created_at DESC LIMIT 1`,
      [user.id, OTP_RESEND_COOLDOWN_SECONDS],
    );
    if (recent.rows.length > 0) {
      return res.status(429).json({
        message: `Please wait ${OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting another OTP`,
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    // Invalidate any earlier, still-open requests.
    await pool.query(
      "UPDATE password_resets SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
      [user.id],
    );

    const inserted = await pool.query(
      `INSERT INTO password_resets (user_id, otp_hash, expires_at)
       VALUES ($1, $2, NOW() + make_interval(mins => $3))
       RETURNING id`,
      [user.id, otpHash, OTP_TTL_MINUTES],
    );

    const text = `Your ExpenseAI password reset code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes. If you didn't request this, ignore this message.`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Your ExpenseAI password reset code",
        text,
        html: `<p>Hi ${user.name.replace(/[<>&"]/g, "")},</p>
<p>Your password reset code is:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px">${otp}</p>
<p>It expires in ${OTP_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>`,
      });
    } catch (sendError) {
      await pool.query("DELETE FROM password_resets WHERE id = $1", [inserted.rows[0].id]);
      console.error("OTP delivery error:", sendError);
      return res.status(503).json({
        message:
          sendError.code === "DELIVERY_NOT_CONFIGURED"
            ? sendError.message
            : "Could not send OTP right now. Please try again.",
      });
    }

    res.json({ message: GENERIC_SENT_MESSAGE });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const verifyResetOtp = async (req, res) => {
  const otp = String(req.body.otp || "").trim();
  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: "Enter the 6-digit OTP" });
  }

  try {
    const { user, error } = await findUserByEmail(req.body.email);
    if (error) return res.status(400).json({ message: error });

    const invalid = { message: "Invalid or expired OTP" };
    if (!user) return res.status(400).json(invalid);

    const result = await pool.query(
      `SELECT id, otp_hash, attempts FROM password_resets
       WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user.id],
    );
    const reset = result.rows[0];
    if (!reset) return res.status(400).json(invalid);

    if (reset.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        message: "Too many incorrect attempts. Please request a new OTP.",
      });
    }

    const match = await bcrypt.compare(otp, reset.otp_hash);
    if (!match) {
      await pool.query(
        "UPDATE password_resets SET attempts = attempts + 1 WHERE id = $1",
        [reset.id],
      );
      const left = OTP_MAX_ATTEMPTS - reset.attempts - 1;
      return res.status(400).json({
        message: left > 0
          ? `Incorrect OTP. ${left} attempt${left === 1 ? "" : "s"} left.`
          : "Too many incorrect attempts. Please request a new OTP.",
      });
    }

    await pool.query(
      "UPDATE password_resets SET verified_at = NOW() WHERE id = $1",
      [reset.id],
    );

    const resetToken = jwt.sign(
      { resetId: reset.id, uid: user.id, purpose: "password_reset" },
      resetSecret(),
      { expiresIn: RESET_TOKEN_TTL },
    );

    res.json({ message: "OTP verified", resetToken });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  const { resetToken, password } = req.body;

  if (!resetToken || !password) {
    return res.status(400).json({ message: "Reset token and new password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  let payload;
  try {
    payload = jwt.verify(resetToken, resetSecret());
    if (payload.purpose !== "password_reset") throw new Error("wrong purpose");
  } catch {
    return res.status(400).json({ message: "Reset session expired. Please start again." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Mark the reset as used atomically so the token can only be redeemed once.
    const claimed = await client.query(
      `UPDATE password_resets SET used_at = NOW()
       WHERE id = $1 AND user_id = $2 AND verified_at IS NOT NULL AND used_at IS NULL
       RETURNING id`,
      [payload.resetId, payload.uid],
    );
    if (claimed.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Reset session expired. Please start again." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      passwordHash,
      payload.uid,
    ]);

    await client.query("COMMIT");
    res.json({ message: "Password updated. You can now sign in." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};
