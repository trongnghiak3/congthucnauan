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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});


// Route trang chủ

router.get("/", async (req, res) => {
    try {
        // Nếu user đã đăng nhập và là admin thì redirect sang /admin
        if (req.session.user && req.session.user.role === 1) {
            return res.redirect("/admin");
        }

        // Nếu không phải admin thì render trang chủ bình thường
        res.render("index/index_layout", {
            title: "Trang chủ",
            viewPath: "trang-chu",
            user: req.session.user, // truyền user cho view
        });
    } catch (err) {
        console.error("Lỗi lấy dữ liệu:", err);
        res.status(500).send("Lỗi server");
    }
});

// Route danh sách món ăn
router.get("/mon-an", async (req, res) => {
    try {
        const { search = "", category = "" } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const offset = (page - 1) * limit;

        // Câu truy vấn tổng số món ăn (để phân trang)
        let countSql = `
            SELECT COUNT(DISTINCT mon_an.ID_CHINH_MA) AS total
            FROM mon_an
            LEFT JOIN mon_an_loai_mon ON mon_an.ID_CHINH_MA = mon_an_loai_mon.ID_CHINH_MA
            LEFT JOIN loai_mon ON mon_an_loai_mon.ID_CHINH_LM = loai_mon.ID_CHINH_LM
        `;

        // Câu truy vấn chính có LIMIT
        let sql = `
            SELECT mon_an.*, GROUP_CONCAT(loai_mon.TEN_LM) as DANH_MUC
            FROM mon_an
            LEFT JOIN mon_an_loai_mon ON mon_an.ID_CHINH_MA = mon_an_loai_mon.ID_CHINH_MA
            LEFT JOIN loai_mon ON mon_an_loai_mon.ID_CHINH_LM = loai_mon.ID_CHINH_LM
        `;

        const params = [];
        const conditions = [];

        if (search) {
            conditions.push("mon_an.TEN_MON_AN LIKE ?");
            params.push(`%${search}%`);
        }
        if (category) {
            conditions.push("loai_mon.ID_CHINH_LM = ?");
            params.push(category);
        }

        if (conditions.length > 0) {
            const whereClause = " WHERE " + conditions.join(" AND ");
            sql += whereClause;
            countSql += whereClause;
        }

        sql += " GROUP BY mon_an.ID_CHINH_MA";
        sql += " LIMIT ? OFFSET ?";
        params.push(limit, offset);

        const [monAnList, countResult, categories] = await Promise.all([
            query(sql, params),
            query(countSql, conditions),
            query("SELECT * FROM loai_mon")
        ]);

        const total = countResult[0]?.total || 0;
        const totalPages = Math.ceil(total / limit);

        const monAnListProcessed = monAnList.map(mon => {
        const fileName = mon.HINH_ANH_MA ? mon.HINH_ANH_MA.split('/').pop() : null;
        return {
            ...mon,
            HINH_ANH_MA: fileName ? `/Uploads/images/monan/${mon.ID_CHINH_MA}/${fileName}` : null
        };
    });


        res.render("index/index_layout", {
            viewPath: "mon-an",
            monAnList: monAnListProcessed,
            categories,
            filters: { search, category },
            pagination: { currentPage: page, totalPages },
            user: req.session.user
        });
    } catch (err) {
        console.error("Lỗi lấy danh sách món ăn:", err);
        res.status(500).send("Lỗi truy vấn dữ liệu");
    }
});


