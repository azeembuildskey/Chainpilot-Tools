// netlify/functions/audit-ai.js
//
// Receives shipment documents (as base64 images) from the frontend,
// sends them to Claude with a cross-check prompt, and returns a
// structured list of discrepancies between the documents.
//
// SETUP REQUIRED:
// 1. In Netlify dashboard -> Site settings -> Environment variables,
//    add: ANTHROPIC_API_KEY = your key
// 2. Deploy. Netlify auto-detects functions in netlify/functions/.

exports.handler = async function (event) {
  // CORS headers so the frontend (same site) can call this
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { documents } = JSON.parse(event.body);
    // documents: [{ name: "invoice.jpg", mediaType: "image/jpeg", base64: "..." }, ...]

    if (!documents || !Array.isArray(documents) || documents.length < 2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Upload at least 2 documents to cross-check (e.g. invoice + packing list).",
        }),
      };
    }

    // Build the content blocks: one image block per document, labeled.
    const content = [];
    documents.forEach((doc, i) => {
      content.push({
        type: "text",
        text: `Document ${i + 1}: ${doc.name}`,
      });
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: doc.mediaType,
          data: doc.base64,
        },
      });
    });

    content.push({
      type: "text",
      text: `You are a freight/customs documentation auditor. Compare the shipment documents above (invoice, packing list, bill of lading, or similar) and identify any discrepancies a customs officer or freight forwarder would flag.

Check specifically for mismatches in:
- Quantities / unit counts
- Consignee / shipper names and addresses
- HS codes / product descriptions
- Total values / currency
- Dates
- Weights / package counts
- Port of loading / discharge

Respond ONLY with valid JSON in this exact shape, no markdown fences, no preamble:
{
  "overall_status": "PASS" | "ISSUES_FOUND",
  "discrepancies": [
    { "field": "Quantity", "documents_involved": ["invoice.jpg", "packing_list.jpg"], "detail": "Invoice shows 500 units, packing list shows 480 units." }
  ],
  "summary": "One sentence summary for the client."
}
If there are no discrepancies, return an empty discrepancies array and overall_status PASS.`,
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "AI provider error", detail: errText }),
      };
    }

    const data = await response.json();
    const rawText = data.content.map((block) => block.text || "").join("\n");

    // Strip accidental markdown fences before parsing
    const cleaned = rawText.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          overall_status: "ISSUES_FOUND",
          discrepancies: [],
          summary: "AI response could not be parsed as structured data.",
          raw: rawText,
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error", detail: err.message }),
    };
  }
};
