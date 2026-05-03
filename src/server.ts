import app from "./app.js";
import "dotenv/config";

const PORT = process.env.PORT ?? 8000;

app.listen(PORT, () => {
  console.log(`OAuth server is running on http://localhost:${PORT}`);
});
