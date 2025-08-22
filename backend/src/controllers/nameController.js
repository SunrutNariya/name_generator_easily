import axios from "axios";
import { storage, checkTrademark } from "../services/trademarkService.js";

export const suggestNames = (req, res) => {
  const { query } = req.body;
  if (!query || query.trim() === "") {
    return res.json({ suggestions: [] });
  }

  const lowerQuery = query.toLowerCase();
  const sortedCategories = Object.keys(storage.searchFrequency).sort((a, b) => {
    const freqDiff =
      (storage.searchFrequency[b] || 0) - (storage.searchFrequency[a] || 0);
    if (freqDiff !== 0) return freqDiff;
    return a.localeCompare(b);
  });

  const suggestions = sortedCategories.filter(
    (cat) =>
      cat.toLowerCase().startsWith(lowerQuery) ||
      cat.toLowerCase().includes(lowerQuery)
  );

  res.json({ suggestions: suggestions.slice(0, 5) });
};

export const generateNames = async (req, res) => {
  try {
    const { category, isRegenerate } = req.body;

    if (!category || category.trim() === "") {
      return res.status(400).json({ error: "Category is required" });
    }

    const catKey = category.toLowerCase();
    storage.searchFrequency[catKey] =
      (storage.searchFrequency[catKey] || 0) + 1;

    if (!storage.generatedNames[catKey]) {
      storage.generatedNames[catKey] = [];
    }

    let allResults = [];
    let attempts = 0;

    // Keep asking AI until we get at least 10 unique new names
    while (allResults.length < 10 && attempts < 3) {
      attempts++;

      const prompt = `Suggest 30 very short (max 8 letters), unique, and attractive brand names for a ${category} startup.
Each name must also include a short and meaningful explanation in this format:
Name - Meaning.`;

      const { data } = await axios.post(
        "http://localhost:11434/api/generate",
        { model: "phi3", prompt, stream: false },
        { headers: { "Content-Type": "application/json" } }
      );

      let results = data.response
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.includes(" - "));

      let namesWithMeanings = results.map((line) => {
        const [rawName, meaning] = line.split(" - ");
        const cleanName = rawName.replace(/^\d+[\).]?\s*/, "").trim();
        return { name: cleanName, meaning: meaning.trim() };
      });

      // Deduplicate within batch
      namesWithMeanings = namesWithMeanings.filter(
        (obj, index, self) =>
          index ===
          self.findIndex((o) => o.name.toLowerCase() === obj.name.toLowerCase())
      );

      // Prevent repeats across previous generations
      let prevNames = storage.generatedNames[catKey];
      let freshResults = namesWithMeanings.filter(
        (obj) =>
          !prevNames.find((p) => p.name.toLowerCase() === obj.name.toLowerCase())
      );

      if (isRegenerate && freshResults.length === 0) {
        freshResults = namesWithMeanings; // fallback if regeneration has no new names
      }

      allResults = [...allResults, ...freshResults];
    }

    // Keep only latest 30 in storage to avoid infinite growth
    storage.generatedNames[catKey] = [
      ...storage.generatedNames[catKey],
      ...allResults,
    ].slice(-30);

    // Ensure exactly 10 names returned
    const finalResults = allResults.slice(0, 10);

    // Add trademark status
    const resultsWithTrademark = await Promise.all(
      finalResults.map(async (item, index) => {
        const tm = await checkTrademark(item.name);
        return {
          number: index + 1,
          name: item.name,
          meaning: item.meaning,
          trademarked: tm,
        };
      })
    );

    res.json({ success: true, category, results: resultsWithTrademark });
  } catch (error) {
    console.error("Backend error:", error.message);
    res.status(500).json({ error: "Failed to generate names" });
  }
};
