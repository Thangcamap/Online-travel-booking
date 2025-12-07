const tourModel = require("../models/tourModel");
const fs = require("fs");

// ======================== UPLOAD IMAGE ==========================
exports.uploadImage = async (req, res) => {
  try {
    const { tour_id } = req.params;

    if (!tour_id)
      return res.status(400).json({ success: false, message: "Missing tour_id" });

    if (!req.file)
      return res.status(400).json({ success: false, message: "No image provided" });

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/tours/${req.file.filename}`;
    
    const result = await tourModel.insertImage(tour_id, imageUrl);

    res.json({ success: true, imageUrl: result.imageUrl });

  } catch (err) {
    console.error("Upload image error:", err);
    res.status(500).json({ success: false, message: "Server upload error" });
  }
};

// ======================== CREATE TOUR ==========================
exports.createTour = async (req, res) => {
  try {
    const {
      name, description, price, currency,
      start_date, end_date, available_slots, available
    } = req.body;

    const provider_id = req.provider_id;

    if (!name || !price || !start_date || !end_date || !available_slots) {
      return res.status(400).json({
        success: false,
        message: "Thiếu dữ liệu quan trọng."
      });
    }

    const tour = await tourModel.createTourRecord(provider_id, {
      name, description, price, currency,
      start_date, end_date, available_slots, available
    });

    res.json({ success: true, tour });

  } catch (err) {
    console.error("Create tour error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== GET TOURS OF PROVIDER ==========================
exports.getToursByProvider = async (req, res) => {
  try {
    const { provider_id } = req.params;

    const tours = await tourModel.getToursByProviderId(provider_id);

    res.json({ success: true, tours });

  } catch (err) {
    console.error("Get tours error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== UPDATE TOUR ==========================
exports.updateTour = async (req, res) => {
  try {
    const { tour_id } = req.params;
    const {
      name, description, price, currency,
      start_date, end_date, available_slots, available
    } = req.body;

    await tourModel.updateTourRecord(tour_id, {
      name, description, price, currency,
      start_date, end_date, available_slots, available
    });

    res.json({ success: true, message: "Tour updated" });

  } catch (err) {
    console.error("Update tour error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== DELETE TOUR ==========================
exports.deleteTour = async (req, res) => {
  try {
    const { tour_id } = req.params;

    await tourModel.deleteTourRecord(tour_id);

    res.json({ success: true, message: "Tour deleted" });

  } catch (err) {
    console.error("Delete tour error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== ITINERARY (CREATE / GET / UPDATE) ==========================
exports.createItinerary = async (req, res) => {
  try {
    const { tour_id } = req.params;
    const { itinerary } = req.body;

    await tourModel.createItineraryRecord(tour_id, itinerary);

    res.json({ success: true, message: "Lưu lịch trình thành công!" });

  } catch (err) {
    console.error("Create itinerary error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getItinerary = async (req, res) => {
  try {
    const { tour_id } = req.params;

    const itinerary = await tourModel.getItineraryRecord(tour_id);

    res.json({ success: true, itinerary });

  } catch (err) {
    console.error("Get itinerary error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateItinerary = async (req, res) => {
  try {
    const { tour_id } = req.params;
    const { itinerary } = req.body;

    await tourModel.updateItineraryRecord(tour_id, itinerary);

    res.json({ success: true, message: "Cập nhật lịch trình thành công!" });

  } catch (err) {
    console.error("Update itinerary error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== PUBLIC LIST / DETAIL ==========================
exports.getPublicTours = async (req, res) => {
  try {
    const tours = await tourModel.getPublicToursRecord();
    res.json(tours);

  } catch (err) {
    console.error("Get public tours error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getPublicTourDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const tour = await tourModel.getPublicTourDetailRecord(id);

    if (!tour)
      return res.status(404).json({ error: "Tour not found" });

    res.json(tour);

  } catch (err) {
    console.error("Get public tour detail error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ======================== BOOKINGS ==========================
exports.getProviderBookings = async (req, res) => {
  try {
    const { providerId } = req.params;

    const bookings = await tourModel.getProviderBookingsRecord(providerId);

    res.json({ success: true, bookings });

  } catch (err) {
    console.error("Get provider bookings error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { booking_id } = req.params;
    const { status } = req.body;

    if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const result = await tourModel.updateBookingStatusRecord(booking_id, status);

    if (result.affectedRows === 0)
      return res.json({ success: false, message: "Booking not found" });

    res.json({ success: true, message: "Booking updated" });

  } catch (err) {
    console.error("Update booking status error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== DELETE IMAGE ==========================
exports.deleteImage = async (req, res) => {
  try {
    const { tour_id, image_id } = req.params;

    if (!image_id) {
      return res.status(400).json({ success: false, message: "Missing image_id" });
    }

    const image = await tourModel.getImageRecord(image_id, tour_id);

    if (!image) {
      return res.status(404).json({ success: false, message: "Image not found" });
    }

    const fileName = image.image_url.split("/").pop();
    const filePath = `uploads/tours/${fileName}`;

    // Xóa file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // Xóa DB record
    await tourModel.deleteImageRecord(image_id);

    res.json({ success: true, message: "Image deleted" });

  } catch (err) {
    console.error("Delete image error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== GET TOUR IMAGES ==========================
exports.getTourImages = async (req, res) => {
  try {
    const { tour_id } = req.params;

    const images = await tourModel.getTourImagesRecord(tour_id);

    res.json({ success: true, images });

  } catch (err) {
    console.error("Get images error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};