const express = require("express");
const router = express.Router();
const { query } = require("../config/db");
const { ensureAdmin, ensureLoggedIn } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

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

// hàm xóa thư mục id
const deleteDirectory = async (dirPath) => {
  try {
    await fs.access(dirPath); // Kiểm tra thư mục tồn tại
    await fs.rm(dirPath, { recursive: true, force: true }); // Xóa thư mục và tất cả tệp bên trong
    console.log(`Đã xóa thư mục: ${dirPath}`);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(`Thư mục không tồn tại, bỏ qua: ${dirPath}`);
    } else {
      console.error(`Lỗi khi xóa thư mục ${dirPath}:`, error);
      throw new Error(`Xóa thư mục thất bại: ${error.message}`);
    }
  }
};
// Trang quản lý admin
router.get("/admin", ensureAdmin, (req, res) => {
  res.render("admin/admin", { title: "Trang Quản Lý", user: req.session.user });
})
// Danh sách công thức
router.get("/admin/cong-thuc", ensureAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const offset = (page - 1) * limit;

    const countResult = await query(`SELECT COUNT(*) AS total FROM cong_thuc`);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const recipes = await query(`
      SELECT 
        ct.ID_CHINH_CT,
        ct.TEN_CT,
        ct.MOTA,
        ct.HUONG_DAN,
        ct.THOI_GIAN_NAU,
        ct.DO_KHO,
        ct.SO_PHAN_AN,
        ct.VIDEO,
        ct.HINH_ANH_CT,
        ct.NGAY_TAO_CT,
        ct.NGAY_CAP_NHAT_CT,
        ct.TRANG_THAI_DUYET_,
        nd.TEN_NGUOI_DUNG AS user,
        ma.TEN_MON_AN
      FROM cong_thuc ct
      LEFT JOIN nguoi_dung nd ON ct.ID_CHINH_ND = nd.ID_CHINH_ND
      LEFT JOIN mon_an ma ON ct.ID_CHINH_MA = ma.ID_CHINH_MA
      ORDER BY ct.NGAY_TAO_CT DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    res.render("admin/cong-thuc", {
      title: "Danh Sách Công Thức",
      recipes: recipes || [],
      currentPage: page,
      totalPages,
      layout: false,
    });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách công thức:", err);
    res.status(500).send("Lỗi server: " + err.message);
  }
});

// Trang thêm công thức
router.get("/admin/cong-thuc/add", ensureLoggedIn, async (req, res) => {
  try {
    const loai_mon = await query("SELECT * FROM loai_mon");
    const nguyen_lieu = await query("SELECT * FROM nguyen_lieu");
    const mon_an = await query("SELECT * FROM mon_an");
    res.render("admin/partials/them-cong-thuc", {
      recipe: null,
      loai_mon: loai_mon || [],
      nguyen_lieu: nguyen_lieu || [],
      mon_an: mon_an || [],
      selectedLoaiMon: [],
      selectedNguyenLieu: [],
      selectedMonAn: null,
      title: "Thêm Công Thức",
      user: req.session.user,
      layout: false,
    });
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu:", err);
    res.status(500).render("error", {
      message: "Lỗi server: " + err.message,
      user: req.session.user,
      layout: false,
    });
  }
});

// Trang chỉnh sửa công thức
router.get("/admin/cong-thuc/edit/:id", ensureLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;

    const [recipe] = await query(
      `SELECT ct.*, nd.TEN_NGUOI_DUNG AS user, ma.TEN_MON_AN
       FROM cong_thuc ct
       LEFT JOIN nguoi_dung nd ON ct.ID_CHINH_ND = nd.ID_CHINH_ND
       LEFT JOIN mon_an ma ON ct.ID_CHINH_MA = ma.ID_CHINH_MA
       WHERE ct.ID_CHINH_CT = ?`,
      [id]
    );

    if (!recipe) {
      return res.status(404).render("error", {
        message: "Không tìm thấy công thức",
        user: req.session.user,
        layout: false,
      });
    }

    const selectedLoaiMon = await query(
      `SELECT lm.ID_CHINH_LM, lm.TEN_LM
       FROM mon_an_loai_mon malm
       JOIN loai_mon lm ON malm.ID_CHINH_LM = lm.ID_CHINH_LM
       WHERE malm.ID_CHINH_MA = ?`,
      [recipe.ID_CHINH_MA]
    );

    const selectedNguyenLieu = await query(
      `SELECT ctnl.ID_CHINH_NL, nl.TEN_NL, ctnl.SO_LUONG, ctnl.GHI_CHU, nl.DON_VI
       FROM cong_thuc_nguyen_lieu ctnl
       JOIN nguyen_lieu nl ON ctnl.ID_CHINH_NL = nl.ID_CHINH_NL
       WHERE ctnl.ID_CHINH_CT = ?`,
      [id]
    );

    const loai_mon = await query("SELECT * FROM loai_mon");
    const nguyen_lieu = await query("SELECT * FROM nguyen_lieu");
    const mon_an = await query("SELECT * FROM mon_an");

    res.render("admin/partials/them-cong-thuc", {
      recipe: recipe || null,
      loai_mon: loai_mon || [],
      nguyen_lieu: nguyen_lieu || [],
      mon_an: mon_an || [],
      selectedLoaiMon: selectedLoaiMon ? selectedLoaiMon.map(lm => lm.ID_CHINH_LM.toString()) : [],
      selectedNguyenLieu: selectedNguyenLieu || [],
      selectedMonAn: recipe.ID_CHINH_MA ? recipe.ID_CHINH_MA.toString() : null,
      title: "Chỉnh sửa Công Thức",
      user: req.session.user,
      layout: false,
    });
  } catch (err) {
    console.error("Lỗi khi lấy chi tiết công thức:", err);
    res.status(500).render("error", {
      message: "Lỗi server: " + err.message,
      user: req.session.user,
      layout: false,
    });
  }
});

// Thêm công thức mới
router.post(
  "/admin/cong-thuc",
  ensureAdmin,
  upload.fields([
    { name: "hinh_anh", maxCount: 1 },
    { name: "video_file", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!req.session.user || !req.session.user.ID_CHINH_ND) {
        return res.status(401).json({ message: "Vui lòng đăng nhập lại!" });
      }

      const normalizeArray = (input) => Array.isArray(input) ? input : (input ? [input] : []);

      const {
        TEN_CT, MOTA, THOI_GIAN_NAU, DO_KHO, SO_PHAN_AN,
        ID_CHINH_MA, nguyen_lieu_id, ten_nguyen_lieu_khac,
        don_vi_khac, so_luong, ghi_chu,
        ten_buoc, buoc_nau
      } = req.body;

      const userId = req.session.user.ID_CHINH_ND;

      // Normalize các trường
      const nguyenLieuIds = normalizeArray(nguyen_lieu_id);
      const tenNguyenLieuKhacs = normalizeArray(ten_nguyen_lieu_khac);
      const donViKhacs = normalizeArray(don_vi_khac);
      const soLuongs = normalizeArray(so_luong);
      const ghiChus = normalizeArray(ghi_chu);
      const tenBuocArray = normalizeArray(ten_buoc);
      const buocNauArray = normalizeArray(buoc_nau);

      // Validate bắt buộc
      if (!TEN_CT?.trim() || !MOTA?.trim() || !ID_CHINH_MA) {
        return res.status(400).json({ message: "Tên công thức, mô tả và món ăn là bắt buộc!" });
      }

      if (
        tenBuocArray.length === 0 || buocNauArray.length === 0 ||
        tenBuocArray.length !== buocNauArray.length ||
        tenBuocArray.some(t => !t.trim()) || buocNauArray.some(b => !b.trim())
      ) {
        return res.status(400).json({ message: "Tên bước và mô tả bước là bắt buộc!" });
      }

      if (soLuongs.length === 0) {
        return res.status(400).json({ message: "Vui lòng thêm ít nhất một nguyên liệu!" });
      }

      // Kiểm tra món ăn tồn tại
      const [monAn] = await query(`SELECT ID_CHINH_MA FROM mon_an WHERE ID_CHINH_MA = ?`, [ID_CHINH_MA]);
      if (!monAn) return res.status(400).json({ message: "Món ăn không tồn tại!" });

      const huongDan = tenBuocArray.map((ten, i) =>
        `Bước ${i + 1}: ${ten.trim()} - ${buocNauArray[i].trim()}`
      ).join("\n\n");

      // Insert công thức trước
      const result = await query(`
        INSERT INTO cong_thuc 
        (ID_CHINH_ND, ID_CHINH_MA, TEN_CT, MOTA, HUONG_DAN, THOI_GIAN_NAU, DO_KHO, SO_PHAN_AN, VIDEO, HINH_ANH_CT, NGAY_TAO_CT, TRANG_THAI_DUYET_)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, CURDATE(), 'Đã duyệt')
      `, [
        userId, ID_CHINH_MA, TEN_CT.trim(), MOTA.trim(),
        huongDan, THOI_GIAN_NAU || null, DO_KHO || null, SO_PHAN_AN || null
      ]);

      const recipeId = result.insertId;

      // Upload file
      const createDir = async (type) => {
        const dir = path.join(__dirname, "..", "public", "Uploads", type, "congthuc", String(recipeId));
        await fs.mkdir(dir, { recursive: true });
        return dir;
      };

      const getUniqueFileName = async (dir, original) => {
        const ext = path.extname(original);
        const name = path.basename(original, ext);
        let filename = original;
        let i = 1;
        while (true) {
          try {
            await fs.access(path.join(dir, filename));
            filename = `${name}_${i++}${ext}`;
          } catch {
            return filename;
          }
        }
      };

      const saveFile = async (fileField, type) => {
        if (!req.files[fileField]) return null;
        const file = req.files[fileField][0];
        const dir = await createDir(type);
        const uniqueName = await getUniqueFileName(dir, file.originalname);
        await fs.rename(file.path, path.join(dir, uniqueName));
        return `/uploads/${type}/congthuc/${recipeId}/${uniqueName}`;
      };

      const finalImagePath = await saveFile("hinh_anh", "images");
      const finalVideoPath = await saveFile("video_file", "videos");

      await query(`UPDATE cong_thuc SET HINH_ANH_CT = ?, VIDEO = ? WHERE ID_CHINH_CT = ?`,
        [finalImagePath, finalVideoPath, recipeId]
      );

      // Xử lý nguyên liệu
      const nguyenLieuData = [];
      const seenIngredients = new Set();

      for (let i = 0; i < soLuongs.length; i++) {
        const id = nguyenLieuIds[i] || null;
        const ten = (tenNguyenLieuKhacs[i] || "").trim();
        const donVi = donViKhacs[i] || "";
        const sl = parseFloat(soLuongs[i]) || 0;
        const ghiChu = ghiChus[i] || "";

        if (sl <= 0) continue;

        let nguyenLieuId = id;

        if (!id && ten) {
          const [existing] = await query("SELECT ID_CHINH_NL FROM nguyen_lieu WHERE TEN_NL = ?", [ten]);
          if (existing) {
            // Xoá công thức vừa tạo để tránh rác DB
            await query("DELETE FROM cong_thuc WHERE ID_CHINH_CT = ?", [recipeId]);
            return res.status(400).json({
              message: `Nguyên liệu "${ten}" đã tồn tại, vui lòng chọn từ danh sách!`
            });
          }
          const insert = await query("INSERT INTO nguyen_lieu (TEN_NL, DON_VI) VALUES (?, ?)", [ten, donVi]);
          nguyenLieuId = insert.insertId;
        }

        if (!nguyenLieuId) continue;

        // NGĂN CHẶN TRÙNG LẶP nguyên liệu trong cùng công thức
        const key = `${recipeId}-${nguyenLieuId}`;
        if (seenIngredients.has(key)) {
          console.warn(`Trùng lặp nguyên liệu: ID_CHINH_CT=${recipeId}, ID_CHINH_NL=${nguyenLieuId}`);
          continue;
        }
        seenIngredients.add(key);

        nguyenLieuData.push([recipeId, nguyenLieuId, sl, ghiChu]);
      }

      // Ghi log để debug
      console.log("Dữ liệu nguyên liệu sẽ chèn:", nguyenLieuData);

      // Kiểm tra dữ liệu nguyên liệu
      if (nguyenLieuData.length === 0) {
        // Xoá công thức vừa tạo để tránh rác DB
        await query("DELETE FROM cong_thuc WHERE ID_CHINH_CT = ?", [recipeId]);
        return res.status(400).json({ message: "Không có nguyên liệu hợp lệ để thêm!" });
      }

      // Chèn nguyên liệu với ON DUPLICATE KEY UPDATE
      const placeholders = nguyenLieuData.map(() => "(?, ?, ?, ?)").join(", ");
      const values = nguyenLieuData.flat();
      await query(`
        INSERT INTO cong_thuc_nguyen_lieu (ID_CHINH_CT, ID_CHINH_NL, SO_LUONG, GHI_CHU)
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE SO_LUONG = VALUES(SO_LUONG), GHI_CHU = VALUES(GHI_CHU)
      `, values);

      return res.status(201).json({ message: "Thêm công thức thành công!" });

    } catch (err) {
      console.error("Lỗi server:", err);
      // Xoá công thức nếu có lỗi để tránh rác DB
      if (recipeId) {
        await query("DELETE FROM cong_thuc WHERE ID_CHINH_CT = ?", [recipeId]);
      }
      return res.status(500).json({ message: "Lỗi server: " + err.message });
    }
  }
);


// Cập nhật công thức
router.put(
  "/admin/cong-thuc/:id",
  ensureAdmin,
  upload.fields([
    { name: "hinh_anh", maxCount: 1 },
    { name: "video_file", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const recipeId = req.params.id;

      if (!req.session.user || !req.session.user.ID_CHINH_ND) {
        return res.status(401).json({ message: "Vui lòng đăng nhập lại!" });
      }

      const normalizeArray = (input) => Array.isArray(input) ? input : (input ? [input] : []);

      const {
        TEN_CT, MOTA, THOI_GIAN_NAU, DO_KHO, SO_PHAN_AN,
        ID_CHINH_MA, nguyen_lieu_id, ten_nguyen_lieu_khac,
        don_vi_khac, so_luong, ghi_chu,
        ten_buoc, buoc_nau
      } = req.body;

      const nguyenLieuIds = normalizeArray(nguyen_lieu_id);
      const tenNguyenLieuKhacs = normalizeArray(ten_nguyen_lieu_khac);
      const donViKhacs = normalizeArray(don_vi_khac);
      const soLuongs = normalizeArray(so_luong);
      const ghiChus = normalizeArray(ghi_chu);
      const tenBuocArray = normalizeArray(ten_buoc);
      const buocNauArray = normalizeArray(buoc_nau);

      if (!TEN_CT?.trim() || !MOTA?.trim() || !ID_CHINH_MA) {
        return res.status(400).json({ message: "Tên công thức, mô tả và món ăn là bắt buộc!" });
      }

      if (
        tenBuocArray.length === 0 || buocNauArray.length === 0 ||
        tenBuocArray.length !== buocNauArray.length ||
        tenBuocArray.some(t => !t.trim()) || buocNauArray.some(b => !b.trim())
      ) {
        return res.status(400).json({ message: "Tên bước và mô tả bước là bắt buộc!" });
      }

      if (soLuongs.length === 0) {
        return res.status(400).json({ message: "Vui lòng thêm ít nhất một nguyên liệu!" });
      }

      const [monAn] = await query("SELECT ID_CHINH_MA FROM mon_an WHERE ID_CHINH_MA = ?", [ID_CHINH_MA]);
      if (!monAn) return res.status(400).json({ message: "Món ăn không tồn tại!" });

      const huongDan = tenBuocArray.map((ten, i) =>
        `Bước ${i + 1}: ${ten.trim()} - ${buocNauArray[i].trim()}`
      ).join("\n\n");

      await query(`
          UPDATE cong_thuc SET 
          TEN_CT = ?, MOTA = ?, HUONG_DAN = ?, 
          THOI_GIAN_NAU = ?, DO_KHO = ?, SO_PHAN_AN = ?, 
          ID_CHINH_MA = ?, NGAY_CAP_NHAT_CT = NOW()
        WHERE ID_CHINH_CT = ?
      `, [
        TEN_CT.trim(), MOTA.trim(), huongDan,
        THOI_GIAN_NAU || null, DO_KHO || null, SO_PHAN_AN || null,
        ID_CHINH_MA, recipeId
      ]);

      const createDir = async (type) => {
        const dir = path.join(__dirname, "..", "public", "Uploads", type, "congthuc", String(recipeId));
        await fs.mkdir(dir, { recursive: true });
        return dir;
      };

      const getUniqueFileName = async (dir, original) => {
        const ext = path.extname(original);
        const name = path.basename(original, ext);
        let filename = original;
        let i = 1;
        while (true) {
          try {
            await fs.access(path.join(dir, filename));
            filename = `${name}_${i++}${ext}`;
          } catch {
            return filename;
          }
        }
      };

      const saveFile = async (fileField, type) => {
        if (!req.files[fileField]) return null;
        const file = req.files[fileField][0];
        const dir = await createDir(type);
        const uniqueName = await getUniqueFileName(dir, file.originalname);
        await fs.rename(file.path, path.join(dir, uniqueName));
        return `/uploads/${type}/congthuc/${recipeId}/${uniqueName}`;
      };

      const finalImagePath = await saveFile("hinh_anh", "images");
      const finalVideoPath = await saveFile("video_file", "videos");

      await query(`
        UPDATE cong_thuc 
        SET HINH_ANH_CT = COALESCE(?, HINH_ANH_CT),
            VIDEO = COALESCE(?, VIDEO)
        WHERE ID_CHINH_CT = ?
      `, [finalImagePath, finalVideoPath, recipeId]);

      // Xóa nguyên liệu cũ
      // Xóa nguyên liệu cũ
      // Xóa nguyên liệu cũ
      await query("DELETE FROM cong_thuc_nguyen_lieu WHERE ID_CHINH_CT = ?", [recipeId]);

      const nguyenLieuData = [];
      for (let i = 0; i < soLuongs.length; i++) {
        const id = nguyenLieuIds[i] || null;
        const ten = (tenNguyenLieuKhacs[i] || "").trim();
        const donVi = donViKhacs[i] || "";
        const sl = parseFloat(soLuongs[i]) || 0;
        const ghiChu = ghiChus[i] || "";

        if (sl <= 0) continue;

        let nguyenLieuId = id;
        if (!id && ten) {
          const [existing] = await query("SELECT ID_CHINH_NL FROM nguyen_lieu WHERE TEN_NL = ?", [ten]);
          if (existing) {
            nguyenLieuId = existing.ID_CHINH_NL;
          } else {
            const insert = await query("INSERT INTO nguyen_lieu (TEN_NL, DON_VI) VALUES (?, ?)", [ten, donVi]);
            nguyenLieuId = insert.insertId;
          }
        }

        if (!nguyenLieuId) continue;

        nguyenLieuData.push([recipeId, nguyenLieuId, sl, ghiChu]);
      }

      if (nguyenLieuData.length === 0) {
        return res.status(400).json({ message: "Không có nguyên liệu hợp lệ để cập nhật!" });
      }

      const placeholders = nguyenLieuData.map(() => "(?, ?, ?, ?)").join(", ");
      const values = nguyenLieuData.flat();
      await query(`
  INSERT INTO cong_thuc_nguyen_lieu (ID_CHINH_CT, ID_CHINH_NL, SO_LUONG, GHI_CHU)
  VALUES ${placeholders}
`, values);

      return res.status(200).json({ message: "Cập nhật công thức thành công!" });

    } catch (err) {
      console.error("Lỗi server:", err);
      return res.status(500).json({ message: "Lỗi server: " + err.message });
    }
  }
);



// Xóa công thức
router.delete("/admin/cong-thuc/:id", ensureAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Lấy thông tin công thức
    const [recipe] = await query("SELECT ID_CHINH_CT, HINH_ANH_CT, VIDEO FROM cong_thuc WHERE ID_CHINH_CT = ?", [id]);
    if (!recipe) {
      return res.status(404).json({ message: "Công thức không tồn tại!" });
    }

    // Xóa bản ghi
    await query("DELETE FROM cong_thuc_nguyen_lieu WHERE ID_CHINH_CT = ?", [id]);
    await query("DELETE FROM cong_thuc WHERE ID_CHINH_CT = ?", [id]);

    // Xóa tệp hình ảnh và video nếu có
    if (recipe.HINH_ANH_CT) {
      const imagePath = path.join(__dirname, "..", "public", recipe.HINH_ANH_CT);
      await fs.unlink(imagePath).catch((err) => console.error(`Lỗi xóa tệp ảnh ${imagePath}:`, err));
    }
    if (recipe.VIDEO) {
      const videoPath = path.join(__dirname, "..", "public", recipe.VIDEO);
      await fs.unlink(videoPath).catch((err) => console.error(`Lỗi xóa tệp video ${videoPath}:`, err));
    }

    // Xóa thư mục (để đảm bảo không còn tệp rác)
    const imageDir = path.join(__dirname, "..", "public", "Uploads", "images", "congthuc", String(id));
    const videoDir = path.join(__dirname, "..", "public", "Uploads", "videos", "congthuc", String(id));
    await deleteDirectory(imageDir);
    await deleteDirectory(videoDir);

    return res.status(200).json({ message: "Xóa công thức thành công!" });
  } catch (error) {
    console.error("Lỗi khi xóa công thức:", error);
    return res.status(500).json({ message: "Lỗi server: " + error.message });
  }
});

// Duyệt công thức
router.put("/admin/cong-thuc/approve/:id", ensureAdmin, async (req, res) => {
  const recipeId = req.params.id;

  try {
    const [recipe] = await query(
      `SELECT TRANG_THAI_DUYET_ FROM cong_thuc WHERE ID_CHINH_CT = ?`,
      [recipeId]
    );
    if (!recipe) {
      return res.status(404).json({ message: "Công thức không tồn tại." });
    }

    if (recipe.TRANG_THAI_DUYET_ !== "Đang chờ duyệt") {
      return res.status(400).json({ message: "Công thức này không thể được duyệt (không phải trạng thái chờ duyệt)." });
    }

    await query(
      `UPDATE cong_thuc SET TRANG_THAI_DUYET_ = 'Đã duyệt' WHERE ID_CHINH_CT = ?`,
      [recipeId]
    );

    return res.json({ message: "Duyệt công thức thành công!" });
  } catch (err) {
    console.error("Lỗi duyệt công thức:", err);
    return res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// Danh sách nguyên liệu
router.get("/admin/nguyen-lieu", ensureAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const offset = (page - 1) * limit;

    const countResult = await query(`SELECT COUNT(*) AS total FROM nguyen_lieu`);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const ingredients = await query(`
      SELECT ID_CHINH_NL, TEN_NL, DON_VI
      FROM nguyen_lieu
      ORDER BY ID_CHINH_NL DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const pageRecipes = parseInt(req.query.pageRecipes) || 1;
    const limitRecipes = 8;
    const offsetRecipes = (pageRecipes - 1) * limitRecipes;

    const countRecipesResult = await query(`SELECT COUNT(*) AS total FROM cong_thuc`);
    const totalRecipes = countRecipesResult[0]?.total || 0;
    const totalPagesRecipes = Math.ceil(totalRecipes / limitRecipes);

    const recipes = await query(`
      SELECT ct.ID_CHINH_CT, ct.TEN_CT, ct.NGAY_CAP_NHAT_CT, ma.TEN_MON_AN
      FROM cong_thuc ct
      LEFT JOIN mon_an ma ON ct.ID_CHINH_MA = ma.ID_CHINH_MA
      ORDER BY ct.ID_CHINH_CT DESC
      LIMIT ? OFFSET ?
    `, [limitRecipes, offsetRecipes]);

    const recipeIds = recipes.map((r) => r.ID_CHINH_CT);
    let ingredientRecipes = [];

    if (recipeIds.length > 0) {
      ingredientRecipes = await query(`
        SELECT 
          ctnl.ID_CHINH_CT,
          nl.TEN_NL AS ten_nl,
          nl.DON_VI AS don_vi,
          ctnl.SO_LUONG AS so_luong,
          ctnl.GHI_CHU AS ghi_chu,
          ct.TEN_CT AS ten_ct,
          ct.NGAY_CAP_NHAT_CT AS ngay_cap_nhat_ct
        FROM cong_thuc_nguyen_lieu ctnl
        JOIN nguyen_lieu nl ON ctnl.ID_CHINH_NL = nl.ID_CHINH_NL
        JOIN cong_thuc ct ON ctnl.ID_CHINH_CT = ct.ID_CHINH_CT
        WHERE ctnl.ID_CHINH_CT IN (?)
        ORDER BY ctnl.ID_CHINH_CT DESC
      `, [recipeIds]);
    }

    const groupedRecipes = {};
    ingredientRecipes.forEach((row) => {
      if (!groupedRecipes[row.ID_CHINH_CT]) {
        groupedRecipes[row.ID_CHINH_CT] = {
          ten_ct: row.ten_ct,
          ngay_cap_nhat_ct: row.ngay_cap_nhat_ct,
          nguyen_lieu: [],
        };
      }
      groupedRecipes[row.ID_CHINH_CT].nguyen_lieu.push({
        ten_nl: row.ten_nl,
        so_luong: row.so_luong,
        don_vi: row.don_vi,
        ghi_chu: row.ghi_chu || '',
      });
    });

    res.render("admin/nguyen-lieu", {
      title: "Danh Sách Nguyên Liệu & Công Thức",
      ingredients,
      currentPage: page,
      totalPages,
      recipes,
      groupedRecipes,
      currentPageRecipes: pageRecipes,
      totalPagesRecipes,
    });
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu:", err);
    res.status(500).send("Lỗi server: " + err.message);
  }
});

