const express = require("express");
const router = express.Router();

const upload = require("../config/tourUpload");
const checkProviderApproved = require("../middlewares/checkProviderApproved");
const tour = require("../controllers/tourController");

// Upload image
router.post("/:tour_id/upload-image", upload.single("image"), tour.uploadImage);

// CRUD
router.post("/", checkProviderApproved, tour.createTour);
router.get("/provider/:provider_id", checkProviderApproved, tour.getToursByProvider);
router.put("/:tour_id", checkProviderApproved, tour.updateTour);
router.delete("/:tour_id", checkProviderApproved, tour.deleteTour);

// Itinerary
router.post("/:tour_id/itinerary", tour.createItinerary);
router.get("/:tour_id/itinerary", tour.getItinerary);
router.put("/:tour_id/itinerary", tour.updateItinerary);

// Public
router.get("/", tour.getPublicTours);
router.get("/:id", tour.getPublicTourDetail);

// Bookings
router.get("/providers/:providerId/bookings", tour.getProviderBookings);
router.put("/bookings/:booking_id/status", tour.updateBookingStatus);

module.exports = router;
