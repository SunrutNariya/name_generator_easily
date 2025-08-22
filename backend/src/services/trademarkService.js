import axios from "axios";

// In-memory storage
const generatedNames = {};
const searchFrequency = {};

export const storage = { generatedNames, searchFrequency };

// ✅ Real USPTO Trademark Check (USA)
export async function checkUSPTO(name) {
  try {
    const url = `https://developer.uspto.gov/ibd-api/v1/application/publications?searchText=${encodeURIComponent(
      name
    )}&rows=1`;

    const { data } = await axios.get(url);
    return data?.response?.numFound > 0;
  } catch (err) {
    console.error("USPTO API error:", err.message);
    return false;
  }
}

// ✅ India Trademark Check (Simulated)
export async function checkIndiaTrademark(name) {
  try {
    console.log(`(Simulated India TM Check for: ${name})`);
    return false; // Always available
  } catch (err) {
    console.error("India TM check error:", err.message);
    return false;
  }
}

// ✅ Unified Trademark Check
export async function checkTrademark(name) {
  const us = await checkUSPTO(name);
  const india = await checkIndiaTrademark(name);
  return { us, india };
}
