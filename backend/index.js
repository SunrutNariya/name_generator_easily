import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Store all generated results per category (to prevent duplicates)
const generatedNames = {};
// Store search frequency for suggestions
const searchFrequency = {};

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// 🔹 Suggestion route (Google-like)
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

// 🔹 Generate Names
app.post("/generate", async (req, res) => {
  try {
    const { category } = req.body;

    if (!category || category.trim() === "") {
      return res.status(400).json({ error: "Category is required" });
    }

    const catKey = category.toLowerCase();

    // Track search frequency
    searchFrequency[catKey] = (searchFrequency[catKey] || 0) + 1;

    // Ensure storage exists
    if (!generatedNames[catKey]) {
      generatedNames[catKey] = [];
    }

    const prompt = `Suggest 20 very short (max 8 letters), unique, and attractive brand names for a ${category} startup.
Each name must also include a short and meaningful explanation in this format:
Name - Meaning.
Example:
Nuvia - Fresh and new beginnings.
Make sure the names are unique and do not repeat.`; 

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "phi3",
        prompt,
        stream: false,
      }),
    });

    const data = await response.json();

    let results = data.response
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.includes(" - "));

    // Convert "Name - Meaning" into objects
    let namesWithMeanings = results.map((line) => {
      const [rawName, meaning] = line.split(" - ");
      const cleanName = rawName.replace(/^\d+[\).]?\s*/, "").trim();
      return { name: cleanName, meaning: meaning.trim() };
    });

    //  Step 1: Remove duplicates inside the batch
    namesWithMeanings = namesWithMeanings.filter(
      (obj, index, self) =>
        index ===
        self.findIndex((o) => o.name.toLowerCase() === obj.name.toLowerCase())
    );

    // Step 2: Remove duplicates from previously generated names
    const prevNames = generatedNames[catKey];
    let freshResults = namesWithMeanings.filter(
      (obj) =>
        !prevNames.find((p) => p.name.toLowerCase() === obj.name.toLowerCase())
    );

    //  Step 3: Merge with previous to keep at least 10 unique
    const finalResults = [...prevNames, ...freshResults]
      .filter(
        (obj, index, self) =>
          index ===
          self.findIndex((o) => o.name.toLowerCase() === obj.name.toLowerCase())
      )
      .slice(0, 10);

    generatedNames[catKey] = finalResults;

    const numberedResults = finalResults.map((item, index) => ({
      number: index + 1,
      ...item,
    }));

    res.json({ success: true, category, results: numberedResults });
  } catch (error) {
    console.error("Backend error:", error.message);
    res.status(500).json({ error: "Failed to generate names" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running at: http://localhost:${PORT}`);
});
