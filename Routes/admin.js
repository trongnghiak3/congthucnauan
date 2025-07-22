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
            content: 'admin/trang-chu', // <--- THAY ĐỔI TẠI ĐÂY
            data: { stats },
            error: null,
        });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu thống kê:", error.stack);
        res.render("admin/admin", {
            title: "Trang Quản Lý",
            user: req.session.user,
            content: null, // Giữ null hoặc chuyển hướng đến một trang lỗi nếu muốn
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

    const search = req.query.search?.trim() || "";
    const date = req.query.date || "";
    // const user = req.query.user?.trim() || "";
    const food = req.query.food?.trim() || "";
    const creator = req.query.creator || "";
   const status = req.query.status || "";
    let queryStr = `
      SELECT 
        ct.ID_CHINH_CT,
        ct.ID_CHINH_ND,
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
        nd.VAI_TRO AS role,
        ma.TEN_MON_AN
      FROM cong_thuc ct
      LEFT JOIN nguoi_dung nd ON ct.ID_CHINH_ND = nd.ID_CHINH_ND
      LEFT JOIN mon_an ma ON ct.ID_CHINH_MA = ma.ID_CHINH_MA
      WHERE 1=1
    `;

    const queryParams = [];

    if (search) {
      queryStr += ` AND (ct.TEN_CT LIKE ? OR ct.MOTA LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (date) {
      queryStr += ` AND DATE(ct.NGAY_TAO_CT) = ?`;
      queryParams.push(date);
    }

    // if (user) {
    //   queryStr += ` AND nd.TEN_NGUOI_DUNG LIKE ?`;
    //   queryParams.push(`%${user}%`);
    // }

    if (food) {
      queryStr += ` AND ma.TEN_MON_AN LIKE ?`;
      queryParams.push(`%${food}%`);
    }

    // ✅ Lọc theo người tạo
    if (creator === "me") {
      queryStr += ` AND nd.ID_CHINH_ND = ?`;
      queryParams.push(req.session.user.ID_CHINH_ND);
    } else if (creator === "admin") {
      queryStr += ` AND nd.VAI_TRO = 'admin' AND nd.ID_CHINH_ND != ?`;
      queryParams.push(req.session.user.ID_CHINH_ND);
    }else if (creator === "nguoidung") {
  queryStr += ` AND nd.VAI_TRO = 'nguoidung'`;
}
    if (status) {
  queryStr += ` AND ct.TRANG_THAI_DUYET_ = ?`;
  queryParams.push(status);
    }

    queryStr += ` ORDER BY ct.NGAY_TAO_CT DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    // === COUNT QUERY ===
    let countQuery = `
      SELECT COUNT(*) AS total 
      FROM cong_thuc ct
      LEFT JOIN nguoi_dung nd ON ct.ID_CHINH_ND = nd.ID_CHINH_ND
      LEFT JOIN mon_an ma ON ct.ID_CHINH_MA = ma.ID_CHINH_MA
      WHERE 1=1
    `;
    const countParams = [];

    if (search) {
      countQuery += ` AND (ct.TEN_CT LIKE ? OR ct.MOTA LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (date) {
      countQuery += ` AND DATE(ct.NGAY_TAO_CT) = ?`;
      countParams.push(date);
    }

    // if (user) {
    //   countQuery += ` AND nd.TEN_NGUOI_DUNG LIKE ?`;
    //   countParams.push(`%${user}%`);
    // }

    if (food) {
      countQuery += ` AND ma.TEN_MON_AN LIKE ?`;
      countParams.push(`%${food}%`);
    }

    // ✅ Count query - theo người tạo
    if (creator === "me") {
      countQuery += ` AND nd.ID_CHINH_ND = ?`;
      countParams.push(req.session.user.ID_CHINH_ND);
    } else if (creator === "admin") {
      countQuery += ` AND nd.VAI_TRO = 'admin' AND nd.ID_CHINH_ND != ?`;
      countParams.push(req.session.user.ID_CHINH_ND);
    }else if (creator === "nguoidung") {
  countQuery += ` AND nd.VAI_TRO = 'nguoidung'`;
}
      if (status) {
        countQuery += ` AND ct.TRANG_THAI_DUYET_ = ?`;
    countParams.push(status);
  }

    const countResult = await query(countQuery, countParams);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const recipes = await query(queryStr, queryParams);

    res.render("admin/admin", {
      title: "Danh Sách Công Thức",
      user: req.session.user,
      content: "admin/cong-thuc",
      recipes,
      currentPage: page,
      totalPages,
      error: recipes.length === 0 ? "Không có công thức nào để hiển thị." : null,
      stats: {},
    });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách công thức:", err);
    res.render("admin/admin", {
      title: "Danh Sách Công Thức",
      user: req.session.user,
      content: "admin/cong-thuc",
      recipes: [],
      currentPage: 1,
      totalPages: 1,
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
      
      let finalVideoPath = null;
      if (req.files['video_file']) {
        finalVideoPath = await saveFile("video_file", "videos");
      }
      if (req.body.remove_video === '1') {
        finalVideoPath = ''; // đặt rỗng
      }

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

let finalVideoPath = null;

// Nếu upload mới thì lưu
if (req.files['video_file']) {
  finalVideoPath = await saveFile("video_file", "videos");
}

// Nếu chọn xoá video
if (req.body.remove_video === '1') {
  finalVideoPath = ''; // set rỗng
}

// Cập nhật hình/video
await query(`
  UPDATE cong_thuc 
  SET HINH_ANH_CT = COALESCE(?, HINH_ANH_CT),
      VIDEO = CASE 
        WHEN ? IS NOT NULL THEN ?
        ELSE VIDEO
      END
  WHERE ID_CHINH_CT = ?
`, [finalImagePath, finalVideoPath, finalVideoPath, recipeId]);

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
  const adminId = req.session.user.ID_CHINH_ND; // Lấy ID của admin đang thao tác

  try {
    // Bước 1: Lấy thông tin công thức và ID_CHINH_ND của người đăng
    // Cần lấy TEN_CT và ID_CHINH_ND của người đăng để gửi thông báo
    const [recipe] = await query(
      `SELECT TEN_CT, ID_CHINH_ND, TRANG_THAI_DUYET_ FROM cong_thuc WHERE ID_CHINH_CT = ?`,
      [recipeId]
    );

    if (!recipe) {
      return res.status(404).json({ message: "Công thức không tồn tại." });
    }

    if (recipe.TRANG_THAI_DUYET_ !== "Đang chờ duyệt") {
      return res.status(400).json({ message: "Công thức này không thể được duyệt (không phải trạng thái chờ duyệt)." });
    }

    // Bước 2: Cập nhật trạng thái duyệt công thức
    await query(
      `UPDATE cong_thuc SET TRANG_THAI_DUYET_ = 'Đã duyệt', NGAY_DUYET = CURDATE() WHERE ID_CHINH_CT = ?`,
      [recipeId]
    );

    // Bước 3: Gửi thông báo cho người đăng công thức
    const tenCongThuc = recipe.TEN_CT;
    const nguoiDangCongThucId = recipe.ID_CHINH_ND;

    // Đảm bảo không gửi thông báo nếu admin là người đăng công thức (hiếm nhưng có thể xảy ra)
    if (nguoiDangCongThucId) { // Đảm bảo ID người đăng tồn tại
        const notificationContent = `Công thức "${tenCongThuc}" của bạn đã được duyệt và công khai!`;
        await query(
            `INSERT INTO THONG_BAO (LOAI_TB, NOI_DUNG_TB, ID_MUC_TIEU, ID_CHINH_ND, DA_DOC, DA_XOA, NGAY_TAO_TB)
             VALUES (?, ?, ?, ?, FALSE, FALSE, NOW())`,
            ['duyet_cong_thuc', notificationContent, nguoiDangCongThucId, adminId] // adminId là người tạo thông báo
        );
    }

    return res.json({ message: "Duyệt công thức thành công!" });
  } catch (err) {
    console.error("Lỗi duyệt công thức:", err);
    return res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

router.put('/admin/cong-thuc/reject/:id', ensureAdmin, async (req, res) => {
    const recipeId = req.params.id;
    const adminId = req.session.user.ID_CHINH_ND;
    const { ly_do_tu_choi } = req.body;

    try {
        const [recipe] = await query(
            `SELECT TEN_CT, ID_CHINH_ND, TRANG_THAI_DUYET_ FROM cong_thuc WHERE ID_CHINH_CT = ?`,
            [recipeId]
        );

        if (!recipe) {
            return res.status(404).json({ message: "Công thức không tồn tại." });
        }

        if (recipe.TRANG_THAI_DUYET_ !== "Đang chờ duyệt") {
            return res.status(400).json({ message: "Công thức này không thể bị từ chối (không phải trạng thái chờ duyệt)." });
        }

        const tenCongThuc = recipe.TEN_CT;
        const nguoiDangCongThucId = recipe.ID_CHINH_ND;

        await query(
            `UPDATE cong_thuc SET TRANG_THAI_DUYET_ = 'Đã từ chối', LY_DO_TU_CHOI = ?, NGAY_DUYET = CURDATE() WHERE ID_CHINH_CT = ?`,
            [ly_do_tu_choi || null, recipeId]
        );

        if (nguoiDangCongThucId) {
            const notificationContent = `Công thức "${tenCongThuc}" của bạn đã bị từ chối. Lý do: ${ly_do_tu_choi || 'Không có lý do cụ thể.'}`;
            await query(
                `INSERT INTO THONG_BAO (LOAI_TB, NOI_DUNG_TB, ID_MUC_TIEU, ID_CHINH_ND, DA_DOC, DA_XOA, NGAY_TAO_TB)
                 VALUES (?, ?, ?, ?, FALSE, FALSE, NOW())`,
                ['duyet_cong_thuc', notificationContent, nguoiDangCongThucId, adminId]
            );
        }

        console.log('Công thức với ID', recipeId, 'đã được từ chối thành công');
        res.json({ message: 'Công thức đã được từ chối thành công' });
    } catch (err) {
        console.error('Lỗi khi cập nhật trạng thái từ chối:', err);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi từ chối công thức: ' + err.message });
    }
});
// Danh sách nguyên liệu
router.get("/admin/nguyen-lieu", ensureAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
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

    // ✅ Tính tổng công thức có nguyên liệu
    const totalRecipes = Object.keys(groupedRecipes).length;
    const totalPagesRecipes = Math.ceil(totalRecipes / limitRecipes);

    res.render("admin/admin", {
      title: "Danh Sách Nguyên Liệu & Công Thức",
      user: req.session.user,
      content: "admin/nguyen-lieu",
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

router.delete("/admin/nguyen-lieu/multiple-delete", ensureAdmin, async (req, res) => {
    try {
        console.log('Received DELETE request to /admin/nguyen-lieu/multiple-delete');
        const { ids } = req.body;
        console.log('Received IDs:', ids);

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "Không có nguyên liệu nào được chọn để xóa." });
        }

        const validIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
        console.log('Valid IDs:', validIds);

        if (validIds.length === 0) {
            return res.status(400).json({ message: "Danh sách ID không hợp lệ." });
        }

        // Tạo placeholder cho truy vấn IN
        const placeholders = validIds.map(() => '?').join(',');
        const [existingIngredients] = await query(
            `SELECT ID_CHINH_NL FROM nguyen_lieu WHERE ID_CHINH_NL IN (${placeholders})`,
            validIds
        );
        console.log('Existing Ingredients:', existingIngredients);

        const foundIds = new Set(existingIngredients.map(item => item.ID_CHINH_NL));
        const notFoundIds = validIds.filter(id => !foundIds.has(id));
        console.log('Found IDs:', Array.from(foundIds));
        console.log('Not Found IDs:', notFoundIds);

        if (notFoundIds.length > 0) {
            return res.status(404).json({ 
                message: `Một hoặc nhiều nguyên liệu không tồn tại: ${notFoundIds.join(", ")}.` 
            });
        }

        const [deleteResult] = await query(
            `DELETE FROM nguyen_lieu WHERE ID_CHINH_NL IN (${placeholders})`,
            validIds
        );
        console.log('Delete Result:', deleteResult);

        if (deleteResult.affectedRows > 0) {
            return res.status(200).json({ 
                message: `Xóa thành công ${deleteResult.affectedRows} nguyên liệu!` 
            });
        } else {
            return res.status(500).json({ message: "Không thể xóa nguyên liệu do lỗi không xác định." });
        }
    } catch (err) {
        console.error("Lỗi server khi xóa nhiều nguyên liệu:", err);
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
        const pageCategories = parseInt(req.query.pageCategories) || 1; // Giữ lại cho tab Loại Món nếu có
        const limit = 7; // Số món ăn trên mỗi trang
        const limitCategories = 8; // Số loại món trên mỗi trang (nếu có tab riêng)
        const offset = (page - 1) * limit;

        // Lấy tham số tìm kiếm và lọc từ query string
        const searchTerm = req.query.search ? req.query.search.trim() : '';
        const typeId = req.query.typeId ? parseInt(req.query.typeId) : ''; // ID của loại món được chọn

        let countQuery = `SELECT COUNT(DISTINCT ma.ID_CHINH_MA) AS total FROM mon_an ma`;
        let listQuery = `SELECT ma.ID_CHINH_MA, ma.TEN_MON_AN, ma.HINH_ANH_MA, ma.MO_TA_MA FROM mon_an ma`;
        let queryParams = [];
        let joinClause = '';
        let whereClause = ' WHERE 1=1'; // Bắt đầu với điều kiện luôn đúng để dễ dàng thêm các điều kiện AND

        // Nếu có typeId được chọn, thêm JOIN và điều kiện WHERE để lọc theo loại món
        if (typeId) {
            joinClause += `
                INNER JOIN mon_an_loai_mon malm ON ma.ID_CHINH_MA = malm.ID_CHINH_MA
                INNER JOIN loai_mon lm ON malm.ID_CHINH_LM = lm.ID_CHINH_LM
            `;
            whereClause += ` AND lm.ID_CHINH_LM = ?`;
            queryParams.push(typeId);
        }

        // Nếu có searchTerm, thêm điều kiện WHERE để tìm kiếm theo tên hoặc mô tả
        if (searchTerm) {
            whereClause += `
                AND (
                    ma.TEN_MON_AN LIKE ?
                    OR ma.MO_TA_MA LIKE ?
                )
            `;
            // Thêm tham số cho LIKE. Dấu % là ký tự đại diện trong SQL.
            queryParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
        }

        // Kết hợp các mệnh đề cho truy vấn đếm tổng số món ăn (sau khi lọc/tìm kiếm)
        countQuery += joinClause + whereClause;

        // Thực thi truy vấn đếm
        const countResult = await query(countQuery, queryParams);
        const total = countResult[0]?.total || 0;
        const totalPages = Math.ceil(total / limit);

        // Kết hợp các mệnh đề cho truy vấn lấy danh sách món ăn chính (sau khi lọc/tìm kiếm và phân trang)
        listQuery += joinClause + whereClause;
        listQuery += ` ORDER BY ma.ID_CHINH_MA DESC LIMIT ? OFFSET ?`;

        // Thêm tham số LIMIT và OFFSET vào cuối mảng queryParams
        const paginatedQueryParams = [...queryParams, limit, offset];

        const monAnList = await query(listQuery, paginatedQueryParams);

        // Lấy tất cả các loại món để populate dropdown lọc (luôn cần)
        const categories = await query(`
            SELECT ID_CHINH_LM, TEN_LM
            FROM loai_mon
            ORDER BY TEN_LM ASC
        `);

        // Logic cũ cho phần Loại Món (giữ nguyên nếu bạn có một tab riêng cho Loại Món)
        const countCategoriesResult = await query(`
            SELECT COUNT(*) AS total
            FROM loai_mon
        `);
        const totalCategories = countCategoriesResult[0]?.total || 0;
        const totalPagesCategories = Math.ceil(totalCategories / limitCategories);
        const offsetCategories = (pageCategories - 1) * limitCategories;


        // Lấy danh sách ID của món ăn đã được phân trang (và lọc/tìm kiếm)
        const monAnIds = monAnList.map(item => item.ID_CHINH_MA);

        let loaiMonData = [];
        if (monAnIds.length > 0) {
            loaiMonData = await query(`
                SELECT
                    malm.ID_CHINH_MA,
                    lm.ID_CHINH_LM,
                    lm.TEN_LM
                FROM mon_an_loai_mon malm
                JOIN loai_mon lm ON malm.ID_CHINH_LM = lm.ID_CHINH_LM
                WHERE malm.ID_CHINH_MA IN (?)
                ORDER BY malm.ID_CHINH_MA DESC
            `, [monAnIds]);
        }

        const groupedLoaiMon = {};
        loaiMonData.forEach((lm) => {
            if (!groupedLoaiMon[lm.ID_CHINH_MA]) {
                groupedLoaiMon[lm.ID_CHINH_MA] = {
                    loai_mon: [],
                };
            }
            groupedLoaiMon[lm.ID_CHINH_MA].loai_mon.push({
                ID_CHINH_LM: lm.ID_CHINH_LM,
                TEN_LM: lm.TEN_LM,
            });
        });

        // Render trang admin với dữ liệu đã được lọc/tìm kiếm
        res.render("admin/admin", {
            title: "Danh Sách Món Ăn & Loại Món",
            user: req.session.user,
            content: "admin/mon-an",
            monAnList,
            categories, // Truyền danh sách tất cả loại món để điền vào dropdown lọc
            currentPage: page,
            totalPages,
            currentPageCategories: pageCategories,
            totalPagesCategories,
            groupedLoaiMon,
            searchTerm, // Truyền lại searchTerm để giữ giá trị trong input
            selectedTypeId: typeId, // Truyền lại typeId để giữ lựa chọn trong dropdown
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

    // --- Dòng console.log bạn cần dùng để kiểm tra danh sách người dùng ---
    // console.log("Danh sách người dùng được gửi tới EJS:", users);
    // console.log("Tổng số người dùng (chỉ vai trò 'nguoidung', không bao gồm admin hiện tại):", total);
    // console.log("Trang hiện tại:", page);
    // ---------------------------------------------------------------------

    res.render("admin/admin", {
      title: "Danh Sách Người Dùng",
      user: req.session.user, // Đây là thông tin của người dùng admin hiện tại
      content: "admin/nguoi-dung",
      users, // Đây là danh sách người dùng bạn muốn kiểm tra
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
    const adminId = req.session.user.ID_CHINH_ND;

    // Điều kiện lọc: chỉ thông báo gửi đến admin đang đăng nhập
    let whereClause = `WHERE tb.DA_XOA = FALSE AND tb.ID_MUC_TIEU = ? AND nd.VAI_TRO = 'nguoidung'`;
    const params = [adminId];

    // Lọc theo nội dung tìm kiếm
    if (search) {
      whereClause += ` AND tb.NOI_DUNG_TB LIKE ?`;
      params.push(`%${search}%`);
    }

    // Lọc theo trạng thái đọc
    if (filter === 'unread') {
      whereClause += ` AND tb.DA_DOC = FALSE`;
    } else if (filter === 'read') {
      whereClause += ` AND tb.DA_DOC = TRUE`;
    }

    // Đếm tổng số bản ghi
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM THONG_BAO tb
      JOIN nguoi_dung nd ON tb.ID_CHINH_ND = nd.ID_CHINH_ND
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Truy vấn lấy dữ liệu thực tế
    const dataQuery = `
      SELECT tb.ID_CHINH_TB, tb.LOAI_TB, tb.NOI_DUNG_TB, tb.NGAY_TAO_TB, tb.DA_DOC
      FROM THONG_BAO tb
      JOIN nguoi_dung nd ON tb.ID_CHINH_ND = nd.ID_CHINH_ND
      ${whereClause}
      ORDER BY tb.NGAY_TAO_TB DESC
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...params, limit, offset];
    const thongBao = await query(dataQuery, dataParams);

    res.render("admin/admin", {
      title: "Danh sách thông báo",
      user: req.session.user,
      content: "admin/thong-bao",
      thong_bao: thongBao,
      currentPage: page,
      totalPages,
      filter,
      search,
      error: null,
      success: null,
      stats: {},
    });

  } catch (err) {
    console.error("❌ Lỗi khi lấy thông báo:", err);
    res.status(500).render("admin/admin", {
      title: "Lỗi",
      user: req.session.user,
      content: null,
      error: "Không thể tải danh sách thông báo: " + err.message,
      stats: {}
    });
  }
});