// Thêm nguyên liệu
router.post("/admin/nguyen-lieu", ensureAdmin, async (req, res) => {
  const { TEN_NL, DON_VI } = req.body;
  try {
    const [existing] = await query(
      "SELECT ID_CHINH_NL FROM nguyen_lieu WHERE TEN_NL = ?",
      [TEN_NL.trim()]
    );
    if (existing) {
      return res.status(400).json({ message: `Nguyên liệu "${TEN_NL.trim()}" đã tồn tại.` });
    }

    const result = await query(
      "INSERT INTO nguyen_lieu (TEN_NL, DON_VI) VALUES (?, ?)",
      [TEN_NL.trim(), DON_VI.trim()]
    );
    res.json({ message: "Thêm nguyên liệu thành công", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// Cập nhật nguyên liệu
router.put("/admin/nguyen-lieu/:id", ensureAdmin, async (req, res) => {
  const { id } = req.params;
  const { TEN_NL, DON_VI } = req.body;

  // Kiểm tra id và dữ liệu body
  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "ID nguyên liệu không hợp lệ" });
  }
  if (!TEN_NL || !DON_VI) {
    return res.status(400).json({ message: "Tên nguyên liệu và đơn vị là bắt buộc" });
  }

  try {
    const [ingredient] = await query(
      "SELECT ID_CHINH_NL FROM nguyen_lieu WHERE ID_CHINH_NL = ?",
      [id]
    );
    if (!ingredient) {
      return res.status(404).json({ message: "Không tìm thấy nguyên liệu" });
    }

    const [existing] = await query(
      "SELECT ID_CHINH_NL FROM nguyen_lieu WHERE TEN_NL = ? AND ID_CHINH_NL != ?",
      [TEN_NL.trim(), id]
    );
    if (existing) {
      return res.status(400).json({ message: `Nguyên liệu "${TEN_NL.trim()}" đã tồn tại.` });
    }

    await query(
      "UPDATE nguyen_lieu SET TEN_NL = ?, DON_VI = ? WHERE ID_CHINH_NL = ?",
      [TEN_NL.trim(), DON_VI.trim(), id]
    );
    res.json({ message: "Cập nhật nguyên liệu thành công" });
  } catch (err) {
    console.error("Lỗi server:", err);
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// Xóa nguyên liệu
router.delete("/admin/nguyen-lieu/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [existingIngredient] = await query(
      "SELECT * FROM nguyen_lieu WHERE ID_CHINH_NL = ?",
      [id]
    );
    if (!existingIngredient) {
      return res.status(404).json({ message: "Nguyên liệu không tồn tại." });
    }

    await query("DELETE FROM nguyen_lieu WHERE ID_CHINH_NL = ?", [id]);

    return res.status(200).json({ message: "Xóa nguyên liệu thành công!" });
  } catch (err) {
    console.error("Lỗi server:", err);
    return res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// Danh sách loại món
router.get("/admin/loai-mon", ensureAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const offset = (page - 1) * limit;

    const countResult = await query(`SELECT COUNT(*) AS total FROM loai_mon`);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const categories = await query(`
      SELECT ID_CHINH_LM, TEN_LM, SLUG_LM, HINH_ANH_LM_URL
      FROM loai_mon
      ORDER BY ID_CHINH_LM DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const categoryIds = categories.map((c) => c.ID_CHINH_LM);
    let recipes = [];

    if (categoryIds.length > 0) {
      recipes = await query(`
        SELECT 
          malm.ID_CHINH_LM,
          ma.ID_CHINH_MA,
          ma.TEN_MON_AN
        FROM mon_an_loai_mon malm
        JOIN mon_an ma ON malm.ID_CHINH_MA = ma.ID_CHINH_MA
        WHERE malm.ID_CHINH_LM IN (?)
        ORDER BY malm.ID_CHINH_LM DESC
      `, [categoryIds]);
    }

    const groupedRecipes = {};
    categories.forEach((cat) => {
      groupedRecipes[cat.ID_CHINH_LM] = {
        TEN_LM: cat.TEN_LM,
        mon_an: [],
      };
    });

    recipes.forEach((r) => {
      if (groupedRecipes[r.ID_CHINH_LM]) {
        groupedRecipes[r.ID_CHINH_LM].mon_an.push({
          ID_CHINH_MA: r.ID_CHINH_MA,
          TEN_MON_AN: r.TEN_MON_AN,
        });
      }
    });

    res.render("admin/loai-mon", {
      title: "Danh Sách Loại Món & Món Ăn",
      categories,
      currentPage: page,
      totalPages,
      groupedRecipes,
    });
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu loại món:", err);
    res.status(500).json({ error: "Lỗi server: " + err.message });
  }
});

// Thêm loại món
router.post("/admin/loai-mon", ensureAdmin, upload.single("hinh_anh"), async (req, res) => {
  console.log("POST /admin/loai-mon called at", new Date().toISOString());
  console.log("Request body:", req.body);
  console.log("Request file:", req.file);
  console.log("Multer temporary path:", req.file ? req.file.path : "No file");

  try {
    const { TEN_LM, SLUG_LM } = req.body;

    // Validate input
    if (!TEN_LM || !TEN_LM.trim()) {
      if (req.file) await fs.unlink(req.file.path).catch((err) => console.error("Lỗi xóa file tạm:", err));
      return res.status(400).json({ message: "Tên loại món là bắt buộc!" });
    }

    // Kiểm tra SLUG_LM nếu có
    if (SLUG_LM && SLUG_LM.trim()) {
      const [existing] = await query("SELECT SLUG_LM FROM loai_mon WHERE SLUG_LM = ?", [SLUG_LM.trim()]);
      if (existing) {
        if (req.file) await fs.unlink(req.file.path).catch((err) => console.error("Lỗi xóa file tạm:", err));
        return res.status(400).json({ message: `Slug "${SLUG_LM.trim()}" đã tồn tại!` });
      }
    }

    // Thêm loại món mới
    const result = await query(
      "INSERT INTO loai_mon (TEN_LM, SLUG_LM, HINH_ANH_LM_URL) VALUES (?, ?, ?)",
      [TEN_LM.trim(), SLUG_LM ? SLUG_LM.trim() : null, ""]
    );
    const categoryId = result.insertId;
    console.log(`Đã thêm loại món với ID: ${categoryId}`);

    // Hàm tạo thư mục
    const createDir = async () => {
      const dir = path.join(__dirname, "..", "public", "Uploads", "images", "loaimon", String(categoryId));
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`Đã tạo thư mục: ${dir}`);
        return dir;
      } catch (error) {
        console.error(`Lỗi tạo thư mục ${dir}:`, error);
        throw new Error(`Tạo thư mục thất bại: ${error.message}`);
      }
    };

    // Hàm tạo tên file duy nhất
    const getUniqueFileName = async (dir, original) => {
      const ext = path.extname(original);
      const name = path.basename(original, ext);
      let filename = original;
      let i = 1;
      while (true) {
        try {
          await fs.access(path.join(dir, filename));
          filename = `${name}_${i++}${ext}`;
        } catch {
          return filename;
        }
      }
    };

    // Hàm lưu file
    const saveFile = async () => {
      if (!req.file) {
        console.log("Không có file được tải lên");
        return null;
      }
      try {
        await fs.access(req.file.path);
        console.log(`File nguồn tồn tại: ${req.file.path}`);
        const dir = await createDir();
        const uniqueName = await getUniqueFileName(dir, req.file.originalname);
        const targetPath = path.join(dir, uniqueName);
        await fs.rename(req.file.path, targetPath);
        console.log(`Đã di chuyển file đến: ${targetPath}`);
        return `/uploads/images/loaimon/${categoryId}/${uniqueName}`;
      } catch (error) {
        console.error(`Lỗi trong saveFile cho ID ${categoryId}:`, error);
        throw new Error(`Di chuyển file thất bại: ${error.message}`);
      }
    };

    // Lưu hình ảnh và cập nhật database
    let imagePath = null;
    if (req.file) {
      imagePath = await saveFile();
      console.log(`Đường dẫn hình ảnh lưu vào DB: ${imagePath}`);
      await query(
        "UPDATE loai_mon SET HINH_ANH_LM_URL = ? WHERE ID_CHINH_LM = ?",
        [imagePath, categoryId]
      );
    }

    return res.status(201).json({ message: "Thêm loại món thành công!", id: categoryId });
  } catch (error) {
    console.error("Lỗi server:", error);
    if (req.file) await fs.unlink(req.file.path).catch((err) => console.error("Lỗi xóa file tạm:", err));
    return res.status(500).json({ message: "Lỗi server: " + error.message });
  }
});
router.get("/admin/loai-mon/edit/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [category] = await query("SELECT ID_CHINH_LM, TEN_LM, SLUG_LM, HINH_ANH_LM_URL FROM loai_mon WHERE ID_CHINH_LM = ?", [id]);
    if (!category) {
      return res.status(404).json({ message: "Loại món không tồn tại!" });
    }
    res.status(200).json(category);
  } catch (error) {
    console.error("Lỗi server:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
});
// Cập nhật loại món
router.put(
  '/admin/loai-mon/:id',
  ensureAdmin,
  upload.single('hinh_anh'),
  async (req, res) => {
    const categoryId = req.params.id;
    console.log(`PUT /admin/loai-mon/${categoryId} called at`, new Date().toISOString());
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    try {
      const { TEN_LM, SLUG_LM } = req.body;

      // --- Validate input ---
      if (!TEN_LM || !TEN_LM.trim()) {
        if (req.file) await fs.unlink(req.file.path).catch(() => { });
        return res.status(400).json({ message: 'Tên loại món là bắt buộc!' });
      }

      if (SLUG_LM && SLUG_LM.trim()) {
        // Kiểm tra xem slug có trùng với record khác không
        const [exists] = await query(
          'SELECT ID_CHINH_LM FROM loai_mon WHERE SLUG_LM = ? AND ID_CHINH_LM <> ?',
          [SLUG_LM.trim(), categoryId]
        );
        if (exists) {
          if (req.file) await fs.unlink(req.file.path).catch(() => { });
          return res.status(400).json({ message: `Slug "${SLUG_LM.trim()}" đã tồn tại!` });
        }
      }

      // --- Cập nhật text fields trước ---
      await query(
        'UPDATE loai_mon SET TEN_LM = ?, SLUG_LM = ? WHERE ID_CHINH_LM = ?',
        [TEN_LM.trim(), SLUG_LM ? SLUG_LM.trim() : null, categoryId]
      );
      console.log(`Đã cập nhật TEN_LM, SLUG_LM cho ID ${categoryId}`);

      // --- Xử lý file hình ảnh nếu có ---
      if (req.file) {
        // 1. Tạo folder nếu chưa có
        const dir = path.join(__dirname, '..', 'public', 'Uploads', 'images', 'loaimon', categoryId);
        await fs.mkdir(dir, { recursive: true });

        // 2. Tạo tên file duy nhất
        const ext = path.extname(req.file.originalname);
        const baseName = path.basename(req.file.originalname, ext);
        let filename = req.file.originalname;
        let counter = 1;
        while (true) {
          try {
            await fs.access(path.join(dir, filename));
            filename = `${baseName}_${counter++}${ext}`;
          } catch {
            break;
          }
        }

        // 3. Di chuyển file tạm vào folder chính
        const targetPath = path.join(dir, filename);
        await fs.rename(req.file.path, targetPath);
        const imageUrl = `/uploads/images/loaimon/${categoryId}/${filename}`;
        console.log(`File hình được lưu: ${imageUrl}`);

        // 4. Xóa file cũ (nếu có)
        const [old] = await query(
          'SELECT HINH_ANH_LM_URL FROM loai_mon WHERE ID_CHINH_LM = ?',
          [categoryId]
        );
        if (old && old.HINH_ANH_LM_URL) {
          const oldPath = path.join(__dirname, '..', 'public', old.HINH_ANH_LM_URL);
          fs.unlink(oldPath).catch(() => { }); // xóa bất đồng bộ, không chặn
        }

        // 5. Cập nhật URL mới vào DB
        await query(
          'UPDATE loai_mon SET HINH_ANH_LM_URL = ? WHERE ID_CHINH_LM = ?',
          [imageUrl, categoryId]
        );
        console.log(`Cập nhật HINH_ANH_LM_URL cho ID ${categoryId}`);
      }

      return res.json({ message: 'Cập nhật loại món thành công!' });
    } catch (err) {
      console.error('Lỗi server:', err);
      if (req.file) await fs.unlink(req.file.path).catch(() => { });
      return res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
  }
);

router.delete("/admin/loai-mon/:id", ensureAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Kiểm tra loại món tồn tại
    const [category] = await query("SELECT ID_CHINH_LM, HINH_ANH_LM_URL FROM loai_mon WHERE ID_CHINH_LM = ?", [id]);
    if (!category) {
      return res.status(404).json({ message: "Loại món không tồn tại!" });
    }

    // Xóa bản ghi trong bảng loai_mon
    await query("DELETE FROM loai_mon WHERE ID_CHINH_LM = ?", [id]);

    // Xóa thư mục hình ảnh
    const imageDir = path.join(__dirname, "..", "public", "Uploads", "images", "loaimon", String(id));
    await deleteDirectory(imageDir);

    return res.status(200).json({ message: "Xóa loại món thành công!" });
  } catch (error) {
    console.error("Lỗi khi xóa loại món:", error);
    return res.status(500).json({ message: "Lỗi server: " + error.message });
  }
});
router.get("/admin/mon-an", ensureAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageCategories = parseInt(req.query.pageCategories) || 1;
    const limit = 8;
    const limitCategories = 8;
    const offset = (page - 1) * limit;
    const offsetCategories = (pageCategories - 1) * limitCategories;

    const countResult = await query(`SELECT COUNT(*) AS total FROM mon_an`);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const monAnList = await query(`
      SELECT ID_CHINH_MA, TEN_MON_AN, HINH_ANH_MA, SLUG_MA, MO_TA_MA
      FROM mon_an
      ORDER BY ID_CHINH_MA DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const categories = await query(`
      SELECT ID_CHINH_LM, TEN_LM
      FROM loai_mon
      ORDER BY TEN_LM ASC
    `);

    const countCategoriesResult = await query(`
      SELECT COUNT(*) AS total
      FROM mon_an_loai_mon malm
      JOIN mon_an ma ON malm.ID_CHINH_MA = ma.ID_CHINH_MA
    `);
    const totalCategories = countCategoriesResult[0]?.total || 0;
    const totalPagesCategories = Math.ceil(totalCategories / limitCategories);

    const monAnIds = monAnList.map((m) => m.ID_CHINH_MA);
    let loaiMonData = [];

    if (monAnIds.length > 0) {
      loaiMonData = await query(`
        SELECT 
          malm.ID_CHINH_MA,
          lm.ID_CHINH_LM,
          lm.TEN_LM,
          ma.TEN_MON_AN
        FROM mon_an_loai_mon malm
        JOIN loai_mon lm ON malm.ID_CHINH_LM = lm.ID_CHINH_LM
        JOIN mon_an ma ON malm.ID_CHINH_MA = ma.ID_CHINH_MA
        ORDER BY malm.ID_CHINH_MA DESC
        LIMIT ? OFFSET ?
      `, [limitCategories, offsetCategories]);
    }

    const groupedLoaiMon = {};
    monAnList.forEach((mon) => {
      groupedLoaiMon[mon.ID_CHINH_MA] = {
        TEN_MON_AN: mon.TEN_MON_AN,
        HINH_ANH_MA: mon.HINH_ANH_MA,
        MO_TA_MA: mon.MO_TA_MA,
        loai_mon: [],
      };
    });

    loaiMonData.forEach((lm) => {
      if (groupedLoaiMon[lm.ID_CHINH_MA]) {
        groupedLoaiMon[lm.ID_CHINH_MA].loai_mon.push({
          ID_CHINH_LM: lm.ID_CHINH_LM,
          TEN_LM: lm.TEN_LM,
        });
      } else {
        groupedLoaiMon[lm.ID_CHINH_MA] = {
          TEN_MON_AN: lm.TEN_MON_AN,
          HINH_ANH_MA: null,
          MO_TA_MA: null,
          loai_mon: [{ ID_CHINH_LM: lm.ID_CHINH_LM, TEN_LM: lm.TEN_LM }],
        };
      }
    });

    res.render("admin/mon-an", {
      title: "Danh Sách Món Ăn & Loại Món",
      monAnList,
      categories,
      currentPage: page,
      totalPages,
      currentPageCategories: pageCategories,
      totalPagesCategories,
      groupedLoaiMon,
    });
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu món ăn:", err);
    res.status(500).json({ error: "Lỗi server: " + err.message });
  }
});
// Thêm món ăn mới
router.post("/admin/mon-an", ensureAdmin, upload.single("hinh_anh"), async (req, res) => {
  console.log("POST /admin/mon-an called at", new Date().toISOString());
  console.log("Request body:", req.body);
  console.log("Request file:", req.file);
  console.log("Multer temporary path:", req.file ? req.file.path : "No file");
  console.log("ID_CHINH_LM raw value:", req.body.ID_CHINH_LM, "Type:", typeof req.body.ID_CHINH_LM);

  try {
    const { TEN_MON_AN, MO_TA_MA, SLUG_MA, ID_CHINH_LM } = req.body;

    // Phân tích ID_CHINH_LM
    let loaiMonIds = [];
    if (ID_CHINH_LM) {
      try {
        if (typeof ID_CHINH_LM === 'string' && ID_CHINH_LM.trim()) {
          const parsed = JSON.parse(ID_CHINH_LM);
          loaiMonIds = Array.isArray(parsed) ? parsed : [parsed];
        } else if (Array.isArray(ID_CHINH_LM)) {
          loaiMonIds = ID_CHINH_LM;
        } else {
          loaiMonIds = [ID_CHINH_LM];
        }
        // Lọc và chuyển thành mảng các chuỗi số nguyên hợp lệ
        loaiMonIds = loaiMonIds
          .map(id => String(id).trim())
          .filter(id => id && !isNaN(id) && Number.isInteger(Number(id)))
          .map(id => String(id)); // Đảm bảo tất cả là chuỗi
        console.log("Parsed loaiMonIds:", loaiMonIds);
      } catch (err) {
        console.error("Lỗi phân tích ID_CHINH_LM:", err.message, "Raw value:", ID_CHINH_LM);
        if (req.file) await fs.unlink(req.file.path).catch((err) => console.error("Lỗi xóa file tạm:", err));
        return res.status(400).json({
          message: "Danh sách loại món không hợp lệ!",
          error: err.message,
          rawValue: ID_CHINH_LM
        });
      }
    }

    // Validate input
    if (!TEN_MON_AN || !TEN_MON_AN.trim()) {
      if (req.file) await fs.unlink(req.file.path).catch((err) => console.error("Lỗi xóa file tạm:", err));
      return res.status(400).json({ message: "Tên món ăn là bắt buộc!" });
    }

    if (loaiMonIds.length === 0) {
      if (req.file) await fs.unlink(req.file.path).catch((err) => console.error("Lỗi xóa file tạm:", err));
      return res.status(400).json({ message: "Vui lòng chọn ít nhất một loại món!" });
    }

    // Kiểm tra SLUG_MA nếu có
    if (SLUG_MA && SLUG_MA.trim()) {
      const [existing] = await query("SELECT SLUG_MA FROM mon_an WHERE SLUG_MA = ?", [SLUG_MA.trim()]);
      if (existing) {
        if (req.file) await fs.unlink(req.file.path).catch((err) => console.error("Lỗi xóa file tạm:", err));
        return res.status(400).json({ message: `Slug "${SLUG_MA.trim()}" đã tồn tại!` });
      }
    }

    // Kiểm tra loại món tồn tại
    const validLoaiMon = await query(
      `SELECT ID_CHINH_LM FROM loai_mon WHERE ID_CHINH_LM IN (${loaiMonIds.map(() => "?").join(",")})`,
      loaiMonIds
    );
    if (validLoaiMon.length !== loaiMonIds.length) {
      if (req.file) await fs.unlink(req.file.path).catch((err) => console.error("Lỗi xóa file tạm:", err));
      return res.status(400).json({ message: "Một hoặc nhiều loại món không tồn tại!" });
    }

    // Thêm món ăn mới
    const result = await query(
      "INSERT INTO mon_an (TEN_MON_AN, MO_TA_MA, SLUG_MA, HINH_ANH_MA) VALUES (?, ?, ?, ?)",
      [TEN_MON_AN.trim(), MO_TA_MA?.trim() || null, SLUG_MA?.trim() || null, ""]
    );
    const monAnId = result.insertId;
    console.log(`Đã thêm món ăn với ID: ${monAnId}`);

    // Hàm tạo thư mục
    const createDir = async () => {
      const dir = path.join(__dirname, "..", "public", "Uploads", "images", "monan", String(monAnId));
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`Đã tạo thư mục: ${dir}`);
        return dir;
      } catch (error) {
        console.error(`Lỗi tạo thư mục ${dir}:`, error);
        throw new Error(`Tạo thư mục thất bại: ${error.message}`);
      }
    };

    // Hàm tạo tên file duy nhất
    const getUniqueFileName = async (dir, original) => {
      const ext = path.extname(original);
      const name = path.basename(original, ext);
      let filename = original;
      let i = 1;
      while (true) {
        try {
          await fs.access(path.join(dir, filename));
          filename = `${name}_${i++}${ext}`;
        } catch {
          return filename;
        }
      }
    };

    // Hàm lưu file
    const saveFile = async () => {
      if (!req.file) {
        console.log("Không có file được tải lên");
        return null;
      }
      try {
        await fs.access(req.file.path);
        console.log(`File nguồn tồn tại: ${req.file.path}`);
        const dir = await createDir();
        const uniqueName = await getUniqueFileName(dir, req.file.originalname);
        const targetPath = path.join(dir, uniqueName);
        await fs.rename(req.file.path, targetPath);
        console.log(`Đã di chuyển file đến: ${targetPath}`);
        return `/Uploads/images/monan/${monAnId}/${uniqueName}`;
      } catch (error) {
        console.error(`Lỗi trong saveFile cho ID ${monAnId}:`, error);
        throw new Error(`Di chuyển file thất bại: ${error.message}`);
      }
    };

    // Lưu hình ảnh và cập nhật database
    let imagePath = null;
    if (req.file) {
      imagePath = await saveFile();
      console.log(`Đường dẫn hình ảnh lưu vào DB: ${imagePath}`);
      await query(
        "UPDATE mon_an SET HINH_ANH_MA = ? WHERE ID_CHINH_MA = ?",
        [imagePath, monAnId]
      );
    }

    // Thêm quan hệ với loại món
    const loaiMonData = loaiMonIds.map(id => [monAnId, id]);
    if (loaiMonData.length > 0) {
      const placeholders = loaiMonData.map(() => "(?, ?)").join(", ");
      const values = loaiMonData.flat();
      await query(
        `INSERT INTO mon_an_loai_mon (ID_CHINH_MA, ID_CHINH_LM) VALUES ${placeholders}`,
        values
      );
      console.log(`Đã thêm ${loaiMonData.length} quan hệ loại món cho món ăn ID ${monAnId}`);
    }

    return res.status(201).json({ message: "Thêm món ăn thành công!", id: monAnId });
  } catch (error) {
    console.error("Lỗi server:", error);
    if (req.file) await fs.unlink(req.file.path).catch((err) => console.error("Lỗi xóa file tạm:", err));
    return res.status(500).json({ message: "Lỗi server: " + error.message });
  }
});

router.put("/admin/mon-an/:id", ensureAdmin, upload.single("hinh_anh"), async (req, res) => {
  console.log(`PUT /admin/mon-an/${req.params.id} called at`, new Date().toISOString());
  console.log("Request body:", req.body);
  console.log("Request file:", req.file);
  console.log("Multer temporary path:", req.file ? req.file.path : "No file");
  console.log("ID_CHINH_LM raw value:", req.body.ID_CHINH_LM, "Type:", typeof req.body.ID_CHINH_LM);

  try {
    const id = parseInt(req.params.id);
    const { TEN_MON_AN, MO_TA_MA, SLUG_MA, ID_CHINH_LM } = req.body;

    // Validate ID
    if (!id || isNaN(id)) {
      if (req.file) await fs.unlink(req.file.path).catch((err) => console.error("Lỗi xóa file tạm:", err));
      return res.status(400).json({ message: "ID món ăn không hợp lệ!" });
    }

    // Kiểm tra món ăn tồn tại
    const [existingDish] = await query("SELECT ID_CHINH_MA, HINH_ANH_MA FROM mon_an WHERE ID_CHINH_MA = ?", [id]);
    if (!existingDish) {
      if (req.file) await fs.unlink(req.file.path).catch((err) => console.error("Lỗi xóa file tạm:", err));
      return res.status(404).json({ message: "Món ăn không tồn tại!" });
    }

    // Phân tích ID_CHINH_LM
    let loaiMonIds = [];
    if (ID_CHINH_LM) {
      try {
        if (typeof ID_CHINH_LM === 'string' && ID_CHINH_LM.trim()) {
          const parsed = JSON.parse(ID_CHINH_LM);
          loaiMonIds = Array.isArray(parsed) ? parsed : [parsed];
        } else if (Array.isArray(ID_CHINH_LM)) {
          loaiMonIds = ID_CHINH_LM;
        } else {
          loaiMonIds = [ID_CHINH_LM];
        }
        loaiMonIds = loaiMonIds
          .map(id => String(id).trim())
          .filter(id => id && !isNaN(id) && Number.isInteger(Number(id)))
          .map(id => String(id));
        console.log("Parsed loaiMonIds:", loaiMonIds);
      } catch (err) {
        console.error("Lỗi phân tích ID_CHINH_LM:", err.message, "Raw value:", ID_CHINH_LM);
        if (req.file) await fs.unlink(req.file.path).catch((err) => console.error("Lỗi xóa file tạm:", err));
        return res.status(400).json({
          message: "Danh sách loại món không hợp lệ!",
          error: err.message,
          rawValue: ID_CHINH_LM
        });
      }
    }

    // Validate input
    if (!TEN_MON_AN || !TEN_MON_AN.trim()) {
      if (req.file) await fs.unlink(req.file.path).catch((err) => console.error("Lỗi xóa file tạm:", err));
      return res.status(400).json({ message: "Tên món ăn là bắt buộc!" });
    }

    if (loaiMonIds.length === 0) {
      if (req.file) await fs.unlink(req.file.path).catch((err) => console.error("Lỗi xóa file tạm:", err));
      return res.status(400).json({ message: "Vui lòng chọn ít nhất một loại món!" });
    }

    // Kiểm tra SLUG_MA nếu có
    if (SLUG_MA && SLUG_MA.trim()) {
      const [existing] = await query(
        "SELECT SLUG_MA FROM mon_an WHERE SLUG_MA = ? AND ID_CHINH_MA != ?",
        [SLUG_MA.trim(), id]
      );
      if (existing) {
        if (req.file) await fs.unlink(req.file.path).catch((err) => console.error("Lỗi xóa file tạm:", err));
        return res.status(400).json({ message: `Slug "${SLUG_MA.trim()}" đã tồn tại!` });
      }
    }

    // Kiểm tra loại món tồn tại
    const validLoaiMon = await query(
      `SELECT ID_CHINH_LM FROM loai_mon WHERE ID_CHINH_LM IN (${loaiMonIds.map(() => "?").join(",")})`,
      loaiMonIds
    );
    if (validLoaiMon.length !== loaiMonIds.length) {
      if (req.file) await fs.unlink(req.file.path).catch((err) => console.error("Lỗi xóa file tạm:", err));
      return res.status(400).json({ message: "Một hoặc nhiều loại món không tồn tại!" });
    }

    // Hàm tạo thư mục
    const createDir = async () => {
      const dir = path.join(__dirname, "..", "public", "Uploads", "images", "monan", String(id));
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`Đã tạo thư mục: ${dir}`);
        return dir;
      } catch (error) {
        console.error(`Lỗi tạo thư mục ${dir}:`, error);
        throw new Error(`Tạo thư mục thất bại: ${error.message}`);
      }
    };

    // Hàm tạo tên file duy nhất
    const getUniqueFileName = async (dir, original) => {
      const ext = path.extname(original);
      const name = path.basename(original, ext);
      let filename = original;
      let i = 1;
      while (true) {
        try {
          await fs.access(path.join(dir, filename));
          filename = `${name}_${i++}${ext}`;
        } catch {
          return filename;
        }
      }
    };

    // Hàm lưu file
    const saveFile = async () => {
      if (!req.file) {
        console.log("Không có file được tải lên");
        return null;
      }
      try {
        await fs.access(req.file.path);
        console.log(`File nguồn tồn tại: ${req.file.path}`);
        const dir = await createDir();
        const uniqueName = await getUniqueFileName(dir, req.file.originalname);
        const targetPath = path.join(dir, uniqueName);
        await fs.rename(req.file.path, targetPath);
        console.log(`Đã di chuyển file đến: ${targetPath}`);
        return `/Uploads/images/monan/${id}/${uniqueName}`;
      } catch (error) {
        console.error(`Lỗi trong saveFile cho ID ${id}:`, error);
        throw new Error(`Di chuyển file thất bại: ${error.message}`);
      }
    };

    // Xóa hình ảnh cũ nếu có
    let imagePath = existingDish.HINH_ANH_MA;
    if (req.file && imagePath) {
      const oldImagePath = path.join(__dirname, "..", "public", imagePath);
      await fs.unlink(oldImagePath).catch((err) => console.error("Lỗi xóa hình ảnh cũ:", err));
    }

    // Lưu hình ảnh mới nếu có
    if (req.file) {
      imagePath = await saveFile();
      console.log(`Đường dẫn hình ảnh mới: ${imagePath}`);
    }

    // Cập nhật món ăn
    await query(
      "UPDATE mon_an SET TEN_MON_AN = ?, MO_TA_MA = ?, SLUG_MA = ?, HINH_ANH_MA = ? WHERE ID_CHINH_MA = ?",
      [TEN_MON_AN.trim(), MO_TA_MA?.trim() || null, SLUG_MA?.trim() || null, imagePath || null, id]
    );
    console.log(`Đã cập nhật món ăn với ID: ${id}`);

    // Xóa quan hệ loại món cũ
    await query("DELETE FROM mon_an_loai_mon WHERE ID_CHINH_MA = ?", [id]);

    // Thêm quan hệ loại món mới
    const loaiMonData = loaiMonIds.map(lmId => [id, lmId]);
    if (loaiMonData.length > 0) {
      const placeholders = loaiMonData.map(() => "(?, ?)").join(",");
      const values = loaiMonData.flat();
      await query(
        `INSERT INTO mon_an_loai_mon (ID_CHINH_MA, ID_CHINH_LM) VALUES ${placeholders}`,
        values
      );
      console.log(`Đã cập nhật ${loaiMonData.length} quan hệ loại món cho món ăn ID: ${id}`);
    }

    return res.status(200).json({ message: "Cập nhật món ăn thành công!" });
  } catch (error) {
    console.error("Lỗi server:", error);
    if (req.file) await fs.unlink(req.file.path).catch((err) => console.error("Lỗi xóa file tạm:", err));
    return res.status(500).json({ message: "Lỗi server: " + error.message });
  }
});
router.delete("/admin/mon-an/:id", ensureAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Kiểm tra món ăn tồn tại
    const [dish] = await query("SELECT ID_CHINH_MA, HINH_ANH_MA FROM mon_an WHERE ID_CHINH_MA = ?", [id]);
    if (!dish) {
      return res.status(404).json({ message: "Món ăn không tồn tại!" });
    }

    // Xóa bản ghi trong bảng liên kết mon_an_loai_mon
    await query("DELETE FROM mon_an_loai_mon WHERE ID_CHINH_MA = ?", [id]);

    // Xóa bản ghi trong bảng mon_an
    await query("DELETE FROM mon_an WHERE ID_CHINH_MA = ?", [id]);

    // Xóa thư mục hình ảnh
    const imageDir = path.join(__dirname, "..", "public", "Uploads", "images", "monan", String(id));
    await deleteDirectory(imageDir);

    return res.status(200).json({ message: "Xóa món ăn thành công!" });
  } catch (error) {
    console.error("Lỗi khi xóa món ăn:", error);
    return res.status(500).json({ message: "Lỗi server: " + error.message });
  }
});

module.exports = router;