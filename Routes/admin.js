const express = require("express");
const router = express.Router();
const { query } = require("../config/db");
const { ensureAdmin, ensureLoggedIn } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const bcrypt = require('bcrypt');
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
router.get("/admin", ensureAdmin, async (req, res) => {
  try {
    const cong_thuc = await query("SELECT COUNT(*) AS count FROM cong_thuc");
    const loai_mon = await query("SELECT COUNT(*) AS count FROM loai_mon");
    const mon_an = await query("SELECT COUNT(*) AS count FROM mon_an");
    const binh_luan = await query("SELECT COUNT(*) AS count FROM binh_luan");
    const phan_hoi_binh_luan = await query("SELECT COUNT(*) AS count FROM phan_hoi_binh_luan");
    const nguyen_lieu = await query("SELECT COUNT(*) AS count FROM nguyen_lieu");
    const danh_gia = await query("SELECT COUNT(*) AS count FROM danh_gia");
    const yeu_thich = await query("SELECT COUNT(*) AS count FROM yeu_thich");
    const nguoi_dung = await query("SELECT COUNT(*) AS count FROM nguoi_dung");

    const stats = {
      cong_thuc: cong_thuc && cong_thuc[0] && cong_thuc[0].count ? cong_thuc[0].count : 0,
      loai_mon: loai_mon && loai_mon[0] && loai_mon[0].count ? loai_mon[0].count : 0,
      mon_an: mon_an && mon_an[0] && mon_an[0].count ? mon_an[0].count : 0,
      binh_luan: binh_luan && binh_luan[0] && binh_luan[0].count ? binh_luan[0].count : 0,
      phan_hoi_binh_luan: phan_hoi_binh_luan && phan_hoi_binh_luan[0] && phan_hoi_binh_luan[0].count ? phan_hoi_binh_luan[0].count : 0,
      nguyen_lieu: nguyen_lieu && nguyen_lieu[0] && nguyen_lieu[0].count ? nguyen_lieu[0].count : 0,
      danh_gia: danh_gia && danh_gia[0] && danh_gia[0].count ? danh_gia[0].count : 0,
      yeu_thich: yeu_thich && yeu_thich[0] && yeu_thich[0].count ? yeu_thich[0].count : 0,
      nguoi_dung: nguoi_dung && nguoi_dung[0] && nguoi_dung[0].count ? nguoi_dung[0].count : 0,
    };

    res.render("admin/admin", {
      title: "Trang Quản Lý",
      user: req.session.user,
      content: null,
      data: { stats },
      error: null,
    });
  } catch (error) {
    console.error("Lỗi lấy dữ liệu thống kê:", error.stack);
    res.render("admin/admin", {
      title: "Trang Quản Lý",
      user: req.session.user,
      content: null,
      data: { stats: {} },
      error: "Không thể tải dữ liệu thống kê",
    });
  }
});


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

    res.render("admin/admin", {
  title: "Danh Sách Công Thức",
  user: req.session.user,
  content: "admin/cong-thuc",
  recipes,
  currentPage: page,
  totalPages,
  error: null,
  stats: {},
});

  } catch (err) {
    console.error("Lỗi khi lấy danh sách công thức:", err);
    res.render("admin/admin", {
      title: "Danh Sách Công Thức",
      user: req.session.user,
     content: "admin/cong-thuc",
      data: {
        recipes: [],
        currentPage: 1,
        totalPages: 1,
      },
      error: "Không thể tải danh sách công thức",
      stats: {},
    });
  }
});



