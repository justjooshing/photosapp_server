import express from "express";
import cors from "cors";
import { CONFIG } from "./config.js";
import { getLoginLink } from "./login.js";
const app = express();

const { port } = CONFIG;

app.use(cors());

app.get("/", (req, res) => {
  res.send("Welcome to my server!");
});

app.get("/api/login-link", (req, res) => {
  const loginLink = getLoginLink();
  res.json({ loginLink });
});

app.get("/api/images", (req, res) => {
  // Somehow grab urls for bucket for now
  // Later replace with google photos api
  const imageUrls = {
    image: "@/assets/images/image.jpg",
    image2: "@/assets/images/image2.jpg",
    image3: "@/assets/images/image3.jpg",
  };

  res.json(["images"]);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