// Route danh sách công thức
router.get("/cong-thuc", async (req, res) => {
    try {

        const { category = "", ingredient = "", time = "", difficulty = "", monAnId = "", search = "" } = req.query;

        // Lấy thông tin món ăn nếu có monAnId
        let monAn = null;
        if (monAnId) {
            const monAnResult = await query("SELECT * FROM mon_an WHERE ID_CHINH_MA = ?", [monAnId]);
            if (monAnResult.length) {
                monAn = {
                    ...monAnResult[0],
                    HINH_ANH_MA: monAnResult[0].HINH_ANH_MA ? `/Uploads/images/monan/${monAnId}/${monAnResult[0].HINH_ANH_MA.split('/').pop()}` : null
                };
            }
        }

        // Truy vấn danh sách công thức
        let sqlRecipes = `
            SELECT cong_thuc.*, GROUP_CONCAT(loai_mon.ID_CHINH_LM) as loai_mon_ids, mon_an.TEN_MON_AN
            FROM cong_thuc
            LEFT JOIN mon_an ON cong_thuc.ID_CHINH_MA = mon_an.ID_CHINH_MA
            LEFT JOIN mon_an_loai_mon ON mon_an.ID_CHINH_MA = mon_an_loai_mon.ID_CHINH_MA
            LEFT JOIN loai_mon ON mon_an_loai_mon.ID_CHINH_LM = loai_mon.ID_CHINH_LM
            LEFT JOIN cong_thuc_nguyen_lieu ON cong_thuc.ID_CHINH_CT = cong_thuc_nguyen_lieu.ID_CHINH_CT
            LEFT JOIN nguyen_lieu ON cong_thuc_nguyen_lieu.ID_CHINH_NL = nguyen_lieu.ID_CHINH_NL
            WHERE cong_thuc.TRANG_THAI_DUYET_ = 'Đã duyệt'
        `;
        const params = [];
        const conditions = [];

        if (category) {
            conditions.push("loai_mon.ID_CHINH_LM = ?");
            params.push(category);
        }
        if (ingredient) {
            conditions.push("nguyen_lieu.TEN_NL LIKE ?");
            params.push(`%${ingredient}%`);
        }
        if (time) {
            conditions.push("TIME_TO_SEC(cong_thuc.THOI_GIAN_NAU) <= ?");
            params.push(parseInt(time) * 60);
        }
        if (difficulty) {
            conditions.push("cong_thuc.DO_KHO = ?");
            params.push(difficulty);
        }
        if (monAnId) {
            conditions.push("mon_an.ID_CHINH_MA = ?");
            params.push(monAnId);
        }
        if (search) {
            conditions.push("cong_thuc.TEN_CT LIKE ?");
            params.push(`%${search}%`);
        }

        if (conditions.length > 0) {
            sqlRecipes += " AND " + conditions.join(" AND ");
        }
        sqlRecipes += " GROUP BY cong_thuc.ID_CHINH_CT";

        let recipes = await query(sqlRecipes, params);
        const categories = await query("SELECT * FROM loai_mon");

        // Xử lý hình ảnh và đánh giá
        recipes = await Promise.all(recipes.map(async recipe => {
            const fileName = recipe.HINH_ANH_CT ? recipe.HINH_ANH_CT.split('/').pop() : null;
            const ratings = await query("SELECT AVG(DANH_GIA) as avg_rating FROM danh_gia WHERE ID_CHINH_CT = ?", [recipe.ID_CHINH_CT]);
            return {
                ...recipe,
                HINH_ANH_CT: fileName ? `/Uploads/images/congthuc/${recipe.ID_CHINH_CT}/${fileName}` : null,
                DANH_GIA: ratings[0].avg_rating ? parseFloat(ratings[0].avg_rating).toFixed(1) : "Chưa có",
                SO_PHAN_AN: recipe.SO_PHAN_AN || "2-4",
                THOI_GIAN_NAU: recipe.THOI_GIAN_NAU || 30,
                DO_KHO: recipe.DO_KHO || "Dễ"
            };
        }));

        // Xử lý yêu thích
        if (req.session.user) {
            const userId = req.session.user.ID_CHINH_ND;
            const favorites = await query("SELECT ID_CHINH_CT FROM yeu_thich WHERE ID_CHINH_ND = ?", [userId]);
            const favoriteSet = new Set(favorites.map(f => f.ID_CHINH_CT));
            recipes = recipes.map(recipe => ({
                ...recipe,
                isFavorite: favoriteSet.has(recipe.ID_CHINH_CT)
            }));
        }

        res.render("index/index_layout", {
            viewPath: "cong-thuc",
            recipes,
            categories,
            monAn,
            filters: { category, ingredient, time, difficulty, monAnId, search },
            user: req.session.user
        });
    } catch (err) {
        console.error("Lỗi lấy danh sách công thức:", err);
        res.status(500).send("Lỗi truy vấn dữ liệu");
    }
});
// Route chi tiết công thức
router.get("/cong-thuc/:id", async (req, res) => {
    const recipeId = req.params.id;
    if (!recipeId || isNaN(recipeId)) {
        return res.status(400).send("ID công thức không hợp lệ");
    }

    try {
        // Lấy chi tiết công thức
        const recipeResult = await query(
            `
            SELECT cong_thuc.*, nguoi_dung.TEN_NGUOI_DUNG AS tac_gia, nguoi_dung.AVARTAR_URL AS avatar_tac_gia
            FROM cong_thuc
            LEFT JOIN nguoi_dung ON cong_thuc.ID_CHINH_ND = nguoi_dung.ID_CHINH_ND
            WHERE cong_thuc.ID_CHINH_CT = ? AND cong_thuc.TRANG_THAI_DUYET_ = 'Đã duyệt'
            `,
            [recipeId]
        );

        if (!recipeResult.length) {
            return res.status(404).send("Không tìm thấy công thức");
        }

        const fileName = recipeResult[0].HINH_ANH_CT ? recipeResult[0].HINH_ANH_CT.split("/").pop() : null;
        const recipe = {
            ...recipeResult[0],
            HINH_ANH_CT: fileName ? `/Uploads/images/congthuc/${recipeId}/${fileName}` : null,
            avatar_tac_gia: recipeResult[0].avatar_tac_gia ? `/Uploads/images/users/${recipeResult[0].ID_CHINH_ND}/${recipeResult[0].avatar_tac_gia.split('/').pop()}` : "/Uploads/default-avatar.png",
            THOI_GIAN_NAU: recipeResult[0].THOI_GIAN_NAU || 30,
            SO_PHAN_AN: recipeResult[0].SO_PHAN_AN || "2-4",
            DO_KHO: recipeResult[0].DO_KHO || "Dễ"
        };

        // Lấy nguyên liệu
        const ingredients = await query(
            `
            SELECT nguyen_lieu.TEN_NL, cong_thuc_nguyen_lieu.SO_LUONG, nguyen_lieu.DON_VI, cong_thuc_nguyen_lieu.GHI_CHU
            FROM cong_thuc_nguyen_lieu
            JOIN nguyen_lieu ON cong_thuc_nguyen_lieu.ID_CHINH_NL = nguyen_lieu.ID_CHINH_NL
            WHERE cong_thuc_nguyen_lieu.ID_CHINH_CT = ?
            `,
            [recipeId]
        );

        // Lấy danh mục
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

        // Lấy bình luận và phản hồi
        const comments = await query(
            `
            SELECT binh_luan.ID_CHINH_BL, binh_luan.NOI_DUNG_BL, binh_luan.NGAY_TAO_BL, 
                   nguoi_dung.TEN_NGUOI_DUNG, nguoi_dung.AVARTAR_URL, nguoi_dung.ID_CHINH_ND
            FROM binh_luan
            JOIN nguoi_dung ON binh_luan.ID_CHINH_ND = nguoi_dung.ID_CHINH_ND
            WHERE binh_luan.ID_CHINH_CT = ?
            ORDER BY binh_luan.NGAY_TAO_BL DESC
            `,
            [recipeId]
        );

        const commentsWithReplies = await Promise.all(comments.map(async comment => {
            const replies = await query(
                `
                SELECT phan_hoi_binh_luan.NOI_DUNG_PH, phan_hoi_binh_luan.NGAY_TAO_PH, 
                       nguoi_dung.TEN_NGUOI_DUNG, nguoi_dung.AVARTAR_URL, nguoi_dung.ID_CHINH_ND
                FROM phan_hoi_binh_luan
                JOIN nguoi_dung ON phan_hoi_binh_luan.ID_CHINH_ND = nguoi_dung.ID_CHINH_ND
                WHERE phan_hoi_binh_luan.ID_CHINH_BL = ?
                ORDER BY phan_hoi_binh_luan.NGAY_TAO_PH DESC
                `,
                [comment.ID_CHINH_BL]
            );
            return {
                ...comment,
                AVARTAR_URL: comment.AVARTAR_URL ? `/Uploads/images/users/${comment.ID_CHINH_ND}/${comment.AVARTAR_URL.split('/').pop()}` : "/Uploads/default-avatar.png",
                replies: replies.map(reply => ({
                    ...reply,
                    AVARTAR_URL: reply.AVARTAR_URL ? `/Uploads/images/users/${reply.ID_CHINH_ND}/${reply.AVARTAR_URL.split('/').pop()}` : "/Uploads/default-avatar.png"
                }))
            };
        }));

        // Lấy số lượt yêu thích
        const likes = await query(
            "SELECT COUNT(*) AS total_likes FROM yeu_thich WHERE ID_CHINH_CT = ?",
            [recipeId]
        );

        // Lấy đánh giá trung bình
        const ratings = await query(
            "SELECT AVG(DANH_GIA) AS avg_rating, COUNT(*) AS total_ratings FROM danh_gia WHERE ID_CHINH_CT = ?",
            [recipeId]
        );

        // Kiểm tra yêu thích của người dùng
        let isFavorite = false;
        if (req.session.user) {
            const favorite = await query(
                "SELECT * FROM yeu_thich WHERE ID_CHINH_CT = ? AND ID_CHINH_ND = ?",
                [recipeId, req.session.user.ID_CHINH_ND]
            );
            isFavorite = favorite.length > 0;
        }

        res.render("index/index_layout", {
            viewPath: "cong-thuc-chi-tiet",
            recipe: { ...recipe, isFavorite },
            ingredients,
            categories,
            comments: commentsWithReplies,
            likes: likes[0].total_likes,
            ratings: {
                average: ratings[0].avg_rating ? parseFloat(ratings[0].avg_rating).toFixed(1) : "Chưa có",
                total: ratings[0].total_ratings
            },
            user: req.session.user
        });
    } catch (err) {
        console.error("Lỗi truy vấn chi tiết công thức:", err);
        res.status(500).send("Lỗi server");
    }
});

