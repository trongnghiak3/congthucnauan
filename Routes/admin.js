const express = require("express");
const router = express.Router();
const { query } = require("../config/db");
const { ensureAdmin, ensureLoggedIn } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

// Cấu hình multer để lưu file
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

// Trang quản lý admin
router.get("/admin", ensureAdmin, (req, res) => {
  res.render("admin/admin", { title: "Trang Quản Lý", user: req.session.user });
});

// Danh sách công thức
router.get("/admin/recipes", ensureAdmin, async (req, res) => {
  try {
    // Lấy page và limit từ query, mặc định page=1, limit=8
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const offset = (page - 1) * limit;

    // Lấy tổng số công thức để tính tổng trang
    const countResult = await query(`SELECT COUNT(*) AS total FROM cong_thuc`);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Lấy danh sách công thức với phân trang
    const recipes = await query(`
      SELECT 
        ct.id_chinh,
        ct.ten_ct,
        ct.mo_ta,
        ct.huong_dan,
        ct.thoi_gian_nau,
        ct.do_kho,
        ct.so_phan_an,
        ct.video_url,
        ct.hinh_anh,
        ct.ngay_tao,
        ct.status,
        nd.ten_dang_nhap AS user
      FROM cong_thuc ct
      LEFT JOIN nguoi_dung nd ON ct.nguoi_dung_id = nd.id_chinh
      ORDER BY ct.ngay_tao DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    res.render("admin/partials/recipes", {
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

router.get("/admin/recipes/add", ensureLoggedIn, async (req, res) => {
  try {
    const loai_mon = await query("SELECT * FROM loai_mon");
    const nguyen_lieu = await query("SELECT * FROM nguyen_lieu");
    res.render("admin/partials/add-recipe", {
      recipe: null, // Đã thêm từ câu trả lời trước
      loai_mon: loai_mon || [],
      nguyen_lieu: nguyen_lieu || [],
      selectedLoaiMon: [], // Thêm mảng rỗng vì không có loại món được chọn
      selectedNguyenLieu: [], // Thêm mảng rỗng vì không có nguyên liệu được chọn
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
// Trang chi tiết công thức
router.get("/admin/recipes/edit/:id", ensureLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;

    // Lấy chi tiết công thức
    const [recipe] = await query(
      `SELECT ct.*, nd.ten_dang_nhap AS user
       FROM cong_thuc ct
       LEFT JOIN nguoi_dung nd ON ct.nguoi_dung_id = nd.id_chinh
       WHERE ct.id_chinh = ?`,
      [id]
    );

    if (!recipe) {
      return res.status(404).render("error", {
        message: "Không tìm thấy công thức",
        user: req.session.user,
        layout: false,
      });
    }

    // Lấy loại món đã chọn của công thức
    const selectedLoaiMon = await query(
      `SELECT lm.id_chinh, lm.ten_loai
       FROM cong_thuc_loai_mon ctlm
       JOIN loai_mon lm ON ctlm.loai_mon_id = lm.id_chinh
       WHERE ctlm.cong_thuc_id = ?`,
      [id]
    );

    // Lấy nguyên liệu đã chọn của công thức
    const selectedNguyenLieu = await query(
      `SELECT ctnl.nguyen_lieu_id, nl.ten_nguyen_lieu, ctnl.so_luong, ctnl.ghi_chu, nl.don_vi
       FROM cong_thuc_nguyen_lieu ctnl
       JOIN nguyen_lieu nl ON ctnl.nguyen_lieu_id = nl.id_chinh
       WHERE ctnl.cong_thuc_id = ?`,
      [id]
    );

    // Lấy danh sách tất cả loại món và nguyên liệu
    const loai_mon = await query("SELECT * FROM loai_mon");
    const nguyen_lieu = await query("SELECT * FROM nguyen_lieu");

    // Render nội dung partial cho AJAX
    res.render("admin/partials/add-recipe", {
      recipe: recipe || null,
      loai_mon: loai_mon || [],
      nguyen_lieu: nguyen_lieu || [],
      selectedLoaiMon: selectedLoaiMon ? selectedLoaiMon.map(lm => lm.id_chinh.toString()) : [],
      selectedNguyenLieu: selectedNguyenLieu || [],
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
// Thêm công thức mới, upload ảnh và video
router.post(
  '/admin/recipes',
  ensureAdmin,
  upload.fields([
    { name: 'hinh_anh', maxCount: 1 },
    { name: 'video_file', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      console.log('req.body:', JSON.stringify(req.body, null, 2));
      console.log('req.files:', req.files);

      const normalizeArray = (input) => {
        if (!input) return [];
        if (Array.isArray(input)) return input;
        if (typeof input === 'string') return [input];
        return [];
      };

      const {
        ten_ct,
        mo_ta,
        thoi_gian_nau,
        do_kho,
        so_phan_an,
        loai_mon,
        nguyen_lieu_id,
        ten_nguyen_lieu_khac,
        don_vi_khac,
        so_luong,
        ghi_chu,
        ten_buoc,
        buoc_nau,
      } = req.body;

      const nguyenLieuIds = normalizeArray(nguyen_lieu_id);
      const tenNguyenLieuKhacs = normalizeArray(ten_nguyen_lieu_khac);
      const donViKhacs = normalizeArray(don_vi_khac);
      const soLuongs = normalizeArray(so_luong);
      const ghiChus = normalizeArray(ghi_chu);

      console.log('Nguyên liệu ID:', nguyenLieuIds);
      console.log('Tên nguyên liệu khác:', tenNguyenLieuKhacs);
      console.log('Đơn vị khác:', donViKhacs);
      console.log('Số lượng:', soLuongs);
      console.log('Ghi chú:', ghiChus);

      if (!ten_ct?.trim() || !mo_ta?.trim()) {
        return res.status(400).json({ message: 'Tên công thức và mô tả là bắt buộc!' });
      }

      const tenBuoc = normalizeArray(ten_buoc);
      const buocNau = normalizeArray(buoc_nau);

      if (
        tenBuoc.length === 0 ||
        buocNau.length === 0 ||
        tenBuoc.length !== buocNau.length ||
        tenBuoc.some((t) => !t.trim()) ||
        buocNau.some((b) => !b.trim())
      ) {
        return res.status(400).json({ message: 'Tên bước và mô tả bước là bắt buộc!' });
      }

      if (soLuongs.length === 0) {
        return res.status(400).json({ message: 'Vui lòng thêm ít nhất một nguyên liệu!' });
      }

      const userId = req.session.user.id_chinh;

      // Thêm công thức (với video_url, hinh_anh tạm để null)
      const result = await query(
        `INSERT INTO cong_thuc 
         (nguoi_dung_id, ten_ct, mo_ta, huong_dan, thoi_gian_nau, do_kho, so_phan_an, video_url, hinh_anh, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Đã duyệt')`,
        [
          userId,
          ten_ct.trim(),
          mo_ta.trim(),
          tenBuoc.map((ten, i) => `Bước ${i + 1}: ${ten.trim()} - ${buocNau[i].trim()}`).join('\n\n'),
          thoi_gian_nau || null,
          do_kho || null,
          so_phan_an || null,
          null,
          null,
        ]
      );

      const recipeId = result.insertId;

      // Tạo thư mục lưu file
      const imageDir = path.join(__dirname, '..', 'public', 'uploads', 'images', 'congthuc', String(recipeId));
      const videoDir = path.join(__dirname, '..', 'public', 'uploads', 'videos', 'congthuc', String(recipeId));

      await fs.mkdir(imageDir, { recursive: true });
      await fs.mkdir(videoDir, { recursive: true });

      const getUniqueFileName = async (dir, filename) => {
        const ext = path.extname(filename);
        const name = path.basename(filename, ext);
        let newName = filename,
          i = 1;
        while (true) {
          try {
            await fs.access(path.join(dir, newName));
            newName = `${name}_${i++}${ext}`;
          } catch {
            return newName;
          }
        }
      };

      const processFileUpload = async (type, dir, fileField) => {
        if (!req.files[fileField]) return null;
        const file = req.files[fileField][0];
        const uniqueName = await getUniqueFileName(dir, file.originalname);
        await fs.rename(file.path, path.join(dir, uniqueName));
       return `/uploads/${type}/congthuc/${recipeId}/${uniqueName}`;
      };

      const finalImagePath = await processFileUpload('images', imageDir, 'hinh_anh');
      const finalVideoPath = await processFileUpload('videos', videoDir, 'video_file');

      await query(`UPDATE cong_thuc SET hinh_anh = ?, video_url = ? WHERE id_chinh = ?`, [
        finalImagePath,
        finalVideoPath,
        recipeId,
      ]);

      // Xử lý loại món
      const loaiMonArray = normalizeArray(loai_mon);
      if (loaiMonArray.length > 0) {
        const values = loaiMonArray.flatMap((lm) => [recipeId, lm]);
        const placeholders = loaiMonArray.map(() => '(?, ?)').join(', ');
        await query(
          `INSERT INTO cong_thuc_loai_mon (cong_thuc_id, loai_mon_id) VALUES ${placeholders}`,
          values
        );
      }

      // Xử lý nguyên liệu
      const nguyenLieuData = [];
      const maxLen = Math.max(
        nguyenLieuIds.length,
        tenNguyenLieuKhacs.length,
        donViKhacs.length,
        soLuongs.length,
        ghiChus.length
      );

      for (let i = 0; i < maxLen; i++) {
        const idRaw = nguyenLieuIds[i] || '';
        const id = idRaw === '' || idRaw === undefined ? null : idRaw;
        const ten = tenNguyenLieuKhacs[i] || '';
        const donVi = donViKhacs[i] || '';
        const sl = parseFloat(soLuongs[i]) || 0;
        const ghiChu = ghiChus[i] || '';

        if (sl <= 0) continue;

        let nguyenLieuId = id;

        if (!id && ten.trim()) {
          // Kiểm tra nguyên liệu khác đã tồn tại chưa
          const existing = await query(
            'SELECT id_chinh FROM nguyen_lieu WHERE ten_nguyen_lieu = ? LIMIT 1',
            [ten.trim()]
          );
          if (existing.length > 0) {
            // Xóa công thức vừa thêm và trả lỗi để tránh dữ liệu rác
            await query('DELETE FROM cong_thuc WHERE id_chinh = ?', [recipeId]);
            return res.status(400).json({
              message: `Nguyên liệu "${ten.trim()}" đã tồn tại, vui lòng nhập tên nguyên liệu khác!`,
            });
          }

          // Thêm nguyên liệu mới
          const insertResult = await query(
            'INSERT INTO nguyen_lieu (ten_nguyen_lieu, don_vi) VALUES (?, ?)',
            [ten.trim(), donVi.trim()]
          );
          nguyenLieuId = insertResult.insertId;
        }

        if (nguyenLieuId) {
          nguyenLieuData.push([recipeId, nguyenLieuId, sl, ghiChu]);
        }
      }

      if (nguyenLieuData.length > 0) {
        const placeholders = nguyenLieuData.map(() => '(?, ?, ?, ?)').join(', ');
        const flatValues = nguyenLieuData.flat();
        await query(
          `INSERT INTO cong_thuc_nguyen_lieu (cong_thuc_id, nguyen_lieu_id, so_luong, ghi_chu) VALUES ${placeholders}`,
          flatValues
        );
      }

      return res.status(201).json({ message: 'Thêm công thức thành công!' });
    } catch (err) {
      console.error('Lỗi server:', err);
      return res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
  }
);



// Cập nhật công thức
router.put(
  "/admin/recipes/:id",
  ensureAdmin,
  upload.fields([
    { name: "hinh_anh", maxCount: 1 },
    { name: "video_file", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const recipeId = req.params.id;
      console.log("req.body:", JSON.stringify(req.body, null, 2));
      console.log("req.files:", req.files);

      // Chuẩn hóa mảng đầu vào
      const normalizeArray = (input) => {
        if (!input) return [];
        if (Array.isArray(input)) return input;
        if (typeof input === "string") return [input];
        return [];
      };

      const {
        ten_ct,
        mo_ta,
        thoi_gian_nau,
        do_kho,
        so_phan_an,
        loai_mon,
        nguyen_lieu_id,
        ten_nguyen_lieu_khac,
        don_vi_khac,
        so_luong,
        ghi_chu,
        ten_buoc,
        buoc_nau,
      } = req.body;

      const nguyenLieuIds = normalizeArray(nguyen_lieu_id);
      const tenNguyenLieuKhacs = normalizeArray(ten_nguyen_lieu_khac);
      const donViKhacs = normalizeArray(don_vi_khac);
      const soLuongs = normalizeArray(so_luong);
      const ghiChus = normalizeArray(ghi_chu);

      // Kiểm tra các trường bắt buộc
      if (!ten_ct?.trim() || !mo_ta?.trim()) {
        return res.status(400).json({ message: "Tên công thức và mô tả là bắt buộc!" });
      }

      const tenBuoc = normalizeArray(ten_buoc);
      const buocNau = normalizeArray(buoc_nau);

      if (
        tenBuoc.length === 0 ||
        buocNau.length === 0 ||
        tenBuoc.length !== buocNau.length ||
        tenBuoc.some((t) => !t.trim()) ||
        buocNau.some((b) => !b.trim())
      ) {
        return res.status(400).json({ message: "Tên bước và mô tả bước là bắt buộc!" });
      }

      if (soLuongs.length === 0) {
        return res.status(400).json({ message: "Vui lòng thêm ít nhất một nguyên liệu!" });
      }

      // Kiểm tra công thức có tồn tại không
      const [existingRecipe] = await query(`SELECT * FROM cong_thuc WHERE id_chinh = ?`, [recipeId]);
      if (!existingRecipe) {
        return res.status(404).json({ message: "Công thức không tồn tại." });
      }

      // Xử lý tải lên tệp
     const imageDir = path.join(__dirname, '..', 'public', 'uploads', 'images', 'congthuc', String(recipeId));
      const videoDir = path.join(__dirname, '..', 'public', 'uploads', 'videos', 'congthuc', String(recipeId));
      await fs.mkdir(imageDir, { recursive: true });
      await fs.mkdir(videoDir, { recursive: true });

      const getUniqueFileName = async (dir, filename) => {
        const ext = path.extname(filename);
        const name = path.basename(filename, ext);
        let newName = filename,
          i = 1;
        while (true) {
          try {
            await fs.access(path.join(dir, newName));
            newName = `${name}_${i++}${ext}`;
          } catch {
            return newName;
          }
        }
      };

      const processFileUpload = async (type, dir, fileField) => {
        if (!req.files[fileField]) return null;
        const file = req.files[fileField][0];
        const uniqueName = await getUniqueFileName(dir, file.originalname);
        await fs.rename(file.path, path.join(dir, uniqueName));
        return `/uploads/${type}/congthuc/${recipeId}/${uniqueName}`;
      };

      const finalImagePath = await processFileUpload("images", imageDir, "hinh_anh") || existingRecipe.hinh_anh;
      const finalVideoPath = await processFileUpload("videos", videoDir, "video_file") || existingRecipe.video_url;

      // Cập nhật công thức
      await query(
        `UPDATE cong_thuc 
         SET ten_ct = ?, mo_ta = ?, huong_dan = ?, thoi_gian_nau = ?, do_kho = ?, so_phan_an = ?, hinh_anh = ?, video_url = ?, status = 'Đã duyệt'
         WHERE id_chinh = ?`,
        [
          ten_ct.trim(),
          mo_ta.trim(),
          tenBuoc.map((ten, i) => `Bước ${i + 1}: ${ten.trim()} - ${buocNau[i].trim()}`).join("\n\n"),
          thoi_gian_nau || null,
          do_kho || null,
          so_phan_an || null,
          finalImagePath,
          finalVideoPath,
          recipeId,
        ]
      );

      // Xóa dữ liệu liên quan hiện có
      await query(`DELETE FROM cong_thuc_loai_mon WHERE cong_thuc_id = ?`, [recipeId]);
      await query(`DELETE FROM cong_thuc_nguyen_lieu WHERE cong_thuc_id = ?`, [recipeId]);

      // Xử lý loại món
      const loaiMonArray = normalizeArray(loai_mon);
      if (loaiMonArray.length > 0) {
        const values = loaiMonArray.flatMap((lm) => [recipeId, lm]);
        const placeholders = loaiMonArray.map(() => "(?, ?)").join(", ");
        await query(
          `INSERT INTO cong_thuc_loai_mon (cong_thuc_id, loai_mon_id) VALUES ${placeholders}`,
          values
        );
      }

      // Xử lý nguyên liệu
      const nguyenLieuData = [];
      const maxLen = Math.max(
        nguyenLieuIds.length,
        tenNguyenLieuKhacs.length,
        donViKhacs.length,
        soLuongs.length,
        ghiChus.length
      );

      for (let i = 0; i < maxLen; i++) {
        const idRaw = nguyenLieuIds[i] || "";
        const id = idRaw === "" || idRaw === undefined ? null : idRaw;
        const ten = tenNguyenLieuKhacs[i] || "";
        const donVi = donViKhacs[i] || "";
        const sl = parseFloat(soLuongs[i]) || 0;
        const ghiChu = ghiChus[i] || "";

        if (sl <= 0) continue;

        let nguyenLieuId = id;

        if (!id && ten.trim()) {
          const existing = await query(
            "SELECT id_chinh FROM nguyen_lieu WHERE ten_nguyen_lieu = ? LIMIT 1",
            [ten.trim()]
          );
          if (existing.length > 0) {
            return res.status(400).json({
              message: `Nguyên liệu "${ten.trim()}" đã tồn tại, vui lòng nhập tên nguyên liệu khác!`,
            });
          }

          const insertResult = await query(
            "INSERT INTO nguyen_lieu (ten_nguyen_lieu, don_vi) VALUES (?, ?)",
            [ten.trim(), donVi.trim()]
          );
          nguyenLieuId = insertResult.insertId;
        }

        if (nguyenLieuId) {
          nguyenLieuData.push([recipeId, nguyenLieuId, sl, ghiChu]);
        }
      }

      if (nguyenLieuData.length > 0) {
        const placeholders = nguyenLieuData.map(() => "(?, ?, ?, ?)").join(", ");
        const flatValues = nguyenLieuData.flat();
        await query(
          `INSERT INTO cong_thuc_nguyen_lieu (cong_thuc_id, nguyen_lieu_id, so_luong, ghi_chu) VALUES ${placeholders}`,
          flatValues
        );
      }

      return res.json({ message: "Cập nhật công thức thành công!" });
    } catch (err) {
      console.error("Lỗi server:", err);
      return res.status(500).json({ message: "Lỗi server: " + err.message });
    }
  }
);



// Xóa công thức (kèm xóa file ảnh, video)

router.delete("/admin/recipes/:id", ensureAdmin, async (req, res) => {
  const recipeId = req.params.id;

  try {
    // Kiểm tra xem công thức có tồn tại không
    const [recipe] = await query(
      `SELECT hinh_anh, video_url FROM cong_thuc WHERE id_chinh = ?`,
      [recipeId]
    );
    if (!recipe) {
      return res.status(404).json({ message: "Công thức không tồn tại." });
    }

    // Bắt đầu transaction
    await query("BEGIN");

    // Xóa các bản ghi liên quan
    await query(`DELETE FROM cong_thuc_loai_mon WHERE cong_thuc_id = ?`, [recipeId]);
    await query(`DELETE FROM cong_thuc_nguyen_lieu WHERE cong_thuc_id = ?`, [recipeId]);
    
    // Xóa công thức chính
    await query(`DELETE FROM cong_thuc WHERE id_chinh = ?`, [recipeId]);

    // Commit nếu mọi thứ ok
    await query("COMMIT");

    res.status(200).json({ message: "Xóa công thức thành công." });
  } catch (error) {
    // Rollback nếu có lỗi
    await query("ROLLBACK");
    console.error("Lỗi khi xóa công thức:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi xóa công thức." });
  }
});

router.put("/admin/recipes/approve/:id", ensureAdmin, async (req, res) => {
  const recipeId = req.params.id;

  try {
    // Kiểm tra xem công thức có tồn tại không
    const [recipe] = await query(
      `SELECT status FROM cong_thuc WHERE id_chinh = ?`,
      [recipeId]
    );
    if (!recipe) {
      return res.status(404).json({ message: "Công thức không tồn tại." });
    }

    // Chỉ duyệt nếu trạng thái là "Đang chờ duyệt"
    if (recipe.status !== 'Đang chờ duyệt') {
      return res.status(400).json({ message: "Công thức này không thể được duyệt (không phải trạng thái chờ duyệt)." });
    }

    // Cập nhật trạng thái thành "Đã duyệt"
   await query(
  `UPDATE cong_thuc SET status = 'Đã duyệt' WHERE id_chinh = ?`,
  [recipeId]
);


    return res.json({ message: "Duyệt công thức thành công!" });
  } catch (err) {
    console.error("Lỗi duyệt công thức:", err);
    return res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// NGUYÊN LIỆU 
router.get("/admin/ingredients", ensureAdmin, async (req, res) => {
  try {
    // ===== PHÂN TRANG NGUYÊN LIỆU =====
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const offset = (page - 1) * limit;

    const countResult = await query(`SELECT COUNT(*) AS total FROM nguyen_lieu`);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const ingredients = await query(`
      SELECT id_chinh, ten_nguyen_lieu, don_vi
      FROM nguyen_lieu
      ORDER BY id_chinh DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    // ===== PHÂN TRANG CÔNG THỨC =====
    const pageRecipes = parseInt(req.query.pageRecipes) || 1;
    const limitRecipes = 8;
    const offsetRecipes = (pageRecipes - 1) * limitRecipes;

    const countRecipesResult = await query(`SELECT COUNT(*) AS total FROM cong_thuc`);
    const totalRecipes = countRecipesResult[0]?.total || 0;
    const totalPagesRecipes = Math.ceil(totalRecipes / limitRecipes);

    const recipes = await query(`
      SELECT id_chinh, ten_ct
      FROM cong_thuc
      ORDER BY id_chinh DESC
      LIMIT ? OFFSET ?
    `, [limitRecipes, offsetRecipes]);

    // ===== LẤY NGUYÊN LIỆU CỦA CÔNG THỨC =====
    const recipeIds = recipes.map(r => r.id_chinh);
    let ingredientRecipes = [];

    if (recipeIds.length > 0) {
      ingredientRecipes = await query(`
        SELECT 
          ctnl.cong_thuc_id,
          nl.ten_nguyen_lieu,
          nl.don_vi,
          ctnl.so_luong,
          ctnl.ghi_chu,
          ct.ten_ct AS ten_cong_thuc
        FROM cong_thuc_nguyen_lieu ctnl
        JOIN nguyen_lieu nl ON ctnl.nguyen_lieu_id = nl.id_chinh
        JOIN cong_thuc ct ON ct.id_chinh = ctnl.cong_thuc_id
        WHERE ctnl.cong_thuc_id IN (?)
        ORDER BY ctnl.cong_thuc_id DESC
      `, [recipeIds]);
    }

    // ===== GỘP NGUYÊN LIỆU THEO CÔNG THỨC =====
    const groupedRecipes = {};
    ingredientRecipes.forEach(row => {
      if (!groupedRecipes[row.cong_thuc_id]) {
        groupedRecipes[row.cong_thuc_id] = {
          ten_cong_thuc: row.ten_cong_thuc,
          nguyen_lieu: []
        };
      }
      groupedRecipes[row.cong_thuc_id].nguyen_lieu.push({
        ten_nguyen_lieu: row.ten_nguyen_lieu,
        so_luong: row.so_luong,
        don_vi: row.don_vi,
        ghi_chu: row.ghi_chu
      });
    });

    // ===== RENDER VIEW =====
    res.render("admin/ingredients", {
      title: "Danh Sách Nguyên Liệu & Công Thức",
      ingredients,
      currentPage: page,
      totalPages,

      recipes,
      groupedRecipes,
      currentPageRecipes: pageRecipes,
      totalPagesRecipes
    });
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu:", err);
    res.status(500).send("Lỗi server: " + err.message);
  }
});

// Thêm nguyên liệu mới (POST)
router.post('/admin/ingredients', async (req, res) => {
    const { ten_nguyen_lieu, don_vi } = req.body;
    try {
        // Kiểm tra xem nguyên liệu đã tồn tại chưa
        const [existing] = await query(
            'SELECT id_chinh FROM nguyen_lieu WHERE ten_nguyen_lieu = ?',
            [ten_nguyen_lieu.trim()]
        );
        if (existing) {
            return res.status(400).json({ message: `Nguyên liệu "${ten_nguyen_lieu.trim()}" đã tồn tại.` });
        }

        // Thêm nguyên liệu mới
        const result = await query(
            'INSERT INTO nguyen_lieu (ten_nguyen_lieu, don_vi) VALUES (?, ?)',
            [ten_nguyen_lieu.trim(), don_vi.trim()]
        );
        res.json({ message: 'Thêm nguyên liệu thành công', id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
});

router.put('/admin/ingredients/:id', async (req, res) => {
    const { id } = req.params;
    const { ten_nguyen_lieu, don_vi } = req.body;
    try {
        // Kiểm tra xem nguyên liệu có tồn tại không
        const [ingredient] = await query(
            'SELECT id_chinh FROM nguyen_lieu WHERE id_chinh = ?',
            [id]
        );
        if (!ingredient) {
            return res.status(404).json({ message: 'Không tìm thấy nguyên liệu' });
        }

        // Kiểm tra xem tên nguyên liệu đã tồn tại chưa (trừ nguyên liệu hiện tại)
        const [existing] = await query(
            'SELECT id_chinh FROM nguyen_lieu WHERE ten_nguyen_lieu = ? AND id_chinh != ?',
            [ten_nguyen_lieu.trim(), id]
        );
        if (existing) {
            return res.status(400).json({ message: `Nguyên liệu "${ten_nguyen_lieu.trim()}" đã tồn tại.` });
        }

        // Cập nhật nguyên liệu
        await query(
            'UPDATE nguyen_lieu SET ten_nguyen_lieu = ?, don_vi = ? WHERE id_chinh = ?',
            [ten_nguyen_lieu.trim(), don_vi.trim(), id]
        );
        res.json({ message: 'Cập nhật nguyên liệu thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
});
// Xóa nguyên liệu (DELETE) - Thêm để hoàn thiện
router.delete('/admin/ingredients/:id', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra xem nguyên liệu có tồn tại không
    const [existingIngredient] = await query(
      'SELECT * FROM nguyen_lieu WHERE id_chinh = ?',
      [id]
    );
    if (!existingIngredient) {
      return res.status(404).json({ message: 'Nguyên liệu không tồn tại.' });
    }

    // Xóa nguyên liệu
    await query('DELETE FROM nguyen_lieu WHERE id_chinh = ?', [id]);

    return res.status(200).json({ message: 'Xóa nguyên liệu thành công!' });
  } catch (err) {
    console.error('Lỗi server:', err);
    return res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
});

// lOẠI MÓN
router.get("/admin/categories", ensureAdmin, async (req, res) => {
  try {
    // Phân trang loại món
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const offset = (page - 1) * limit;

    const countResult = await query(`SELECT COUNT(*) AS total FROM loai_mon`);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const categories = await query(`
      SELECT id_chinh, ten_loai, slug, hinh_anh
      FROM loai_mon
      ORDER BY id_chinh DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    // Lấy công thức theo loại món
    const categoryIds = categories.map(c => c.id_chinh);
    let recipes = [];

    if (categoryIds.length > 0) {
      recipes = await query(`
        SELECT ctl.id_chinh, ct.ten_ct, ctl.loai_mon_id
        FROM cong_thuc_loai_mon ctl
        JOIN cong_thuc ct ON ctl.cong_thuc_id = ct.id_chinh
        WHERE ctl.loai_mon_id IN (?)
        ORDER BY ctl.loai_mon_id DESC, ctl.id_chinh DESC
      `, [categoryIds]);
    }

    // Gộp công thức theo loại món
    const groupedRecipes = {};
    categories.forEach(cat => {
      groupedRecipes[cat.id_chinh] = {
        ten_loai: cat.ten_loai,
        cong_thuc: []
      };
    });

    recipes.forEach(r => {
      if (groupedRecipes[r.loai_mon_id]) {
        groupedRecipes[r.loai_mon_id].cong_thuc.push({
          id_chinh: r.id_chinh,
          ten_ct: r.ten_ct
        });
      }
    });

    // Render view
    res.render("admin/categories", {
      title: "Danh Sách Loại Món & Công Thức",
      categories,
      currentPage: page,
      totalPages,
      groupedRecipes
    });
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu loại món:", err);
    res.status(500).json({ error: "Lỗi server: " + err.message });
  }
});
// Thêm loại món mới (POST /admin/categories)
router.post('/admin/categories', ensureAdmin, upload.single('hinh_anh'), async (req, res) => {
    console.log('POST /admin/categories gọi lúc', new Date().toISOString());
  try {
    const { ten_loai, slug } = req.body;
    if (!ten_loai || !ten_loai.trim()) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ message: 'Tên loại món là bắt buộc!' });
    }

    let imagePath = '';
    if (req.file) {
      // Lưu đường dẫn public cho ảnh
      imagePath = `/uploads/images/${req.file.filename}`;
    }

    const result = await query(
      'INSERT INTO loai_mon (ten_loai, slug, hinh_anh) VALUES (?, ?, ?)',
      [ten_loai.trim(), slug || null, imagePath]
    );

    return res.status(201).json({ message: 'Thêm loại món thành công!', id: result.insertId });
  } catch (error) {
    console.error('Lỗi server:', error);
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    return res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
});





// Route sửa loại món
router.put('/admin/categories/:id', ensureAdmin, upload.fields([{ name: 'hinh_anh', maxCount: 1 }]), async (req, res) => {
    try {
        const { id } = req.params;
        const { ten_loai, slug } = req.body;
        if (!ten_loai || !slug) {
            return res.status(400).json({ message: 'Tên loại món và slug là bắt buộc' });
        }

        // Tạo thư mục lưu file
        const imageDir = path.join(__dirname, '..', 'public', 'Uploads', 'images', 'loaimon', String(id));
        await fs.mkdir(imageDir, { recursive: true });

        // Hàm tạo tên file duy nhất
        const getUniqueFileName = async (dir, filename) => {
            const ext = path.extname(filename);
            const name = path.basename(filename, ext);
            let newName = filename,
                i = 1;
            while (true) {
                try {
                    await fs.access(path.join(dir, newName));
                    newName = `${name}_${i++}${ext}`;
                } catch {
                    return newName;
                }
            }
        };

        // Xử lý file upload
        const processFileUpload = async (type, dir, fileField) => {
            if (!req.files || !req.files[fileField]) return null;
            const file = req.files[fileField][0];
            const uniqueName = await getUniqueFileName(dir, file.originalname);
            await fs.rename(file.path, path.join(dir, uniqueName));
            return `/Uploads/${type}/loaimon/${id}/${uniqueName}`;
        };

        // Xử lý hình ảnh
        const hinh_anh = await processFileUpload('images', imageDir, 'hinh_anh');

        // Cập nhật cơ sở dữ liệu
        const updateFields = hinh_anh
            ? { ten_loai, slug, hinh_anh }
            : { ten_loai, slug };
        const updateQuery = hinh_anh
            ? 'UPDATE loai_mon SET ten_loai = ?, slug = ?, hinh_anh = ? WHERE id_chinh = ?'
            : 'UPDATE loai_mon SET ten_loai = ?, slug = ? WHERE id_chinh = ?';
        const updateValues = hinh_anh
            ? [ten_loai, slug, hinh_anh, id]
            : [ten_loai, slug, id];

        const [result] = await query(updateQuery, updateValues);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Loại món không tồn tại' });
        }

        res.status(200).json({ message: 'Cập nhật loại món thành công' });
    } catch (err) {
        console.error('Lỗi khi cập nhật loại món:', err);
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
});


module.exports = router;
