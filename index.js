import express from "express";
import cors from "cors";
import { CONFIG } from "./config.js";
import { getLoginLink } from "./login.js";

const app = express();

const { port } = CONFIG;

app.use(cors());
app.use(express.json());

const images = [
  {
    source:
      "https://images.unsplash.com/photo-1542379653-b928db1b4956?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=387&q=80",
    id: 1,
  },
  {
    source:
      "https://plus.unsplash.com/premium_photo-1661883991651-b5487771e9aa?q=80&w=1516&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    id: 2,
  },
  {
    source:
      "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    id: 3,
  },
];

let imageUrls = images;

app.get("/api/login-link", (_, res) => {
  const loginLink = getLoginLink();
  res.json({ loginLink });
});

app.get("/api/images", (_, res) => {
  // reset images after sorting through them
  if (!imageUrls.length) {
    imageUrls = images;
  }
  res.json({ imageUrls });
});

app.post("/api/images", (req, res) => {
  imageUrls = imageUrls.filter((old) => old.id !== req.body.image.id);
  res.json({});
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