// Trang thêm công thức
router.get("/admin/cong-thuc/add", ensureLoggedIn, async (req, res) => {
  try {
    const loai_mon = await query("SELECT * FROM loai_mon");
    const nguyen_lieu = await query("SELECT * FROM nguyen_lieu");
    const mon_an = await query("SELECT * FROM mon_an");

    res.render("admin/admin", {
      title: "Thêm Công Thức",
      user: req.session.user,
      content: "admin/them-cong-thuc", // ✅ dùng đúng relative path
      recipe: null,
      loai_mon,
      nguyen_lieu,
      mon_an,
      selectedLoaiMon: [],
      selectedNguyenLieu: [],
      selectedMonAn: null,
      error: null,
      stats: {},
    });

  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu:", err);
    res.status(500).render("admin/admin", {
      title: "Lỗi",
      user: req.session.user,
      content: null, // ❌ Không dùng content lỗi nữa
      error: "Không thể tải dữ liệu: " + err.message,
      stats: {},
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

   res.render("admin/admin", {
  title: "Chỉnh sửa Công Thức",
  user: req.session.user,
  content: "admin/them-cong-thuc", // ⚠️ Đảm bảo file này tồn tại: views/admin/them-cong-thuc.ejs
  recipe: recipe || null,
  loai_mon: loai_mon || [],
  nguyen_lieu: nguyen_lieu || [],
  mon_an: mon_an || [],
  selectedLoaiMon: selectedLoaiMon.map(lm => lm.ID_CHINH_LM.toString()),
  selectedNguyenLieu: selectedNguyenLieu || [],
  selectedMonAn: recipe.ID_CHINH_MA ? recipe.ID_CHINH_MA.toString() : null,
  error: null,
  stats: {},
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

    const recipeIds = recipes.map(r => r.ID_CHINH_CT);
    let ingredientRecipes = [];

    if (recipeIds.length > 0) {
      const placeholders = recipeIds.map(() => '?').join(',');
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
        WHERE ctnl.ID_CHINH_CT IN (${placeholders})
        ORDER BY ctnl.ID_CHINH_CT DESC
      `, recipeIds);
    }

    // Gom nhóm nguyên liệu theo công thức
    const groupedRecipes = {};
    ingredientRecipes.forEach(row => {
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

    // ✅ Gửi về layout `admin/admin.ejs` và include content: `admin/nguyen-lieu.ejs`
    res.render("admin/admin", {
      title: "Danh Sách Nguyên Liệu & Công Thức",
      user: req.session.user,
      content: "admin/nguyen-lieu", // ⚠️ file views/admin/nguyen-lieu.ejs phải tồn tại
      ingredients,
      currentPage: page,
      totalPages,
      recipes,
      groupedRecipes,
      currentPageRecipes: pageRecipes,
      totalPagesRecipes,
      totalRecipes,
      error: null,
      stats: {},
    });

  } catch (err) {
    console.error("❌ Lỗi khi lấy dữ liệu:", err);
    res.status(500).render("admin/admin", {
      title: "Lỗi",
      user: req.session.user,
      content: null,
      error: "Không thể tải dữ liệu nguyên liệu và công thức: " + err.message,
      stats: {},
    });
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
    const limit = 7;
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

    res.render("admin/admin", {
      title: "Danh Sách Loại Món & Món Ăn",
      user: req.session.user,
      content: "admin/loai-mon",
      categories,
      currentPage: page,
      totalPages,
      groupedRecipes,
      error: null,
      stats: {},
    });

  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu loại món:", err);
    res.status(500).render("admin/admin", {
      title: "Lỗi",
      user: req.session.user,
      content: null,
      error: "Không thể tải dữ liệu loại món: " + err.message,
      stats: {},
    });
  }
});



// Route POST
router.post('/admin/loai-mon', ensureAdmin, upload.single('hinh_anh'), async (req, res) => {
  console.log('POST /admin/loai-mon được gọi lúc', new Date().toISOString());
  console.log('Body yêu cầu:', req.body);
  console.log('File yêu cầu:', req.file);
  console.log('Đường dẫn tạm của Multer:', req.file ? req.file.path : 'Không có file');

  try {
    const { TEN_LM, SLUG_LM } = req.body;

    if (!TEN_LM || !TEN_LM.trim()) {
      if (req.file) await fs.unlink(req.file.path).catch((err) => console.error('Lỗi xóa file tạm:', err));
      return res.status(400).json({ message: 'Tên loại món là bắt buộc!' });
    }

    if (SLUG_LM && SLUG_LM.trim()) {
      const result = await query('SELECT SLUG_LM FROM loai_mon WHERE SLUG_LM = ?', [SLUG_LM.trim()]);
      if (result.length > 0) {
        if (req.file) await fs.unlink(req.file.path).catch((err) => console.error('Lỗi xóa file tạm:', err));
        return res.status(400).json({ message: `Slug "${SLUG_LM.trim()}" đã tồn tại!` });
      }
    }

    const result = await query(
      'INSERT INTO loai_mon (TEN_LM, SLUG_LM, HINH_ANH_LM_URL) VALUES (?, ?, ?)',
      [TEN_LM.trim(), SLUG_LM ? SLUG_LM.trim() : null, '']
    );
    const categoryId = result.insertId;
    console.log(`Đã thêm loại món với ID: ${categoryId}`);

    const createDir = async () => {
      const dir = path.join(__dirname, '..', 'public', 'Uploads', 'images', 'loaimon', String(categoryId));
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`Đã tạo thư mục: ${dir}`);
        return dir;
      } catch (error) {
        console.error(`Lỗi tạo thư mục ${dir}:`, error);
        throw new Error(`Tạo thư mục thất bại: ${error.message}`);
      }
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

    const saveFile = async () => {
      if (!req.file) {
        console.log('Không có file được tải lên');
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
        return `/Uploads/images/loaimon/${categoryId}/${uniqueName}`;
      } catch (error) {
        console.error(`Lỗi trong saveFile cho ID ${categoryId}:`, error);
        throw new Error(`Di chuyển file thất bại: ${error.message}`);
      }
    };

    let imagePath = null;
    if (req.file) {
      imagePath = await saveFile();
      console.log(`Đường dẫn hình ảnh lưu vào DB: ${imagePath}`);
      await query('UPDATE loai_mon SET HINH_ANH_LM_URL = ? WHERE ID_CHINH_LM = ?', [imagePath, categoryId]);
    }

    return res.status(201).json({ message: 'Thêm loại món thành công!', id: categoryId });
  } catch (error) {
    console.error('Lỗi server:', error);
    if (req.file) await fs.unlink(req.file.path).catch((err) => console.error('Lỗi xóa file tạm:', err));
    return res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
});


// Route PUT
router.put('/admin/loai-mon/:id', ensureAdmin, upload.single('hinh_anh'), async (req, res) => {
  const categoryId = req.params.id;
  console.log(`PUT /admin/loai-mon/${categoryId} được gọi lúc`, new Date().toISOString());

  try {
    const [existing] = await query('SELECT * FROM loai_mon WHERE ID_CHINH_LM = ?', [categoryId]);
    if (!existing) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(404).json({ message: `Không tìm thấy loại món với ID ${categoryId}` });
    }

    const { TEN_LM, SLUG_LM } = req.body;

    if (!TEN_LM || !TEN_LM.trim()) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(400).json({ message: 'Tên loại món là bắt buộc!' });
    }

    if (SLUG_LM && SLUG_LM.trim()) {
      const slugCheck = await query('SELECT ID_CHINH_LM FROM loai_mon WHERE SLUG_LM = ? AND ID_CHINH_LM != ?', [SLUG_LM.trim(), categoryId]);
      if (slugCheck.length > 0) {
        if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
        return res.status(400).json({ message: `Slug "${SLUG_LM.trim()}" đã tồn tại!` });
      }
    }

    await query(
      'UPDATE loai_mon SET TEN_LM = ?, SLUG_LM = ? WHERE ID_CHINH_LM = ?',
      [TEN_LM.trim(), SLUG_LM ? SLUG_LM.trim() : null, categoryId]
    );
    console.log(`Đã cập nhật tên và slug cho ID ${categoryId}`);

    // ------ Xử lý ảnh nếu có -------
    const createDir = async () => {
      const dir = path.join(__dirname, '..', 'public', 'Uploads', 'images', 'loaimon', String(categoryId));
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

    if (req.file) {
      const dir = await createDir();
      const uniqueName = await getUniqueFileName(dir, req.file.originalname);
      const targetPath = path.join(dir, uniqueName);
      await fs.rename(req.file.path, targetPath);

      const newImagePath = `/Uploads/images/loaimon/${categoryId}/${uniqueName}`;
      console.log(`Lưu hình ảnh: ${newImagePath}`);

      // Xóa ảnh cũ nếu có
      if (existing.HINH_ANH_LM_URL) {
        const oldPath = path.join(__dirname, '..', 'public', existing.HINH_ANH_LM_URL);
        await fs.unlink(oldPath).catch(err => console.error('Lỗi xóa ảnh cũ:', err));
      }

      await query('UPDATE loai_mon SET HINH_ANH_LM_URL = ? WHERE ID_CHINH_LM = ?', [newImagePath, categoryId]);
    }

    return res.status(200).json({ message: 'Cập nhật loại món thành công!' });
  } catch (err) {
    console.error('Lỗi server:', err);
    if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
    return res.status(500).json({ message: 'Lỗi server: ' + err.message });
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


router.delete('/admin/loai-mon/:id', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const sql = 'DELETE FROM loai_mon WHERE ID_CHINH_LM = ?';
    const result = await query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy loại món' });
    }

    res.json({ message: 'Xóa loại món thành công' });
  } catch (err) {
    console.error('Lỗi khi xóa loại món:', err);
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
});
router.get('/admin/mon-an', ensureAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageCategories = parseInt(req.query.pageCategories) || 1;
    const limit = 7;
    const limitCategories = 8;
    const offset = (page - 1) * limit;
    const offsetCategories = (pageCategories - 1) * limitCategories;

    const countResult = await query(`SELECT COUNT(*) AS total FROM mon_an`);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const monAnList = await query(`
      SELECT ID_CHINH_MA, TEN_MON_AN, HINH_ANH_MA, MO_TA_MA
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

    let loaiMonData = [];
    if (monAnList.length > 0) {
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
    loaiMonData.forEach((lm) => {
      if (!groupedLoaiMon[lm.ID_CHINH_MA]) {
        groupedLoaiMon[lm.ID_CHINH_MA] = {
          TEN_MON_AN: lm.TEN_MON_AN,
          loai_mon: [],
        };
      }
      groupedLoaiMon[lm.ID_CHINH_MA].loai_mon.push({
        ID_CHINH_LM: lm.ID_CHINH_LM,
        TEN_LM: lm.TEN_LM,
      });
    });

    res.render("admin/admin", {
      title: "Danh Sách Món Ăn & Loại Món",
      user: req.session.user,
      content: "admin/mon-an",
      monAnList,
      categories,
      currentPage: page,
      totalPages,
      currentPageCategories: pageCategories,
      totalPagesCategories,
      groupedLoaiMon,
      error: null,
      stats: {},
    });

  } catch (err) {
    console.error('Lỗi khi lấy dữ liệu món ăn:', err);
    res.status(500).render("admin/admin", {
      title: "Lỗi",
      user: req.session.user,
      content: null,
      error: "Không thể tải dữ liệu món ăn: " + err.message,
      stats: {},
    });
  }
});

// POST: Thêm món ăn mới
router.post('/admin/mon-an', ensureAdmin, upload.single('hinh_anh'), async (req, res) => {
  console.log('POST /admin/mon-an được gọi lúc', new Date().toISOString());
  console.log('Body yêu cầu:', req.body);
  console.log('File yêu cầu:', req.file);
  console.log('Đường dẫn tạm của Multer:', req.file ? req.file.path : 'Không có file');
  console.log('ID_CHINH_LM raw value:', req.body.ID_CHINH_LM, 'Type:', typeof req.body.ID_CHINH_LM);

  try {
    const { TEN_MON_AN, MO_TA_MA, ID_CHINH_LM } = req.body;

    // Validate tên món ăn
    if (!TEN_MON_AN || !TEN_MON_AN.trim()) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(400).json({ message: 'Tên món ăn là bắt buộc!' });
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
        console.log('Parsed loaiMonIds:', loaiMonIds);
      } catch (err) {
        console.error('Lỗi phân tích ID_CHINH_LM:', err.message, 'Raw value:', ID_CHINH_LM);
        if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
        return res.status(400).json({
          message: 'Danh sách loại món không hợp lệ!',
          error: err.message,
          rawValue: ID_CHINH_LM
        });
      }
    }

    // Validate loại món
    if (loaiMonIds.length === 0) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất một loại món!' });
    }

    // Kiểm tra loại món tồn tại
    const validLoaiMon = await query(
      `SELECT ID_CHINH_LM FROM loai_mon WHERE ID_CHINH_LM IN (${loaiMonIds.map(() => '?').join(',')})`,
      loaiMonIds
    );
    if (validLoaiMon.length !== loaiMonIds.length) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(400).json({ message: 'Một hoặc nhiều loại món không tồn tại!' });
    }

    // Thêm món ăn mới
    const result = await query(
      'INSERT INTO mon_an (TEN_MON_AN, MO_TA_MA, HINH_ANH_MA) VALUES (?, ?, ?)',
      [TEN_MON_AN.trim(), MO_TA_MA?.trim() || null, '']
    );
    const monAnId = result.insertId;
    console.log(`Đã thêm món ăn với ID: ${monAnId}`);

    // Hàm tạo thư mục
    const createDir = async () => {
      const dir = path.join(__dirname, '..', 'public', 'Uploads', 'images', 'monan', String(monAnId));
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
        console.log('Không có file được tải lên');
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

    // Lưu hình ảnh
    let imagePath = null;
    if (req.file) {
      imagePath = await saveFile();
      console.log(`Đường dẫn hình ảnh lưu vào DB: ${imagePath}`);
      await query('UPDATE mon_an SET HINH_ANH_MA = ? WHERE ID_CHINH_MA = ?', [imagePath, monAnId]);
    }

    // Thêm quan hệ với loại món
    const loaiMonData = loaiMonIds.map(id => [monAnId, id]);
    if (loaiMonData.length > 0) {
      const placeholders = loaiMonData.map(() => '(?, ?)').join(', ');
      const values = loaiMonData.flat();
      await query(
        `INSERT INTO mon_an_loai_mon (ID_CHINH_MA, ID_CHINH_LM) VALUES ${placeholders}`,
        values
      );
      console.log(`Đã thêm ${loaiMonData.length} quan hệ loại món cho món ăn ID ${monAnId}`);
    }

    return res.status(201).json({ message: 'Thêm món ăn thành công!', id: monAnId });
  } catch (error) {
    console.error('Lỗi server:', error);
    if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
    return res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
});

// PUT: Cập nhật món ăn
router.put('/admin/mon-an/:id', ensureAdmin, upload.single('hinh_anh'), async (req, res) => {
  const monAnId = req.params.id;
  console.log(`PUT /admin/mon-an/${monAnId} được gọi lúc`, new Date().toISOString());
  console.log('Body yêu cầu:', req.body);
  console.log('File yêu cầu:', req.file);
  console.log('Đường dẫn tạm của Multer:', req.file ? req.file.path : 'Không có file');
  console.log('ID_CHINH_LM raw value:', req.body.ID_CHINH_LM, 'Type:', typeof req.body.ID_CHINH_LM);

  try {
    // Validate ID
    const id = parseInt(monAnId);
    if (!id || isNaN(id)) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(400).json({ message: 'ID món ăn không hợp lệ!' });
    }

    // Kiểm tra món ăn tồn tại
    const [existing] = await query('SELECT ID_CHINH_MA, HINH_ANH_MA FROM mon_an WHERE ID_CHINH_MA = ?', [id]);
    if (!existing) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(404).json({ message: `Không tìm thấy món ăn với ID ${id}` });
    }

    const { TEN_MON_AN, MO_TA_MA, ID_CHINH_LM } = req.body;

    // Validate tên món ăn
    if (!TEN_MON_AN || !TEN_MON_AN.trim()) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(400).json({ message: 'Tên món ăn là bắt buộc!' });
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
        console.log('Parsed loaiMonIds:', loaiMonIds);
      } catch (err) {
        console.error('Lỗi phân tích ID_CHINH_LM:', err.message, 'Raw value:', ID_CHINH_LM);
        if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
        return res.status(400).json({
          message: 'Danh sách loại món không hợp lệ!',
          error: err.message,
          rawValue: ID_CHINH_LM
        });
      }
    }

    // Validate loại món
    if (loaiMonIds.length === 0) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất một loại món!' });
    }

    // Kiểm tra loại món tồn tại
    const validLoaiMon = await query(
      `SELECT ID_CHINH_LM FROM loai_mon WHERE ID_CHINH_LM IN (${loaiMonIds.map(() => '?').join(',')})`,
      loaiMonIds
    );
    if (validLoaiMon.length !== loaiMonIds.length) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(400).json({ message: 'Một hoặc nhiều loại món không tồn tại!' });
    }

    // Hàm tạo thư mục
    const createDir = async () => {
      const dir = path.join(__dirname, '..', 'public', 'Uploads', 'images', 'monan', String(id));
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
        console.log('Không có file được tải lên');
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

    // Xóa ảnh cũ nếu có
    let imagePath = existing.HINH_ANH_MA;
    if (req.file && imagePath) {
      const oldImagePath = path.join(__dirname, '..', 'public', imagePath);
      await fs.unlink(oldImagePath).catch(err => console.error('Lỗi xóa hình ảnh cũ:', err));
    }

    // Lưu ảnh mới nếu có
    if (req.file) {
      imagePath = await saveFile();
      console.log(`Đường dẫn hình ảnh mới: ${imagePath}`);
    }

    // Cập nhật món ăn
    await query(
      'UPDATE mon_an SET TEN_MON_AN = ?, MO_TA_MA = ?, HINH_ANH_MA = ? WHERE ID_CHINH_MA = ?',
      [TEN_MON_AN.trim(), MO_TA_MA?.trim() || null, imagePath || null, id]
    );
    console.log(`Đã cập nhật món ăn với ID: ${id}`);

    // Xóa quan hệ loại món cũ
    await query('DELETE FROM mon_an_loai_mon WHERE ID_CHINH_MA = ?', [id]);

    // Thêm quan hệ loại món mới
    const loaiMonData = loaiMonIds.map(lmId => [id, lmId]);
    if (loaiMonData.length > 0) {
      const placeholders = loaiMonData.map(() => '(?, ?)').join(',');
      const values = loaiMonData.flat();
      await query(
        `INSERT INTO mon_an_loai_mon (ID_CHINH_MA, ID_CHINH_LM) VALUES ${placeholders}`,
        values
      );
      console.log(`Đã cập nhật ${loaiMonData.length} quan hệ loại món cho món ăn ID: ${id}`);
    }

    return res.status(200).json({ message: 'Cập nhật món ăn thành công!' });
  } catch (err) {
    console.error('Lỗi server:', err);
    if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
    return res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
});

