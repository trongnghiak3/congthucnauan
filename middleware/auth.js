const ensureLoggedIn = (req, res, next) => {
    try {
        if (!req.session.user || req.session.user.status !== "active") {
            if (req.xhr || req.headers.accept.includes("json")) {
                return res.status(401).json({ error: "Vui lòng đăng nhập để thực hiện hành động này" });
            }
            return res.redirect("/login"); // Fixed redirect path
        }
        next();
    } catch (error) {
        console.error("Error in ensureLoggedIn:", error);
        res.status(500).json({ error: "Lỗi server" });
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