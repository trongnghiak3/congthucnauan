const express = require("express");
const router = express.Router();
const { query } = require("../config/db");
const { ensureLoggedIn } = require("../middleware/auth");
const multer = require('multer');
const path = require("path");
const fs = require("fs").promises;

// Hàm chuyển buffer sang base64 (chỉ dùng cho avatar, không dùng cho ảnh công thức)
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
 limits: { fileSize: 100 * 1024 * 1024 }, // Tăng lên 100MBB
});


// Route trang chủ
router.get("/", async (req, res) => {
    try {
        const { nguyenLieu } = req.query;
        let params = [];
        let sql = `
            SELECT ct.*, ma.TEN_MON_AN,
                   COALESCE(AVG(dg.DANH_GIA), 0) AS avg_rating
            FROM cong_thuc ct
            JOIN mon_an ma ON ct.ID_CHINH_MA = ma.ID_CHINH_MA
            LEFT JOIN danh_gia dg ON ct.ID_CHINH_CT = dg.ID_CHINH_CT
            WHERE ct.TRANG_THAI_DUYET_ = 'Đã duyệt'
        `;

        if (nguyenLieu && nguyenLieu.trim() !== "") {
            sql += ` AND EXISTS (
                SELECT 1 FROM cong_thuc_nguyen_lieu ctnl
                JOIN nguyen_lieu nl ON ctnl.ID_CHINH_NL = nl.ID_CHINH_NL
                WHERE ctnl.ID_CHINH_CT = ct.ID_CHINH_CT 
                  AND nl.TEN_NL LIKE ?
            )`;
            params.push(`%${nguyenLieu}%`);
        }

        if (nguyenLieu) {
            sql += " GROUP BY ct.ID_CHINH_CT ORDER BY ct.NGAY_TAO_CT DESC";
            const recipes = await query(sql, params);

            recipes.forEach(recipe => {
                const fileName = recipe.HINH_ANH_CT?.split('/').pop();
                recipe.HINH_ANH_CT = fileName
                    ? `/Uploads/images/congthuc/${recipe.ID_CHINH_CT}/${fileName}`
                    : null;
                recipe.DANH_GIA = recipe.avg_rating
                    ? parseFloat(recipe.avg_rating).toFixed(1)
                    : "Chưa có";
            });

            return res.render("index/index_layout", {
                title: "Kết quả tìm kiếm",
                viewPath: "trang-chu",
                categories: [],
                recipesNewest: recipes,
                recipesHot: [],
                recipesLikedRecently: [],
                featuredCategoriesData: [],
                todayRecipe: null,
                user: req.session.user,
                timKiem: nguyenLieu || ""
            });
        }

        // ========== Nếu không có tìm kiếm thì chạy logic trang chủ ==========
        const categories = await query("SELECT * FROM loai_mon");

        const recipesNewest = await query(`
            SELECT ct.*, ma.TEN_MON_AN,
                   COALESCE(AVG(dg.DANH_GIA), 0) as avg_rating
            FROM cong_thuc ct
            JOIN mon_an ma ON ct.ID_CHINH_MA = ma.ID_CHINH_MA
            LEFT JOIN danh_gia dg ON ct.ID_CHINH_CT = dg.ID_CHINH_CT
            WHERE ct.TRANG_THAI_DUYET_ = 'Đã duyệt'
            GROUP BY ct.ID_CHINH_CT
            ORDER BY ct.NGAY_TAO_CT DESC
            LIMIT 8
        `);
        recipesNewest.forEach(r => {
            const fileName = r.HINH_ANH_CT?.split('/').pop();
            r.HINH_ANH_CT = fileName ? `/Uploads/images/congthuc/${r.ID_CHINH_CT}/${fileName}` : null;
            r.DANH_GIA = r.avg_rating ? parseFloat(r.avg_rating).toFixed(1) : "Chưa có";
        });

        const recipesHot = await query(`
            SELECT ct.*, ma.TEN_MON_AN,
                   COALESCE(COUNT(DISTINCT bl.ID_CHINH_BL), 0) as total_comments,
                   COALESCE(COUNT(DISTINCT yt.ID_CHINH_YT), 0) as total_favorites,
                   COALESCE(AVG(dg.DANH_GIA), 0) as avg_rating
            FROM cong_thuc ct
            JOIN mon_an ma ON ct.ID_CHINH_MA = ma.ID_CHINH_MA
            LEFT JOIN binh_luan bl ON ct.ID_CHINH_CT = bl.ID_CHINH_CT
            LEFT JOIN yeu_thich yt ON ct.ID_CHINH_CT = yt.ID_CHINH_CT
            LEFT JOIN danh_gia dg ON ct.ID_CHINH_CT = dg.ID_CHINH_CT
            WHERE ct.TRANG_THAI_DUYET_ = 'Đã duyệt'
            GROUP BY ct.ID_CHINH_CT, ma.TEN_MON_AN
            ORDER BY (
                COALESCE(COUNT(DISTINCT bl.ID_CHINH_BL), 0) * 2 + 
                COALESCE(COUNT(DISTINCT yt.ID_CHINH_YT), 0) +
                COALESCE(AVG(dg.DANH_GIA), 0) * 3
            ) DESC, ct.NGAY_TAO_CT DESC
            LIMIT 6
        `);
        recipesHot.forEach(r => {
            const fileName = r.HINH_ANH_CT?.split('/').pop();
            r.HINH_ANH_CT = fileName ? `/Uploads/images/congthuc/${r.ID_CHINH_CT}/${fileName}` : null;
            r.DANH_GIA = r.avg_rating ? parseFloat(r.avg_rating).toFixed(1) : "Chưa có";
        });

        const recipesLikedRecently = await query(`
            SELECT ct.*, ma.TEN_MON_AN,
                   MAX(yt.NGAY_TAO_YT) AS NGAY_TAO_YT,
                   COALESCE(AVG(dg.DANH_GIA), 0) as avg_rating
            FROM yeu_thich yt
            JOIN cong_thuc ct ON yt.ID_CHINH_CT = ct.ID_CHINH_CT
            JOIN mon_an ma ON ct.ID_CHINH_MA = ma.ID_CHINH_MA
            LEFT JOIN danh_gia dg ON ct.ID_CHINH_CT = dg.ID_CHINH_CT
            WHERE ct.TRANG_THAI_DUYET_ = 'Đã duyệt'
            GROUP BY ct.ID_CHINH_CT, ma.TEN_MON_AN
            ORDER BY NGAY_TAO_YT DESC
            LIMIT 8
        `);
        recipesLikedRecently.forEach(r => {
            const fileName = r.HINH_ANH_CT?.split('/').pop();
            r.HINH_ANH_CT = fileName ? `/Uploads/images/congthuc/${r.ID_CHINH_CT}/${fileName}` : null;
            r.DANH_GIA = r.avg_rating ? parseFloat(r.avg_rating).toFixed(1) : "Chưa có";
        });

        const featuredCategoriesData = [];
        const topCategories = await query("SELECT * FROM loai_mon LIMIT 3");
        for (const cat of topCategories) {
            const recipesInCat = await query(`
                SELECT ct.*, ma.TEN_MON_AN,
                       COALESCE(AVG(dg.DANH_GIA), 0) as avg_rating
                FROM cong_thuc ct
                JOIN mon_an ma ON ct.ID_CHINH_MA = ma.ID_CHINH_MA
                JOIN mon_an_loai_mon malm ON ma.ID_CHINH_MA = malm.ID_CHINH_MA
                LEFT JOIN danh_gia dg ON ct.ID_CHINH_CT = dg.ID_CHINH_CT
                WHERE malm.ID_CHINH_LM = ? AND ct.TRANG_THAI_DUYET_ = 'Đã duyệt'
                GROUP BY ct.ID_CHINH_CT
                ORDER BY ct.NGAY_TAO_CT DESC
                LIMIT 4
            `, [cat.ID_CHINH_LM]);

            recipesInCat.forEach(r => {
                const fileName = r.HINH_ANH_CT?.split('/').pop();
                r.HINH_ANH_CT = fileName ? `/Uploads/images/congthuc/${r.ID_CHINH_CT}/${fileName}` : null;
                r.DANH_GIA = r.avg_rating ? parseFloat(r.avg_rating).toFixed(1) : "Chưa có";
            });

            featuredCategoriesData.push({
                category: cat,
                recipes: recipesInCat
            });
        }

        const todayRecipeRaw = await query(`
            SELECT ct.*, ma.TEN_MON_AN,
                   COALESCE(AVG(dg.DANH_GIA), 0) as avg_rating
            FROM cong_thuc ct
            JOIN mon_an ma ON ct.ID_CHINH_MA = ma.ID_CHINH_MA
            LEFT JOIN danh_gia dg ON ct.ID_CHINH_CT = dg.ID_CHINH_CT
            WHERE ct.TRANG_THAI_DUYET_ = 'Đã duyệt'
            GROUP BY ct.ID_CHINH_CT
            ORDER BY RAND()
            LIMIT 1
        `);

        let todayRecipe = null;
        if (todayRecipeRaw.length > 0) {
            const recipe = todayRecipeRaw[0];
            const fileName = recipe.HINH_ANH_CT?.split('/').pop();
            const image = fileName ? `/Uploads/images/congthuc/${recipe.ID_CHINH_CT}/${fileName}` : null;
            const avgRating = recipe.avg_rating ? parseFloat(recipe.avg_rating).toFixed(1) : "Chưa có";
            todayRecipe = {
                ...recipe,
                HINH_ANH_CT: image,
                DANH_GIA: avgRating
            };
        }

        res.render("index/index_layout", {
            title: "Trang chủ",
            viewPath: "trang-chu",
            categories,
            recipesNewest,
            recipesHot,
            recipesLikedRecently,
            featuredCategoriesData,
            todayRecipe,
            user: req.session.user,
            timKiem: ""
        });

    } catch (err) {
        console.error("Lỗi lấy dữ liệu trang chủ:", err);
        res.status(500).send("Lỗi server trang chủ");
    }
});

router.get("/api/random-recipe", async (req, res) => {
    try {
        const todayRecipeRaw = await query(`
            SELECT ct.*, ma.TEN_MON_AN
            FROM cong_thuc ct
            JOIN mon_an ma ON ct.ID_CHINH_MA = ma.ID_CHINH_MA
            WHERE ct.TRANG_THAI_DUYET_ = 'Đã duyệt'
            ORDER BY RAND()
            LIMIT 1;
        `);
        let todayRecipe = null;
        if (todayRecipeRaw.length > 0) {
            const recipe = todayRecipeRaw[0];
            const fileName = recipe.HINH_ANH_CT?.split('/').pop();
            const image = fileName ? `/Uploads/images/congthuc/${recipe.ID_CHINH_CT}/${fileName}` : null;
            const [ratingRes] = await query("SELECT AVG(DANH_GIA) as avg FROM danh_gia WHERE ID_CHINH_CT = ?", [recipe.ID_CHINH_CT]);
            const avgRating = ratingRes?.avg ? parseFloat(ratingRes.avg).toFixed(1) : "Chưa có";
            todayRecipe = {
                ...recipe,
                HINH_ANH_CT: image,
                DANH_GIA: avgRating,
                MO_TA: recipe.MO_TA || "Thưởng thức món ăn tuyệt vời này với công thức đơn giản và dễ thực hiện!",
                THOI_GIAN: recipe.THOI_GIAN || "30 phút",
                KHOI_LUONG: recipe.KHOI_LUONG || "4 người",
                THOI_GIAN_NAU: recipe.THOI_GIAN_NAU || 30,
                SO_PHAN_AN: recipe.SO_PHAN_AN || recipe.KHOI_LUONG || "4",
                DO_KHO: recipe.DO_KHO || "Dễ",
                SLUG_CT: recipe.SLUG_CT || recipe.ID_CHINH_CT
            };
        }
        res.json(todayRecipe);
    } catch (err) {
        console.error("Lỗi lấy công thức ngẫu nhiên:", err);
        res.status(500).json({ error: "Lỗi server" });
    }
});
router.get("/gioi-thieu", async (req, res) => {
    try {
        // Nếu user là admin thì redirect về trang admin
        if (req.session.user && req.session.user.role === 1) {
            return res.redirect("/admin");
        }

        // Render trang giới thiệu cho người dùng thường
        res.render("index/index_layout", {
            title: "Giới thiệu",
            viewPath: "gioi-thieu",  // Tên file .ejs trong views/index/gioi-thieu.ejs
            user: req.session.user
        });
    } catch (err) {
        console.error("Lỗi khi truy cập trang giới thiệu:", err);
        res.status(500).send("Lỗi server");
    }
});
router.get("/lien-he", async (req, res) => {
  try {
    // Nếu user là admin thì redirect về trang admin
    if (req.session.user && req.session.user.role === 1) {
      return res.redirect("/admin");
    }

    // Render trang liên hệ cho người dùng thường
    res.render("index/index_layout", {
      title: "Liên hệ",
      viewPath: "lien-he", // => views/index/lien-he.ejs
      user: req.session.user,
      success: null,
      error: null
    });

  } catch (err) {
    console.error("Lỗi khi truy cập trang liên hệ:", err);
    res.status(500).send("Lỗi server");
  }
});

