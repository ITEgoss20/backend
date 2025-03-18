import express from "express";
import router from "./routes.js";
import multer from "multer";
import cors from "cors";

const app = express();
const PORT = 4000;

app.use(cors({ origin: "http://localhost:5173" }));

app.use(express.json());

app.use("/api", router);

app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});


