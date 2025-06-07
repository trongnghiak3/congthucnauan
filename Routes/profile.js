const express = require("express");
const router = express.Router();
const { query } = require("../config/db");
const { ensureLoggedIn } = require("../middleware/auth");
const multer = require("multer");

const upload = multer({ dest: "public/uploads/" });
const toBase64 = (buffer) => (buffer ? `data:image/jpeg;base64,${buffer.toString("base64")}` : null);

router.get("/profile", ensureLoggedIn, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const userRecipes = await query("SELECT * FROM cong_thuc WHERE nguoi_dung_id = ?", [userId]).then(results =>
      results.map(recipe => ({ ...recipe, hinh_anh: toBase64(recipe.hinh_anh) }))
    );

    const favoriteRecipes = await query(`
      SELECT c.* FROM yeu_thich y
      JOIN cong_thuc c ON y.cong_thuc_id = c.id_chinh 
      WHERE y.nguoi_dung_id = ?`, [userId]).then(results =>
      results.map(recipe => ({ ...recipe, hinh_anh: toBase64(recipe.hinh_anh) }))
    );

    const categories = await query("SELECT id_chinh AS loai_mon_id, ten_loai FROM loai_mon");

    res.render("index/profile", {
      user: req.session.user,
      userRecipes,
      favoriteRecipes,
      categories,
    });
  } catch (err) {
    console.error("Lỗi truy vấn:", err);
    res.status(500).send("Lỗi server");
  }
});

router.get("/profile/baidang", ensureLoggedIn, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const recipes = await query("SELECT * FROM cong_thuc WHERE nguoi_dung_id = ?", [userId]);
    const recipeIds = recipes.map(recipe => recipe.id_chinh);
    const categories = await query("SELECT id_chinh AS loai_mon_id, ten_loai FROM loai_mon");

    if (recipeIds.length === 0) {
      return res.render("profile", { title: "Bài Đăng", recipes: [], categories });
    }

    const ingredients = await query(`
      SELECT 
        ctl.cong_thuc_id, 
        nl.id_chinh AS nguyen_lieu_id,  
        nl.ten_nguyen_lieu AS ten_nguyen_lieu, 
        ctl.so_luong AS so_luong,  
        nl.don_vi AS don_vi,      
        ctl.ghi_chu AS ghi_chu
      FROM cong_thuc_nguyen_lieu ctl
      JOIN nguyen_lieu nl ON ctl.nguyen_lieu_id = nl.id_chinh
      WHERE ctl.cong_thuc_id IN (${recipeIds.join(",")})`);

    const recipeWithDetails = recipes.map(recipe => ({
      ...recipe,
      ingredients: ingredients.filter(ing => ing.cong_thuc_id === recipe.id_chinh),
    }));

    res.render("index/profile", { title: "Bài Đăng", recipes: recipeWithDetails, categories });
  } catch (err) {
    console.error("Lỗi truy vấn:", err);
    res.status(500).send("Lỗi server");
  }
});

router.post("/cong-thuc-cua-toi", ensureLoggedIn, upload.single("hinh_anh"), async (req, res) => {
  const userId = req.session.user.id;
  const { ten_cong_thuc, mo_ta, thoi_gian_nau, do_kho, so_phan_an, video_url, loai_mon, nguyen_lieu } = req.body;
  const hinhAnh = req.file;

  if (!ten_cong_thuc || !mo_ta) return res.status(400).json({ message: "Tên công thức và mô tả là bắt buộc!" });

  try {
    let hinhAnhPath = null;
    if (hinhAnh) {
      hinhAnhPath = `/uploads/${hinhAnh.filename}`;
    }

    const result = await query(`
      INSERT INTO cong_thuc (nguoi_dung_id, ten_cong_thuc, mo_ta, thoi_gian_nau, do_kho, so_phan_an, video_url, hinh_anh)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [userId, ten_cong_thuc, mo_ta, thoi_gian_nau, do_kho, so_phan_an, video_url, hinhAnhPath]);
    const recipeId = result.insertId;

    if (Array.isArray(loai_mon) && loai_mon.length) {
      await query("INSERT INTO cong_thuc_loai_mon (cong_thuc_id, loai_mon_id) VALUES ?", [loai_mon.map(lm => [recipeId, lm])]);
    }

    if (Array.isArray(nguyen_lieu) && nguyen_lieu.length) {
      await query("INSERT INTO cong_thuc_nguyen_lieu (cong_thuc_id, nguyen_lieu_id, so_luong, ghi_chu) VALUES ?", 
        [nguyen_lieu.map(nl => [recipeId, nl.id, nl.so_luong, nl.ghi_chu || ""])]);
    }

    res.status(201).json({ message: "Thêm công thức thành công!", recipeId });
  } catch (err) {
    console.error("Lỗi khi thêm công thức:", err);
    res.status(500).json({ message: "Lỗi server khi thêm công thức" });
  }
});

router.put("/cong-thuc-cua-toi/:id", ensureLoggedIn, async (req, res) => {
  const { id } = req.params;
  const { ten_cong_thuc, mo_ta, thoi_gian_nau, do_kho, so_phan_an } = req.body;

  try {
    await query(
      "UPDATE cong_thuc SET ten_cong_thuc = ?, mo_ta = ?, thoi_gian_nau = ?, do_kho = ?, so_phan_an = ? WHERE id_chinh = ? AND nguoi_dung_id = ?",
      [ten_cong_thuc, mo_ta, thoi_gian_nau, do_kho, so_phan_an, id, req.session.user.id]
    );
    res.json({ message: "Sửa công thức thành công!" });
  } catch (err) {
    console.error("Lỗi khi sửa công thức:", err);
    res.status(500).send("Lỗi khi sửa công thức");
  }
});

router.delete("/cong-thuc-cua-toi/:id", ensureLoggedIn, async (req, res) => {
  const { id } = req.params;

  try {
    await query("DELETE FROM cong_thuc WHERE id_chinh = ? AND nguoi_dung_id = ?", [id, req.session.user.id]);
    res.json({ message: "Xóa công thức thành công!" });
  } catch (err) {
    console.error("Lỗi khi xóa công thức:", err);
    res.status(500).send("Lỗi khi xóa công thức");
  }
});

module.exports = router;