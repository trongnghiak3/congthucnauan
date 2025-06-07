const ensureLoggedIn = (req, res, next) => {
    if (!req.session.user) {
        if (req.xhr || req.headers.accept.includes("json")) {
            // Nếu là request AJAX/fetch, trả về JSON
            return res.status(401).json({ error: "Vui lòng đăng nhập để thực hiện hành động này" });
        }
        // Nếu là request thông thường, redirect
        return res.redirect("/dang-nhap");
    }
    next();
};

module.exports = { ensureLoggedIn };
  
  const ensureAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).send("Bạn không có quyền truy cập trang này.");
    }
    next();
  };
  
  module.exports = { ensureLoggedIn, ensureAdmin };