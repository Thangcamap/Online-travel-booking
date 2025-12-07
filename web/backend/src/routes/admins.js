const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// ======================== PROVIDER MANAGEMENT ==========================
// Get all pending providers
router.get("/providers/pending", adminController.getPendingProviders);

// Get all providers with statistics
router.get("/providers", adminController.getAllProviders);

// Approve or reject provider
router.put("/providers/:id/approve", adminController.approveProvider);

// ======================== USER MANAGEMENT ==========================
// Get all users
router.get("/users", adminController.getAllUsers);

// Update user status (active, inactive, suspended)
router.put("/users/:id/status", adminController.updateUserStatus);

// ======================== TOUR MANAGEMENT ==========================
// Get all tours with revenue statistics
router.get("/tours", adminController.getAllTours);

// ======================== PAYMENT MANAGEMENT ==========================
// Get all payments
router.get("/payments", adminController.getAllPayments);

// Update payment status
router.put("/payments/:id/status", adminController.updatePaymentStatus);

// Get payment detail
router.get("/payments/:id", adminController.getPaymentDetail);

module.exports = router;