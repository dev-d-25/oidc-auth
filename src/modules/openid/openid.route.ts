import { Router } from "express";
import {
  getJwks,
  getOpenIdConfiguration,
  userInfo,
} from "./openid.controller.js";

const router: Router = Router();

router.get("/.well-known/openid-configuration", getOpenIdConfiguration);
router.get("/.well-known/jwks.json", getJwks);
router.get("/userinfo", userInfo);

export default router;
