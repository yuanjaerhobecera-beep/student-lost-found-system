import User from "../models/User.js";
import LostItem from "../models/LostItem.js";
import FoundItem from "../models/FoundItem.js";
import Claim from "../models/Claim.js";
import ItemMatch from "../models/ItemMatch.js";
import Notification from "../models/Notification.js";
import ActivityLog from "../models/ActivityLog.js";
import { POPULATE_PUBLIC } from "./itemHelpers.js";

// Turns [{ _id: "open", count: 3 }] into { open: 3 }
export const countBy = async (Model, field, match = {}) => {
  const rows = await Model.aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id ?? "none", r.count]));
};

const sum = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);

// Counts documents per month for the last N months (done in JavaScript so it works everywhere)
export const monthlySeries = async (months = 6) => {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() - (months - 1));

  const labels = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(start);
    d.setMonth(start.getMonth() + i);
    labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const key = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const bucket = (docs, field) => {
    const counts = Object.fromEntries(labels.map((l) => [l, 0]));
    for (const doc of docs) {
      const k = key(new Date(doc[field]));
      if (k in counts) counts[k]++;
    }
    return labels.map((l) => counts[l]);
  };

  const [lost, found, released] = await Promise.all([
    LostItem.find({ createdAt: { $gte: start } }).select("createdAt").lean(),
    FoundItem.find({ createdAt: { $gte: start } }).select("createdAt").lean(),
    Claim.find({ status: "completed", releasedAt: { $gte: start } }).select("releasedAt").lean(),
  ]);

  return {
    labels,
    lost: bucket(lost, "createdAt"),
    found: bucket(found, "createdAt"),
    released: bucket(released, "releasedAt"),
  };
};

const STAFF_ENTITY_TYPES = ["lost_item", "found_item", "claim"];

// GET /api/dashboard/student
export const studentDashboard = async (req, res) => {
  const me = req.user._id;
  const myOpenLost = await LostItem.find({ reportedBy: me, status: "open" }).select("_id");

  const [lostByStatus, foundByStatus, claimsByStatus, unreadNotifications, matchCount, recentClaims, recentLost] =
    await Promise.all([
      countBy(LostItem, "status", { reportedBy: me }),
      countBy(FoundItem, "status", { reportedBy: me }),
      countBy(Claim, "status", { claimant: me }),
      Notification.countDocuments({ recipient: me, isRead: false }),
      ItemMatch.countDocuments({ lostItem: { $in: myOpenLost.map((l) => l._id) }, status: "suggested" }),
      Claim.find({ claimant: me })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate({ path: "foundItem", select: "itemName images", populate: POPULATE_PUBLIC })
        .select("status createdAt updatedAt foundItem"),
      LostItem.find({ reportedBy: me }).sort({ createdAt: -1 }).limit(5).populate(POPULATE_PUBLIC),
    ]);

  res.json({
    success: true,
    stats: {
      lostReports: sum(lostByStatus),
      openLostReports: lostByStatus.open || 0,
      foundReports: sum(foundByStatus),
      totalClaims: sum(claimsByStatus),
      activeClaims: (claimsByStatus.pending || 0) + (claimsByStatus.under_review || 0) + (claimsByStatus.info_required || 0),
      approvedClaims: claimsByStatus.approved || 0,
      completedClaims: claimsByStatus.completed || 0,
      unreadNotifications,
      possibleMatches: matchCount,
    },
    claimsByStatus,
    recentClaims,
    recentLost,
  });
};

// GET /api/dashboard/staff
export const staffDashboard = async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [foundByStatus, lostByStatus, claimsByStatus, releasedToday, pendingClaims, pendingItems, recentActivity] =
    await Promise.all([
      countBy(FoundItem, "status"),
      countBy(LostItem, "status"),
      countBy(Claim, "status"),
      Claim.countDocuments({ status: "completed", releasedAt: { $gte: startOfDay } }),
      Claim.find({ status: { $in: ["pending", "under_review", "info_required"] } })
        .sort({ createdAt: 1 })
        .limit(6)
        .populate([
          { path: "foundItem", select: "itemName" },
          { path: "claimant", select: "firstName lastName studentId" },
        ]),
      FoundItem.find({ status: "pending" })
        .sort({ createdAt: 1 })
        .limit(6)
        .populate([...POPULATE_PUBLIC, { path: "reportedBy", select: "firstName lastName" }]),
      ActivityLog.find({ entityType: { $in: STAFF_ENTITY_TYPES } })
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("user", "firstName lastName role"),
    ]);

  res.json({
    success: true,
    stats: {
      pendingFoundItems: foundByStatus.pending || 0,
      availableItems: foundByStatus.available || 0,
      openLostReports: lostByStatus.open || 0,
      pendingClaims: claimsByStatus.pending || 0,
      underReview: (claimsByStatus.under_review || 0) + (claimsByStatus.info_required || 0),
      approvedClaims: claimsByStatus.approved || 0,
      rejectedClaims: claimsByStatus.rejected || 0,
      completedClaims: claimsByStatus.completed || 0,
      releasedToday,
    },
    claimsByStatus,
    pendingClaims,
    pendingItems,
    recentActivity,
  });
};

// GET /api/dashboard/admin
export const adminDashboard = async (_req, res) => {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [usersByRole, inactiveUsers, lostByStatus, foundByStatus, claimsByStatus, failedLogins24h, lockedAccounts, monthly, recentActivity, recentFailures] =
    await Promise.all([
      countBy(User, "role"),
      User.countDocuments({ isActive: false }),
      countBy(LostItem, "status"),
      countBy(FoundItem, "status"),
      countBy(Claim, "status"),
      ActivityLog.countDocuments({ action: "LOGIN_FAILED", createdAt: { $gte: since24h } }),
      User.countDocuments({ lockUntil: { $gt: new Date() } }),
      monthlySeries(6),
      ActivityLog.find().sort({ createdAt: -1 }).limit(10).populate("user", "firstName lastName role"),
      ActivityLog.find({ status: "failure" }).sort({ createdAt: -1 }).limit(6),
    ]);

  const totalFound = sum(foundByStatus);
  const released = foundByStatus.released || 0;

  res.json({
    success: true,
    stats: {
      totalUsers: sum(usersByRole),
      totalStudents: usersByRole.student || 0,
      totalStaff: usersByRole.staff || 0,
      totalAdmins: usersByRole.admin || 0,
      inactiveUsers,
      totalLostItems: sum(lostByStatus),
      totalFoundItems: totalFound,
      pendingClaims: (claimsByStatus.pending || 0) + (claimsByStatus.under_review || 0) + (claimsByStatus.info_required || 0),
      approvedClaims: claimsByStatus.approved || 0,
      completedClaims: claimsByStatus.completed || 0,
      rejectedClaims: claimsByStatus.rejected || 0,
      recoveryRate: totalFound ? Math.round((released / totalFound) * 100) : 0,
      failedLogins24h,
      lockedAccounts,
    },
    lostByStatus,
    foundByStatus,
    claimsByStatus,
    monthly,
    recentActivity,
    recentFailures,
  });
};