// Route danh sách món ăn
router.get("/mon-an", async (req, res) => { // Giữ nguyên đường dẫn để khớp với form EJS
    try {
        // Lấy bộ lọc timKiem và loaiMon từ query string
        const { timKiem = "", loaiMon = "" } = req.query; // Bỏ sapXep và chuCai nếu không dùng
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const offset = (page - 1) * limit;

        // Câu truy vấn để đếm tổng số món ăn (dùng cho phân trang)
        let countSql = `
            SELECT COUNT(DISTINCT mon_an.ID_CHINH_MA) AS total
            FROM mon_an
            LEFT JOIN mon_an_loai_mon ON mon_an.ID_CHINH_MA = mon_an_loai_mon.ID_CHINH_MA
            LEFT JOIN loai_mon ON mon_an_loai_mon.ID_CHINH_LM = loai_mon.ID_CHINH_LM
        `;

        // Câu truy vấn chính để lấy danh sách món ăn
        let sql = `
            SELECT mon_an.*, GROUP_CONCAT(loai_mon.TEN_LM) as DANH_MUC
            FROM mon_an
            LEFT JOIN mon_an_loai_mon ON mon_an.ID_CHINH_MA = mon_an_loai_mon.ID_CHINH_MA
            LEFT JOIN loai_mon ON mon_an_loai_mon.ID_CHINH_LM = loai_mon.ID_CHINH_LM
        `;

        const params = []; // Tham số cho câu truy vấn chính
        const countParams = []; // Tham số cho câu truy vấn đếm
        const conditions = []; // Mảng chứa các điều kiện WHERE

        // --- Xây dựng điều kiện WHERE dựa trên các bộ lọc ---

        // Lọc theo từ khóa tìm kiếm
        if (timKiem) {
            conditions.push("(mon_an.TEN_MON_AN LIKE ? OR mon_an.MO_TA_MA LIKE ?)"); // Tìm kiếm theo tên món hoặc mô tả
            params.push(`%${timKiem}%`, `%${timKiem}%`);
            countParams.push(`%${timKiem}%`, `%${timKiem}%`);
        }

        // Lọc theo loại món
        if (loaiMon) {
            conditions.push("loai_mon.SLUG_LM = ?");
            params.push(loaiMon);
            countParams.push(loaiMon);
        }

        // Nối các điều kiện WHERE vào câu truy vấn nếu có
        if (conditions.length > 0) {
            const whereClause = " WHERE " + conditions.join(" AND ");
            sql += whereClause;
            countSql += whereClause;
        }

        // Nhóm kết quả theo ID món ăn để tránh trùng lặp khi JOIN với loại món
        sql += " GROUP BY mon_an.ID_CHINH_MA";

        // Thêm sắp xếp mặc định (ví dụ theo ID hoặc tên món ăn)
        // Bảng mon_an không có NGAY_TAO, nên chúng ta sẽ sắp xếp mặc định theo ID
        sql += " ORDER BY mon_an.ID_CHINH_MA DESC"; // Sắp xếp theo ID giảm dần (món mới hơn có ID cao hơn)

        // Thêm LIMIT và OFFSET cho phân trang
        sql += " LIMIT ? OFFSET ?";
        params.push(limit, offset);

        // Thực hiện đồng thời các truy vấn: danh sách món ăn, tổng số món, và danh mục
        const [monAnList, countResult, categories] = await Promise.all([
            query(sql, params),
            query(countSql, countParams),
            query("SELECT * FROM loai_mon") // Lấy danh sách tất cả các loại món
        ]);

        const total = countResult[0]?.total || 0;
        const totalPages = Math.ceil(total / limit);

        // Xử lý đường dẫn hình ảnh cho danh sách món ăn
        const monAnListProcessed = monAnList.map(mon => {
            const fileName = mon.HINH_ANH_MA ? mon.HINH_ANH_MA.split('/').pop() : null;
            return {
                ...mon,
                HINH_ANH_MA: fileName ? `/Uploads/images/monan/${mon.ID_CHINH_MA}/${fileName}` : null
            };
        });

        // Phần gợi ý món ăn hôm nay (giữ nguyên hoặc điều chỉnh tùy ý)
        const todaySuggestion = monAnListProcessed.length > 0
            ? monAnListProcessed[Math.floor(Math.random() * monAnListProcessed.length)]
            : null;

        // Render trang với dữ liệu đã được xử lý và các bộ lọc hiện tại
        res.render("index/index_layout", {
            viewPath: "mon-an",
            monAnList: monAnListProcessed,
            categories,
            filters: { timKiem, loaiMon }, // Chỉ truyền các bộ lọc thực sự dùng
            pagination: { currentPage: page, totalPages },
            user: req.session.user,
            todaySuggestion
        });
    } catch (err) {
        console.error("Lỗi khi lấy danh sách món ăn:", err);
        res.status(500).send("Đã xảy ra lỗi khi truy vấn dữ liệu.");
    }
});

router.get("/danh-muc", async (req, res) => {
    try {
        const perPage = 12; // Số danh mục tối đa cho mỗi trang
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || "";

        let whereClause = "";
        let params = [];

        // Nếu có từ khóa tìm kiếm
        if (search.trim() !== "") {
            whereClause = "WHERE TEN_LM LIKE ?";
            params.push(`%${search}%`);
        }

        // Lấy tổng số danh mục để tính tổng số trang
        const countQuery = `SELECT COUNT(*) AS total FROM loai_mon ${whereClause}`;
        const countResult = await query(countQuery, params);
        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / perPage);

        // Lấy dữ liệu trang hiện tại
        const offset = (page - 1) * perPage;
        const dataQuery = `
            SELECT * FROM loai_mon
            ${whereClause}
            ORDER BY TEN_LM ASC
            LIMIT ? OFFSET ?
        `;
        const categories = await query(dataQuery, [...params, perPage, offset]);

        res.render("index/index_layout", {
            viewPath: "danh-muc",
            categories,
            currentPage: page,
            totalPages,
            search,
            user: req.session.user
        });
    } catch (err) {
        console.error("Lỗi lấy danh mục:", err);
        res.status(500).send("Lỗi server");
    }
});

router.get("/danh-muc/:slug", async (req, res) => {
  const { slug } = req.params;

  const [category] = await query("SELECT * FROM loai_mon WHERE SLUG_LM = ?", [slug]);
  if (!category) return res.status(404).render("404");

  const monAnList = await query(`
    SELECT mon_an.*
    FROM mon_an
    JOIN mon_an_loai_mon ON mon_an.ID_CHINH_MA = mon_an_loai_mon.ID_CHINH_MA
    WHERE mon_an_loai_mon.ID_CHINH_LM = ?
  `, [category.ID_CHINH_LM]);

  res.render("index/index_layout", {
    viewPath: "danh-muc-chi-tiet", // ví dụ views/index/danh-muc-chi-tiet.ejs
    category,
    monAnList,
    user: req.session.user
  });
});


router.get("/cong-thuc", async (req, res) => { // Giả sử query đã được import
    try {
        const {
            loaiMon = "",
            nguyenLieu = "",
            thoiGian = "",
            doKho = "",
            monAnId = "",
            timKiem = "",
            sapXep = "mac-dinh",
            trang = 1,
            soPhan = "" // Thêm biến soPhan vào đây
        } = req.query;

        const filters = { loaiMon, nguyenLieu, thoiGian, doKho, monAnId, timKiem, sapXep, trang, soPhan }; // Cập nhật filters
        const gioiHan = 12;
        const boQua = (parseInt(trang) - 1) * gioiHan;

        let baseSql = `
            SELECT
                cong_thuc.*,
                mon_an.TEN_MON_AN,
                GROUP_CONCAT(DISTINCT loai_mon.ID_CHINH_LM) as loai_mon_ids,
                GROUP_CONCAT(DISTINCT CONCAT(nd.TEN_NGUOI_DUNG, ':', cx.LOAI_CAM_XUC_BL)) as reaction_users_raw,
                GROUP_CONCAT(DISTINCT cx.LOAI_CAM_XUC_BL) as reaction_types_raw,
                COUNT(DISTINCT cx.ID_CHINH_CXBL) as total_reactions
            FROM cong_thuc
            LEFT JOIN mon_an ON cong_thuc.ID_CHINH_MA = mon_an.ID_CHINH_MA
            LEFT JOIN mon_an_loai_mon ON mon_an.ID_CHINH_MA = mon_an_loai_mon.ID_CHINH_MA
            LEFT JOIN loai_mon ON mon_an_loai_mon.ID_CHINH_LM = loai_mon.ID_CHINH_LM
            LEFT JOIN cong_thuc_nguyen_lieu ON cong_thuc.ID_CHINH_CT = cong_thuc_nguyen_lieu.ID_CHINH_CT
            LEFT JOIN nguyen_lieu ON cong_thuc_nguyen_lieu.ID_CHINH_NL = nguyen_lieu.ID_CHINH_NL
            LEFT JOIN binh_luan bl ON cong_thuc.ID_CHINH_CT = bl.ID_CHINH_CT
            LEFT JOIN binh_luan_cam_xuc cx ON bl.ID_CHINH_BL = cx.ID_CHINH_BL
            LEFT JOIN nguoi_dung nd ON cx.ID_CHINH_ND = nd.ID_CHINH_ND
            WHERE cong_thuc.TRANG_THAI_DUYET_ = 'Đã duyệt'
        `;

        const conditions = [];
        const params = [];

        if (loaiMon) {
            conditions.push("loai_mon.ID_CHINH_LM = ?");
            params.push(loaiMon);
        }
        if (nguyenLieu) {
            conditions.push("nguyen_lieu.TEN_NL LIKE ?");
            params.push(`%${nguyenLieu}%`);
        }
        if (thoiGian === "duoi-30") {
            conditions.push("cong_thuc.THOI_GIAN_NAU <= ?");
            params.push(30);
        } else if (thoiGian === "30-60") {
            conditions.push("cong_thuc.THOI_GIAN_NAU BETWEEN ? AND ?");
            params.push(30, 60);
        } else if (thoiGian === "tren-60") {
            conditions.push("cong_thuc.THOI_GIAN_NAU > ?");
            params.push(60);
        }

        if (doKho) {
            let doKhoValue;
            switch(doKho) {
                case 'de': doKhoValue = 'Dễ'; break;
                case 'trung-binh': doKhoValue = 'Trung bình'; break;
                case 'kho': doKhoValue = 'Khó'; break;
                default: doKhoValue = doKho;
            }
            conditions.push("cong_thuc.DO_KHO = ?");
            params.push(doKhoValue);
        }
        if (monAnId) {
            conditions.push("mon_an.ID_CHINH_MA = ?");
            params.push(monAnId);
        }
            if (timKiem) {
        conditions.push(`(
            cong_thuc.TEN_CT LIKE ?
            OR mon_an.TEN_MON_AN LIKE ?
            OR nguyen_lieu.TEN_NL LIKE ?
        )`);
        params.push(`%${timKiem}%`, `%${timKiem}%`, `%${timKiem}%`);
    }


        // === THAY ĐỔI LỚN TẠI ĐÂY CHO LỌC SỐ PHẦN ĂN ===
        if (soPhan) {
            switch(soPhan) {
                case "1-2":
                    conditions.push("cong_thuc.SO_PHAN_AN BETWEEN 1 AND 2");
                    break;
                case "3-4":
                    conditions.push("cong_thuc.SO_PHAN_AN BETWEEN 3 AND 4");
                    break;
                case "5+":
                    conditions.push("cong_thuc.SO_PHAN_AN >= 5");
                    break;
                // Nếu có các trường hợp khác, thêm vào đây
            }
        }
        // ===============================================

        if (conditions.length > 0) {
            baseSql += " AND " + conditions.join(" AND ");
        }

        baseSql += " GROUP BY cong_thuc.ID_CHINH_CT";

        if (sapXep === "thoi-gian-tang-dan") {
            baseSql += " ORDER BY cong_thuc.THOI_GIAN_NAU ASC";
        } else if (sapXep === "thoi-gian-giam-dan") {
            baseSql += " ORDER BY cong_thuc.THOI_GIAN_NAU DESC";
        } else if (sapXep === "danh-gia-cao-nhat") {
            baseSql += " ORDER BY (SELECT AVG(DANH_GIA) FROM danh_gia WHERE ID_CHINH_CT = cong_thuc.ID_CHINH_CT) DESC";
        } else {
            baseSql += " ORDER BY cong_thuc.NGAY_TAO_CT DESC";
        }

        baseSql += ` LIMIT ${gioiHan} OFFSET ${boQua}`;

        let recipes = await query(baseSql, params);
        const categories = await query("SELECT * FROM loai_mon");

        recipes = await Promise.all(recipes.map(async recipe => {
            const fileName = recipe.HINH_ANH_CT?.split('/').pop();
            const image = fileName ? `/Uploads/images/congthuc/${recipe.ID_CHINH_CT}/${fileName}` : null;

            const [ratingRes] = await query("SELECT AVG(DANH_GIA) as avg FROM danh_gia WHERE ID_CHINH_CT = ?", [recipe.ID_CHINH_CT]);
            const avgRating = ratingRes?.avg ? parseFloat(ratingRes.avg).toFixed(1) : "Chưa có";

            const reactions = {};
            const reactionUsers = [];

            if (recipe.reaction_types_raw && recipe.reaction_users_raw) {
                const usersRaw = recipe.reaction_users_raw.split(',');
                const types = recipe.reaction_types_raw.split(',');

                types.forEach(type => {
                    reactions[type] = usersRaw.filter(u => u.includes(`:${type}`)).length;
                });

                usersRaw.forEach(entry => {
                    const [name, type] = entry.split(':');
                    if (name && type) reactionUsers.push({ TEN_NGUOI_DUNG: name, LOAI_CAM_XUC_BL: type });
                });
            }

            return {
                ...recipe,
                HINH_ANH_CT: image,
                DANH_GIA: avgRating,
                SO_PHAN_AN: recipe.SO_PHAN_AN || "2-4", // Giá trị hiển thị mặc định nếu null
                THOI_GIAN_NAU: recipe.THOI_GIAN_NAU || 30,
                DO_KHO: recipe.DO_KHO || "Dễ",
                reactions,
                reaction_users: reactionUsers
            };
        }));

        if (req.session.user) {
            const userId = req.session.user.ID_CHINH_ND;
            const favorites = await query("SELECT ID_CHINH_CT FROM yeu_thich WHERE ID_CHINH_ND = ?", [userId]);
            const liked = new Set(favorites.map(f => f.ID_CHINH_CT));
            recipes = recipes.map(r => ({ ...r, isFavorite: liked.has(r.ID_CHINH_CT) }));
        }

        const countSql = `
            SELECT COUNT(DISTINCT cong_thuc.ID_CHINH_CT) as total
            FROM cong_thuc
            LEFT JOIN mon_an ON cong_thuc.ID_CHINH_MA = mon_an.ID_CHINH_MA
            LEFT JOIN mon_an_loai_mon ON mon_an.ID_CHINH_MA = mon_an_loai_mon.ID_CHINH_MA
            LEFT JOIN loai_mon ON mon_an_loai_mon.ID_CHINH_LM = loai_mon.ID_CHINH_LM
            LEFT JOIN cong_thuc_nguyen_lieu ON cong_thuc.ID_CHINH_CT = cong_thuc_nguyen_lieu.ID_CHINH_CT
            LEFT JOIN nguyen_lieu ON cong_thuc_nguyen_lieu.ID_CHINH_NL = nguyen_lieu.ID_CHINH_NL
            WHERE cong_thuc.TRANG_THAI_DUYET_ = 'Đã duyệt'
            ${conditions.length > 0 ? " AND " + conditions.join(" AND ") : ""}
        `;
        const [countResult] = await query(countSql, params);
        const totalRecipes = countResult.total;

        console.log("⛳ BỘ LỌC:", filters);
        res.render("index/index_layout", {
            viewPath: "cong-thuc",
            recipes,
            categories,
            monAn: null,
            filters,
            user: req.session.user,
            hasMore: totalRecipes > trang * gioiHan
        });

    } catch (err) {
        console.error("Lỗi truy vấn công thức:", err);
        res.status(500).send("Lỗi server");
    }
});




