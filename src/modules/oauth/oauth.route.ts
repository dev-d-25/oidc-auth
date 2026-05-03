import { Router } from "express";
import {
  authorize,
  token,
  signIn,
  signUp,
  logout,
  sessionLogout,
} from "./oauth.controller.js";

const router: Router = Router();

// OAuth 2.0 Endpoints
router.get("/authorize", authorize);
router.post("/token", token);
router.post("/logout", logout);
router.post("/session/logout", sessionLogout);

// Authentication endpoints (used by the login page)
router.post("/authenticate/sign-in", signIn);
router.post("/authenticate/sign-up", signUp);

export default router;
