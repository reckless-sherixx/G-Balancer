import cors from "cors";
import express from "express";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
	res.status(200).json({ ok: true, service: "backend" });
});

app.listen(port, () => {
	console.log(`Backend is running on http://localhost:${port}`);
});