// Route GET /cong-thuc/:id
router.get("/cong-thuc/:id", async (req, res) => {
    const recipeId = req.params.id;

    // 1. Kiểm tra ID công thức hợp lệ
    if (!recipeId || isNaN(recipeId)) {
        return res.status(400).send("ID công thức không hợp lệ");
    }

    try {
        // 2. Lấy chi tiết công thức
        const recipeResult = await query(
            `
            SELECT cong_thuc.*,
                   nguoi_dung.TEN_NGUOI_DUNG AS tac_gia,
                   nguoi_dung.AVARTAR_URL AS avatar_tac_gia,
                   nguoi_dung.ID_CHINH_ND,
                   nguoi_dung.VAI_TRO      -- <--- THÊM CỘT VAI_TRO VÀO ĐÂY
            FROM cong_thuc
            LEFT JOIN nguoi_dung ON cong_thuc.ID_CHINH_ND = nguoi_dung.ID_CHINH_ND
            WHERE cong_thuc.ID_CHINH_CT = ? AND cong_thuc.TRANG_THAI_DUYET_ = 'Đã duyệt'
            `,
            [recipeId]
        );

        if (!recipeResult.length) {
            return res.status(404).send("Không tìm thấy công thức");
        }

        // Xử lý dữ liệu công thức, bao gồm đường dẫn hình ảnh và thông tin mặc định
        const recipe = {
            ...recipeResult[0],
            // Xử lý hình ảnh chính của công thức
            HINH_ANH_CT: recipeResult[0].HINH_ANH_CT
                ? `/Uploads/images/congthuc/${recipeId}/${recipeResult[0].HINH_ANH_CT.split("/").pop()}`
                : null,
            // Xử lý avatar của tác giả công thức
            // Xử lý avatar của tác giả công thức (SỬA ĐOẠN NÀY)
            avatar_tac_gia: recipeResult[0].avatar_tac_gia
                ? recipeResult[0].avatar_tac_gia // Sử dụng trực tiếp đường dẫn từ DB
                : "/Uploads/default-avatar.png",
            THOI_GIAN_NAU: recipeResult[0].THOI_GIAN_NAU || 30,
            SO_PHAN_AN: recipeResult[0].SO_PHAN_AN || "2-4",
            DO_KHO: recipeResult[0].DO_KHO || "Dễ"
        };

        // --- CẬP NHẬT LOGIC XÁC ĐỊNH ADMIN DỰA TRÊN VAI_TRO ---
        const isAdmin = (recipeResult[0].VAI_TRO === 'admin'); // Sử dụng cột VAI_TRO
        recipe.tac_gia_hien_thi = isAdmin ? "Quản trị viên" : recipe.tac_gia;
        recipe.avatar_tac_gia_hien_thi = recipe.avatar_tac_gia;
        // --- KẾT THÚC CẬP NHẬT LOGIC ---

        // (Các phần còn lại của mã nguồn vẫn giữ nguyên)

        // 3. Lấy nguyên liệu
        const ingredients = await query(
            `
            SELECT nguyen_lieu.TEN_NL, cong_thuc_nguyen_lieu.SO_LUONG, nguyen_lieu.DON_VI, cong_thuc_nguyen_lieu.GHI_CHU
            FROM cong_thuc_nguyen_lieu
            JOIN nguyen_lieu ON cong_thuc_nguyen_lieu.ID_CHINH_NL = nguyen_lieu.ID_CHINH_NL
            WHERE cong_thuc_nguyen_lieu.ID_CHINH_CT = ?
            `,
            [recipeId]
        );

        // 4. Lấy danh mục
        const categories = await query(
            `
            SELECT loai_mon.TEN_LM
            FROM mon_an
            JOIN mon_an_loai_mon ON mon_an.ID_CHINH_MA = mon_an_loai_mon.ID_CHINH_MA
            JOIN loai_mon ON mon_an_loai_mon.ID_CHINH_LM = loai_mon.ID_CHINH_LM
            WHERE mon_an.ID_CHINH_MA = ?
            `,
            [recipe.ID_CHINH_MA]
        );

        // 5. Lấy bình luận và cảm xúc
        const comments = await query(
            `
            SELECT binh_luan.ID_CHINH_BL, binh_luan.NOI_DUNG_BL, binh_luan.NGAY_TAO_BL,
                   nguoi_dung.TEN_NGUOI_DUNG, nguoi_dung.AVARTAR_URL, nguoi_dung.ID_CHINH_ND,
                   GROUP_CONCAT(DISTINCT cx.LOAI_CAM_XUC_BL) as reaction_types,
                   COUNT(DISTINCT cx.ID_CHINH_CXBL) as total_reactions,
                   GROUP_CONCAT(DISTINCT CONCAT(nd2.TEN_NGUOI_DUNG, ':', cx.LOAI_CAM_XUC_BL)) as reaction_users
            FROM binh_luan
            JOIN nguoi_dung ON binh_luan.ID_CHINH_ND = nguoi_dung.ID_CHINH_ND
            LEFT JOIN binh_luan_cam_xuc cx ON binh_luan.ID_CHINH_BL = cx.ID_CHINH_BL
            LEFT JOIN nguoi_dung nd2 ON cx.ID_CHINH_ND = nd2.ID_CHINH_ND
            WHERE binh_luan.ID_CHINH_CT = ?
            GROUP BY binh_luan.ID_CHINH_BL
            ORDER BY binh_luan.NGAY_TAO_BL DESC
            `,
            [recipeId]
        );

        // 6. Lấy đánh giá của người dùng
        const userRatings = await query(
            `
            SELECT dg.DANH_GIA, dg.NOI_DUNG_DG, dg.NGAY_TAO_DG,
                   nd.TEN_NGUOI_DUNG, nd.AVARTAR_URL, nd.ID_CHINH_ND
            FROM danh_gia dg
            JOIN nguoi_dung nd ON dg.ID_CHINH_ND = nd.ID_CHINH_ND
            WHERE dg.ID_CHINH_CT = ?
            ORDER BY dg.NGAY_TAO_DG DESC
            `,
            [recipeId]
        );

        // Xử lý ảnh đại diện cho các đánh giá người dùng
        const processedUserRatings = userRatings.map(rating => ({
            ...rating,
            AVARTAR_URL: rating.AVARTAR_URL
                ? `/Uploads/images/nguoidung/${rating.ID_CHINH_ND}/${rating.AVARTAR_URL.split('/').pop()}`
                : "/Uploads/default-avatar.png"
        }));

        // 7. Lấy phản hồi và cảm xúc cho từng bình luận (trong vòng lặp Promise.all)
        const commentsWithReplies = await Promise.all(comments.map(async comment => {
                const replies = await query(
                    `
                    SELECT phan_hoi_binh_luan.ID_CHINH_PHBL, phan_hoi_binh_luan.NOI_DUNG_PH, phan_hoi_binh_luan.NGAY_TAO_PH,
                           phan_hoi_binh_luan.ID_CHINH_PHBL_CHA, nguoi_dung.TEN_NGUOI_DUNG, nguoi_dung.AVARTAR_URL, nguoi_dung.ID_CHINH_ND,
                           GROUP_CONCAT(DISTINCT cx.LOAI_CAM_XUC) as reaction_types,
                           COUNT(DISTINCT cx.ID_CHINH_PHCX) as total_reactions,
                           GROUP_CONCAT(DISTINCT CONCAT(nd2.TEN_NGUOI_DUNG, ':', cx.LOAI_CAM_XUC)) as reaction_users
                    FROM phan_hoi_binh_luan
                    JOIN nguoi_dung ON phan_hoi_binh_luan.ID_CHINH_ND = nguoi_dung.ID_CHINH_ND
                    LEFT JOIN phan_hoi_cam_xuc cx ON phan_hoi_binh_luan.ID_CHINH_PHBL = cx.ID_CHINH_PHBL
                    LEFT JOIN nguoi_dung nd2 ON cx.ID_CHINH_ND = nd2.ID_CHINH_ND
                    WHERE phan_hoi_binh_luan.ID_CHINH_BL = ?
                    GROUP BY phan_hoi_binh_luan.ID_CHINH_PHBL
                    ORDER BY phan_hoi_binh_luan.NGAY_TAO_PH DESC
                    `,
                    [comment.ID_CHINH_BL]
                );

                // Xử lý cảm xúc cho bình luận chính
                const commentReactionsCount = {};
                const commentReactionUsersList = [];

                if (comment.reaction_types != null) {
                    const safeReactionTypes = String(comment.reaction_types);
                    if (safeReactionTypes) {
                        safeReactionTypes.split(',').forEach(emo => {
                            const safeCommentReactionUsers = comment.reaction_users != null ? String(comment.reaction_users) : '';
                            const usersForThisReaction = safeCommentReactionUsers
                                ? safeCommentReactionUsers.split(',').filter(u => u.includes(`:${emo}`)).length
                                : 0;
                            commentReactionsCount[emo] = usersForThisReaction;
                        });
                    }
                }
                if (comment.reaction_users != null) {
                    const safeCommentReactionUsersList = String(comment.reaction_users);
                    if (safeCommentReactionUsersList) {
                        safeCommentReactionUsersList.split(',').forEach(item => {
                            const [name, emo] = item.split(':');
                            if (name && emo) {
                                commentReactionUsersList.push({ TEN_NGUOI_DUNG: name, LOAI_CAM_XUC_BL: emo });
                            }
                        });
                    }
                }

                // Xử lý phản hồi và cảm xúc của phản hồi
                const replyMap = {};
                replies.forEach(reply => {
                    const processedReply = {
                        ...reply,
                        AVARTAR_URL: reply.AVARTAR_URL
                            ? `/Uploads/images/nguoidung/${reply.ID_CHINH_ND}/${reply.AVARTAR_URL.split('/').pop()}`
                            : "/Uploads/default-avatar.png",
                        reactions: {},
                        reaction_users_list: [],
                        child_replies: []
                    };

                    if (reply.reaction_types != null) {
                        const safeReplyReactionTypes = String(reply.reaction_types);
                        if (safeReplyReactionTypes) {
                            safeReplyReactionTypes.split(',').forEach(emo => {
                                const safeReplyReactionUsers = reply.reaction_users != null ? String(reply.reaction_users) : '';
                                const usersForThisReaction = safeReplyReactionUsers
                                    ? safeReplyReactionUsers.split(',').filter(u => u.includes(`:${emo}`)).length
                                    : 0;
                                processedReply.reactions[emo] = usersForThisReaction;
                            });
                        }
                    }

                    if (reply.reaction_users != null) {
                        const safeReplyReactionUsersList = String(reply.reaction_users);
                        if (safeReplyReactionUsersList) {
                            const tempReactionUsers = safeReplyReactionUsersList.split(',');
                            tempReactionUsers.forEach(item => {
                                const [name, emo] = item.split(':');
                                if (name && emo) {
                                    processedReply.reaction_users_list.push({ TEN_NGUOI_DUNG: name, LOAI_CAM_XUC: emo });
                                }
                            });
                        }
                    }

                    replyMap[reply.ID_CHINH_PHBL] = processedReply;
                });

                // Xây dựng cây phản hồi
                const buildReplyTree = (replies, parentId = null) => {
                    return replies
                        .filter(r => r.ID_CHINH_PHBL_CHA === parentId)
                        .map(r => ({
                            ...replyMap[r.ID_CHINH_PHBL],
                            child_replies: buildReplyTree(replies, r.ID_CHINH_PHBL)
                        }));
                };

                return {
                    ...comment,
                    AVARTAR_URL: comment.AVARTAR_URL ? `/Uploads/images/nguoidung/${comment.ID_CHINH_ND}/${comment.AVARTAR_URL.split('/').pop()}` : "/Uploads/default-avatar.png",
                    reactions: commentReactionsCount,
                    reaction_users: commentReactionUsersList,
                    replies: buildReplyTree(replies)
                };
            }));

        // 8. Lấy số lượt yêu thích
        const likes = await query(
            "SELECT COUNT(*) AS total_likes FROM yeu_thich WHERE ID_CHINH_CT = ?",
            [recipeId]
        );

        // 9. Lấy đánh giá trung bình
        const ratings = await query(
            "SELECT AVG(DANH_GIA) AS avg_rating, COUNT(*) AS total_ratings FROM danh_gia WHERE ID_CHINH_CT = ?",
            [recipeId]
        );
        let userRating = null;
        if (req.session.user) {
            const alreadyRated = await query(
                "SELECT * FROM danh_gia WHERE ID_CHINH_CT = ? AND ID_CHINH_ND = ?",
                [recipeId, req.session.user.ID_CHINH_ND]
            );
            userRating = alreadyRated.length > 0 ? alreadyRated[0] : null;
        }

        // 10. Kiểm tra yêu thích của người dùng hiện tại
        let isFavorite = false;
        if (req.session.user) {
            const favorite = await query(
                "SELECT * FROM yeu_thich WHERE ID_CHINH_CT = ? AND ID_CHINH_ND = ?",
                [recipeId, req.session.user.ID_CHINH_ND]
            );
            isFavorite = favorite.length > 0;
        }

        // 11. Lấy công thức tương tự
        const similarRecipes = await query(
            `
         SELECT DISTINCT
    cong_thuc.ID_CHINH_CT,
    cong_thuc.TEN_CT,
    cong_thuc.HINH_ANH_CT,
    cong_thuc.THOI_GIAN_NAU,
    cong_thuc.DO_KHO,
    mon_an.TEN_MON_AN,
    (
        SELECT AVG(DANH_GIA)
        FROM danh_gia
        WHERE danh_gia.ID_CHINH_CT = cong_thuc.ID_CHINH_CT
    ) AS DANH_GIA,
    GROUP_CONCAT(DISTINCT loai_mon.TEN_LM) AS categories
FROM cong_thuc
JOIN mon_an ON cong_thuc.ID_CHINH_MA = mon_an.ID_CHINH_MA
JOIN mon_an_loai_mon ON mon_an.ID_CHINH_MA = mon_an_loai_mon.ID_CHINH_MA
JOIN loai_mon ON mon_an_loai_mon.ID_CHINH_LM = loai_mon.ID_CHINH_LM
WHERE cong_thuc.TRANG_THAI_DUYET_ = 'Đã duyệt'
AND cong_thuc.ID_CHINH_CT != ?
AND (
    loai_mon.ID_CHINH_LM IN (
        SELECT ID_CHINH_LM
        FROM mon_an_loai_mon
        WHERE ID_CHINH_MA = ?
    )
    OR mon_an.ID_CHINH_MA = ?
)
GROUP BY cong_thuc.ID_CHINH_CT
ORDER BY RAND()
LIMIT 4
            `,
            [recipeId, recipe.ID_CHINH_MA, recipe.ID_CHINH_MA]
        );

        // Xử lý hình ảnh cho công thức tương tự
        const processedSimilarRecipes = similarRecipes.map(similarRecipe => {
            const fileName = similarRecipe.HINH_ANH_CT ? similarRecipe.HINH_ANH_CT.split("/").pop() : null;
            return {
                ...similarRecipe,
                HINH_ANH_CT: fileName ? `/Uploads/images/congthuc/${similarRecipe.ID_CHINH_CT}/${fileName}` : null,
                categories: similarRecipe.categories ? similarRecipe.categories.split(',') : []
            };
        });

        // 12. Render trang và truyền dữ liệu
        res.render("index/index_layout", {
            viewPath: "cong-thuc-chi-tiet",
            recipe: { ...recipe, isFavorite }, // Đảm bảo truyền 'recipe' đã được xử lý
            ingredients,
            categories,
            comments: commentsWithReplies,
            likes: likes[0].total_likes,
            ratings: {
                average: ratings[0].avg_rating ? parseFloat(ratings[0].avg_rating).toFixed(1) : "Chưa có",
                total: ratings[0].total_ratings
            },
            user: req.session.user,
            similarRecipes: processedSimilarRecipes,
            processedUserRatings,
            userRatings,
            userRating,
            session: req.session
        });
    } catch (err) {
        console.error("Lỗi truy vấn chi tiết công thức:", err);
        res.status(500).send("Lỗi server");
    }
});




