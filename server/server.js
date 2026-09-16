import express from "express";

// const express = require("express");
const app = express();
// const port = process.env.PORT || 3000;
const PORT = 5000;

app.get("/", (req, res) => {
  res.json({
    message: "School Records System API",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
