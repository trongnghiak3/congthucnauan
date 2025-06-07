const express = require("express");
const router = express.Router();
const { query } = require("../config/db");
const { ensureLoggedIn } = require("../middleware/auth");

// Hàm chuyển buffer sang base64 (chỉ dùng cho avatar, không dùng cho ảnh công thức)
const toBase64 = (buffer) => (buffer ? `data:image/jpeg;base64,${buffer.toString("base64")}` : null);

// Route trang chủ
router.get("/", async (req, res) => {
    try {
        if (req.user && req.user.role === "admin") {
            return res.redirect("/admin");
        }

        const categories = await query("SELECT * FROM loai_mon");
        res.render("index/index_layout", {
            title: "Trang chủ",
            categories,
            viewPath: "home",
            user: req.session.user
        });
    } catch (err) {
        console.error("Lỗi lấy danh mục món:", err);
        res.status(500).send("Lỗi server");
    }
});

// Route danh sách công thức
router.get("/cong-thuc", async (req, res) => {
    try {
        const categoryId = req.query.category || "";
        let sqlRecipes = `
            SELECT cong_thuc.*, 
                   GROUP_CONCAT(loai_mon.id_chinh) as loai_mon_ids
            FROM cong_thuc
            LEFT JOIN cong_thuc_loai_mon ON cong_thuc.id_chinh = cong_thuc_loai_mon.cong_thuc_id
            LEFT JOIN loai_mon ON cong_thuc_loai_mon.loai_mon_id = loai_mon.id_chinh
        `;
        let params = [];
        if (categoryId) {
            sqlRecipes += " WHERE loai_mon.id_chinh = ?";
            params.push(categoryId);
        }
        sqlRecipes += " GROUP BY cong_thuc.id_chinh";

        let recipes = await query(sqlRecipes, params);
        const categories = await query("SELECT * FROM loai_mon");

        // Tạo đường dẫn ảnh chính xác, tránh double slash
        recipes = recipes.map(recipe => {
            let imagePath = null;
            if (recipe.hinh_anh) {
                // Lấy tên file từ cột hinh_anh và nối với đường dẫn cơ bản
                const fileName = recipe.hinh_anh.split('/').pop(); // Lấy phần tên file (ví dụ: 640768a69f9d93b95b28a1c0_GreenFalafel-9.jpg)
                imagePath = `/uploads/images/congthuc/${recipe.id_chinh}/${fileName}`;
            }
            console.log(`Đường dẫn ảnh cho công thức ${recipe.id_chinh}: ${imagePath}`); // Debug
            return {
                ...recipe,
                hinh_anh: imagePath,
            };
        });

        if (req.session.user) {
            const userId = req.session.user.id;
            const favorites = await query(
                "SELECT cong_thuc_id FROM yeu_thich WHERE nguoi_dung_id = ?",
                [userId]
            );
            const favoriteSet = new Set(favorites.map(f => f.cong_thuc_id));
            recipes = recipes.map(recipe => ({
                ...recipe,
                isFavorite: favoriteSet.has(recipe.id_chinh),
            }));
        }

        res.render("index/index_layout", {
            viewPath: "recipes",
            recipes,
            categories,
            user: req.session.user
        });
    } catch (err) {
        console.error("Lỗi lấy dữ liệu:", err);
        res.status(500).send("Lỗi truy vấn dữ liệu");
    }
});
// Route chi tiết công thức
// Route chi tiết công thức
router.get("/cong-thuc/:id", async (req, res) => {
  const recipeId = req.params.id;
  if (!recipeId || isNaN(recipeId)) {
    return res.status(400).send("ID công thức không hợp lệ");
  }

  try {
    const recipeResult = await query(
      `
      SELECT cong_thuc.*, nguoi_dung.ten_dang_nhap AS tac_gia, nguoi_dung.avatar AS avatar_tac_gia
      FROM cong_thuc
      LEFT JOIN nguoi_dung ON cong_thuc.nguoi_dung_id = nguoi_dung.id_chinh
      WHERE cong_thuc.id_chinh = ?
      `,
      [recipeId]
    );

    if (!recipeResult.length) {
      return res.status(404).send("Không tìm thấy công thức");
    }

    // Lấy tên file ảnh tránh lỗi đường dẫn
    const hinhAnhFileName = recipeResult[0].hinh_anh
      ? recipeResult[0].hinh_anh.split("/").pop()
      : null;

    const recipe = {
      ...recipeResult[0],
      tac_gia: recipeResult[0].tac_gia || "Không rõ",
      hinh_anh: hinhAnhFileName
        ? `/uploads/images/congthuc/${recipeId}/${hinhAnhFileName}`
        : null,
      avatar_tac_gia: recipeResult[0].avatar_tac_gia
        ? toBase64(recipeResult[0].avatar_tac_gia)
        : "/uploads/default-avatar.png",
    };

    const ingredients = await query(
      `
      SELECT nguyen_lieu.ten_nguyen_lieu, cong_thuc_nguyen_lieu.so_luong, nguyen_lieu.don_vi, cong_thuc_nguyen_lieu.ghi_chu
      FROM cong_thuc_nguyen_lieu
      JOIN nguyen_lieu ON cong_thuc_nguyen_lieu.nguyen_lieu_id = nguyen_lieu.id_chinh
      WHERE cong_thuc_nguyen_lieu.cong_thuc_id = ?
      `,
      [recipeId]
    );

    const categories = await query(
      `
      SELECT loai_mon.ten_loai
      FROM cong_thuc_loai_mon
      JOIN loai_mon ON cong_thuc_loai_mon.loai_mon_id = loai_mon.id_chinh
      WHERE cong_thuc_loai_mon.cong_thuc_id = ?
      `,
      [recipeId]
    );

    const comments = await query(
      `
      SELECT binh_luan.noi_dung, binh_luan.ngay_tao, nguoi_dung.ten_dang_nhap, nguoi_dung.avatar 
      FROM binh_luan
      JOIN nguoi_dung ON binh_luan.nguoi_dung_id = nguoi_dung.id_chinh
      WHERE binh_luan.cong_thuc_id = ?
      ORDER BY binh_luan.ngay_tao DESC
      `,
      [recipeId]
    );

    // Chuyển avatar comment sang base64 hoặc ảnh mặc định
    const commentsWithAvatar = comments.map((comment) => ({
      ...comment,
      avatar: comment.avatar ? toBase64(comment.avatar) : "/uploads/default-avatar.png",
    }));

    const likes = await query(
      "SELECT COUNT(*) AS total_likes FROM yeu_thich WHERE cong_thuc_id = ?",
      [recipeId]
    );

    res.render("index/index_layout", {
      viewPath: "recipe-detail",
      recipe,
      ingredients,
      categories,
      comments: commentsWithAvatar,
      likes: likes[0].total_likes,
      user: req.session ? req.session.user : null,
    });
  } catch (err) {
    console.error("Lỗi truy vấn:", err);
    res.status(500).send("Lỗi server");
  }
});