// Route POST /cong-thuc/:id/yeu-thich
router.post("/cong-thuc/:id/yeu-thich", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send("Vui lòng đăng nhập để yêu thích");
    }

    const recipeId = req.params.id;
    const userId = req.session.user.ID_CHINH_ND;

    if (!recipeId || isNaN(recipeId)) {
        return res.status(400).send("ID công thức không hợp lệ");
    }

    try {
        const existing = await query(
            "SELECT * FROM yeu_thich WHERE ID_CHINH_CT = ? AND ID_CHINH_ND = ?",
            [recipeId, userId]
        );

        // Biến này sẽ giữ trạng thái liệu có cần gửi thông báo hay không
        // Chỉ gửi thông báo khi người dùng thêm công thức vào mục yêu thích
        let shouldSendNotification = false; 

        if (existing.length) {
            // Nếu đã yêu thích, bỏ yêu thích
            await query(
                "DELETE FROM yeu_thich WHERE ID_CHINH_CT = ? AND ID_CHINH_ND = ?",
                [recipeId, userId]
            );
            // Không cần gửi thông báo khi bỏ yêu thích
        } else {
            // Nếu chưa yêu thích, thêm yêu thích
            await query(
                "INSERT INTO yeu_thich (ID_CHINH_CT, ID_CHINH_ND, NGAY_TAO_YT) VALUES (?, ?, CURDATE())",
                [recipeId, userId]
            );
            shouldSendNotification = true; // Đặt cờ để gửi thông báo
        }

        // --- Bắt đầu phần thông báo (chỉ khi thêm yêu thích) ---
        if (shouldSendNotification) {
            const [nguoiDung] = await query("SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = ?", [userId]);
            const tenNguoiDung = nguoiDung?.TEN_NGUOI_DUNG || "Người dùng";

            const [congThuc] = await query("SELECT TEN_CT, ID_CHINH_ND FROM cong_thuc WHERE ID_CHINH_CT = ?", [recipeId]);
            const tenCongThuc = congThuc?.TEN_CT || "một công thức";
            const chuCongThucId = congThuc?.ID_CHINH_ND; // ID của người đăng công thức

            // Chỉ gửi thông báo đến chủ công thức nếu họ không phải là người đang thực hiện hành động
            if (chuCongThucId && chuCongThucId !== userId) {
                await query(
                    `INSERT INTO THONG_BAO (LOAI_TB, NOI_DUNG_TB, ID_MUC_TIEU, ID_CHINH_ND, DA_DOC, DA_XOA, NGAY_TAO_TB)
                    VALUES (?, ?, ?, ?, FALSE, FALSE, NOW())`,
                    ['yeu_thich', `${tenNguoiDung} đã yêu thích công thức "${tenCongThuc}" của bạn.`, chuCongThucId, userId]
                );
            }
        }
        // --- Kết thúc phần thông báo ---

        res.redirect(`/cong-thuc/${recipeId}`);
    } catch (err) {
        console.error("Lỗi xử lý yêu thích:", err);
        res.status(500).send("Lỗi server");
    }
});



// Route thêm bình luận
// Route POST /cong-thuc/:id/binh-luan
router.post("/cong-thuc/:id/binh-luan", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send("Vui lòng đăng nhập để bình luận");
    }

    const recipeId = req.params.id;
    const {
        noi_dung
    } = req.body;
    const userId = req.session.user.ID_CHINH_ND;

    if (!recipeId || isNaN(recipeId) || !noi_dung) {
        return res.status(400).send("Dữ liệu không hợp lệ");
    }

    try {
        const result = await query(
            "INSERT INTO binh_luan (ID_CHINH_CT, ID_CHINH_ND, NOI_DUNG_BL, NGAY_TAO_BL) VALUES (?, ?, ?, CURDATE())",
            [recipeId, userId, noi_dung]
        );

        const idBinhLuan = result.insertId;

        // --- Bắt đầu phần thông báo cho bình luận mới ---
        const [nguoiDung] = await query("SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = ?", [userId]);
        const tenNguoiDung = nguoiDung?.TEN_NGUOI_DUNG || "Người dùng";

        const [congThuc] = await query("SELECT TEN_CT, ID_CHINH_ND FROM cong_thuc WHERE ID_CHINH_CT = ?", [recipeId]);
        const tenCongThuc = congThuc?.TEN_CT || "một công thức";
        const chuCongThucId = congThuc?.ID_CHINH_ND; // ID của người đăng công thức

        // Lấy tất cả admin
        const admins = await query(`SELECT ID_CHINH_ND FROM nguoi_dung WHERE VAI_TRO = 'admin'`);

        // Tạo một Set để lưu trữ các ID người nhận duy nhất
        const recipients = new Set(admins.map(admin => admin.ID_CHINH_ND));

        // Thêm ID của chủ công thức vào danh sách nếu họ không phải là người đang bình luận
        if (chuCongThucId && chuCongThucId !== userId) {
            recipients.add(chuCongThucId);
        }

        // Chuyển Set thành mảng
        const uniqueRecipients = Array.from(recipients);

        // Lấy vai trò của người nhận (admin/user) để tùy chỉnh thông báo
        const recipientRoles = {};
        for (const rId of uniqueRecipients) {
            const [userRole] = await query("SELECT VAI_TRO FROM nguoi_dung WHERE ID_CHINH_ND = ?", [rId]);
            recipientRoles[rId] = userRole?.VAI_TRO;
        }

        // Gửi thông báo cho từng người nhận duy nhất
        for (const recipientId of uniqueRecipients) {
            let notificationMessage = `Người dùng ${tenNguoiDung} đã bình luận trên công thức "${tenCongThuc}".`;

            // Nếu người nhận là chủ công thức và không phải admin
            if (recipientId === chuCongThucId && recipientRoles[recipientId] !== 'admin') {
                notificationMessage = ` ${tenNguoiDung} đã bình luận trên công thức "${tenCongThuc}" của bạn.`;
            }

            await query(
                `INSERT INTO THONG_BAO (LOAI_TB, NOI_DUNG_TB, ID_MUC_TIEU, ID_CHINH_ND, DA_DOC, DA_XOA, NGAY_TAO_TB)
                 VALUES (?, ?, ?, ?, FALSE, FALSE, NOW())`,
                ['binh_luan', notificationMessage, recipientId, userId]
            );
        }
        // --- Kết thúc phần thông báo ---

        res.redirect(`/cong-thuc/${recipeId}`);
    } catch (err) {
        console.error("Lỗi thêm bình luận:", err);
        res.status(500).send("Lỗi server");
    }
});