// Route yêu thích công thức
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

        if (existing.length) {
            await query(
                "DELETE FROM yeu_thich WHERE ID_CHINH_CT = ? AND ID_CHINH_ND = ?",
                [recipeId, userId]
            );
        } else {
            await query(
                "INSERT INTO yeu_thich (ID_CHINH_CT, ID_CHINH_ND, NGAY_TAO_YT) VALUES (?, ?, CURDATE())",
                [recipeId, userId]
            );
        }
        res.redirect(`/cong-thuc/${recipeId}`);
    } catch (err) {
        console.error("Lỗi xử lý yêu thích:", err);
        res.status(500).send("Lỗi server");
    }
});

// Route bình luận
router.post("/cong-thuc/:id/binh-luan", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send("Vui lòng đăng nhập để bình luận");
    }

    const recipeId = req.params.id;
    const { noi_dung } = req.body;
    const userId = req.session.user.ID_CHINH_ND;

    if (!recipeId || isNaN(recipeId) || !noi_dung) {
        return res.status(400).send("Dữ liệu không hợp lệ");
    }

    try {
        await query(
            "INSERT INTO binh_luan (ID_CHINH_CT, ID_CHINH_ND, NOI_DUNG_BL, NGAY_TAO_BL) VALUES (?, ?, ?, CURDATE())",
            [recipeId, userId, noi_dung]
        );
        res.redirect(`/cong-thuc/${recipeId}`);
    } catch (err) {
        console.error("Lỗi thêm bình luận:", err);
        res.status(500).send("Lỗi server");
    }
});

