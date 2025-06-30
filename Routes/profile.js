const express = require("express");
const router = express.Router();
const { query } = require("../config/db");
const { ensureLoggedIn } = require("../middleware/auth");
const multer = require("multer");
const fs = require("fs").promises;
const path = require("path");

// const upload = multer({ dest: "public/uploads/" });
// Cấu hình multer (giữ nguyên từ mã gốc)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "hinh_anh") {
      cb(null, "public/uploads/images/");
    } else if (file.fieldname === "video_file") {
      cb(null, "public/uploads/videos/");
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "hinh_anh") {
      if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("Vui lòng tải lên file hình ảnh!"));
      }
    } else if (file.fieldname === "video_file") {
      if (file.mimetype !== "video/mp4") {
        return cb(new Error("Vui lòng tải lên file MP4!"));
      }
    }
    cb(null, true);
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

router.get("/profile", ensureLoggedIn, async (req, res) => {
  const userId = req.session.user.ID_CHINH_ND;
  try {
    // Lấy công thức của người dùng
    const userRecipes = await query("SELECT * FROM cong_thuc WHERE ID_CHINH_ND = ?", [userId]);

    // Lấy công thức yêu thích
    const favoriteRecipes = await query(`
      SELECT c.* FROM yeu_thich y
      JOIN cong_thuc c ON y.ID_CHINH_CT = c.ID_CHINH_CT 
      WHERE y.ID_CHINH_ND = ?`, [userId]);

    // Lấy danh sách loại món
    const categories = await query("SELECT ID_CHINH_LM AS ID_CHINH_MA, TEN_LM AS TEN_MON_AN FROM loai_mon");

    // Lấy danh sách nguyên liệu
    const nguyen_lieu = await query("SELECT ID_CHINH_NL, TEN_NL, DON_VI FROM nguyen_lieu");
    const mon_an = await query("SELECT * FROM mon_an");

    // Lấy thông tin chi tiết người dùng
    const [userInfo] = await query("SELECT * FROM nguoi_dung WHERE ID_CHINH_ND = ?", [userId]);

    if (!userInfo) {
      return res.status(404).send("Không tìm thấy thông tin người dùng");
    }

    // Cập nhật session với thông tin mới từ userInfo
    req.session.user = {
      ...req.session.user,
      TEN_NGUOI_DUNG: userInfo.TEN_NGUOI_DUNG,
      EMAIL_: userInfo.EMAIL_,
      AVARTAR_URL: userInfo.AVARTAR_URL,
    };

    res.render("index/index_layout", {
      viewPath: "profile",
      user: req.session.user,
      userInfo,
      userRecipes,
      favoriteRecipes,
      mon_an,
      nguyen_lieu, // Thêm nguyen_lieu vào template
    });
  } catch (err) {
    console.error("Lỗi truy vấn:", err);
    res.status(500).send("Lỗi server");
  }
});



router.put("/cong-thuc-cua-toi/:id", ensureLoggedIn, async (req, res) => {
  const { id } = req.params;
  const { TEN_CT, MOTA, THOI_GIAN_NAU, DO_KHO, SO_PHAN_AN, HUONG_DAN } = req.body;

  try {
    await query(
      "UPDATE cong_thuc SET TEN_CT = ?, MOTA = ?, HUONG_DAN = ?, THOI_GIAN_NAU = ?, DO_KHO = ?, SO_PHAN_AN = ?, NGAY_CAP_NHAT_CT = CURDATE() WHERE ID_CHINH_CT = ? AND ID_CHINH_ND = ?",
      [TEN_CT, MOTA, HUONG_DAN || null, THOI_GIAN_NAU, DO_KHO, SO_PHAN_AN, id, req.session.user.ID_CHINH_ND]
    );
    res.json({ message: "Sửa công thức thành công!" });
  } catch (err) {
    console.error("Lỗi khi sửa công thức:", err);
    res.status(500).json({ message: "Lỗi khi sửa công thức" });
  }
});