router.post("/binh-luan/:id/phan-hoi", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send("Vui lòng đăng nhập để phản hồi");
    }

    const commentId = req.params.id;
    const {
        noi_dung,
        id_phan_hoi_cha
    } = req.body;
    const userId = req.session.user.ID_CHINH_ND;

    if (!commentId || isNaN(commentId) || !noi_dung) {
        return res.status(400).send("Dữ liệu không hợp lệ");
    }

    try {
        const [comment] = await query("SELECT ID_CHINH_CT, ID_CHINH_ND FROM binh_luan WHERE ID_CHINH_BL = ?", [commentId]);
        if (!comment) {
            return res.status(404).send("Bình luận không tồn tại");
        }

        // Kiểm tra id_phan_hoi_cha
        if (id_phan_hoi_cha) {
            const [parentReply] = await query("SELECT ID_CHINH_PHBL FROM phan_hoi_binh_luan WHERE ID_CHINH_PHBL = ?", [id_phan_hoi_cha]);
            if (!parentReply) {
                return res.status(404).send("Phản hồi cha không tồn tại");
            }
        }

        await query(
            "INSERT INTO phan_hoi_binh_luan (ID_CHINH_BL, ID_CHINH_ND, NOI_DUNG_PH, NGAY_TAO_PH, ID_CHINH_PHBL_CHA) VALUES (?, ?, ?, CURDATE(), ?)",
            [commentId, userId, noi_dung, id_phan_hoi_cha || null]
        );

        const [nguoiDung] = await query("SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = ?", [userId]);
        const tenNguoiDung = nguoiDung?.TEN_NGUOI_DUNG || "Người dùng";

        const [congThuc] = await query("SELECT TEN_CT FROM cong_thuc WHERE ID_CHINH_CT = ?", [comment.ID_CHINH_CT]);
        const tenCongThuc = congThuc?.TEN_CT || "một công thức";

        // Lấy tất cả admin
        const admins = await query(`SELECT ID_CHINH_ND FROM nguoi_dung WHERE VAI_TRO = 'admin'`);

        // Lấy ID của chủ bình luận gốc
        const commentOwnerId = comment.ID_CHINH_ND;

        // Tạo một Set để lưu trữ các ID người nhận duy nhất
        const recipients = new Set(admins.map(admin => admin.ID_CHINH_ND));

        // Thêm chủ bình luận gốc vào danh sách nếu họ không phải là người đang trả lời
        if (commentOwnerId && commentOwnerId !== userId) {
            recipients.add(commentOwnerId);
        }

        // Nếu có phản hồi cha, lấy ID của người sở hữu phản hồi cha và thêm vào danh sách người nhận
        let parentReplyOwnerId = null;
        if (id_phan_hoi_cha) {
            const [parentReplyInfo] = await query("SELECT ID_CHINH_ND FROM phan_hoi_binh_luan WHERE ID_CHINH_PHBL = ?", [id_phan_hoi_cha]);
            parentReplyOwnerId = parentReplyInfo?.ID_CHINH_ND;
            if (parentReplyOwnerId && parentReplyOwnerId !== userId) {
                recipients.add(parentReplyOwnerId);
            }
        }

        // Chuyển Set thành mảng
        const uniqueRecipients = Array.from(recipients);

        // Lấy vai trò của người nhận (admin/user) để tùy chỉnh thông báo
        const recipientRoles = {};
        for (const rId of uniqueRecipients) {
            const [userRole] = await query("SELECT VAI_TRO FROM nguoi_dung WHERE ID_CHINH_ND = ?", [rId]);
            recipientRoles[rId] = userRole?.VAI_TRO;
        }


        // Gửi thông báo cho từng người nhận duy nhất
        for (const recipientId of uniqueRecipients) {
            let notificationMessage = `Người dùng ${tenNguoiDung} đã phản hồi bình luận trên công thức "${tenCongThuc}".`;

            // Nếu người nhận là chủ bình luận gốc và không phải admin
            if (recipientId === commentOwnerId && recipientRoles[recipientId] !== 'admin') {
                notificationMessage = ` ${tenNguoiDung} đã phản hồi bình luận của bạn trên công thức "${tenCongThuc}".`;
            }
            // Nếu người nhận là chủ phản hồi cha và không phải admin (và không phải là chủ bình luận gốc)
            else if (recipientId === parentReplyOwnerId && recipientRoles[recipientId] !== 'admin' && recipientId !== commentOwnerId) {
                notificationMessage = ` ${tenNguoiDung} đã phản hồi phản hồi của bạn trên công thức "${tenCongThuc}".`;
            }

            await query(
                `INSERT INTO THONG_BAO (LOAI_TB, NOI_DUNG_TB, ID_MUC_TIEU, ID_CHINH_ND, DA_DOC, DA_XOA, NGAY_TAO_TB)
                 VALUES (?, ?, ?, ?, FALSE, FALSE, NOW())`,
                ['phan_hoi_binh_luan', notificationMessage, recipientId, userId]
            );
        }

        res.redirect(`/cong-thuc/${comment.ID_CHINH_CT}`);
    } catch (err) {
        console.error("Lỗi thêm phản hồi:", err);
        res.status(500).send("Lỗi server");
    }
});
// Route thả/xóa cảm xúc cho bình luận
// Route thả/xóa cảm xúc cho bình luận
router.post("/binh-luan/:id/cam-xuc", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send("Vui lòng đăng nhập để thả cảm xúc");
    }

    const commentId = req.params.id;
    const { loai_cam_xuc } = req.body;
    const userId = req.session.user.ID_CHINH_ND;

    if (!commentId || isNaN(commentId) || !['like', 'love', 'haha', 'wow', 'sad', 'angry'].includes(loai_cam_xuc)) {
        return res.status(400).send("Dữ liệu không hợp lệ");
    }

    try {
        const [comment] = await query("SELECT ID_CHINH_CT, ID_CHINH_ND FROM binh_luan WHERE ID_CHINH_BL = ?", [commentId]);
        if (!comment) {
            return res.status(404).send("Bình luận không tồn tại");
        }

        const [existingReaction] = await query(
            "SELECT ID_CHINH_CXBL FROM binh_luan_cam_xuc WHERE ID_CHINH_BL = ? AND ID_CHINH_ND = ? AND LOAI_CAM_XUC_BL = ?",
            [commentId, userId, loai_cam_xuc]
        );

        // Nếu existingReaction, nghĩa là người dùng đang xóa cảm xúc của họ
        if (existingReaction) {
            await query("DELETE FROM binh_luan_cam_xuc WHERE ID_CHINH_CXBL = ?", [existingReaction.ID_CHINH_CXBL]);
            // Không gửi thông báo khi xóa cảm xúc
        } else {
            // Nếu không có existingReaction, nghĩa là người dùng đang thêm cảm xúc mới
            await query(
                "INSERT INTO binh_luan_cam_xuc (ID_CHINH_BL, ID_CHINH_ND, LOAI_CAM_XUC_BL, NGAY_TAO_CX_BL) VALUES (?, ?, ?, CURDATE())",
                [commentId, userId, loai_cam_xuc]
            );

            // --- Bắt đầu phần thông báo (chỉ khi thêm cảm xúc) ---
            const commentOwnerId = comment.ID_CHINH_ND; // Chủ sở hữu của bình luận

            // Chỉ gửi thông báo nếu người thả cảm xúc không phải là chủ sở hữu bình luận
            if (commentOwnerId && commentOwnerId !== userId) {
                const [nguoiDung] = await query("SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = ?", [userId]);
                const tenNguoiDung = nguoiDung?.TEN_NGUOI_DUNG || "Người dùng";

                const [congThuc] = await query("SELECT TEN_CT FROM cong_thuc WHERE ID_CHINH_CT = ?", [comment.ID_CHINH_CT]);
                const tenCongThuc = congThuc?.TEN_CT || "một công thức";

                await query(
                    `INSERT INTO THONG_BAO (LOAI_TB, NOI_DUNG_TB, ID_MUC_TIEU, ID_CHINH_ND, DA_DOC, DA_XOA, NGAY_TAO_TB)
                     VALUES (?, ?, ?, ?, FALSE, FALSE, NOW())`,
                    ['binh_luan_cam_xuc', `Người dùng ${tenNguoiDung} đã thả ${loai_cam_xuc} trên bình luận của bạn trong công thức "${tenCongThuc}".`, commentOwnerId, userId]
                );
            }
            // --- Kết thúc phần thông báo ---
        }

        res.redirect(`/cong-thuc/${comment.ID_CHINH_CT}`);
    } catch (err) {
        console.error("Lỗi thả cảm xúc:", err);
        res.status(500).send("Lỗi server");
    }
});


// Route thả/xóa cảm xúc cho phản hồi

// Route POST /phan-hoi/:id/cam-xuc
router.post("/phan-hoi/:id/cam-xuc", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send("Vui lòng đăng nhập để thả cảm xúc");
    }

    const replyId = req.params.id;
    const { loai_cam_xuc } = req.body;
    const userId = req.session.user.ID_CHINH_ND;

    if (!replyId || isNaN(replyId) || !['like', 'love', 'haha', 'wow', 'sad', 'angry'].includes(loai_cam_xuc)) {
        return res.status(400).send("Dữ liệu không hợp lệ");
    }

    try {
        const [reply] = await query(
            "SELECT ID_CHINH_BL, ID_CHINH_ND FROM phan_hoi_binh_luan WHERE ID_CHINH_PHBL = ?", // Lấy ID_CHINH_ND của chủ phản hồi
            [replyId]
        );
        if (!reply) {
            return res.status(404).send("Phản hồi không tồn tại");
        }

        const [comment] = await query("SELECT ID_CHINH_CT FROM binh_luan WHERE ID_CHINH_BL = ?", [reply.ID_CHINH_BL]);
        if (!comment) {
            return res.status(404).send("Bình luận không tồn tại");
        }

        const [existingReaction] = await query(
            "SELECT ID_CHINH_PHCX FROM phan_hoi_cam_xuc WHERE ID_CHINH_PHBL = ? AND ID_CHINH_ND = ? AND LOAI_CAM_XUC = ?",
            [replyId, userId, loai_cam_xuc]
        );

        // Nếu existingReaction, nghĩa là người dùng đang xóa cảm xúc của họ
        if (existingReaction) {
            await query("DELETE FROM phan_hoi_cam_xuc WHERE ID_CHINH_PHCX = ?", [existingReaction.ID_CHINH_PHCX]);
            // Không gửi thông báo khi xóa cảm xúc
        } else {
            // Nếu không có existingReaction, nghĩa là người dùng đang thêm cảm xúc mới
            await query(
                "INSERT INTO phan_hoi_cam_xuc (ID_CHINH_PHBL, ID_CHINH_ND, LOAI_CAM_XUC, NGAY_TAO_CX_PH) VALUES (?, ?, ?, CURDATE())",
                [replyId, userId, loai_cam_xuc]
            );

            // --- Bắt đầu phần thông báo (chỉ khi thêm cảm xúc) ---
            const replyOwnerId = reply.ID_CHINH_ND; // Chủ sở hữu của phản hồi

            // Chỉ gửi thông báo nếu người thả cảm xúc không phải là chủ sở hữu phản hồi
            if (replyOwnerId && replyOwnerId !== userId) {
                const [nguoiDung] = await query("SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = ?", [userId]);
                const tenNguoiDung = nguoiDung?.TEN_NGUOI_DUNG || "Người dùng";

                const [congThuc] = await query("SELECT TEN_CT FROM cong_thuc WHERE ID_CHINH_CT = ?", [comment.ID_CHINH_CT]);
                const tenCongThuc = congThuc?.TEN_CT || "một công thức";

                await query(
                    `INSERT INTO THONG_BAO (LOAI_TB, NOI_DUNG_TB, ID_MUC_TIEU, ID_CHINH_ND, DA_DOC, DA_XOA, NGAY_TAO_TB)
                     VALUES (?, ?, ?, ?, FALSE, FALSE, NOW())`,
                    ['phan_hoi_cam_xuc', `Người dùng ${tenNguoiDung} đã thả ${loai_cam_xuc} trên phản hồi của bạn trong công thức "${tenCongThuc}".`, replyOwnerId, userId]
                );
            }
            // --- Kết thúc phần thông báo ---
        }

        res.redirect(`/cong-thuc/${comment.ID_CHINH_CT}`);
    } catch (err) {
        console.error("Lỗi thả cảm xúc:", err);
        res.status(500).send("Lỗi server");
    }
});

// Route chỉnh sửa bình luận
router.put("/binh-luan/:id", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Vui lòng đăng nhập để chỉnh sửa bình luận" });
  }

  const commentId = req.params.id;
  const { noi_dung } = req.body;
  const userId = req.session.user.ID_CHINH_ND;
  const isAdmin = req.session.user.VAI_TRO === 'admin';

  if (!commentId || isNaN(commentId) || !noi_dung || typeof noi_dung !== 'string') {
    return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
  }

  try {
    const [comment] = await query("SELECT ID_CHINH_ND FROM binh_luan WHERE ID_CHINH_BL = ?", [commentId]);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Bình luận không tồn tại" });
    }

    if (comment.ID_CHINH_ND !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền chỉnh sửa bình luận này" });
    }

  await query("UPDATE binh_luan SET NOI_DUNG_BL = ? WHERE ID_CHINH_BL = ?", [noi_dung, commentId]);

    console.log("BODY:", req.body);
    res.json({
      success: true,
      updatedContent: noi_dung,
      message: "Cập nhật bình luận thành công"
    });
  } catch (err) {
    console.error("Lỗi cập nhật bình luận:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi cập nhật bình luận" });
  }
});

// Route xóa bình luận
router.delete("/binh-luan/:id", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Vui lòng đăng nhập để xóa bình luận" });
  }

  const commentId = req.params.id;
  const userId = req.session.user.ID_CHINH_ND;
  const isAdmin = req.session.user.VAI_TRO === 'admin';

  if (!commentId || isNaN(commentId)) {
    return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
  }

  try {
    const [comment] = await query("SELECT ID_CHINH_CT, ID_CHINH_ND FROM binh_luan WHERE ID_CHINH_BL = ?", [commentId]);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Bình luận không tồn tại" });
    }

    if (comment.ID_CHINH_ND !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền xóa bình luận này" });
    }

    await query("DELETE FROM binh_luan_cam_xuc WHERE ID_CHINH_BL = ?", [commentId]);
    await query("DELETE FROM phan_hoi_cam_xuc WHERE ID_CHINH_PHBL IN (SELECT ID_CHINH_PHBL FROM phan_hoi_binh_luan WHERE ID_CHINH_BL = ?)", [commentId]);
    await query("DELETE FROM phan_hoi_binh_luan WHERE ID_CHINH_BL = ?", [commentId]);
    await query("DELETE FROM binh_luan WHERE ID_CHINH_BL = ?", [commentId]);

    res.json({ success: true, message: "Xóa bình luận thành công" });
  } catch (err) {
    console.error("Lỗi xóa bình luận:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi xóa bình luận" });
  }
});

// Route chỉnh sửa phản hồi

router.put("/phan-hoi/:id", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Vui lòng đăng nhập" });
  }

  const replyId = req.params.id;
  const { noi_dung } = req.body;
  const userId = req.session.user.ID_CHINH_ND;
  const isAdmin = req.session.user.VAI_TRO === 'admin';

  if (!replyId || isNaN(replyId) || !noi_dung || typeof noi_dung !== 'string') {
    return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
  }

  try {
    const [reply] = await query("SELECT ID_CHINH_BL, ID_CHINH_ND FROM phan_hoi_binh_luan WHERE ID_CHINH_PHBL = ?", [replyId]);
    if (!reply) {
      return res.status(404).json({ success: false, message: "Phản hồi không tồn tại" });
    }

    if (reply.ID_CHINH_ND !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền chỉnh sửa phản hồi này" });
    }

    await query("UPDATE phan_hoi_binh_luan SET NOI_DUNG_PH = ? WHERE ID_CHINH_PHBL = ?", [noi_dung, replyId]);
    console.log("BODY:", req.body);
    res.json({
      success: true,
      updatedContent: noi_dung,
      message: "Cập nhật phản hồi thành công"
    });
  } catch (err) {
    console.error("Lỗi cập nhật phản hồi:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi cập nhật phản hồi" });
  }
});