// Route phản hồi bình luận
router.post("/binh-luan/:id/phan-hoi", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send("Vui lòng đăng nhập để phản hồi");
    }

    const commentId = req.params.id;
    const { noi_dung } = req.body;
    const userId = req.session.user.ID_CHINH_ND;

    if (!commentId || isNaN(commentId) || !noi_dung) {
        return res.status(400).send("Dữ liệu không hợp lệ");
    }

    try {
        const comment = await query("SELECT ID_CHINH_CT FROM binh_luan WHERE ID_CHINH_BL = ?", [commentId]);
        if (!comment.length) {
            return res.status(404).send("Bình luận không tồn tại");
        }

        await query(
            "INSERT INTO phan_hoi_binh_luan (ID_CHINH_BL, ID_CHINH_ND, NOI_DUNG_PH, NGAY_TAO_PH) VALUES (?, ?, ?, CURDATE())",
            [commentId, userId, noi_dung]
        );
        res.redirect(`/cong-thuc/${comment[0].ID_CHINH_CT}`);
    } catch (err) {
        console.error("Lỗi thêm phản hồi:", err);
        res.status(500).send("Lỗi server");
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
            await query(
                "UPDATE danh_gia SET DANH_GIA = ?, NOI_DUNG_DG = ?, NGAY_TAO_DG = CURDATE() WHERE ID_CHINH_CT = ? AND ID_CHINH_ND = ?",
                [danh_gia, noi_dung || null, recipeId, userId]
            );
        } else {
            await query(
                "INSERT INTO danh_gia (ID_CHINH_CT, ID_CHINH_ND, DANH_GIA, NOI_DUNG_DG, NGAY_TAO_DG) VALUES (?, ?, ?, ?, CURDATE())",
                [recipeId, userId, danh_gia, noi_dung || null]
            );
        }
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
    let recipeId = null;
    try {
      if (!req.session.user || !req.session.user.ID_CHINH_ND) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập lại!' });
      }

      const normalizeArray = (input) => (Array.isArray(input) ? input : input ? [input] : []);

      console.log('req.body:', req.body); // Debug dữ liệu nhận được

    //   const {
    //     TEN_CT,
    //     MOTA,
    //     THOI_GIAN_NAU,
    //     DO_KHO,
    //     SO_PHAN_AN,
    //     id_chinh_ma: ID_CHINH_MA,
    //     'nguyen_lieu_id[]': nguyen_lieu_id,
    //     'ten_nguyen_lieu_khac[]': ten_nguyen_lieu_khac,
    //     'don_vi_khac[]': don_vi_khac,
    //     'so_luong[]': so_luong,
    //     'ghi_chu[]': ghi_chu,
    //     'ten_buoc[]': ten_buoc,
    //     'buoc_nau[]': buoc_nau,
    //   } = req.body;
 const {
        TEN_CT, MOTA, THOI_GIAN_NAU, DO_KHO, SO_PHAN_AN,
        id_chinh_ma: ID_CHINH_MA, nguyen_lieu_id, ten_nguyen_lieu_khac,
        don_vi_khac, so_luong, ghi_chu,
        ten_buoc, buoc_nau
      } = req.body;
      const userId = req.session.user.ID_CHINH_ND;

      const nguyenLieuIds = normalizeArray(nguyen_lieu_id);
      const tenNguyenLieuKhacs = normalizeArray(ten_nguyen_lieu_khac);
      const donViKhacs = normalizeArray(don_vi_khac);
      const soLuongs = normalizeArray(so_luong);
      const ghiChus = normalizeArray(ghi_chu);
    const tenBuocArray = normalizeArray(ten_buoc);
      const buocNauArray = normalizeArray(buoc_nau);


      console.log('tenBuocArray:', tenBuocArray); // Debug
      console.log('buocNauArray:', buocNauArray); // Debug

      // Validate bắt buộc
      if (!TEN_CT?.trim() || !MOTA?.trim() || !ID_CHINH_MA) {
        return res.status(400).json({ message: 'Tên công thức, mô tả và món ăn là bắt buộc!' });
      }

    if (
        tenBuocArray.length === 0 || buocNauArray.length === 0 ||
        tenBuocArray.length !== buocNauArray.length ||
        tenBuocArray.some(t => !t.trim()) || buocNauArray.some(b => !b.trim())
      ) {
        return res.status(400).json({ message: "Tên bước và mô tả bước là bắt buộc!" });
      }

      if (soLuongs.length === 0) {
        return res.status(400).json({ message: 'Vui lòng thêm ít nhất một nguyên liệu!' });
      }

      // Kiểm tra món ăn
      const [monAn] = await query(`SELECT ID_CHINH_MA FROM mon_an WHERE ID_CHINH_MA = ?`, [ID_CHINH_MA]);
      if (!monAn) return res.status(400).json({ message: 'Món ăn không tồn tại!' });

      const huongDan = tenBuocArray
        .map((ten, i) => `Bước ${i + 1}: ${ten.trim()} - ${buocNauArray[i].trim()}`)
        .join('\n\n');

      // Insert công thức
      const result = await query(
        `
        INSERT INTO cong_thuc 
        (ID_CHINH_ND, ID_CHINH_MA, TEN_CT, MOTA, HUONG_DAN, THOI_GIAN_NAU, DO_KHO, SO_PHAN_AN, VIDEO, HINH_ANH_CT, NGAY_TAO_CT, TRANG_THAI_DUYET_)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, CURDATE(), 'Đang chờ duyệt')
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
        ]
      );

      recipeId = result.insertId;

      // Upload file
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

      const finalImagePath = await saveFile('hinh_anh', 'images');
      const finalVideoPath = await saveFile('video_file', 'videos');

      await query(`UPDATE cong_thuc SET HINH_ANH_CT = ?, VIDEO = ? WHERE ID_CHINH_CT = ?`, [
        finalImagePath,
        finalVideoPath,
        recipeId,
      ]);

      // Xử lý nguyên liệu
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
        await query('DELETE FROM cong_thuc WHERE ID_CHINH_CT = ?', [recipeId]);
        return res.status(400).json({ message: 'Không có nguyên liệu hợp lệ để thêm!' });
      }

      const placeholders = nguyenLieuData.map(() => '(?, ?, ?, ?)').join(', ');
      const values = nguyenLieuData.flat();
      console.log('Nguyên liệu data:', nguyenLieuData); // Debug
      await query(
        `
        INSERT INTO cong_thuc_nguyen_lieu (ID_CHINH_CT, ID_CHINH_NL, SO_LUONG, GHI_CHU)
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE SO_LUONG = VALUES(SO_LUONG), GHI_CHU = VALUES(GHI_CHU)
      `,
        values
      );

      return res.status(201).json({ message: 'Đăng công thức thành công! Vui lòng chờ duyệt.', recipeId });
    } catch (err) {
      console.error('Lỗi server:', err);
      if (recipeId) {
        await query('DELETE FROM cong_thuc WHERE ID_CHINH_CT = ?', [recipeId]);
      }
      return res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
  }
);

router.get("/cong-thuc-cua-toi", ensureLoggedIn, async (req, res) => {
  const userId = req.session.user.ID_CHINH_ND;

  try {
    // Lấy danh sách công thức của người dùng
    const userRecipes = await query(
      `SELECT * FROM cong_thuc WHERE ID_CHINH_ND = ? ORDER BY NGAY_TAO_CT DESC`,
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
      viewPath: "cong-thuc-cua-toi", // đường dẫn view bên trong views/index/
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


router.post("/cong-thuc-cua-toi", ensureLoggedIn, upload.single("hinh_anh"), async (req, res) => {
  const userId = req.session.user.ID_CHINH_ND;
  const { TEN_CT, MOTA, THOI_GIAN_NAU, DO_KHO, SO_PHAN_AN, VIDEO, loai_mon, nguyen_lieu, HUONG_DAN } = req.body;
  const hinhAnh = req.file;

  if (!TEN_CT || !MOTA) return res.status(400).json({ message: "Tên công thức và mô tả là bắt buộc!" });

  try {
    let hinhAnhPath = null;

    const result = await query(`
      INSERT INTO cong_thuc (ID_CHINH_ND, TEN_CT, MOTA, HUONG_DAN, THOI_GIAN_NAU, DO_KHO, SO_PHAN_AN, VIDEO, HINH_ANH_CT, NGAY_TAO_CT, TRANG_THAI_DUYET_)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'Đang chờ duyệt')`, 
      [userId, TEN_CT, MOTA, HUONG_DAN || null, THOI_GIAN_NAU, DO_KHO, SO_PHAN_AN, VIDEO, null]);
    const recipeId = result.insertId;

    if (hinhAnh) {
      const targetDir = path.join("public", "uploads", "images", "congthuc", `${recipeId}`);
      await fs.mkdir(targetDir, { recursive: true });
      const fileExtension = path.extname(hinhAnh.originalname);
      const targetPath = path.join(targetDir, `image${fileExtension}`);
      await fs.rename(hinhAnh.path, targetPath);
      hinhAnhPath = `/uploads/images/congthuc/${recipeId}/image${fileExtension}`;

      await query("UPDATE cong_thuc SET HINH_ANH_CT = ? WHERE ID_CHINH_CT = ?", [hinhAnhPath, recipeId]);
    }

    if (Array.isArray(loai_mon) && loai_mon.length) {
      await query("INSERT INTO cong_thuc_loai_mon (ID_CHINH_CT, ID_CHINH_LM) VALUES ?", [loai_mon.map(lm => [recipeId, lm])]);
    }

    if (Array.isArray(nguyen_lieu) && nguyen_lieu.length) {
      await query("INSERT INTO cong_thuc_nguyen_lieu (ID_CHINH_CT, ID_CHINH_NL, SO_LUONG, GHI_CHU) VALUES ?", 
        [nguyen_lieu.map(nl => [recipeId, nl.id, nl.so_luong, nl.ghi_chu || ""])]);
    }

    res.status(201).json({ message: "Thêm công thức thành công!", recipeId });
  } catch (err) {
    console.error("Lỗi khi thêm công thức:", err);
    res.status(500).json({ message: "Lỗi server khi thêm công thức" });
  }
});
module.exports = router;