// GET: Lấy thông tin món ăn để chỉnh sửa
router.get('/admin/mon-an/edit/:id', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`GET /admin/mon-an/edit/${id} được gọi lúc`, new Date().toISOString());

    // Lấy thông tin món ăn
    const [dish] = await query(
      'SELECT ID_CHINH_MA, TEN_MON_AN, MO_TA_MA, HINH_ANH_MA FROM mon_an WHERE ID_CHINH_MA = ?',
      [id]
    );
    if (!dish) {
      return res.status(404).json({ message: 'Món ăn không tồn tại!' });
    }

    // Lấy danh sách loại món liên quan
    const loaiMon = await query(
      `SELECT lm.ID_CHINH_LM, lm.TEN_LM 
       FROM mon_an_loai_mon malm 
       JOIN loai_mon lm ON malm.ID_CHINH_LM = lm.ID_CHINH_LM 
       WHERE malm.ID_CHINH_MA = ?`,
      [id]
    );
    dish.ID_CHINH_LM = loaiMon.map(lm => lm.ID_CHINH_LM); // Mảng ID loại món
    dish.LOAI_MON = loaiMon; // Danh sách đầy đủ thông tin loại món (ID và tên)

    console.log('Dữ liệu món ăn gửi về client:', dish);
    res.status(200).json(dish);
  } catch (error) {
    console.error('Lỗi server:', error);
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
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

// Route GET danh sách người dùng
router.get('/admin/nguoi-dung', ensureAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 7;
    const offset = (page - 1) * limit;

    const currentUserId = req.session.user?.ID_CHINH_ND;

    // Đếm tổng số người dùng (chỉ role = 'nguoidung')
    const countResult = await query(`
      SELECT COUNT(*) AS total 
      FROM nguoi_dung 
      WHERE ID_CHINH_ND != ? AND VAI_TRO = 'nguoidung'
    `, [currentUserId]);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Lấy danh sách người dùng thường
    const users = await query(`
      SELECT ID_CHINH_ND, TEN_NGUOI_DUNG, EMAIL_, SO_DIEN_THOAI_, AVARTAR_URL, VAI_TRO, TRANG_THAI, NGAY_TAO_ND, NGAY_CAP_NHAT_ND
      FROM nguoi_dung
      WHERE ID_CHINH_ND != ? AND VAI_TRO = 'nguoidung'
      ORDER BY ID_CHINH_ND DESC
      LIMIT ? OFFSET ?
    `, [currentUserId, limit, offset]);

    res.render("admin/admin", {
      title: "Danh Sách Người Dùng",
      user: req.session.user,
      content: "admin/nguoi-dung",
      users,
      currentPage: page,
      totalPages,
      error: null,
      stats: {},
    });

  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu người dùng:", err);
    res.status(500).render("admin/admin", {
      title: "Lỗi",
      user: req.session.user,
      content: null,
      error: "Không thể tải dữ liệu người dùng: " + err.message,
      stats: {},
    });
  }
});




