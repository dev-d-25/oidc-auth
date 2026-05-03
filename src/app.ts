import express from "express";
import type { Express } from "express";
import path from "node:path";
import cookieParser from "cookie-parser";
import openidRoutes from "./modules/openid/openid.route.js";
import oauthRoutes from "./modules/oauth/oauth.route.js";
import clientRegisterRoutes from "./modules/client-register/client-register.route.js";

const app: Express = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.resolve("public")));

// Mount routes
app.use("/o", openidRoutes);
app.use("/o", oauthRoutes);
app.use("/o/client", clientRegisterRoutes);

app.get("/health", (req, res) => {
  res.json({
    healthy: true,
    message: "serveris running",
  });
});

export default app;
