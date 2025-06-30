const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { query } = require("../config/db");

const toBase64 = (buffer) => (buffer ? `data:image/png;base64,${buffer.toString("base64")}` : null);

router.get("/login", (req, res) => {
    res.render("index/dang-nhap", { title: "Đăng nhập", message: "Xin chào EJS!" });
});

// POST /login - Xử lý đăng nhập
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const results = await query("SELECT * FROM nguoi_dung WHERE EMAIL_ = ?", [email]);
        if (!results.length) {
            return res.status(401).send("Thông tin đăng nhập không đúng");
        }

        const nguoiDung = results[0];
        const isMatch = await bcrypt.compare(password, nguoiDung.MAT_KHAU);
        if (!isMatch) {
            return res.status(401).send("Thông tin đăng nhập không đúng");
        }

        req.session.user = {
            ID_CHINH_ND: nguoiDung.ID_CHINH_ND, // Sửa tên trường
            email: nguoiDung.EMAIL_,
            username: nguoiDung.TEN_NGUOI_DUNG,
            avatar: nguoiDung.AVARTAR_URL || "/Uploads/default-avatar.png",
            role: nguoiDung.VAI_TRO,
            status: nguoiDung.TRANG_THAI,
        };

        console.log("Session after login:", req.session); // Log để kiểm tra
        console.log("User saved to session:", req.session.user);

        if (nguoiDung.VAI_TRO === "admin") {
            return res.redirect("/admin");
        }
        res.redirect("/");
    } catch (err) {
        console.error("Lỗi truy vấn:", err);
        res.status(500).send("Lỗi server");
    }
});

router.get("/register", (req, res) => {
    res.render("index/dang-ky", { title: "Đăng ký" });
});

router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).send("Vui lòng nhập đầy đủ thông tin.");
    }
    const [exists] = await query("SELECT * FROM nguoi_dung WHERE EMAIL_ = ?", [email]);
    if (exists) {
        return res.status(409).send("Email đã được sử dụng.");
    }
    try {
        const hash = await bcrypt.hash(password, 10);
        await query("INSERT INTO nguoi_dung (TEN_NGUOI_DUNG, EMAIL_, MAT_KHAU, VAI_TRO, TRANG_THAI) VALUES (?, ?, ?, ?, ?)", [
            name,
            email,
            hash,
            "user", // Fixed to string "user"
            "active", // Default status
        ]);
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