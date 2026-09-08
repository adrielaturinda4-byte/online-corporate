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

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware with increased limit for base64 images
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

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
    const { docBase64, docType, userName, userEmail } = req.body;

    if (!docBase64) {
      return res.status(400).json({ error: "Missing document image" });
    }

    try {
      const ai = getAi();
      // Clean the base64 string if it contains data URI prefix
      const base64Data = docBase64.split(",")[1] || docBase64;
      let mimeType = docBase64.split(";")[0]?.split(":")[1] || "image/jpeg";
      if (mimeType === "image/jpg") mimeType = "image/jpeg";

      const prompt = `You are a certified forensic identity document verification agent for Online Corporate.
The user has submitted an image claiming it is a: "${docType || 'Identity Document'}".
The user's registered name on this platform is: "${userName || 'Not provided'}".
The user's email is: "${userEmail || 'Not provided'}".

Analyze the provided image with high forensic scrutiny:
1. DOCUMENT CLASSIFICATION:
   - Identify the exact document type (e.g. "National ID Card", "International Passport", "Driver's License", "Academic Certificate / Degree", "Business Registration", or "Unrecognized / Invalid Document").
   - Identify issuing country or authority (e.g. "Republic of Uganda (NIRA)", "Kenya National ID", "Federal Republic of Nigeria", "United States", etc.).

2. FORENSIC & SECURITY CHECKS:
   - Check 1: "Clarity & Legibility" - Are the text, portrait, and national emblems clear, sharp, and readable without blinding glare, deep shadows, or cut-off corners?
   - Check 2: "Document Structure & Seals" - Does it contain standard official governmental security markings (coat of arms, security guilloche patterns, official seals, chip indicator, microtext borders, or MRZ lines if passport)?
   - Check 3: "Tamper & Alteration Detection" - Are there signs of digital photo alteration, font mismatching, pasted text boxes, or taking a photo of a computer screen?
   - Check 4: "Name Alignment" - Does the printed holder name on the document reasonably match the registered user name "${userName || ''}" (considering standard naming orders, e.g., First Last vs Last First, middle initials)?

3. EXTRACTED CREDENTIALS:
   - holderName: The full legal name printed on the document (or empty if unreadable).
   - documentNumber: Masked identification or NIN/Passport number (e.g., "CM84••••••2K" or "A09•••••"). Keep privacy protected by masking middle digits.
   - issuingAuthority: Issuing country / government ministry or organization.
   - expiryDate: Expiry date or issue date if visible (or "Not applicable" / "Permanent").

4. FINAL VERDICT:
   - verified: boolean. TRUE ONLY IF: It is an authentic government or certified document, text is legible, and holder name is consistent with "${userName || ''}".
   - confidence: integer percentage (0 to 100).
   - recommendation: One of:
     * "auto_approved" (Confidence >= 80%, all checks passed, authentic government ID)
     * "flagged_for_manual_review" (Confidence 50-79%, partially blurry, minor name variation, or unusual document type)
     * "rejected_illegible" (Too blurry, poor lighting, or obscured details)
     * "rejected_fraud_risk" (Signs of Photoshop, fake template, screenshot of another screen, or name totally mismatched)
   - reason: A concise, professional explanation of the findings (e.g., "Authentic Uganda National ID verified. Name 'Aturinda Adriel' matches platform profile with clear security seal and NIRA coat of arms.").`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
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
              documentTypeDetected: { type: Type.STRING },
              holderName: { type: Type.STRING },
              documentNumber: { type: Type.STRING },
              issuingAuthority: { type: Type.STRING },
              expiryDate: { type: Type.STRING },
              nameMatch: {
                type: Type.OBJECT,
                properties: {
                  matches: { type: Type.BOOLEAN },
                  explanation: { type: Type.STRING },
                },
                required: ["matches", "explanation"],
              },
              securityChecks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    passed: { type: Type.BOOLEAN },
                    detail: { type: Type.STRING },
                  },
                  required: ["id", "label", "passed", "detail"],
                },
              },
              recommendation: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: [
              "verified",
              "confidence",
              "documentTypeDetected",
              "holderName",
              "documentNumber",
              "issuingAuthority",
              "nameMatch",
              "securityChecks",
              "recommendation",
              "reason",
            ],
          },
        },
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Verification error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to verify document",
        verified: false,
        confidence: 0,
        recommendation: "flagged_for_manual_review",
        reason: "The AI verification engine could not process the image at this moment. You can submit for manual admin review."
      });
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
