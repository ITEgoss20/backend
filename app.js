import express from "express";
import router from "./routes.js";
import multer from "multer";
import cors from "cors";

const app = express();
const PORT = 4000;

// const allowedOrigins = [
//   "http://localhost:5173",
// ];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       // Allow requests with no origin (like mobile apps or curl)
//       if (!origin) return callback(null, true);
//       if (allowedOrigins.includes(origin)) {
//         return callback(null, true);
//       } else {
//         return callback(new Error("Not allowed by CORS"));
//       }
//     },
//   })
// );

const allowedOrigins = [
  "http://localhost:5173",
  "https://fileuploader-itegoss.netlify.app",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);

app.use(express.json());

app.use("/api", router);

app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});