// Route GET chi tiết người dùng để sửa
router.get('/admin/nguoi-dung/edit/:id', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [user] = await query(`
      SELECT ID_CHINH_ND, TEN_NGUOI_DUNG, EMAIL_, SO_DIEN_THOAI_, AVARTAR_URL, VAI_TRO, TRANG_THAI, NGAY_TAO_ND, NGAY_CAP_NHAT_ND
      FROM nguoi_dung
      WHERE ID_CHINH_ND = ?
    `, [id]);
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại!' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Lỗi server:', error);
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
});
router.post('/admin/nguoi-dung', ensureAdmin, upload.single('hinh_anh'), async (req, res) => {
  console.log('POST /admin/nguoi-dung được gọi lúc', new Date().toISOString());
  console.log('Body yêu cầu:', req.body);
  console.log('File yêu cầu:', req.file);

  try {
    const { TEN_NGUOI_DUNG, EMAIL_, MAT_KHAU, VAI_TRO, SO_DIEN_THOAI_ } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!TEN_NGUOI_DUNG || !TEN_NGUOI_DUNG.trim() || TEN_NGUOI_DUNG.trim().length < 3) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(400).json({ message: 'Tên người dùng phải có ít nhất 3 ký tự!' });
    }

    if (!EMAIL_ || !EMAIL_.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(EMAIL_.trim())) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(400).json({ message: 'Email không hợp lệ!' });
    }

    if (!MAT_KHAU || !MAT_KHAU.trim() || MAT_KHAU.trim().length < 8) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự!' });
    }

    // Kiểm tra email trùng lặp
    const emailCheck = await query('SELECT ID_CHINH_ND FROM nguoi_dung WHERE EMAIL_ = ?', [EMAIL_.trim()]);
    if (emailCheck.length > 0) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(400).json({ message: `Email "${EMAIL_.trim()}" đã tồn tại!` });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(MAT_KHAU.trim(), 10);

    // Thêm người dùng vào cơ sở dữ liệu
    const result = await query(
      'INSERT INTO nguoi_dung (TEN_NGUOI_DUNG, EMAIL_, MAT_KHAU, VAI_TRO, TRANG_THAI, SO_DIEN_THOAI_, AVARTAR_URL) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [TEN_NGUOI_DUNG.trim(), EMAIL_.trim(), hashedPassword, VAI_TRO || 'nguoidung', 'hoatdong', SO_DIEN_THOAI_ || null, '']
    );
    const userId = result.insertId;

    // Xử lý file upload
    let imagePath = null;
    if (req.file) {
      const tempPath = req.file.path;
      const finalDir = path.join(__dirname, '..', 'public', 'Uploads', 'images', 'nguoidung', String(userId));
      const finalFileName = `avatar-${Date.now()}${path.extname(req.file.originalname)}`;
      const finalPath = path.join(finalDir, finalFileName);

      await fs.mkdir(finalDir, { recursive: true });
      await fs.access(finalDir, fs.constants.W_OK);
      await fs.rename(tempPath, finalPath);
      imagePath = `/Uploads/images/nguoidung/${userId}/${finalFileName}`;

      await query('UPDATE nguoi_dung SET AVARTAR_URL = ? WHERE ID_CHINH_ND = ?', [imagePath, userId]);
    }

    res.status(201).json({ message: 'Thêm người dùng thành công!', id: userId });
  } catch (error) {
    console.error('Lỗi server:', error);
    if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
});

router.put('/admin/nguoi-dung/:id', ensureAdmin, upload.single('hinh_anh'), async (req, res) => {
  const userId = req.params.id;
  console.log(`PUT /admin/nguoi-dung/${userId} được gọi lúc`, new Date().toISOString());
  console.log('Body yêu cầu:', req.body);
  console.log('File yêu cầu:', req.file);

  try {
    const [existing] = await query('SELECT * FROM nguoi_dung WHERE ID_CHINH_ND = ?', [userId]);
    if (!existing) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(404).json({ message: `Không tìm thấy người dùng với ID ${userId}` });
    }

    const { TEN_NGUOI_DUNG, EMAIL_, MAT_KHAU, VAI_TRO, TRANG_THAI, SO_DIEN_THOAI_ } = req.body;

    if (!TEN_NGUOI_DUNG || !TEN_NGUOI_DUNG.trim()) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(400).json({ message: 'Tên người dùng là bắt buộc!' });
    }

    if (!EMAIL_ || !EMAIL_.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(EMAIL_.trim())) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(400).json({ message: 'Email không hợp lệ!' });
    }

    const emailCheck = await query('SELECT ID_CHINH_ND FROM nguoi_dung WHERE EMAIL_ = ? AND ID_CHINH_ND != ?', [EMAIL_.trim(), userId]);
    if (emailCheck.length > 0) {
      if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
      return res.status(400).json({ message: `Email "${EMAIL_.trim()}" đã tồn tại!` });
    }

    let hashedPassword = existing.MAT_KHAU;
    if (MAT_KHAU && MAT_KHAU.trim()) {
      if (MAT_KHAU.trim().length < 8) {
        if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
        return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự!' });
      }
      hashedPassword = await bcrypt.hash(MAT_KHAU.trim(), 10);
    }

    let imagePath = existing.AVARTAR_URL;
    if (req.file) {
      const tempPath = req.file.path;
      const finalDir = path.join(__dirname, '..', 'public', 'Uploads', 'images', 'nguoidung', String(userId));
      const finalFileName = `avatar-${Date.now()}${path.extname(req.file.originalname)}`;
      const finalPath = path.join(finalDir, finalFileName);

      await fs.mkdir(finalDir, { recursive: true });
      await fs.access(finalDir, fs.constants.W_OK);
      await fs.rename(tempPath, finalPath);
      imagePath = `/Uploads/images/nguoidung/${userId}/${finalFileName}`;

      if (existing.AVARTAR_URL) {
        const oldPath = path.join(__dirname, '..', 'public', existing.AVARTAR_URL);
        await fs.unlink(oldPath).catch(err => console.error('Lỗi xóa ảnh cũ:', err));
      }
    }

    await query(
      'UPDATE nguoi_dung SET TEN_NGUOI_DUNG = ?, EMAIL_ = ?, MAT_KHAU = ?, VAI_TRO = ?, TRANG_THAI = ?, SO_DIEN_THOAI_ = ?, AVARTAR_URL = ? WHERE ID_CHINH_ND = ?',
      [TEN_NGUOI_DUNG.trim(), EMAIL_.trim(), hashedPassword, VAI_TRO || existing.VAI_TRO, TRANG_THAI || existing.TRANG_THAI, SO_DIEN_THOAI_ || null, imagePath, userId]
    );

    res.status(200).json({ message: 'Cập nhật người dùng thành công!' });
  } catch (error) {
    console.error('Lỗi server:', error);
    if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Lỗi xóa file tạm:', err));
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
});