// Route xóa phản hồi
router.delete("/phan-hoi/:id", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Vui lòng đăng nhập để xóa phản hồi" });
  }

  const replyId = req.params.id;
  const userId = req.session.user.ID_CHINH_ND;
  const isAdmin = req.session.user.VAI_TRO === 'admin';

  if (!replyId || isNaN(replyId)) {
    return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
  }

  try {
    const [reply] = await query("SELECT ID_CHINH_BL, ID_CHINH_ND FROM phan_hoi_binh_luan WHERE ID_CHINH_PHBL = ?", [replyId]);
    if (!reply) {
      return res.status(404).json({ success: false, message: "Phản hồi không tồn tại" });
    }

    if (reply.ID_CHINH_ND !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền xóa phản hồi này" });
    }

    const [comment] = await query("SELECT ID_CHINH_CT FROM binh_luan WHERE ID_CHINH_BL = ?", [reply.ID_CHINH_BL]);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Bình luận không tồn tại" });
    }

    await query("DELETE FROM phan_hoi_cam_xuc WHERE ID_CHINH_PHBL = ?", [replyId]);
    await query("DELETE FROM phan_hoi_binh_luan WHERE ID_CHINH_PHBL_CHA = ?", [replyId]);
    await query("DELETE FROM phan_hoi_binh_luan WHERE ID_CHINH_PHBL = ?", [replyId]);

    res.json({ success: true, message: "Xóa phản hồi thành công" });
  } catch (err) {
    console.error("Lỗi xóa phản hồi:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi xóa phản hồi" });
  }
});


router.post("/cong-thuc/:id/danh-gia", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Vui lòng đăng nhập để đánh giá");
  }

  const recipeId = req.params.id;
  const { danh_gia, noi_dung } = req.body;
  const userId = req.session.user.ID_CHINH_ND;

  if (!recipeId || isNaN(recipeId) || !danh_gia || isNaN(danh_gia) || danh_gia < 1 || danh_gia > 5) {
    return res.status(400).send("Dữ liệu đánh giá không hợp lệ");
  }

  try {
    const existing = await query(
      "SELECT * FROM danh_gia WHERE ID_CHINH_CT = ? AND ID_CHINH_ND = ?",
      [recipeId, userId]
    );

    if (existing.length) {
      // Đã tồn tại -> không cho đánh giá nữa
      return res.status(403).send("Bạn đã đánh giá công thức này rồi!");
    }

    // Chưa có -> thêm mới
   await query(
  "INSERT INTO danh_gia (ID_CHINH_CT, ID_CHINH_ND, DANH_GIA, NOI_DUNG_DG, NGAY_TAO_DG) VALUES (?, ?, ?, ?, CURDATE())",
  [recipeId, userId, danh_gia, noi_dung || null]
);

    // --- Bắt đầu phần thông báo cho đánh giá mới ---
    const [nguoiDung] = await query("SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = ?", [userId]);
    const tenNguoiDung = nguoiDung?.TEN_NGUOI_DUNG || "Người dùng";

    const [congThuc] = await query("SELECT TEN_CT, ID_CHINH_ND FROM cong_thuc WHERE ID_CHINH_CT = ?", [recipeId]);
    const tenCongThuc = congThuc?.TEN_CT || "một công thức";
    const chuCongThucId = congThuc?.ID_CHINH_ND; // ID của người đăng công thức

    // Lấy tất cả admin
    const admins = await query(`SELECT ID_CHINH_ND FROM nguoi_dung WHERE VAI_TRO = 'admin'`);

    // Tạo một Set để lưu trữ các ID người nhận duy nhất
    const recipients = new Set(admins.map(admin => admin.ID_CHINH_ND));

    // Thêm ID của chủ công thức vào danh sách nếu họ không phải là người đang đánh giá
    if (chuCongThucId && chuCongThucId !== userId) {
      recipients.add(chuCongThucId);
    }

    // Chuyển Set thành mảng
    const uniqueRecipients = Array.from(recipients);

    // Lấy vai trò của người nhận (admin/user) để tùy chỉnh thông báo
    const recipientRoles = {};
    for (const rId of uniqueRecipients) {
        const [userRole] = await query("SELECT VAI_TRO FROM nguoi_dung WHERE ID_CHINH_ND = ?", [rId]);
        recipientRoles[rId] = userRole?.VAI_TRO;
    }

    // Gửi thông báo cho từng người nhận duy nhất
    for (const recipientId of uniqueRecipients) {
        let notificationMessage = `Người dùng ${tenNguoiDung} đã đánh giá công thức "${tenCongThuc}" với ${danh_gia} sao.`;

        // Nếu người nhận là chủ công thức và không phải admin
        if (recipientId === chuCongThucId && recipientRoles[recipientId] !== 'admin') {
            notificationMessage = `${tenNguoiDung} đã đánh giá công thức "${tenCongThuc}" của bạn với ${danh_gia} sao.`;
        }

  await query(
    `INSERT INTO THONG_BAO (LOAI_TB, NOI_DUNG_TB, ID_MUC_TIEU, ID_CHINH_ND, DA_DOC, DA_XOA, NGAY_TAO_TB)
    VALUES (?, ?, ?, ?, FALSE, FALSE, NOW())`, // Gõ lại dòng này một cách cẩn thận
    ['danh_gia', notificationMessage, recipientId, userId]
);
    }
    // --- Kết thúc phần thông báo ---

    res.redirect(`/cong-thuc/${recipeId}`);
  } catch (err) {
    console.error("Lỗi xử lý đánh giá:", err);
    res.status(500).send("Lỗi server");
  }
});

// Route kiểm tra đăng nhập
router.get("/check-login", (req, res) => {
    if (req.session.user) {
        return res.status(200).json({ loggedIn: true });
    }
    return res.status(200).json({ loggedIn: false });
});

router.get("/dang-cong-thuc", ensureLoggedIn, async (req, res) => {
  const userId = req.session.user.ID_CHINH_ND;
  try {
    // Lấy công thức của người dùng
    const userRecipes = await query("SELECT * FROM cong_thuc WHERE ID_CHINH_ND = ?", [userId]);

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
      viewPath: "dang-cong-thuc",
      user: req.session.user,
      userInfo,
      userRecipes,
      mon_an,
      nguyen_lieu,
      recipe: null,
    });
  } catch (err) {
    console.error("Lỗi truy vấn:", err);
    res.status(500).send("Lỗi server");
  }
});