// Route yêu thích công thức
router.post("/cong-thuc/:id/yeu-thich", ensureLoggedIn, async (req, res) => {
    const recipeId = req.params.id;
    const userId = req.session.user.id;

    try {
        const results = await query("SELECT * FROM yeu_thich WHERE cong_thuc_id = ? AND nguoi_dung_id = ?", [recipeId, userId]);
        if (results.length > 0) {
            await query("DELETE FROM yeu_thich WHERE cong_thuc_id = ? AND nguoi_dung_id = ?", [recipeId, userId]);
            return res.json({ success: true, isFavorite: false });
        } else {
            await query("INSERT INTO yeu_thich (cong_thuc_id, nguoi_dung_id) VALUES (?, ?)", [recipeId, userId]);
            return res.json({ success: true, isFavorite: true });
        }
    } catch (err) {
        console.error("Lỗi truy vấn yeu_thich:", err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// Route bình luận
router.post("/cong-thuc/:id/binh-luan", ensureLoggedIn, async (req, res) => {
    const recipeId = req.params.id;
    const { comment } = req.body;
    const userId = req.session.user.id;

    if (!comment || comment.trim() === "") return res.status(400).send("Vui lòng nhập bình luận.");

    try {
        await query("INSERT INTO binh_luan (cong_thuc_id, nguoi_dung_id, noi_dung) VALUES (?, ?, ?)", [recipeId, userId, comment]);
        res.redirect(`/cong-thuc/${recipeId}`);
    } catch (err) {
        console.error("Lỗi khi lưu bình luận:", err);
        res.status(500).send("Lỗi server");
    }
});

// Route phản hồi bình luận
router.post("/binh-luan/:id/phan-hoi", ensureLoggedIn, async (req, res) => {
    const binhLuanId = req.params.id;
    const { noi_dung } = req.body;
    const userId = req.session.user.id;

    if (!noi_dung || noi_dung.trim() === "") return res.status(400).send("Vui lòng nhập nội dung phản hồi.");

    try {
        await query("INSERT INTO phan_hoi_binh_luan (binh_luan_id, nguoi_dung_id, noi_dung) VALUES (?, ?, ?)", [binhLuanId, userId, noi_dung]);
        res.redirect("back");
    } catch (err) {
        console.error("Lỗi khi lưu phản hồi:", err);
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

module.exports = router;