router.delete("/cong-thuc-cua-toi/:id", ensureLoggedIn, async (req, res) => {
  const { id } = req.params;

  try {
    // Xóa hình ảnh liên quan
    const recipe = await query("SELECT HINH_ANH_CT FROM cong_thuc WHERE ID_CHINH_CT = ? AND ID_CHINH_ND = ?", [id, req.session.user.ID_CHINH_ND]);
    if (recipe.length && recipe[0].HINH_ANH_CT) {
      const imagePath = path.join("public", recipe[0].HINH_ANH_CT);
      await fs.unlink(imagePath).catch(err => console.error("Lỗi xóa ảnh:", err));
    }

    await query("DELETE FROM cong_thuc WHERE ID_CHINH_CT = ? AND ID_CHINH_ND = ?", [id, req.session.user.ID_CHINH_ND]);
    res.json({ message: "Xóa công thức thành công!" });
  } catch (err) {
    console.error("Lỗi khi xóa công thức:", err);
    res.status(500).json({ message: "Lỗi khi xóa công thức" });
  }
});

router.put("/api/profile", ensureLoggedIn, upload.single("AVARTAR_URL"), async (req, res) => {
  const userId = req.session.user.ID_CHINH_ND;
  const { TEN_NGUOI_DUNG, EMAIL_ } = req.body;
  let avatarPath = req.session.user.AVARTAR_URL;

  if (!TEN_NGUOI_DUNG || !EMAIL_) {
    return res.status(400).json({ error: "Tên người dùng và email là bắt buộc!" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(EMAIL_)) {
    return res.status(400).json({ error: "Email không hợp lệ!" });
  }

  try {
    if (req.file) {
      const targetDir = path.join("public", "uploads", "images", "nguoidung", `${userId}`); // Cập nhật đường dẫn
      await fs.mkdir(targetDir, { recursive: true });
      const fileExtension = path.extname(req.file.originalname);
      const targetPath = path.join(targetDir, `nguoidung${fileExtension}`);
      await fs.rename(req.file.path, targetPath);
      avatarPath = `/uploads/images/nguoidung/${userId}/nguoidung${fileExtension}`; // Cập nhật đường dẫn trả về
    }

    await query(
      "UPDATE nguoi_dung SET TEN_NGUOI_DUNG = ?, EMAIL_ = ?, AVARTAR_URL = ? WHERE ID_CHINH_ND = ?",
      [TEN_NGUOI_DUNG, EMAIL_, avatarPath, userId]
    );

    req.session.user = { ...req.session.user, TEN_NGUOI_DUNG, EMAIL_, AVARTAR_URL: avatarPath };
    res.json({ message: "Cập nhật hồ sơ thành công!", user: req.session.user });
  } catch (err) {
    console.error("Lỗi cập nhật hồ sơ:", err);
    res.status(500).json({ error: "Lỗi server khi cập nhật hồ sơ" });
  }
});

router.post("/api/yeu-thich/:id", ensureLoggedIn, async (req, res) => {
  const userId = req.session.user.ID_CHINH_ND;
  const recipeId = req.params.id;

  try {
    const exists = await query("SELECT * FROM yeu_thich WHERE ID_CHINH_ND = ? AND ID_CHINH_CT = ?", [userId, recipeId]);
    if (exists.length > 0) {
      await query("DELETE FROM yeu_thich WHERE ID_CHINH_ND = ? AND ID_CHINH_CT = ?", [userId, recipeId]);
      res.json({ message: "Đã xóa khỏi yêu thích!" });
    } else {
      await query("INSERT INTO yeu_thich (ID_CHINH_ND, ID_CHINH_CT, NGAY_TAO_YT) VALUES (?, ?, CURDATE())", [userId, recipeId]);
      res.json({ message: "Đã thêm vào yêu thích!" });
    }
  } catch (err) {
    console.error("Lỗi:", err);
    res.status(500).json({ error: "Lỗi server khi thay đổi trạng thái yêu thích" });
  }
});


module.exports = router;