// Route DELETE xóa người dùng
router.delete('/admin/nguoi-dung/:id', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra tồn tại người dùng
    const [existing] = await query('SELECT AVARTAR_URL FROM nguoi_dung WHERE ID_CHINH_ND = ?', [id]);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Xóa ảnh đại diện nếu có
    if (existing.AVARTAR_URL) {
      const avatarPath = path.join(__dirname, '..', 'public', existing.AVARTAR_URL);
      try {
        await fs.unlink(avatarPath);
      } catch (err) {
        console.warn('Không thể xóa ảnh cũ:', err.message);
      }
    }

    // Xóa người dùng
    const result = await query('DELETE FROM nguoi_dung WHERE ID_CHINH_ND = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Người dùng không tồn tại hoặc đã bị xóa' });
    }

    res.json({ message: 'Xóa người dùng thành công' });
  } catch (err) {
    console.error('Lỗi khi xóa người dùng:', err);
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
});


router.get('/admin/yeu-thich', ensureAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 7;
    const offset = (page - 1) * limit;

    const favorites = await query(`
      SELECT yt.ID_CHINH_YT, yt.ID_CHINH_CT, yt.ID_CHINH_ND, yt.NGAY_TAO_YT,
             nd.TEN_NGUOI_DUNG, nd.EMAIL_, ct.TEN_CT
      FROM yeu_thich yt
      JOIN nguoi_dung nd ON yt.ID_CHINH_ND = nd.ID_CHINH_ND
      JOIN cong_thuc ct ON yt.ID_CHINH_CT = ct.ID_CHINH_CT
      ORDER BY yt.NGAY_TAO_YT DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const groupedFavorites = {};
    favorites.forEach(fav => {
      const userId = fav.ID_CHINH_ND;
      if (!groupedFavorites[userId]) groupedFavorites[userId] = [];
      groupedFavorites[userId].push(fav);
    });

    const countResult = await query(`SELECT COUNT(*) AS total FROM yeu_thich`);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

   res.render("admin/admin", {
  title: "Danh sách yêu thích",
  user: req.session.user,
  content: "admin/yeu-thich",
  groupedFavorites,
  currentPage: page,
  totalPages,
  error: null,
  success: null
});
  } catch (err) {
    console.error('Lỗi khi lấy dữ liệu yêu thích:', err);
    res.status(500).render("admin/admin", {
      title: "Lỗi",
      user: req.session.user,
      content: null,
      error: err.message
    });
  }
});


router.get('/admin/danh-gia', ensureAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const count = await query('SELECT COUNT(*) AS total FROM danh_gia');
    const total = count[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const reviews = await query(`
      SELECT dg.ID_CHINH_DG, dg.DANH_GIA, dg.NOI_DUNG_DG, dg.NGAY_TAO_DG,
             nd.ID_CHINH_ND, nd.TEN_NGUOI_DUNG, nd.EMAIL_,
             ct.TEN_CT
      FROM danh_gia dg
      JOIN nguoi_dung nd ON dg.ID_CHINH_ND = nd.ID_CHINH_ND
      JOIN cong_thuc ct ON dg.ID_CHINH_CT = ct.ID_CHINH_CT
      ORDER BY dg.NGAY_TAO_DG DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const groupedReviews = {};
    reviews.forEach(row => {
      const userId = row.ID_CHINH_ND;
      if (!groupedReviews[userId]) groupedReviews[userId] = [];
      groupedReviews[userId].push(row);
    });

    res.render("admin/admin", {
      title: "Danh sách đánh giá",
      user: req.session.user,
      content: "admin/danh-gia",
      groupedReviews,
      reviews,
      currentPage: page,
      totalPages,
      error: null,
     success: null
    });
  } catch (err) {
    console.error('Lỗi lấy đánh giá:', err);
    res.status(500).render("admin/admin", {
      title: "Lỗi",
      user: req.session.user,
      content: null,
      error: err.message
    });
  }
});

router.delete('/admin/danh-gia/:id', ensureAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Kiểm tra đánh giá có tồn tại không
    const [dg] = await query('SELECT * FROM danh_gia WHERE ID_CHINH_DG = ?', [id]);
    if (!dg) {
      return res.status(404).json({ message: 'Đánh giá không tồn tại!' });
    }

    // Xóa đánh giá
    await query('DELETE FROM danh_gia WHERE ID_CHINH_DG = ?', [id]);

    return res.status(200).json({ message: 'Xóa đánh giá thành công!' });
  } catch (err) {
    console.error('Lỗi khi xóa đánh giá:', err);
    return res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
});