router.get("/dang-cong-thuc/:id", ensureLoggedIn, async (req, res) => {
  const userId = req.session.user.ID_CHINH_ND;
  const recipeId = req.params.id;
  try {
    console.log("recipeId:", recipeId);
    console.log("userId:", userId);
    console.log("Session user:", req.session.user);

    const [recipe] = await query(
      "SELECT * FROM cong_thuc WHERE ID_CHINH_CT = ? AND ID_CHINH_ND = ? AND TRANG_THAI_DUYET_ IN (?, ?)",
      [recipeId, userId, 'Đang chờ duyệt', 'Từ chối']
    );

    if (!recipe) {
      console.log("Không tìm thấy recipe. Kiểm tra DB:");
      const [dbCheck] = await query(
        "SELECT TRANG_THAI_DUYET_ FROM cong_thuc WHERE ID_CHINH_CT = ? AND ID_CHINH_ND = ?",
        [recipeId, userId]
      );
      console.log("Giá trị TRANG_THAI_DUYET_ từ DB:", dbCheck ? dbCheck.TRANG_THAI_DUYET_ : "Không có bản ghi");
      return res.status(404).send("Công thức không tồn tại hoặc không thể chỉnh sửa!");
    }

    // Tiếp tục các bước lấy dữ liệu
    const recipeIngredients = await query(
      `
      SELECT ctnl.*, nl.TEN_NL, nl.DON_VI 
      FROM cong_thuc_nguyen_lieu ctnl 
      LEFT JOIN nguyen_lieu nl ON ctnl.ID_CHINH_NL = nl.ID_CHINH_NL 
      WHERE ctnl.ID_CHINH_CT = ?
    `,
      [recipeId]
    );

    const categories = await query("SELECT ID_CHINH_LM AS ID_CHINH_MA, TEN_LM AS TEN_MON_AN FROM loai_mon");
    const nguyen_lieu = await query("SELECT ID_CHINH_NL, TEN_NL, DON_VI FROM nguyen_lieu");
    const mon_an = await query("SELECT * FROM mon_an");

    const [userInfo] = await query("SELECT * FROM nguoi_dung WHERE ID_CHINH_ND = ?", [userId]);

    if (!userInfo) {
      return res.status(404).send("Không tìm thấy thông tin người dùng");
    }

    req.session.user = {
      ...req.session.user,
      TEN_NGUOI_DUNG: userInfo.TEN_NGUOI_DUNG,
      EMAIL_: userInfo.EMAIL_,
      AVARTAR_URL: userInfo.AVARTAR_URL,
    };

    res.render("index/index_layout", {
      viewPath: "dang-cong-thuc",
      user: req.session.user,
      userInfo,
      recipe,
      recipeIngredients,
      mon_an,
      nguyen_lieu,
      categories,
    });
  } catch (err) {
    console.error("Lỗi truy vấn:", err);
    res.status(500).send("Lỗi server");
  }
});
// 
router.post(
  '/dang-cong-thuc',
  ensureLoggedIn,
  upload.fields([
    { name: 'hinh_anh', maxCount: 1 },
    { name: 'video_file', maxCount: 1 },
  ]),
  async (req, res) => {
    let recipeId = null; // Khởi tạo recipeId ở phạm vi rộng hơn để xử lý lỗi
    try {
      if (!req.session.user || !req.session.user.ID_CHINH_ND) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập lại!' });
      }

      const normalizeArray = (input) => (Array.isArray(input) ? input : input ? [input] : []);

      const {
        TEN_CT, MOTA, THOI_GIAN_NAU, DO_KHO, SO_PHAN_AN, ID_CHINH_MA,
        nguyen_lieu_id, ten_nguyen_lieu_khac, don_vi_khac, so_luong, ghi_chu,
        ten_buoc, buoc_nau
      } = req.body;

      const userId = req.session.user.ID_CHINH_ND; // ID của người đăng công thức

      // Validate bắt buộc
      if (!TEN_CT?.trim()) return res.status(400).json({ message: 'Tên công thức là bắt buộc!' });
      if (!MOTA?.trim()) return res.status(400).json({ message: 'Mô tả là bắt buộc!' });
      if (!ID_CHINH_MA) return res.status(400).json({ message: 'Loại món ăn là bắt buộc!' });

      const nguyenLieuIds = normalizeArray(nguyen_lieu_id);
      const tenNguyenLieuKhacs = normalizeArray(ten_nguyen_lieu_khac);
      const donViKhacs = normalizeArray(don_vi_khac);
      const soLuongs = normalizeArray(so_luong);
      const ghiChus = normalizeArray(ghi_chu);
      const tenBuocArray = normalizeArray(ten_buoc);
      const buocNauArray = normalizeArray(buoc_nau);

      if (tenBuocArray.length === 0 || buocNauArray.length === 0 || tenBuocArray.length !== buocNauArray.length) {
        return res.status(400).json({ message: 'Phải có ít nhất một bước nấu hợp lệ!' });
      }
      if (tenBuocArray.some(t => !t.trim()) || buocNauArray.some(b => !b.trim())) {
        return res.status(400).json({ message: 'Tên bước và mô tả bước là bắt buộc!' });
      }
      if (soLuongs.length === 0) {
        return res.status(400).json({ message: 'Vui lòng thêm ít nhất một nguyên liệu!' });
      }

      // Kiểm tra món ăn
      const [monAn] = await query('SELECT ID_CHINH_MA FROM mon_an WHERE ID_CHINH_MA = ?', [ID_CHINH_MA]);
      if (!monAn) return res.status(400).json({ message: 'Món ăn không tồn tại!' });

      const huongDan = tenBuocArray
        .map((ten, i) => `Bước ${i + 1}: ${ten.trim()} - ${buocNauArray[i].trim()}`)
        .join('\n\n');

      // Thêm công thức
const result = await query(
  `
  INSERT INTO cong_thuc (
    ID_CHINH_ND, ID_CHINH_MA, TEN_CT, MOTA, HUONG_DAN, 
    THOI_GIAN_NAU, DO_KHO, SO_PHAN_AN, HINH_ANH_CT, VIDEO, 
    TRANG_THAI_DUYET_, NGAY_TAO_CT
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
  `,
  [
    userId,
    ID_CHINH_MA,
    TEN_CT.trim(),
    MOTA.trim(),
    huongDan,
    THOI_GIAN_NAU || null,
    DO_KHO || null,
    SO_PHAN_AN || null,
    null,
    null,
    'Đang chờ duyệt'
  ]
);



      recipeId = result.insertId; // Gán giá trị cho biến recipeId đã khai báo ở trên

      // Xử lý file upload
      const createDir = async (type) => {
        const dir = path.join(__dirname, '..', 'public', 'Uploads', type, 'congthuc', String(recipeId));
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
        return `/Uploads/${type}/congthuc/${recipeId}/${uniqueName}`;
      };

      const imagePath = await saveFile('hinh_anh', 'images');
      const videoPath = await saveFile('video_file', 'videos');

      if (imagePath || videoPath) {
        await query(
          'UPDATE cong_thuc SET HINH_ANH_CT = ?, VIDEO = ? WHERE ID_CHINH_CT = ?',
          [imagePath, videoPath, recipeId]
        );
      }

      // Thêm nguyên liệu
      const nguyenLieuData = [];
      const seenIngredients = new Set();

      for (let i = 0; i < soLuongs.length; i++) {
        let nguyenLieuId = nguyenLieuIds[i] ? parseInt(nguyenLieuIds[i]) : null;
        const ten = (tenNguyenLieuKhacs[i] || '').trim();
        const donVi = donViKhacs[i] || '';
        const sl = parseFloat(soLuongs[i]) || 0;
        const ghiChu = ghiChus[i] || '';

        if (sl <= 0) continue;

        if (!nguyenLieuId && ten) {
          const [existing] = await query('SELECT ID_CHINH_NL FROM nguyen_lieu WHERE TEN_NL = ?', [ten]);
          if (existing) {
            nguyenLieuId = existing.ID_CHINH_NL;
          } else {
            const insert = await query('INSERT INTO nguyen_lieu (TEN_NL, DON_VI) VALUES (?, ?)', [ten, donVi]);
            nguyenLieuId = insert.insertId;
          }
        }

        if (!nguyenLieuId || isNaN(nguyenLieuId)) {
          return res.status(400).json({ message: `Nguyên liệu thứ ${i + 1} không hợp lệ!` });
        }

        const key = `${recipeId}-${nguyenLieuId}`;
        if (seenIngredients.has(key)) {
          console.warn(`Trùng nguyên liệu: ID_CHINH_CT=${recipeId}, ID_CHINH_NL=${nguyenLieuId}`);
          continue;
        }
        seenIngredients.add(key);

        nguyenLieuData.push([recipeId, nguyenLieuId, sl, ghiChu]);
      }

      if (nguyenLieuData.length === 0) {
        await query('DELETE FROM cong_thuc WHERE ID_CHINH_CT = ?', [recipeId]);
        return res.status(400).json({ message: 'Không có nguyên liệu hợp lệ để thêm!' });
      }

      const placeholders = nguyenLieuData.map(() => '(?, ?, ?, ?)').join(', ');
      const values = nguyenLieuData.flat();
      await query(
        `
        INSERT INTO cong_thuc_nguyen_lieu (ID_CHINH_CT, ID_CHINH_NL, SO_LUONG, GHI_CHU)
        VALUES ${placeholders}
      `,
        values
      );

      // --- BẮT ĐẦU PHẦN THÔNG BÁO ---

      // Lấy tên người dùng đã đăng công thức
      const [nguoiDungDangBai] = await query("SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = ?", [userId]);
      const tenNguoiDungDangBai = nguoiDungDangBai?.TEN_NGUOI_DUNG || "Một người dùng";

      // Lấy tất cả admin
      const admins = await query(`SELECT ID_CHINH_ND FROM nguoi_dung WHERE VAI_TRO = 'admin'`);

      // Tạo một Set để lưu trữ các ID người nhận duy nhất
      const recipients = new Set(admins.map(admin => admin.ID_CHINH_ND));

      // Thêm ID của người đăng công thức vào danh sách (để họ nhận thông báo về việc công thức của mình đang chờ duyệt)
      // Loại bỏ trường hợp họ cũng là admin để tránh thông báo trùng lặp nếu dùng Set
      if (!recipients.has(userId)) { // Kiểm tra để không thêm userId nếu đã có trong danh sách admin
         recipients.add(userId);
      }
      
      const uniqueRecipients = Array.from(recipients);

      // Gửi thông báo cho từng người nhận duy nhất
      for (const recipientId of uniqueRecipients) {
        let notificationContent = '';
        if (recipientId === userId) {
            notificationContent = `Công thức "${TEN_CT.trim()}" của bạn đã được gửi và đang chờ duyệt.`;
        } else { // Admin
            notificationContent = `Công thức "${TEN_CT.trim()}" của ${tenNguoiDungDangBai} đang chờ duyệt.`;
        }
        
        await query(
          `INSERT INTO THONG_BAO (LOAI_TB, NOI_DUNG_TB, ID_MUC_TIEU, ID_CHINH_ND, DA_DOC, DA_XOA, NGAY_TAO_TB)
           VALUES (?, ?, ?, ?, FALSE, FALSE, NOW())`,
          ['cong_thuc', notificationContent, recipientId, userId]
        );
      }
      // --- KẾT THÚC PHẦN THÔNG BÁO ---

      return res.status(200).json({ message: 'Đăng công thức thành công!', recipeId });
    } catch (err) {
      console.error('Lỗi server:', err);
      // Nếu có lỗi sau khi thêm công thức, hãy cố gắng xóa công thức đã thêm
      if (recipeId) { // recipeId sẽ được định nghĩa nếu đã thêm công thức thành công
        await query('DELETE FROM cong_thuc WHERE ID_CHINH_CT = ?', [recipeId]);
        console.error(`Đã xóa công thức ID ${recipeId} do lỗi trong quá trình xử lý.`);
      }
      return res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
  }
);
router.put(
  '/dang-cong-thuc/:id',
  ensureLoggedIn,
  (req, res, next) => {
    upload.fields([
      { name: 'hinh_anh', maxCount: 1 },
      { name: 'video_file', maxCount: 1 },
    ])(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File tải lên quá lớn! Kích thước tối đa là 100MB.' });
        }
        return res.status(400).json({ message: 'Lỗi khi tải lên file: ' + err.message });
      } else if (err) {
        console.error('Lỗi upload:', err);
        return res.status(400).json({ message: 'Lỗi khi tải lên file: ' + err.message });
      }
      next();
    });
  },
  async (req, res) => {
    let recipeId = req.params.id;
    try {
      if (!req.session.user || !req.session.user.ID_CHINH_ND) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập lại!' });
      }

      const normalizeArray = (input) => (Array.isArray(input) ? input : input ? [input] : []);

      const {
        TEN_CT, MOTA, THOI_GIAN_NAU, DO_KHO, SO_PHAN_AN, ID_CHINH_MA,
        nguyen_lieu_id, ten_nguyen_lieu_khac, don_vi_khac, so_luong, ghi_chu,
        ten_buoc, buoc_nau, remove_video
      } = req.body;

      const userId = req.session.user.ID_CHINH_ND;

      // Validate công thức
      const [recipe] = await query(
        'SELECT * FROM cong_thuc WHERE ID_CHINH_CT = ? AND ID_CHINH_ND = ? AND TRANG_THAI_DUYET_ IN (?, ?)',
        [recipeId, userId, 'Đang chờ duyệt', 'Từ chối']
      );
      if (!recipe) {
        console.log(`Công thức không tồn tại hoặc không thể chỉnh sửa: ID_CHINH_CT=${recipeId}, ID_CHINH_ND=${userId}`);
        return res.status(403).json({ message: 'Công thức không tồn tại hoặc không thể chỉnh sửa!' });
      }

      // Validate bắt buộc
      if (!TEN_CT?.trim()) return res.status(400).json({ message: 'Tên công thức là bắt buộc!' });
      if (!MOTA?.trim()) return res.status(400).json({ message: 'Mô tả là bắt buộc!' });
      if (!ID_CHINH_MA) return res.status(400).json({ message: 'Loại món ăn là bắt buộc!' });

      const nguyenLieuIds = normalizeArray(nguyen_lieu_id);
      const tenNguyenLieuKhacs = normalizeArray(ten_nguyen_lieu_khac);
      const donViKhacs = normalizeArray(don_vi_khac);
      const soLuongs = normalizeArray(so_luong);
      const ghiChus = normalizeArray(ghi_chu);
      const tenBuocArray = normalizeArray(ten_buoc);
      const buocNauArray = normalizeArray(buoc_nau);

      // Kiểm tra bước nấu
      if (tenBuocArray.length === 0 || buocNauArray.length === 0 || tenBuocArray.length !== buocNauArray.length) {
        return res.status(400).json({ message: 'Phải có ít nhất một bước nấu hợp lệ!' });
      }
      if (tenBuocArray.some(t => !t?.trim()) || buocNauArray.some(b => !b?.trim())) {
        return res.status(400).json({ message: 'Tên bước và mô tả bước là bắt buộc!' });
      }
      if (soLuongs.length === 0) {
        return res.status(400).json({ message: 'Vui lòng thêm ít nhất một nguyên liệu!' });
      }

      // Tạo chuỗi hướng dẫn
      let huongDan;
      try {
        huongDan = tenBuocArray
          .map((ten, i) => `Bước ${i + 1}: ${ten.trim()} - ${buocNauArray[i].trim()}`)
          .join('\n\n');
      } catch (err) {
        console.error('Lỗi khi tạo chuỗi huongDan:', err);
        return res.status(400).json({ message: 'Dữ liệu bước nấu không hợp lệ!' });
      }

      // Kiểm tra món ăn
      const [monAn] = await query('SELECT ID_CHINH_MA FROM mon_an WHERE ID_CHINH_MA = ?', [ID_CHINH_MA]);
      if (!monAn) return res.status(400).json({ message: 'Món ăn không tồn tại!' });

      // Xử lý file upload
      const createDir = async (type) => {
        const dir = path.join(__dirname, '..', 'public', 'Uploads', type, 'congthuc', String(recipeId));
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

      const saveFile = async (fileField, type, existingPath) => {
        if (!req.files[fileField]) return existingPath;
        const file = req.files[fileField][0];
        const dir = await createDir(type);
        const uniqueName = await getUniqueFileName(dir, file.originalname);
        await fs.rename(file.path, path.join(dir, uniqueName));
        if (existingPath) {
          try {
            await fs.unlink(path.join(__dirname, '..', 'public', existingPath));
          } catch (err) {
            console.warn(`Không thể xóa file cũ ${existingPath}:`, err);
          }
        }
        return `/Uploads/${type}/congthuc/${recipeId}/${uniqueName}`;
      };

      let finalImagePath = recipe.HINH_ANH_CT;
      let finalVideoPath = remove_video === '1' ? null : recipe.VIDEO;

      finalImagePath = await saveFile('hinh_anh', 'images', finalImagePath);
      if (remove_video !== '1') {
        finalVideoPath = await saveFile('video_file', 'videos', finalVideoPath);
      } else if (recipe.VIDEO) {
        try {
          await fs.unlink(path.join(__dirname, '..', 'public', recipe.VIDEO));
        } catch (err) {
          console.warn(`Không thể xóa video cũ ${recipe.VIDEO}:`, err);
        }
      }

      // Cập nhật công thức, không đặt lại LY_DO_TU_CHOI
      const updateResult = await query(
        `
        UPDATE cong_thuc 
        SET 
          ID_CHINH_MA = ?, 
          TEN_CT = ?, 
          MOTA = ?, 
          HUONG_DAN = ?, 
          THOI_GIAN_NAU = ?, 
          DO_KHO = ?, 
          SO_PHAN_AN = ?, 
          HINH_ANH_CT = ?, 
          VIDEO = ?, 
          TRANG_THAI_DUYET_ = ?,
          NGAY_CAP_NHAT_CT = CURDATE()
        WHERE 
          ID_CHINH_CT = ? AND 
          ID_CHINH_ND = ?
        `,
        [
          ID_CHINH_MA,
          TEN_CT.trim(),
          MOTA.trim(),
          huongDan,
          THOI_GIAN_NAU || null,
          DO_KHO || null,
          SO_PHAN_AN || null,
          finalImagePath,
          finalVideoPath,
          'Đang chờ duyệt',
          recipeId,
          userId
        ]
      );

      // Kiểm tra số hàng bị ảnh hưởng
      if (updateResult.affectedRows === 0) {
        console.error(`Không thể cập nhật công thức: ID_CHINH_CT=${recipeId}, ID_CHINH_ND=${userId}`);
        return res.status(500).json({ message: 'Không thể cập nhật công thức do lỗi dữ liệu!' });
      }

      // Xóa nguyên liệu cũ
      await query('DELETE FROM cong_thuc_nguyen_lieu WHERE ID_CHINH_CT = ?', [recipeId]);

      // Thêm nguyên liệu mới
      const nguyenLieuData = [];
      const seenIngredients = new Set();

      for (let i = 0; i < soLuongs.length; i++) {
        let nguyenLieuId = nguyenLieuIds[i] ? parseInt(nguyenLieuIds[i]) : null;
        const ten = (tenNguyenLieuKhacs[i] || '').trim();
        const donVi = donViKhacs[i] || '';
        const sl = parseFloat(soLuongs[i]) || 0;
        const ghiChu = ghiChus[i] || '';

        if (sl <= 0) continue;

        if (!nguyenLieuId && ten) {
          const [existing] = await query('SELECT ID_CHINH_NL FROM nguyen_lieu WHERE TEN_NL = ?', [ten]);
          if (existing) {
            return res.status(400).json({
              message: `Nguyên liệu "${ten}" đã tồn tại, vui lòng chọn từ danh sách!`,
            });
          }
          const insert = await query('INSERT INTO nguyen_lieu (TEN_NL, DON_VI) VALUES (?, ?)', [ten, donVi]);
          nguyenLieuId = insert.insertId;
        }

        if (!nguyenLieuId || isNaN(nguyenLieuId)) {
          return res.status(400).json({ message: `Nguyên liệu thứ ${i + 1} không hợp lệ!` });
        }

        const key = `${recipeId}-${nguyenLieuId}`;
        if (seenIngredients.has(key)) {
          console.warn(`Trùng nguyên liệu: ID_CHINH_CT=${recipeId}, ID_CHINH_NL=${nguyenLieuId}`);
          continue;
        }
        seenIngredients.add(key);

        nguyenLieuData.push([recipeId, nguyenLieuId, sl, ghiChu]);
      }

      if (nguyenLieuData.length === 0) {
        return res.status(400).json({ message: 'Không có nguyên liệu hợp lệ để thêm!' });
      }

      const placeholders = nguyenLieuData.map(() => '(?, ?, ?, ?)').join(', ');
      const values = nguyenLieuData.flat();
      await query(
        `
        INSERT INTO cong_thuc_nguyen_lieu (ID_CHINH_CT, ID_CHINH_NL, SO_LUONG, GHI_CHU)
        VALUES ${placeholders}
        `,
        values
      );

      // Gửi thông báo cho người dùng và admin
      const [nguoiDungDangBai] = await query("SELECT TEN_NGUOI_DUNG FROM nguoi_dung WHERE ID_CHINH_ND = ?", [userId]);
      const tenNguoiDungDangBai = nguoiDungDangBai?.TEN_NGUOI_DUNG || "Một người dùng";

      const admins = await query(`SELECT ID_CHINH_ND FROM nguoi_dung WHERE VAI_TRO = 'admin'`);
      const recipients = new Set(admins.map(admin => admin.ID_CHINH_ND));
      if (!recipients.has(userId)) {
        recipients.add(userId);
      }
      const uniqueRecipients = Array.from(recipients);

      for (const recipientId of uniqueRecipients) {
        let notificationContent = '';
        if (recipientId === userId) {
          notificationContent = `Công thức "${TEN_CT.trim()}" của bạn đã được cập nhật và đang chờ duyệt.`;
        } else {
          notificationContent = `Công thức "${TEN_CT.trim()}" của ${tenNguoiDungDangBai} đã được cập nhật và đang chờ duyệt.`;
        }
        
        await query(
          `INSERT INTO THONG_BAO (LOAI_TB, NOI_DUNG_TB, ID_MUC_TIEU, ID_CHINH_ND, DA_DOC, DA_XOA, NGAY_TAO_TB)
           VALUES (?, ?, ?, ?, FALSE, FALSE, NOW())`,
          ['cong_thuc', notificationContent, recipientId, userId]
        );
      }

      console.log(`Cập nhật công thức thành công: ID_CHINH_CT=${recipeId}, ID_CHINH_ND=${userId}`);
      return res.status(200).json({ message: 'Cập nhật công thức thành công!', recipeId });
    }catch (err) {
      console.error('Lỗi server khi cập nhật công thức:', err);
      return res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
  }
);
router.delete(
  '/dang-cong-thuc/:id',
  ensureLoggedIn,
  async (req, res) => {
    const recipeId = req.params.id;
    try {
      if (!req.session.user || !req.session.user.ID_CHINH_ND) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập lại!' });
      }

      const userId = req.session.user.ID_CHINH_ND;
      const [recipe] = await query('SELECT * FROM cong_thuc WHERE ID_CHINH_CT = ? AND ID_CHINH_ND = ? AND TRANG_THAI_DUYET_ = ?', [recipeId, userId, 'Đang chờ duyệt']);
      if (!recipe) {
        return res.status(403).json({ message: 'Công thức không tồn tại hoặc không thể xóa!' });
      }

      // Xóa file hình ảnh và video nếu có
      if (recipe.HINH_ANH_CT) {
        try {
          await fs.unlink(path.join(__dirname, '..', 'public', recipe.HINH_ANH_CT));
        } catch (err) {
          console.warn(`Không thể xóa hình ảnh ${recipe.HINH_ANH_CT}:`, err);
        }
      }
      if (recipe.VIDEO) {
        try {
          await fs.unlink(path.join(__dirname, '..', 'public', recipe.VIDEO));
        } catch (err) {
          console.warn(`Không thể xóa video ${recipe.VIDEO}:`, err);
        }
      }

      // Xóa công thức và nguyên liệu liên quan
      await query('DELETE FROM cong_thuc_nguyen_lieu WHERE ID_CHINH_CT = ?', [recipeId]);
      await query('DELETE FROM cong_thuc WHERE ID_CHINH_CT = ?', [recipeId]);

      return res.status(200).json({ message: 'Xóa công thức thành công!' });
    } catch (err) {
      console.error('Lỗi server:', err);
      return res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
  }
);
router.get("/cong-thuc-cua-toi", ensureLoggedIn, async (req, res) => {
  const userId = req.session.user.ID_CHINH_ND;

  try {
    // Lấy danh sách công thức của người dùng, JOIN với bảng mon_an để lấy TEN_MON_AN
    const userRecipes = await query(
      `SELECT
        ct.*,
        ma.TEN_MON_AN
       FROM
        cong_thuc AS ct
       JOIN
        mon_an AS ma ON ct.ID_CHINH_MA = ma.ID_CHINH_MA
       WHERE
        ct.ID_CHINH_ND = ?
       ORDER BY ct.NGAY_TAO_CT DESC`,
      [userId]
    );

    // Lấy danh sách món ăn (nếu cần lọc theo món ăn)
    const mon_an = await query("SELECT * FROM mon_an");

    // Lấy thông tin người dùng
    const [userInfo] = await query("SELECT * FROM nguoi_dung WHERE ID_CHINH_ND = ?", [userId]);

    if (!userInfo) {
      return res.status(404).send("Không tìm thấy thông tin người dùng");
    }

    // Cập nhật lại session (nếu thông tin user đã thay đổi)
    req.session.user = {
      ...req.session.user,
      TEN_NGUOI_DUNG: userInfo.TEN_NGUOI_DUNG,
      EMAIL_: userInfo.EMAIL_,
      AVARTAR_URL: userInfo.AVARTAR_URL,
    };

    res.render("index/index_layout", {
      viewPath: "cong-thuc-cua-toi",
      user: req.session.user,
      userInfo,
      userRecipes,
      mon_an,
    });
  } catch (err) {
    console.error("Lỗi truy vấn công thức của tôi:", err);
    res.status(500).send("Lỗi server khi lấy danh sách công thức");
  }
});


