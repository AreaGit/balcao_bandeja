const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/category.controllers");

router.get("/", categoryController.getCategories);
router.post("/", categoryController.createCategory);
router.delete("/:id", categoryController.deleteCategory);

module.exports = router;
