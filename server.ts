import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware with increased limit for base64 images
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/verify-document", async (req, res) => {
    const { docBase64, docType } = req.body;

    if (!docBase64) {
      return res.status(400).json({ error: "Missing document data" });
    }

    try {
      // Clean the base64 string if it contains data URI prefix
      const base64Data = docBase64.split(",")[1] || docBase64;
      const mimeType = docBase64.split(";")[0]?.split(":")[1] || "image/jpeg";

      const prompt = `You are an automated document verification assistant. 
      The user is claiming to provide a ${docType}. 
      Analyze the provided image and determine if it appears to be a valid, authentic document of that type.
      Check for:
      1. Legibility.
      2. Authenticity (does it look like a real ID/license/cert?).
      3. Consistency (does it match the expected docType?).
      
      Return a JSON response with:
      - verified (boolean): true if the document looks authentic and matches docType.
      - confidence (number): 0-1 score.
      - reason (string): Brief explanation of the decision.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verified: { type: Type.BOOLEAN },
              confidence: { type: Type.NUMBER },
              reason: { type: Type.STRING },
            },
            required: ["verified", "confidence", "reason"],
          },
        },
      });

      const result = JSON.parse(response.text);
      res.json(result);
    } catch (error: any) {
      console.error("Verification error:", error);
      res.status(500).json({ error: error.message || "Failed to verify document" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
