import LostItem from "../models/LostItem.js";
import FoundItem from "../models/FoundItem.js";
import ItemMatch from "../models/ItemMatch.js";
import { notifyUser } from "./notification.service.js";
import { getSettings } from "./settings.service.js";

// ---------------------------------------------------------------
// Basic matching algorithm
// Compares a lost item with found items (or the other way around)
// and gives each pair a score from 0 to 100:
//   Category      30 points (same category)
//   Item name     30 points (shared words)
//   Description   15 points (shared words)
//   Location      15 points (same campus location)
//   Date          10 points (found close to the date it was lost)
// A match is only a SUGGESTION. Ownership is decided by staff through a claim.
// ---------------------------------------------------------------

const STOP_WORDS = new Set([
  "the", "and", "with", "for", "this", "that", "has", "have", "was", "are", "its", "from",
  "color", "colour", "item", "near", "very", "some", "one", "inside", "small", "big", "large",
]);

const DAY = 24 * 60 * 60 * 1000;

const words = (text = "") =>
  new Set(
    String(text)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );

// How many words two texts share, from 0 to 1
const overlap = (a, b) => {
  const setA = words(a);
  const setB = words(b);
  if (!setA.size || !setB.size) return 0;
  let shared = 0;
  for (const w of setA) if (setB.has(w)) shared++;
  return shared / Math.min(setA.size, setB.size);
};

const dateScore = (dateLost, dateFound) => {
  const diffDays = (new Date(dateFound) - new Date(dateLost)) / DAY;
  if (diffDays < -1) return 0; // found BEFORE it was lost -> unlikely
  const d = Math.abs(diffDays);
  if (d <= 3) return 10;
  if (d <= 7) return 7;
  if (d <= 14) return 4;
  if (d <= 30) return 2;
  return 0;
};

export const scorePair = (lost, found) => {
  const reasons = [];
  let score = 0;

  if (String(lost.category) === String(found.category)) {
    score += 30;
    reasons.push("Same category");
  }

  const nameScore = Math.round(overlap(lost.itemName, found.itemName) * 30);
  if (nameScore > 0) reasons.push("Similar item name");
  score += nameScore;

  const descScore = Math.round(
    overlap(`${lost.itemName} ${lost.description}`, `${found.itemName} ${found.description}`) * 15
  );
  if (descScore >= 5) reasons.push("Similar description");
  score += descScore;

  if (String(lost.location) === String(found.location)) {
    score += 15;
    reasons.push("Same location");
  }

  const ds = dateScore(lost.dateLost, found.dateFound);
  if (ds >= 7) reasons.push("Found within a few days");
  score += ds;

  return { score: Math.min(100, score), reasons };
};

const saveMatch = async (lost, found, result) => {
  const existing = await ItemMatch.findOne({ lostItem: lost._id, foundItem: found._id });
  if (existing) {
    if (existing.status === "suggested") {
      existing.score = result.score;
      existing.reasons = result.reasons;
      await existing.save();
    }
    return false;
  }
  await ItemMatch.create({ lostItem: lost._id, foundItem: found._id, ...result });
  return true;
};

const notifyOwner = (lost, count) =>
  notifyUser(lost.reportedBy, {
    type: "match",
    title: "Possible match found",
    message: `We found ${count} possible match${count > 1 ? "es" : ""} for your lost "${lost.itemName}". Check if it's yours.`,
    link: `/student/items/lost/${lost._id}`,
    email: true,
  });

// Run after a LOST item is reported or edited
export const findMatchesForLostItem = async (lostItemId) => {
  try {
    const { matchScoreThreshold } = await getSettings();
    const lost = await LostItem.findById(lostItemId);
    if (!lost || lost.status !== "open") return;

    const from = new Date(new Date(lost.dateLost).getTime() - 2 * DAY);
    const candidates = await FoundItem.find({
      status: { $in: ["pending", "available"] },
      dateFound: { $gte: from },
    })
      .limit(500)
      .lean();

    let newMatches = 0;
    for (const found of candidates) {
      const result = scorePair(lost, found);
      if (result.score >= matchScoreThreshold && (await saveMatch(lost, found, result))) newMatches++;
    }
    if (newMatches > 0) await notifyOwner(lost, newMatches);
  } catch (err) {
    console.error("Matching failed:", err.message);
  }
};

// Run after a FOUND item is reported or edited
export const findMatchesForFoundItem = async (foundItemId) => {
  try {
    const { matchScoreThreshold } = await getSettings();
    const found = await FoundItem.findById(foundItemId);
    if (!found || !["pending", "available"].includes(found.status)) return;

    const until = new Date(new Date(found.dateFound).getTime() + 2 * DAY);
    const candidates = await LostItem.find({ status: "open", dateLost: { $lte: until } })
      .limit(500)
      .lean();

    for (const lost of candidates) {
      const result = scorePair(lost, found);
      if (result.score >= matchScoreThreshold && (await saveMatch(lost, found, result))) {
        await notifyOwner(lost, 1);
      }
    }
  } catch (err) {
    console.error("Matching failed:", err.message);
  }
};
