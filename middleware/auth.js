const ensureLoggedIn = (req, res, next) => {
    try {
        // Kiểm tra xem user có tồn tại và có trạng thái "hoatdong" không
        if (!req.session.user || !req.session.user.ID_CHINH_ND || req.session.user.status !== "hoatdong") {
            // Kiểm tra yêu cầu AJAX hoặc yêu cầu JSON
            const isJsonRequest = req.xhr || (req.headers.accept && req.headers.accept.includes("json"));
            
            if (isJsonRequest) {
                return res.status(401).json({ error: "Vui lòng đăng nhập để thực hiện hành động này" });
            }
            
            // Lưu URL hiện tại để chuyển hướng sau khi đăng nhập
            req.session.returnTo = req.originalUrl;
            return res.redirect("/dang-nhap");
        }
        
        next();
    } catch (error) {
        console.error("Lỗi trong ensureLoggedIn:", {
            message: error.message,
            stack: error.stack,
            url: req.originalUrl
        });
        res.status(500).json({ error: "Lỗi server, vui lòng thử lại sau" });
    }
};
const ensureAdmin = (req, res, next) => {
    try {
        if (!req.session.user || req.session.user.role !== "admin") {
            if (req.xhr || req.headers.accept.includes("json")) {
                return res.status(403).json({ error: "Bạn không có quyền truy cập." });
            }
            return res.status(403).send("Bạn không có quyền truy cập trang này.");
        }
        next();
    } catch (error) {
        console.error("Error in ensureAdmin:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};

module.exports = { ensureLoggedIn, ensureAdmin };