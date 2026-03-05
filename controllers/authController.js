exports.adminLogin = (req, res) => {
  const { name, password } = req.body;

  const adminName = process.env.ADMIN_NAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (name === adminName && password === adminPassword) {
    return res.json({ success: true, role: "admin" });
  } else {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }
};





 