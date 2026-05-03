import { Router } from "express";
import {
  registerClient,
  getClientById,
  getClientDisplayById,
} from "./client-register.controller.js";

const router: Router = Router();

router.post("/register", registerClient);
router.get("/:clientId/public", getClientDisplayById);
router.get("/:clientId", getClientById);

export default router;