// router.post("/cong-thuc-cua-toi", ensureLoggedIn, upload.single("hinh_anh"), async (req, res) => {
//   const userId = req.session.user.ID_CHINH_ND;
//   const { TEN_CT, MOTA, THOI_GIAN_NAU, DO_KHO, SO_PHAN_AN, VIDEO, loai_mon, nguyen_lieu, HUONG_DAN } = req.body;
//   const hinhAnh = req.file;

//   if (!TEN_CT || !MOTA) return res.status(400).json({ message: "Tên công thức và mô tả là bắt buộc!" });

//   try {
//     let hinhAnhPath = null;

//     const result = await query(`
//       INSERT INTO cong_thuc (ID_CHINH_ND, TEN_CT, MOTA, HUONG_DAN, THOI_GIAN_NAU, DO_KHO, SO_PHAN_AN, VIDEO, HINH_ANH_CT, NGAY_TAO_CT, TRANG_THAI_DUYET_)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'Đang chờ duyệt')`, 
//       [userId, TEN_CT, MOTA, HUONG_DAN || null, THOI_GIAN_NAU, DO_KHO, SO_PHAN_AN, VIDEO, null]);
//     const recipeId = result.insertId;

//     if (hinhAnh) {
//       const targetDir = path.join("public", "uploads", "images", "congthuc", `${recipeId}`);
//       await fs.mkdir(targetDir, { recursive: true });
//       const fileExtension = path.extname(hinhAnh.originalname);
//       const targetPath = path.join(targetDir, `image${fileExtension}`);
//       await fs.rename(hinhAnh.path, targetPath);
//       hinhAnhPath = `/uploads/images/congthuc/${recipeId}/image${fileExtension}`;

//       await query("UPDATE cong_thuc SET HINH_ANH_CT = ? WHERE ID_CHINH_CT = ?", [hinhAnhPath, recipeId]);
//     }

//     if (Array.isArray(loai_mon) && loai_mon.length) {
//       await query("INSERT INTO cong_thuc_loai_mon (ID_CHINH_CT, ID_CHINH_LM) VALUES ?", [loai_mon.map(lm => [recipeId, lm])]);
//     }

//     if (Array.isArray(nguyen_lieu) && nguyen_lieu.length) {
//       await query("INSERT INTO cong_thuc_nguyen_lieu (ID_CHINH_CT, ID_CHINH_NL, SO_LUONG, GHI_CHU) VALUES ?", 
//         [nguyen_lieu.map(nl => [recipeId, nl.id, nl.so_luong, nl.ghi_chu || ""])]);
//     }

//     res.status(201).json({ message: "Thêm công thức thành công!", recipeId });
//   } catch (err) {
//     console.error("Lỗi khi thêm công thức:", err);
//     res.status(500).json({ message: "Lỗi server khi thêm công thức" });
//   }
// });

router.get("/thong-bao", ensureLoggedIn, async (req, res) => {
    const userId = req.session.user.ID_CHINH_ND; // ID của người dùng hiện tại

    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Số thông báo trên mỗi trang
    const offset = (page - 1) * limit;

    let filter = req.query.filter || 'all'; // 'all', 'read', 'unread'
    let search = req.query.search || '';
    let whereClause = `WHERE ID_MUC_TIEU = ? AND DA_XOA = FALSE`; // ID_MUC_TIEU là người nhận thông báo

    const queryParams = [userId]; // Thêm userId vào đây

    if (filter === 'read') {
        whereClause += ` AND DA_DOC = TRUE`;
    } else if (filter === 'unread') {
        whereClause += ` AND DA_DOC = FALSE`;
    }

    if (search) {
        whereClause += ` AND NOI_DUNG_TB LIKE ?`;
        queryParams.push(`%${search}%`);
    }

    try {
        // Lấy tổng số thông báo
        const [totalRowsResult] = await query(`SELECT COUNT(*) as count FROM THONG_BAO ${whereClause}`, queryParams);
        const totalRows = totalRowsResult.count;
        const totalPages = Math.ceil(totalRows / limit);

        // Lấy danh sách thông báo
        const thong_bao = await query(
            `SELECT * FROM THONG_BAO ${whereClause} ORDER BY NGAY_TAO_TB DESC LIMIT ? OFFSET ?`,
            [...queryParams, limit, offset]
        );

        res.render("index/index_layout", { 
            viewPath: "thong-bao",// Giả sử template của bạn là user/thong_bao.ejs
            thong_bao,
            currentPage: page,
            totalPages,
            filter,
            search,
            urlPrefix: '/nguoi-dung',
            user: req.session.user // Truyền thông tin user để hiển thị trên giao diện nếu cần
        });

    } catch (error) {
        console.error("Lỗi khi lấy thông báo:", error);
        res.status(500).send("Lỗi server khi tải thông báo.");
    }
});
// API lấy danh sách thông báo
router.get('/api/thong-bao', ensureLoggedIn, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const userId = req.session.user.ID_CHINH_ND;
        // Lấy trạng thái từ query parameter, mặc định là 'all'
        const status = req.query.status; // 'unread' hoặc 'all'

        let sqlQuery = `
            SELECT tb.ID_CHINH_TB, tb.LOAI_TB, tb.NOI_DUNG_TB, tb.NGAY_TAO_TB, tb.DA_DOC,
                   nd.TEN_NGUOI_DUNG
            FROM THONG_BAO tb
            JOIN nguoi_dung nd ON tb.ID_CHINH_ND = nd.ID_CHINH_ND
            WHERE tb.DA_XOA = FALSE AND tb.ID_MUC_TIEU = ?
        `;
        const queryParams = [userId];

        // Thêm điều kiện lọc theo trạng thái nếu có
        if (status === 'unread') {
            sqlQuery += ` AND tb.DA_DOC = FALSE`;
        }

        sqlQuery += `
            ORDER BY tb.NGAY_TAO_TB DESC
            LIMIT ?
        `;
        queryParams.push(limit);

        const thongBao = await query(sqlQuery, queryParams);

        res.json({ thong_bao: thongBao });
    } catch (err) {
        console.error('Lỗi khi lấy thông báo:', err);
        res.status(500).json({ error: 'Không thể tải thông báo' });
    }
});

/// API lấy số lượng thông báo chưa đọc
router.get('/api/thong-bao/unread-count', ensureLoggedIn, async (req, res) => {
    // ensureLoggedIn sẽ kiểm tra đăng nhập, nếu không có user thì middleware sẽ xử lý
    const userId = req.session.user.ID_CHINH_ND;

    try {
        const result = await query(
            `SELECT COUNT(*) AS unreadCount
             FROM THONG_BAO
             WHERE ID_MUC_TIEU = ? AND DA_DOC = FALSE AND DA_XOA = FALSE`,
            [userId]
        );

        // Lấy unreadCount, nếu không có kết quả thì mặc định là 0
        const unreadCount = result[0]?.unreadCount || 0;

        res.status(200).json({ count: unreadCount });

    } catch (error) {
        console.error('Lỗi khi lấy số thông báo chưa đọc từ DB:', error);
        res.status(500).json({ error: 'Lỗi server khi lấy số thông báo chưa đọc.' });
    }
});

// API đánh dấu đã đọc
router.post('/api/thong-bao/:id/mark-read', ensureLoggedIn, async (req, res) => {
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

// API xóa thông báo
router.post('/api/thong-bao/:id/delete', ensureLoggedIn, async (req, res) => {
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