router.get('/api/thong-bao', ensureAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const adminId = req.session.user?.ID_CHINH_ND;

    const thongBao = await query(`
      SELECT tb.ID_CHINH_TB, tb.LOAI_TB, tb.NOI_DUNG_TB, tb.NGAY_TAO_TB, tb.DA_DOC,
             nd.TEN_NGUOI_DUNG
      FROM THONG_BAO tb
      JOIN nguoi_dung nd ON tb.ID_CHINH_ND = nd.ID_CHINH_ND
      WHERE tb.DA_XOA = FALSE AND tb.ID_MUC_TIEU = ?
      ORDER BY tb.NGAY_TAO_TB DESC
      LIMIT ?
    `, [adminId, limit]);

    res.json({ thong_bao: thongBao });
  } catch (err) {
    console.error('Lỗi khi lấy thông báo:', err);
    res.status(500).json({ error: 'Không thể tải thông báo' });
  }
});



// API lấy số lượng thông báo chưa đọc
// ✅ API lấy số lượng thông báo chưa đọc
router.get('/api/thong-bao/dem-chua-doc', async (req, res) => {
  try {
    const userId = req.session.user.ID_CHINH_ND;

    const count = await query(`
      SELECT COUNT(*) AS total 
      FROM THONG_BAO 
      WHERE DA_DOC = FALSE AND DA_XOA = FALSE AND ID_MUC_TIEU = ?
    `, [userId]);

    res.json({ count: count[0].total });
  } catch (err) {
    console.error('Lỗi khi lấy số lượng thông báo:', err);
    res.status(500).json({ error: 'Không thể tải số lượng thông báo' });
  }
});



// ✅ Đánh dấu đã đọc
router.post('/api/thong-bao/:type/:id/mark-read', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.ID_CHINH_ND;

    await query(`
      UPDATE THONG_BAO 
      SET DA_DOC = TRUE 
      WHERE ID_CHINH_TB = ? AND ID_MUC_TIEU = ?
    `, [id, userId]);

    res.json({ success: true });
  } catch (err) {
    console.error('Lỗi khi đánh dấu đã đọc:', err);
    res.status(500).json({ error: 'Không thể đánh dấu đã đọc' });
  }
});



// ✅ Xóa thông báo
router.post('/api/thong-bao/:type/:id/delete', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.ID_CHINH_ND;

    await query(`
      UPDATE THONG_BAO 
      SET DA_XOA = TRUE 
      WHERE ID_CHINH_TB = ? AND ID_MUC_TIEU = ?
    `, [id, userId]);

    res.json({ success: true });
  } catch (err) {
    console.error('Lỗi khi xóa thông báo:', err);
    res.status(500).json({ error: 'Không thể xóa thông báo' });
  }
});



module.exports = router;