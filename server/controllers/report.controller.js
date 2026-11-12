import LostItem from "../models/LostItem.js";
import FoundItem from "../models/FoundItem.js";
import Claim from "../models/Claim.js";
import Category from "../models/Category.js";
import CampusLocation from "../models/CampusLocation.js";
import AppError from "../utils/AppError.js";
import { dateRangeFilter } from "../utils/query.js";
import { countBy, monthlySeries } from "./dashboard.controller.js";
import { logActivity } from "../services/activityLog.service.js";

const nameMap = async (Model) => Object.fromEntries((await Model.find().select("name").lean()).map((d) => [String(d._id), d.name]));

// GET /api/reports/summary?from=&to=   (admin)
export const getSummary = async (req, res) => {
  const range = dateRangeFilter("createdAt", req.query.from, req.query.to);

  const [lostByStatus, foundByStatus, claimsByStatus, lostByCat, foundByCat, foundByLoc, lostByLoc, categories, locations, completed, monthly] =
    await Promise.all([
      countBy(LostItem, "status", range),
      countBy(FoundItem, "status", range),
      countBy(Claim, "status", range),
      countBy(LostItem, "category", range),
      countBy(FoundItem, "category", range),
      countBy(FoundItem, "location", range),
      countBy(LostItem, "location", range),
      nameMap(Category),
      nameMap(CampusLocation),
      Claim.find({ status: "completed", ...range }).select("createdAt releasedAt").lean(),
      monthlySeries(12),
    ]);

  const total = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const totalFound = total(foundByStatus);

  const byCategory = Object.keys(categories)
    .map((id) => ({ name: categories[id], lost: lostByCat[id] || 0, found: foundByCat[id] || 0 }))
    .filter((r) => r.lost || r.found)
    .sort((a, b) => b.lost + b.found - (a.lost + a.found));

  const byLocation = Object.keys(locations)
    .map((id) => ({ name: locations[id], lost: lostByLoc[id] || 0, found: foundByLoc[id] || 0 }))
    .filter((r) => r.lost || r.found)
    .sort((a, b) => b.lost + b.found - (a.lost + a.found));

  const avgDaysToRelease = completed.length
    ? Math.round((completed.reduce((s, c) => s + (new Date(c.releasedAt) - new Date(c.createdAt)), 0) / completed.length / 86400000) * 10) / 10
    : 0;

  res.json({
    success: true,
    summary: {
      totalLost: total(lostByStatus),
      totalFound,
      totalClaims: total(claimsByStatus),
      released: foundByStatus.released || 0,
      recoveryRate: totalFound ? Math.round(((foundByStatus.released || 0) / totalFound) * 100) : 0,
      avgDaysToRelease,
    },
    lostByStatus,
    foundByStatus,
    claimsByStatus,
    byCategory,
    byLocation,
    monthly,
  });
};

// Protects against "CSV injection": a cell starting with = + - @ could run as a formula in Excel
const csvCell = (value) => {
  let text = value === undefined || value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
const toCsv = (headers, rows) => [headers.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\r\n");
const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

// GET /api/reports/export?type=lost|found|claims&from=&to=   (admin) -> CSV file
export const exportCsv = async (req, res) => {
  const { type } = req.query;
  const range = dateRangeFilter("createdAt", req.query.from, req.query.to);
  const LIMIT = 5000;
  let csv;

  if (type === "lost") {
    const items = await LostItem.find(range).populate("category location", "name").populate("reportedBy", "firstName lastName email studentId").sort({ createdAt: -1 }).limit(LIMIT).lean();
    csv = toCsv(
      ["Reported On", "Item", "Category", "Location", "Date Lost", "Status", "Reported By", "Email", "Student ID"],
      items.map((i) => [fmtDate(i.createdAt), i.itemName, i.category?.name, i.location?.name, fmtDate(i.dateLost), i.status, `${i.reportedBy?.firstName ?? ""} ${i.reportedBy?.lastName ?? ""}`, i.reportedBy?.email, i.reportedBy?.studentId])
    );
  } else if (type === "found") {
    const items = await FoundItem.find(range).select("+storageLocation").populate("category location", "name").populate("reportedBy", "firstName lastName email").sort({ createdAt: -1 }).limit(LIMIT).lean();
    csv = toCsv(
      ["Reported On", "Item", "Category", "Location Found", "Date Found", "Status", "Storage", "Reported By", "Email"],
      items.map((i) => [fmtDate(i.createdAt), i.itemName, i.category?.name, i.location?.name, fmtDate(i.dateFound), i.status, i.storageLocation, `${i.reportedBy?.firstName ?? ""} ${i.reportedBy?.lastName ?? ""}`, i.reportedBy?.email])
    );
  } else if (type === "claims") {
    const claims = await Claim.find(range)
      .populate("foundItem", "itemName")
      .populate("claimant", "firstName lastName email studentId")
      .populate("reviewedBy releasedBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean();
    const name = (u) => (u ? `${u.firstName} ${u.lastName}` : "");
    csv = toCsv(
      ["Submitted On", "Item", "Claimant", "Email", "Student ID", "Status", "Reviewed By", "Reviewed On", "Released By", "Released On"],
      claims.map((c) => [fmtDate(c.createdAt), c.foundItem?.itemName, name(c.claimant), c.claimant?.email, c.claimant?.studentId, c.status, name(c.reviewedBy), fmtDate(c.reviewedAt), name(c.releasedBy), fmtDate(c.releasedAt)])
    );
  } else {
    throw new AppError("Choose a report type: lost, found, or claims.", 400);
  }

  await logActivity(req, { action: "REPORT_EXPORTED", entityType: "setting", description: `${type} report exported` });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${type}-report-${fmtDate(new Date())}.csv"`);
  res.send("﻿" + csv); // BOM so Excel shows special characters correctly
};
