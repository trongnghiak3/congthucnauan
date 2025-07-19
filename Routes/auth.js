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
            "nguoidung", // Fixed to string "user"
            "hoatdong", // Default status
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
// GET - hiển thị form đổi mật khẩu
// GET - đổi mật khẩu dùng chung
// GET - Hiển thị form đổi mật khẩu
router.get('/doi-mat-khau', async (req, res) => {
    // Đảm bảo req.session.user tồn tại. Nếu không, chuyển hướng.
    const user = req.session.user;
    if (!user) {
        console.log('User not in session, redirecting to /dang-nhap');
        return res.redirect('/dang-nhap');
    }

    try {
        const rows = await query('SELECT * FROM NGUOI_DUNG WHERE ID_CHINH_ND = ?', [user.ID_CHINH_ND]);
        if (rows.length === 0) {
            console.log('User not found in database for ID:', user.ID_CHINH_ND);
            return res.status(404).send('Không tìm thấy người dùng');
        }

        const userData = rows[0];
        const isAdmin = userData.VAI_TRO === 'admin';

        const viewParams = {
            title: 'Đổi Mật Khẩu',
            user: userData,
            error: null,
            success: null,
            // Nếu là admin, content sẽ chỉ đường dẫn của partial để admin layout include
            content: isAdmin ? 'auth/doi-mat-khau' : undefined,
            // Nếu không phải admin (user thường), viewPath sẽ chỉ đường dẫn của partial để index_layout include
            // Đường dẫn này phải tương đối từ thư mục của index_layout.ejs
            viewPath: !isAdmin ? '../auth/doi-mat-khau' : undefined // <-- ĐÃ SỬA CHỮA ĐƯỜNG DẪN
        };

        console.log('User role:', isAdmin ? 'admin' : 'user');
        console.log('Rendering layout:', isAdmin ? 'admin/admin' : 'index/index_layout');
        console.log('Include path (passed to layout):', isAdmin ? viewParams.content : viewParams.viewPath);

        res.render(isAdmin ? 'admin/admin' : 'index/index_layout', viewParams);
    } catch (err) {
        console.error('Error in GET /doi-mat-khau:', err);
        res.status(500).send('Lỗi máy chủ');
    }
});

// POST - Xử lý đổi mật khẩu dùng chung
router.post('/doi-mat-khau', async (req, res) => {
    // Đảm bảo req.session.user tồn tại. Nếu không, chuyển hướng.
    const user = req.session.user;
    if (!user) {
        console.log('User not in session for POST, redirecting to /dang-nhap');
        return res.redirect('/dang-nhap');
    }

    const { matKhauCu, matKhauMoi, xacNhanMatKhau } = req.body;
    console.log('Received change password request:', { matKhauCu, matKhauMoi, xacNhanMatKhau });

    try {
        const rows = await query('SELECT * FROM NGUOI_DUNG WHERE ID_CHINH_ND = ?', [user.ID_CHINH_ND]);
        if (rows.length === 0) {
            console.log('User not found in database for ID:', user.ID_CHINH_ND);
            return res.status(404).send('Không tìm thấy người dùng');
        }

        const currentUser = rows[0];
        const isAdmin = currentUser.VAI_TRO === 'admin';

        // So sánh mật khẩu cũ
        // Sử dụng bcrypt.compare cho mật khẩu đã hash
        const match = await bcrypt.compare(matKhauCu, currentUser.MAT_KHAU);
        if (!match) {
            console.log('Current password mismatch for user:', currentUser.ID_CHINH_ND);
            const viewParams = {
                title: 'Đổi Mật Khẩu',
                user: currentUser,
                error: 'Mật khẩu hiện tại không đúng',
                success: null,
                content: isAdmin ? 'auth/doi-mat-khau' : undefined,
                viewPath: !isAdmin ? '../auth/doi-mat-khau' : undefined // <-- ĐÃ SỬA CHỮA ĐƯỜNG DẪN
            };
            return res.render(isAdmin ? 'admin/admin' : 'index/index_layout', viewParams);
        }

        // Kiểm tra xác nhận mật khẩu mới
        if (matKhauMoi !== xacNhanMatKhau) {
            console.log('New password confirmation mismatch for user:', currentUser.ID_CHINH_ND);
            const viewParams = {
                title: 'Đổi Mật Khẩu',
                user: currentUser,
                error: 'Xác nhận mật khẩu không khớp',
                success: null,
                content: isAdmin ? 'auth/doi-mat-khau' : undefined,
                viewPath: !isAdmin ? '../auth/doi-mat-khau' : undefined // <-- ĐÃ SỬA CHỮA ĐƯỜNG DẪN
            };
            return res.render(isAdmin ? 'admin/admin' : 'index/index_layout', viewParams);
        }

        // Hash mật khẩu mới và cập nhật vào DB
        const hashed = await bcrypt.hash(matKhauMoi, 10);
        await query(
            'UPDATE NGUOI_DUNG SET MAT_KHAU = ?, NGAY_CAP_NHAT_ND = NOW() WHERE ID_CHINH_ND = ?',
            [hashed, user.ID_CHINH_ND]
        );

        console.log('Password changed successfully for user:', currentUser.ID_CHINH_ND);
        const viewParams = {
            title: 'Đổi Mật Khẩu',
            user: currentUser,
            error: null,
            success: 'Đổi mật khẩu thành công!',
            content: isAdmin ? 'auth/doi-mat-khau' : undefined,
            viewPath: !isAdmin ? '../auth/doi-mat-khau' : undefined // <-- ĐÃ SỬA CHỮA ĐƯỜNG DẪN
        };
        res.render(isAdmin ? 'admin/admin' : 'index/index_layout', viewParams);
    } catch (err) {
        console.error('Error in POST /doi-mat-khau:', err);
        res.status(500).send('Lỗi máy chủ');
    }
});

module.exports = router;