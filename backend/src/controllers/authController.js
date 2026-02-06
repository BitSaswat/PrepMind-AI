// TODO: This controller will be implemented with PostgreSQL in the future
// Currently, all authentication is handled by Firebase on the frontend

exports.signup = async (req, res) => {
  try {
    // TODO: Implement PostgreSQL user creation
    res.status(501).json({
      message: "Backend authentication not yet implemented. Using Firebase for now."
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    // TODO: Implement PostgreSQL user authentication
    res.status(501).json({
      message: "Backend authentication not yet implemented. Using Firebase for now."
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