// routes/admin.js
router.get('/admin/binh-luan', ensureAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const count = await query('SELECT COUNT(*) AS total FROM binh_luan');
    const total = count[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const comments = await query(`
      SELECT bl.ID_CHINH_BL, bl.NOI_DUNG_BL, bl.NGAY_TAO_BL,
             ct.TEN_CT, nd.TEN_NGUOI_DUNG, nd.EMAIL_
      FROM binh_luan bl
      JOIN cong_thuc ct ON bl.ID_CHINH_CT = ct.ID_CHINH_CT
      JOIN nguoi_dung nd ON bl.ID_CHINH_ND = nd.ID_CHINH_ND
      ORDER BY bl.NGAY_TAO_BL DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const groupedComments = {};
    comments.forEach(cmt => {
      const ct = cmt.TEN_CT;
      if (!groupedComments[ct]) groupedComments[ct] = [];
      groupedComments[ct].push(cmt);
    });

    res.render("admin/admin", {
      title: "Danh sách bình luận",
      user: req.session.user,
      content: "admin/binh-luan",
      groupedComments,
      currentPage: page,
      totalPages,
      error: null,
     success: null
    });
  } catch (err) {
    console.error('Lỗi khi lấy bình luận:', err);
    res.status(500).render("admin/admin", {
      title: "Lỗi",
      user: req.session.user,
      content: null,
      error: err.message
    });
  }
});

// routes/admin.js
router.delete("/admin/binh-luan/:id", ensureAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Cố gắng xóa bình luận
    await query("DELETE FROM binh_luan WHERE ID_CHINH_BL = ?", [id]);

    res.json({ message: "Xóa bình luận thành công!" });
  } catch (error) {
    console.error("Lỗi khi xóa bình luận:", error);

    // Nếu là lỗi do ràng buộc khóa ngoại (foreign key)
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return res.status(400).json({
        message: "Bình luận này có phản hồi, không thể xóa."
      });
    }

    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
});

// Route hiển thị giao diện quản lý phản hồi bình luận (có phân cấp)
router.get('/admin/phan-hoi-binh-luan', ensureAdmin, async (req, res) => {
  try {
    const replies = await query(`
      SELECT 
        ph.ID_CHINH_PHBL, ph.NOI_DUNG_PH, ph.NGAY_TAO_PH,
        ph.ID_CHINH_PHBL_CHA,
        nd.TEN_NGUOI_DUNG AS TEN_NGUOI_DUNG_PH, nd.EMAIL_ AS EMAIL_,
        bl.NOI_DUNG_BL, bl.ID_CHINH_BL,
        nd_bl.TEN_NGUOI_DUNG AS TEN_NGUOI_DUNG_BL,
        ct.TEN_CT
      FROM phan_hoi_binh_luan ph
      JOIN nguoi_dung nd ON ph.ID_CHINH_ND = nd.ID_CHINH_ND
      JOIN binh_luan bl ON ph.ID_CHINH_BL = bl.ID_CHINH_BL
      JOIN nguoi_dung nd_bl ON bl.ID_CHINH_ND = nd_bl.ID_CHINH_ND
      JOIN cong_thuc ct ON bl.ID_CHINH_CT = ct.ID_CHINH_CT
      ORDER BY ph.NGAY_TAO_PH ASC;
    `);

    const groupedReplies = {};
    const replyMap = {};

    for (const reply of replies) {
      reply.con = [];
      replyMap[reply.ID_CHINH_PHBL] = reply;
    }

    for (const reply of replies) {
      if (reply.ID_CHINH_PHBL_CHA) {
        const parent = replyMap[reply.ID_CHINH_PHBL_CHA];
        if (parent) parent.con.push(reply);
      } else {
        const binhLuanId = reply.ID_CHINH_BL;
        if (!groupedReplies[binhLuanId]) groupedReplies[binhLuanId] = [];
        groupedReplies[binhLuanId].push(reply);
      }
    }

    res.render("admin/admin", {
      title: "Phản hồi bình luận",
      user: req.session.user,
      content: "admin/phan-hoi-binh-luan",
      groupedReplies,
      error: null,
     success: null
    });
  } catch (err) {
    console.error('Lỗi lấy phản hồi:', err);
    res.status(500).render("admin/admin", {
      title: "Lỗi",
      user: req.session.user,
      content: null,
      error: err.message
    });
  }
});


// Xóa phản hồi
router.delete('/admin/phan-hoi-binh-luan/:id', ensureAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Hàm đệ quy: tìm tất cả ID phản hồi con theo cha
    async function getAllChildReplyIds(parentId) {
      const children = await query(
        'SELECT ID_CHINH_PHBL FROM phan_hoi_binh_luan WHERE ID_CHINH_PHBL_CHA = ?',
        [parentId]
      );

      let allIds = [];
      for (const child of children) {
        allIds.push(child.ID_CHINH_PHBL);
        const subChildren = await getAllChildReplyIds(child.ID_CHINH_PHBL);
        allIds = allIds.concat(subChildren);
      }

      return allIds;
    }

    // Kiểm tra phản hồi tồn tại
    const [reply] = await query('SELECT * FROM phan_hoi_binh_luan WHERE ID_CHINH_PHBL = ?', [id]);
    if (!reply) {
      return res.status(404).json({ message: 'Phản hồi không tồn tại!' });
    }

    // Tìm tất cả phản hồi con (đệ quy)
    const childIds = await getAllChildReplyIds(id);

    // Xóa tất cả phản hồi con
    if (childIds.length > 0) {
      await query(
        `DELETE FROM phan_hoi_binh_luan WHERE ID_CHINH_PHBL IN (${childIds.map(() => '?').join(',')})`,
        childIds
      );
    }

    // Xóa phản hồi gốc
    await query('DELETE FROM phan_hoi_binh_luan WHERE ID_CHINH_PHBL = ?', [id]);

    res.status(200).json({ message: 'Đã xóa phản hồi và các phản hồi con (nếu có).' });
  } catch (error) {
    console.error('Lỗi khi xóa phản hồi:', error);
    res.status(500).json({ message: 'Lỗi server khi xóa phản hồi.' });
  }
});
router.get('/admin/binh-luan-cam-xuc', ensureAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const count = await query('SELECT COUNT(*) AS total FROM binh_luan_cam_xuc');
    const total = count[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const emotions = await query(`
      SELECT cxbl.ID_CHINH_CXBL, cxbl.LOAI_CAM_XUC_BL, cxbl.NGAY_TAO_CX_BL,
             ct.TEN_CT, nd.TEN_NGUOI_DUNG, nd.EMAIL_, bl.NOI_DUNG_BL
      FROM binh_luan_cam_xuc cxbl
      JOIN binh_luan bl ON cxbl.ID_CHINH_BL = bl.ID_CHINH_BL
      JOIN cong_thuc ct ON bl.ID_CHINH_CT = ct.ID_CHINH_CT
      JOIN nguoi_dung nd ON cxbl.ID_CHINH_ND = nd.ID_CHINH_ND
      ORDER BY cxbl.NGAY_TAO_CX_BL DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const groupedEmotions = {};
    emotions.forEach(emo => {
      const ct = emo.TEN_CT;
      if (!groupedEmotions[ct]) groupedEmotions[ct] = [];
      groupedEmotions[ct].push(emo);
    });

    res.render("admin/admin", {
      title: "Cảm xúc bình luận",
      user: req.session.user,
      content: "admin/binh-luan-cam-xuc",
      groupedEmotions,
      currentPage: page,
      totalPages,
      error: null,
      success: null
    });
  } catch (err) {
    console.error('Lỗi khi lấy cảm xúc:', err);
    res.status(500).render("admin/admin", {
      title: "Lỗi",
      user: req.session.user,
      content: null,
      error: err.message
    });
  }
});

