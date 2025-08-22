import React, { useState, useEffect } from "react";

export default function App() {
  const [category, setCategory] = useState("");
  const [results, setResults] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [selectedMeaning, setSelectedMeaning] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [searchedCategory, setSearchedCategory] = useState("");

  // 🔹 Fetch category suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (category.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const response = await fetch("http://localhost:3000/api/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: category }),
        });
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch (err) {
        console.error("Suggestion fetch error:", err.message);
      }
    };
    const timeout = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeout);
  }, [category]);

  // 🔹 Generate business names + check trademark
  const generateNames = async (isRegenerate = false) => {
    if (!category.trim()) {
      alert("Please enter a category");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:3000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, isRegenerate }),
      });

      if (!response.ok) throw new Error("Failed to fetch names");
      const data = await response.json();

      const formatted = (data.results || []).map((item, idx) => ({
        number: idx + 1,
        name: typeof item === "string" ? item : item.name,
        meaning: typeof item === "string" ? "" : item.meaning,
        trademarked:
          typeof item === "object" && item.trademarked
            ? item.trademarked
            : { us: false, india: false },
      }));

      setResults(formatted);
      setCopied(null);
      setSelectedMeaning(null);
      setSearchedCategory(category);
    } catch (err) {
      console.error("Frontend error:", err.message);
      setError("Error fetching names. Please make sure the backend is running.");
      setResults([]);
    } finally {
      setLoading(false);
      setSuggestions([]);
    }
  };

  const copyToClipboard = (name) => {
    navigator.clipboard.writeText(name);
    setCopied(name);
    setTimeout(() => setCopied(null), 1500);
  };

  const addToFavorites = (name) => {
    if (!favorites.includes(name)) {
      setFavorites([...favorites, name]);
    }
  };

  const removeFromFavorites = (name) => {
    setFavorites(favorites.filter((fav) => fav !== name));
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ color: "#333" }}>AI Business Name Generator</h1>

      {/* Input + Suggestions */}
      <div style={{ marginBottom: "1rem", position: "relative" }}>
        <input
          type="text"
          placeholder="Enter category (e.g. clothing, tech, food)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: "0.5rem",
            width: "300px",
            borderRadius: "8px",
            border: "1px solid #ccc",
          }}
        />
        {suggestions.length > 0 && (
          <ul
            style={{
              position: "absolute",
              top: "110%",
              left: 0,
              width: "300px",
              background: "#fff",
              border: "1px solid #ccc",
              borderRadius: "6px",
              listStyle: "none",
              margin: 0,
              padding: "0.5rem",
              zIndex: 10,
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}
          >
            {suggestions.map((s, i) => (
              <li
                key={i}
                style={{
                  padding: "0.4rem",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                }}
                onClick={() => {
                  setCategory(s);
                  setSuggestions([]);
                }}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() => generateNames(false)}
          style={{
            marginLeft: "1rem",
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate"}
        </button>

        {results.length > 0 && (
          <button
            onClick={() => generateNames(true)}
            style={{
              marginLeft: "1rem",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
            disabled={loading}
          >
            {loading ? "Regenerating..." : "Regenerate"}
          </button>
        )}
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Results */}
      {searchedCategory && results.length > 0 && (
        <h2>
          Results for <span style={{ color: "#007bff" }}>{searchedCategory}</span>
        </h2>
      )}

      {results.length > 0 && (
        <ul
          style={{
            marginTop: "1rem",
            background: "#f9f9f9",
            padding: "1rem",
            borderRadius: "8px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            listStyle: "none",
          }}
        >
          {results.map((item) => (
            <li
              key={item.number}
              style={{
                marginBottom: "0.8rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
              }}
              onClick={() =>
                setSelectedMeaning(
                  selectedMeaning?.name === item.name ? null : item
                )
              }
            >
              <span>
                {item.number}. {item.name}
              </span>

              {/* Trademark statuses */}
              <div style={{ marginLeft: "1rem", fontSize: "0.9rem" }}>
                <span
                  style={{
                    color: item.trademarked.us ? "red" : "green",
                    marginRight: "0.8rem",
                  }}
                >
                  {item.trademarked.us ? "❌ US Trademarked" : "✅ US Available"}
                </span>
                <span
                  style={{
                    color: item.trademarked.india ? "red" : "green",
                  }}
                >
                  {item.trademarked.india
                    ? "❌ India Trademarked"
                    : "✅ India Available"}
                </span>
              </div>

              {/* Buttons */}
              <div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(item.name);
                  }}
                  style={{
                    marginLeft: "0.5rem",
                    padding: "0.3rem 0.7rem",
                    borderRadius: "6px",
                    backgroundColor:
                      copied === item.name ? "#ffc107" : "#6c63ff",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  {copied === item.name ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addToFavorites(item.name);
                  }}
                  style={{
                    marginLeft: "0.5rem",
                    padding: "0.3rem 0.7rem",
                    borderRadius: "6px",
                    backgroundColor: favorites.includes(item.name)
                      ? "#999"
                      : "#ff5722",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                  disabled={favorites.includes(item.name)}
                >
                  {favorites.includes(item.name) ? "Saved" : "Save"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Show meaning */}
      {selectedMeaning && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            border: "1px solid #ccc",
            borderRadius: "8px",
            background: "#e9f7ef",
          }}
        >
          <h3>Meaning of "{selectedMeaning.name}"</h3>
          <p>{selectedMeaning.meaning}</p>
        </div>
      )}

      {/* Favorites */}
      {favorites.length > 0 && (
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            background: "#fff3cd",
            border: "1px solid #ffeeba",
            borderRadius: "8px",
          }}
        >
          <h2>Saved Favorites</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {favorites.map((fav, i) => (
              <li
                key={i}
                style={{
                  marginBottom: "0.8rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {fav}
                <button
                  onClick={() => removeFromFavorites(fav)}
                  style={{
                    marginLeft: "1rem",
                    padding: "0.3rem 0.7rem",
                    borderRadius: "6px",
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
