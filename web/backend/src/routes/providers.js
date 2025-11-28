const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadProvider");
const providerController = require("../controllers/providerController");

// Create provider
router.post("/", providerController.createProvider);

// Upload provider avatar + cover
router.post(
  "/:providerId/upload",
  upload.fields([{ name: "avatar" }, { name: "cover" }]),
  providerController.uploadProviderImage
);

// Get all providers
router.get("/", providerController.getProviders);

// Get provider by user id
router.get("/user/:userId", providerController.getProviderByUser);

// Get provider detail
router.get("/:providerId", providerController.getProviderDetail);

module.exports = router;
