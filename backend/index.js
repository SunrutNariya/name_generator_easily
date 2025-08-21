import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Store generated names history
const generatedNames = {};
const searchFrequency = {};

// ✅ Real USPTO Trademark Check (USA)
async function checkUSPTO(name) {
  try {
    const url = `https://developer.uspto.gov/ibd-api/v1/application/publications?searchText=${encodeURIComponent(
      name
    )}&rows=1`;
    const response = await fetch(url);
    const data = await response.json();
    return data?.response?.numFound > 0;
  } catch (err) {
    console.error("USPTO API error:", err.message);
    return false;
  }
}

// ✅ India Trademark Check (Simulated)
async function checkIndiaTrademark(name) {
  try {
    console.log(`(Simulated India TM Check for: ${name})`);
    return false; // Always available
  } catch (err) {
    console.error("India TM check error:", err.message);
    return false;
  }
}

// ✅ Unified Trademark Check
async function checkTrademark(name) {
  const us = await checkUSPTO(name);
  const india = await checkIndiaTrademark(name);
  return { us, india };
}

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// 🔹 Suggestion route
app.post("/suggest", (req, res) => {
  const { query } = req.body;
  if (!query || query.trim() === "") {
    return res.json({ suggestions: [] });
  }

  const lowerQuery = query.toLowerCase();
  const sortedCategories = Object.keys(searchFrequency).sort((a, b) => {
    const freqDiff = (searchFrequency[b] || 0) - (searchFrequency[a] || 0);
    if (freqDiff !== 0) return freqDiff;
    return a.localeCompare(b);
  });

  const suggestions = sortedCategories.filter(
    (cat) =>
      cat.toLowerCase().startsWith(lowerQuery) ||
      cat.toLowerCase().includes(lowerQuery)
  );

  res.json({ suggestions: suggestions.slice(0, 5) });
});

// 🔹 Generate Names + Trademark Check
app.post("/generate", async (req, res) => {
  try {
    const { category, isRegenerate } = req.body;

    if (!category || category.trim() === "") {
      return res.status(400).json({ error: "Category is required" });
    }

    const catKey = category.toLowerCase();
    searchFrequency[catKey] = (searchFrequency[catKey] || 0) + 1;

    if (!generatedNames[catKey]) {
      generatedNames[catKey] = [];
    }

    // Prompt for Ollama model
    const prompt = `Suggest 20 very short (max 8 letters), unique, and attractive brand names for a ${category} startup.
Each name must also include a short and meaningful explanation in this format:
Name - Meaning.`;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "phi3", prompt, stream: false }),
    });

    const data = await response.json();

    let results = data.response
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.includes(" - "));

    let namesWithMeanings = results.map((line) => {
      const [rawName, meaning] = line.split(" - ");
      const cleanName = rawName.replace(/^\d+[\).]?\s*/, "").trim();
      return { name: cleanName, meaning: meaning.trim() };
    });

    // Deduplicate (case-insensitive)
    namesWithMeanings = namesWithMeanings.filter(
      (obj, index, self) =>
        index ===
        self.findIndex((o) => o.name.toLowerCase() === obj.name.toLowerCase())
    );

    // Prevent repeats on regenerate
    let prevNames = generatedNames[catKey];
    let freshResults = namesWithMeanings.filter(
      (obj) =>
        !prevNames.find((p) => p.name.toLowerCase() === obj.name.toLowerCase())
    );

    // If regenerate but no fresh names found → return old ones
    if (isRegenerate && freshResults.length === 0) {
      freshResults = namesWithMeanings;
    }

    // Update stored history
    generatedNames[catKey] = [...prevNames, ...freshResults].slice(-30); // keep last 30 max

    // Take top 10 names to show
    const finalResults = freshResults.slice(0, 10);

    // ✅ Add Trademark Status for each name
    const resultsWithTrademark = await Promise.all(
      finalResults.map(async (item, index) => {
        const tm = await checkTrademark(item.name);
        return {
          number: index + 1,
          name: item.name,
          meaning: item.meaning,
          trademarked: {
            us: tm.us,
            india: tm.india,
          },
        };
      })
    );

    res.json({ success: true, category, results: resultsWithTrademark });
  } catch (error) {
    console.error("Backend error:", error.message);
    res.status(500).json({ error: "Failed to generate names" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running at: http://localhost:${PORT}`);
}); 