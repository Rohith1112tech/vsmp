// ============================================================
// Auth Routes — /api/auth
// ============================================================
// Public endpoints (no auth middleware required):
//   POST /login      — Admin & Teacher password login
//   POST /send-otp   — Request OTP for parent mobile
//   POST /verify-otp — Validate OTP and receive tokens
//   POST /refresh    — Exchange refresh token for new access token
// ============================================================

import { Router } from "express";
import {
  login,
  sendOTP,
  verifyOTPHandler,
  refreshToken,
  teacherResetPassword,
  parentResetPassword,
} from "../controllers/auth.controller.js";

const router = Router();

// Password-based login for Admin and Teacher users
router.post("/login", login);

// OTP flow for Parent users
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTPHandler);

// Password reset for Teacher using phone number
router.post("/teacher-reset-password", teacherResetPassword);

// Password reset for Parent using secret reset code
router.post("/parent-reset-password", parentResetPassword);

// Token refresh — issue a new access token using a valid refresh token
router.post("/refresh", refreshToken);

export default router;
