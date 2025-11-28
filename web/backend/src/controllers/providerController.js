const { v4: uuidv4 } = require("uuid");
const Provider = require("../models/providerModel");

module.exports = {
  createProvider: async (req, res) => {
    try {
      const { user_id, company_name, description, email, phone_number, address_id } = req.body;

      const [existing] = await Provider.checkExistingProvider(user_id);
      if (existing.length > 0)
        return res.status(400).json({ success: false, message: "❌ Người dùng này đã có provider rồi." });

      const [checkName] = await Provider.checkCompanyName(company_name);
      if (checkName.length > 0)
        return res.status(400).json({ field: "companyName", message: "Tên công ty đã được sử dụng ." });

      const [checkEmail] = await Provider.checkEmail(email);
      if (checkEmail.length > 0)
        return res.status(400).json({ field: "email", message: "Email này đã được sử dụng." });

      const [checkPhone] = await Provider.checkPhone(phone_number);
      if (checkPhone.length > 0)
        return res.status(400).json({ field: "phoneNumber", message: "Số điện thoại đã được sử dụng." });

      const provider_id = "prov_" + uuidv4();

      await Provider.createProvider(
        provider_id,
        user_id,
        company_name,
        description,
        email,
        phone_number,
        address_id
      );

      res.json({
        success: true,
        message: "✅ Provider created successfully!",
        provider_id,
      });
    } catch (error) {
      console.error("❌ Error creating provider:", error);
      res.status(500).json({ success: false, error: "Server error when creating provider." });
    }
  },

  uploadProviderImage: async (req, res) => {
    try {
      const { providerId } = req.params;
      const files = req.files;

      let avatarUrl = null;
      let coverUrl = null;

      if (files.avatar) {
        const f = files.avatar[0];
        avatarUrl = `${req.protocol}://${req.get("host")}/uploads/providers/${f.filename}`;

        await Provider.updateLogo(avatarUrl, providerId);
        await Provider.insertImage("img_" + uuidv4(), providerId, avatarUrl, "Ảnh logo provider");
      }

      if (files.cover) {
        const f = files.cover[0];
        coverUrl = `${req.protocol}://${req.get("host")}/uploads/providers/${f.filename}`;

        await Provider.updateCover(coverUrl, providerId);
        await Provider.insertImage("img_" + uuidv4(), providerId, coverUrl, "Ảnh cover provider");
      }

      res.json({
        success: true,
        message: "✅ Ảnh provider đã được upload & lưu DB thành công!",
        avatarUrl,
        coverUrl,
      });
    } catch (error) {
      console.error("❌ Upload image error:", error);
      res.status(500).json({ success: false, message: "Server error uploading provider image." });
    }
  },

  getProviders: async (req, res) => {
    try {
      const [rows] = await Provider.getProviders();
      res.json({ success: true, providers: rows });
    } catch (error) {
      res.status(500).json({ success: false, error: "Server error fetching providers." });
    }
  },

  getProviderByUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const [rows] = await Provider.getProviderByUser(userId);

      if (rows.length === 0)
        return res.json({ exists: false });

      res.json({ exists: true, provider: rows[0] });
    } catch (error) {
      console.error("❌ Error fetching provider by user:", error);
      res.status(500).json({ error: "Server error fetching provider status" });
    }
  },

  getProviderDetail: async (req, res) => {
    try {
      const { providerId } = req.params;

      const [rows] = await Provider.getProviderDetail(providerId);
      if (rows.length === 0)
        return res.status(404).json({ success: false, message: "Không tìm thấy nhà cung cấp này." });

      const provider = rows[0];
      const [images] = await Provider.getImages(providerId);

      provider.images = images;

      res.json({ success: true, provider });
    } catch (error) {
      console.error("❌ Error fetching provider:", error);
      res.status(500).json({ success: false, message: "Server error fetching provider details." });
    }
  }
};
