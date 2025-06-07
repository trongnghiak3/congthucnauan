const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { query } = require("../config/db");

const toBase64 = (buffer) => (buffer ? `data:image/png;base64,${buffer.toString("base64")}` : null);

router.get("/login", (req, res) => {
  res.render("index/login", { title: "Đăng nhập", message: "Xin chào EJS!" });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const results = await query("SELECT * FROM nguoi_dung WHERE email = ?", [email]);
    if (!results.length) return res.status(401).send("Email hoặc mật khẩu không đúng");

    const nguoiDung = results[0];
    const isMatch = await bcrypt.compare(password, nguoiDung.mat_khau);
    if (!isMatch) return res.status(401).send("Email hoặc mật khẩu không đúng");

    req.session.user = {
      id: nguoiDung.id_chinh,
      email: nguoiDung.email,
      username: nguoiDung.ten_dang_nhap,
      avatar: toBase64(nguoiDung.avatar) || "/uploads/default-avatar.png",
      role: nguoiDung.vai_tro,
    };

    // Kiểm tra role, nếu admin thì redirect sang /admin
    if (nguoiDung.vai_tro === 'admin') {
      return res.redirect("/admin");
    }

    // Nếu không phải admin thì redirect về trang chủ
    res.redirect("/");
  } catch (err) {
    console.error("Lỗi truy vấn:", err);
    res.status(500).send("Lỗi server");
  }
});


router.get("/register", (req, res) => {
  res.render("index/register", { title: "Đăng ký" });
});

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).send("Vui lòng nhập đầy đủ thông tin.");

  try {
    const hash = await bcrypt.hash(password, 10);
    await query("INSERT INTO nguoi_dung (ten_dang_nhap, email, mat_khau) VALUES (?, ?, ?)", [name, email, hash]);
    res.redirect("/login");
  } catch (err) {
    console.error("Lỗi lưu người dùng:", err);
    res.status(500).send("Lỗi server");
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Lỗi khi đăng xuất:", err);
    res.redirect("/login");
  });
});

module.exports = router;