router.get('/admin/phan-hoi-cam-xuc', ensureAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const count = await query('SELECT COUNT(*) AS total FROM phan_hoi_cam_xuc');
    const total = count[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const emotions = await query(`
      SELECT phcx.ID_CHINH_PHCX, phcx.LOAI_CAM_XUC, phcx.NGAY_TAO_CX_PH,
             ct.TEN_CT, nd.TEN_NGUOI_DUNG, nd.EMAIL_, 
             phbl.NOI_DUNG_PH, phbl.ID_CHINH_PHBL_CHA,
             bl.NOI_DUNG_BL, parent_ph.NOI_DUNG_PH AS NOI_DUNG_PH_CHA
      FROM phan_hoi_cam_xuc phcx
      JOIN phan_hoi_binh_luan phbl ON phcx.ID_CHINH_PHBL = phbl.ID_CHINH_PHBL
      JOIN binh_luan bl ON phbl.ID_CHINH_BL = bl.ID_CHINH_BL
      JOIN cong_thuc ct ON bl.ID_CHINH_CT = ct.ID_CHINH_CT
      JOIN nguoi_dung nd ON phcx.ID_CHINH_ND = nd.ID_CHINH_ND
      LEFT JOIN phan_hoi_binh_luan parent_ph ON phbl.ID_CHINH_PHBL_CHA = parent_ph.ID_CHINH_PHBL
      ORDER BY phcx.NGAY_TAO_CX_PH DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const groupedEmotions = {};
    emotions.forEach(emo => {
      const ct = emo.TEN_CT;
      if (!groupedEmotions[ct]) groupedEmotions[ct] = [];
      groupedEmotions[ct].push(emo);
    });

    res.render("admin/admin", {
      title: "Cảm xúc phản hồi",
      user: req.session.user,
      content: "admin/phan-hoi-cam-xuc",
      groupedEmotions,
      currentPage: page,
      totalPages,
      error: null,
     success: null
    });
  } catch (err) {
    console.error('Lỗi khi lấy phản hồi cảm xúc:', err);
    res.status(500).render("admin/admin", {
      title: "Lỗi",
      user: req.session.user,
      content: null,
      error: err.message
    });
  }
});

// // Route xóa cảm xúc
// router.delete('/admin/cam-xuc-binh-luan/:id', ensureAdmin, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const result = await query('DELETE FROM cam_xuc_binh_luan WHERE ID_CHINH_CXBL = ?', [id]);
//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: 'Không tìm thấy cảm xúc' });
//     }
//     res.json({ message: 'Xóa cảm xúc thành công' });
//   } catch (err) {
//     console.error('Lỗi khi xóa cảm xúc:', err);
//     res.status(500).json({ message: 'Lỗi server' });
//   }
// });
router.get('/admin/trang-ca-nhan', ensureAdmin, async (req, res) => {
  try {
    const currentUserId = req.session.user?.ID_CHINH_ND;

    if (!currentUserId) {
      return res.status(401).send('Không xác định được người dùng.');
    }

    const [user] = await query(`
      SELECT ID_CHINH_ND, TEN_NGUOI_DUNG, EMAIL_, AVARTAR_URL, VAI_TRO, TRANG_THAI, NGAY_TAO_ND, NGAY_CAP_NHAT_ND, SO_DIEN_THOAI_
      FROM nguoi_dung
      WHERE ID_CHINH_ND = ?
    `, [currentUserId]);

    if (!user) {
      return res.status(404).send('Không tìm thấy người dùng.');
    }

    res.render('admin/admin', {
      title: 'Trang Cá Nhân',
      user,                          // ✅ quan trọng: truyền đúng biến `user`
      content: 'admin/trang-ca-nhan',
      error: null,
      success: null
    });
  } catch (err) {
    console.error('Lỗi khi lấy thông tin cá nhân:', err);
    res.status(500).send('Lỗi server: ' + err.message);
  }
});


router.put('/admin/trang-ca-nhan/cap-nhat', ensureLoggedIn, upload.single("hinh_anh"), async (req, res) => {
  const userId = req.session.user.ID_CHINH_ND;
  const { TEN_NGUOI_DUNG, EMAIL_, SO_DIEN_THOAI_ } = req.body;
  let avatarPath = req.session.user.AVARTAR_URL;

  if (!TEN_NGUOI_DUNG || !EMAIL_) {
    return res.status(400).json({ error: "Tên người dùng và email là bắt buộc!" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(EMAIL_)) {
    return res.status(400).json({ error: "Email không hợp lệ!" });
  }

  try {
    // Nếu có upload ảnh mới
    if (req.file) {
      avatarPath = `/uploads/images/${req.file.filename}`;
    }

    // Cập nhật dữ liệu
    await query(`
      UPDATE nguoi_dung 
      SET TEN_NGUOI_DUNG = ?, EMAIL_ = ?, SO_DIEN_THOAI_ = ?, AVARTAR_URL = ?, NGAY_CAP_NHAT_ND = NOW()
      WHERE ID_CHINH_ND = ?
    `, [TEN_NGUOI_DUNG, EMAIL_, SO_DIEN_THOAI_ || null, avatarPath, userId]);

    // Cập nhật session
    req.session.user = {
      ...req.session.user,
      TEN_NGUOI_DUNG,
      EMAIL_,
      SO_DIEN_THOAI_: SO_DIEN_THOAI_ || null,
      AVARTAR_URL: avatarPath
    };

    res.json({ message: "✅ Đã cập nhật thông tin cá nhân!", user: req.session.user });
  } catch (error) {
    console.error("Lỗi cập nhật thông tin:", error);
    res.status(500).json({ error: error.message || "❌ Có lỗi xảy ra khi cập nhật thông tin." });
  }
});

router.get('/admin/thong-bao', ensureAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const filter = req.query.filter || 'all';
    const search = req.query.search || '';

    // Truy vấn để đếm tổng số thông báo
    let countQuery = `
      SELECT COUNT(*) AS total FROM (
        SELECT ID_CHINH_CT AS id, 'cong_thuc' AS type, NGAY_TAO_CT AS date
        FROM cong_thuc
        WHERE TRANG_THAI_DUYET_ = 'Đang chờ duyệt'
        UNION
        SELECT ID_CHINH_BL, 'binh_luan', NGAY_TAO_BL
        FROM binh_luan
        UNION
        SELECT ID_CHINH_PHBL, 'phan_hoi_binh_luan', NGAY_TAO_PH
        FROM phan_hoi_binh_luan
        UNION
        SELECT ID_CHINH_DG, 'danh_gia', NGAY_TAO_DG
        FROM danh_gia
        UNION
        SELECT ID_CHINH_YT, 'yeu_thich', NGAY_TAO_YT
        FROM yeu_thich
        UNION
        SELECT ID_CHINH_CXBL, 'binh_luan_cam_xuc', NGAY_TAO_CX_BL
        FROM binh_luan_cam_xuc
        UNION
        SELECT ID_CHINH_PHCX, 'phan_hoi_cam_xuc', NGAY_TAO_CX_PH
        FROM phan_hoi_cam_xuc
      ) AS notifications
    `;
    if (search) {
      countQuery += ` WHERE message LIKE ?`;
    }
    const count = await query(countQuery, search ? [`%${search}%`] : []);
    const total = count[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Truy vấn thông báo
    let notificationsQuery = `
      SELECT id, type, message, date
      FROM (
        SELECT 
          ID_CHINH_CT AS id, 'cong_thuc' AS type, 
          CONCAT('Người dùng ', (SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = cong_thuc.ID_CHINH_ND), 
                 ' đã thêm công thức ', TEN_CT) AS message, 
          NGAY_TAO_CT AS date
        FROM cong_thuc
        WHERE TRANG_THAI_DUYET_ = 'Đang chờ duyệt'
        UNION
        SELECT 
          ID_CHINH_BL, 'binh_luan', 
          CONCAT('Người dùng ', (SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = binh_luan.ID_CHINH_ND), 
                 ' đã bình luận trên công thức ', (SELECT TEN_CT FROM cong_thuc WHERE ID_CHINH_CT = binh_luan.ID_CHINH_CT)), 
          NGAY_TAO_BL
        FROM binh_luan
        UNION
        SELECT 
          ID_CHINH_PHBL, 'phan_hoi_binh_luan', 
          CONCAT('Người dùng ', (SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = phan_hoi_binh_luan.ID_CHINH_ND), 
                 ' đã phản hồi bình luận trên công thức ', (SELECT TEN_CT FROM cong_thuc WHERE ID_CHINH_CT = (SELECT ID_CHINH_CT FROM binh_luan WHERE ID_CHINH_BL = phan_hoi_binh_luan.ID_CHINH_BL))), 
          NGAY_TAO_PH
        FROM phan_hoi_binh_luan
        UNION
        SELECT 
          ID_CHINH_DG, 'danh_gia', 
          CONCAT('Người dùng ', (SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = danh_gia.ID_CHINH_ND), 
                 ' đã đánh giá công thức ', (SELECT TEN_CT FROM cong_thuc WHERE ID_CHINH_CT = danh_gia.ID_CHINH_CT)), 
          NGAY_TAO_DG
        FROM danh_gia
        UNION
        SELECT 
          ID_CHINH_YT, 'yeu_thich', 
          CONCAT('Người dùng ', (SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = yeu_thich.ID_CHINH_ND), 
                 ' đã yêu thích công thức ', (SELECT TEN_CT FROM cong_thuc WHERE ID_CHINH_CT = yeu_thich.ID_CHINH_CT)), 
          NGAY_TAO_YT
        FROM yeu_thich
        UNION
        SELECT 
          ID_CHINH_CXBL, 'binh_luan_cam_xuc', 
          CONCAT('Người dùng ', (SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = binh_luan_cam_xuc.ID_CHINH_ND), 
                 ' đã bày tỏ cảm xúc ', LOAI_CAM_XUC_BL, ' trên bình luận'), 
          NGAY_TAO_CX_BL
        FROM binh_luan_cam_xuc
        UNION
        SELECT 
          ID_CHINH_PHCX, 'phan_hoi_cam_xuc', 
          CONCAT('Người dùng ', (SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = phan_hoi_cam_xuc.ID_CHINH_ND), 
                 ' đã bày tỏ cảm xúc ', LOAI_CAM_XUC, ' trên phản hồi bình luận'), 
          NGAY_TAO_CX_PH
        FROM phan_hoi_cam_xuc
      ) AS notifications
    `;
    if (search) {
      notificationsQuery += ` WHERE message LIKE ?`;
    }
    notificationsQuery += ` ORDER BY date DESC LIMIT ? OFFSET ?`;
    const notifications = await query(notificationsQuery, search ? [`%${search}%`, limit, offset] : [limit, offset]);

    // Thêm trạng thái read từ session
    const readNotifications = req.session.readNotifications || [];
    const deletedNotifications = req.session.deletedNotifications || [];
    const filteredNotifications = notifications
      .filter(n => !deletedNotifications.includes(`${n.type}:${n.id}`))
      .map(n => ({
        ...n,
        read: readNotifications.includes(`${n.type}:${n.id}`)
      }));

    // Lọc theo trạng thái
    let finalNotifications = filteredNotifications;
    if (filter === 'unread') {
      finalNotifications = filteredNotifications.filter(n => !n.read);
    } else if (filter === 'read') {
      finalNotifications = filteredNotifications.filter(n => n.read);
    }

    res.render("admin/admin", {
      title: "Danh sách thông báo",
      user: req.session.user,
      content: "admin/thong-bao",
      notifications: finalNotifications,
      currentPage: page,
      totalPages,
      filter,
      search,
      error: null,
      success: null
    });
  } catch (err) {
    console.error('Lỗi khi lấy thông báo:', err);
    res.status(500).render("admin/admin", {
      title: "Lỗi",
      user: req.session.user,
      content: null,
      error: err.message
    });
  }
});
// Lấy 5 thông báo mới nhất cho dropdown
router.get('/api/notifications', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const notifications = await query(`
      SELECT id, type, message, date
      FROM (
        SELECT 
          ID_CHINH_CT AS id, 'cong_thuc' AS type, 
          CONCAT('Người dùng ', (SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = cong_thuc.ID_CHINH_ND), 
                 ' đã thêm công thức ', TEN_CT) AS message, 
          NGAY_TAO_CT AS date
        FROM cong_thuc
        WHERE TRANG_THAI_DUYET_ = 'Đang chờ duyệt'
        UNION
        SELECT 
          ID_CHINH_BL, 'binh_luan', 
          CONCAT('Người dùng ', (SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = binh_luan.ID_CHINH_ND), 
                 ' đã bình luận trên công thức ', (SELECT TEN_CT FROM cong_thuc WHERE ID_CHINH_CT = binh_luan.ID_CHINH_CT)), 
          NGAY_TAO_BL
        FROM binh_luan
        UNION
        SELECT 
          ID_CHINH_PHBL, 'phan_hoi_binh_luan', 
          CONCAT('Người dùng ', (SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = phan_hoi_binh_luan.ID_CHINH_ND), 
                 ' đã phản hồi bình luận trên công thức ', (SELECT TEN_CT FROM cong_thuc WHERE ID_CHINH_CT = (SELECT ID_CHINH_CT FROM binh_luan WHERE ID_CHINH_BL = phan_hoi_binh_luan.ID_CHINH_BL))), 
          NGAY_TAO_PH
        FROM phan_hoi_binh_luan
        UNION
        SELECT 
          ID_CHINH_DG, 'danh_gia', 
          CONCAT('Người dùng ', (SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = danh_gia.ID_CHINH_ND), 
                 ' đã đánh giá công thức ', (SELECT TEN_CT FROM cong_thuc WHERE ID_CHINH_CT = danh_gia.ID_CHINH_CT)), 
          NGAY_TAO_DG
        FROM danh_gia
        UNION
        SELECT 
          ID_CHINH_YT, 'yeu_thich', 
          CONCAT('Người dùng ', (SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = yeu_thich.ID_CHINH_ND), 
                 ' đã yêu thích công thức ', (SELECT TEN_CT FROM cong_thuc WHERE ID_CHINH_CT = yeu_thich.ID_CHINH_CT)), 
          NGAY_TAO_YT
        FROM yeu_thich
        UNION
        SELECT 
          ID_CHINH_CXBL, 'binh_luan_cam_xuc', 
          CONCAT('Người dùng ', (SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = binh_luan_cam_xuc.ID_CHINH_ND), 
                 ' đã bày tỏ cảm xúc ', LOAI_CAM_XUC_BL, ' trên bình luận'), 
          NGAY_TAO_CX_BL
        FROM binh_luan_cam_xuc
        UNION
        SELECT 
          ID_CHINH_PHCX, 'phan_hoi_cam_xuc', 
          CONCAT('Người dùng ', (SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = phan_hoi_cam_xuc.ID_CHINH_ND), 
                 ' đã bày tỏ cảm xúc ', LOAI_CAM_XUC, ' trên phản hồi bình luận'), 
          NGAY_TAO_CX_PH
        FROM phan_hoi_cam_xuc
      ) AS notifications
      ORDER BY date DESC
      LIMIT ?
    `, [limit]);

    // Thêm trạng thái read từ session
    const readNotifications = req.session.readNotifications || [];
    const deletedNotifications = req.session.deletedNotifications || [];
    const filteredNotifications = notifications
      .filter(n => !deletedNotifications.includes(`${n.type}:${n.id}`))
      .map(n => ({
        ...n,
        read: readNotifications.includes(`${n.type}:${n.id}`)
      }));

    res.json({ notifications: filteredNotifications });
  } catch (err) {
    console.error('Lỗi khi lấy thông báo:', err);
    res.status(500).json({ error: err.message });
  }
});

// Lấy số lượng thông báo chưa đọc
router.get('/api/notifications/unread-count', async (req, res) => {
  try {
    const notifications = await query(`
      SELECT id, type
      FROM (
        SELECT ID_CHINH_CT AS id, 'cong_thuc' AS type
        FROM cong_thuc
        WHERE TRANG_THAI_DUYET_ = 'Đang chờ duyệt'
        UNION
        SELECT ID_CHINH_BL, 'binh_luan'
        FROM binh_luan
        UNION
        SELECT ID_CHINH_PHBL, 'phan_hoi_binh_luan'
        FROM phan_hoi_binh_luan
        UNION
        SELECT ID_CHINH_DG, 'danh_gia'
        FROM danh_gia
        UNION
        SELECT ID_CHINH_YT, 'yeu_thich'
        FROM yeu_thich
        UNION
        SELECT ID_CHINH_CXBL, 'binh_luan_cam_xuc'
        FROM binh_luan_cam_xuc
        UNION
        SELECT ID_CHINH_PHCX, 'phan_hoi_cam_xuc'
        FROM phan_hoi_cam_xuc
      ) AS notifications
    `);
    const readNotifications = req.session.readNotifications || [];
    const deletedNotifications = req.session.deletedNotifications || [];
    const unreadCount = notifications.filter(n => 
      !readNotifications.includes(`${n.type}:${n.id}`) && 
      !deletedNotifications.includes(`${n.type}:${n.id}`)
    ).length;
    res.json({ count: unreadCount });
  } catch (err) {
    console.error('Lỗi khi lấy số lượng thông báo:', err);
    res.status(500).json({ error: err.message });
  }
});

// Đánh dấu đã đọc
router.post('/api/notifications/:type/:id/mark-read', ensureAdmin, async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!req.session.readNotifications) {
      req.session.readNotifications = [];
    }
    const key = `${type}:${id}`;
    if (!req.session.readNotifications.includes(key)) {
      req.session.readNotifications.push(key);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Lỗi khi đánh dấu đã đọc:', err);
    res.status(500).json({ error: err.message });
  }
});

// Xóa thông báo
router.post('/api/notifications/:type/:id/delete', ensureAdmin, async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!req.session.deletedNotifications) {
      req.session.deletedNotifications = [];
    }
    const key = `${type}:${id}`;
    if (!req.session.deletedNotifications.includes(key)) {
      req.session.deletedNotifications.push(key);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Lỗi khi xóa thông báo:', err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;