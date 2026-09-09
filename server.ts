import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Supabase configuration
const SUPABASE_PROJECT_NAME = "Online corporate";
const SUPABASE_PROJECT_ID = "fkmuaxvpxmfoeprorpxl";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://fkmuaxvpxmfoeprorpxl.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_Zm-dW7k81oosJ1pUTQm7yQ_TBBuQEpS";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
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
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      supabase: {
        projectName: SUPABASE_PROJECT_NAME,
        projectId: SUPABASE_PROJECT_ID,
        url: SUPABASE_URL
      }
    });
  });

  // Supabase connection and status check
  app.get("/api/supabase/status", async (req, res) => {
    try {
      const startTime = Date.now();
      const { data, error } = await supabase.from('checkouts').select('count', { count: 'exact', head: true });
      const latency = Date.now() - startTime;

      if (error) {
        const tableMissing = error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist');
        return res.json({
          connected: true,
          tableExists: !tableMissing,
          latencyMs: latency,
          projectName: SUPABASE_PROJECT_NAME,
          projectId: SUPABASE_PROJECT_ID,
          url: SUPABASE_URL,
          message: tableMissing 
            ? "Connected to Supabase endpoint! Table 'checkouts' needs to be created in Supabase SQL editor."
            : error.message,
          error: error
        });
      }

      res.json({
        connected: true,
        tableExists: true,
        latencyMs: latency,
        projectName: SUPABASE_PROJECT_NAME,
        projectId: SUPABASE_PROJECT_ID,
        url: SUPABASE_URL,
        message: `Successfully connected to Supabase (${SUPABASE_PROJECT_NAME})!`
      });
    } catch (err: any) {
      res.status(500).json({
        connected: false,
        projectName: SUPABASE_PROJECT_NAME,
        projectId: SUPABASE_PROJECT_ID,
        error: err.message || "Failed to reach Supabase"
      });
    }
  });

  // Supabase Checkout Record Creation Endpoint
  app.post("/api/checkouts", async (req, res) => {
    const checkout = req.body;

    if (!checkout || !checkout.userEmail || !checkout.amount) {
      return res.status(400).json({ error: "Missing required checkout parameters (userEmail, amount)" });
    }

    const payload = {
      order_id: checkout.id || `ord_${Date.now()}`,
      user_email: checkout.userEmail,
      user_name: checkout.userName || checkout.userEmail,
      user_role: checkout.userRole || 'Employee',
      user_business: checkout.userBusiness || '',
      item_type: checkout.itemType || 'CorporatePlan',
      item_title: checkout.itemTitle || 'Corporate Subscription',
      item_description: checkout.itemDescription || '',
      amount: checkout.amount,
      currency: checkout.currency || 'USD',
      status: checkout.status || 'completed',
      payment_method: checkout.paymentMethod || 'Credit / Debit Card',
      billing_address: checkout.billingAddress || '',
      company_tax_id: checkout.companyTaxId || '',
      phone_number: checkout.phoneNumber || '',
      metadata: checkout.metadata || {},
      created_at: new Date(checkout.createdAt || Date.now()).toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('checkouts')
        .upsert(payload, { onConflict: 'order_id' })
        .select();

      if (error) {
        console.warn("[Supabase Server Checkouts] Upsert warning:", error.message);
        return res.status(200).json({
          savedLocally: true,
          supabaseSynced: false,
          message: `Saved with warning: ${error.message}`,
          record: payload
        });
      }

      res.status(201).json({
        savedLocally: true,
        supabaseSynced: true,
        message: "Checkout successfully recorded in Supabase!",
        data: data?.[0] || payload
      });
    } catch (err: any) {
      console.error("[Supabase Server Checkouts] Error:", err);
      res.status(500).json({
        error: err.message || "Failed to store checkout in Supabase",
        record: payload
      });
    }
  });

  // Get all checkouts or user checkouts from Supabase
  app.get("/api/checkouts", async (req, res) => {
    const userEmail = req.query.email as string;

    try {
      let query = supabase.from('checkouts').select('*').order('created_at', { ascending: false });
      if (userEmail) {
        query = query.eq('user_email', userEmail.trim().toLowerCase());
      }
      const { data, error } = await query;
      if (error) {
        return res.status(200).json({ error: error.message, data: [] });
      }
      res.json({ data });
    } catch (err: any) {
      res.status(500).json({ error: err.message, data: [] });
    }
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
