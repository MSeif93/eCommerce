import express from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import db from "./src/config/db.js";
import dotenv from "dotenv";
import helmet from "helmet";
import expressLayouts from "express-ejs-layouts";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import cron from "node-cron";
import flash from "connect-flash";
import passport from "passport";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import initializePassport from "./src/config/passport.js";

dotenv.config();
const app = express();
const PgSession = pgSession(session);

// Check if required environment variables are set
if (!process.env.SESSION_SECRET) {
  console.error("❌ SESSION_SECRET environment variable is not set!");
  process.exit(1);
}

if (
  !process.env.PG_USER ||
  !process.env.PG_HOST ||
  !process.env.PG_DATABASE ||
  !process.env.PG_PASSWORD ||
  !process.env.PG_PORT
) {
  console.error(
    "❌ Database environment variables are not properly configured!"
  );
  process.exit(1);
}

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src", "views"));
app.set("layout", "layout");

app.use(expressLayouts);
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(express.json({ limit: "10kb" }));
app.use(helmet());
app.use(express.static(path.join(process.cwd(), "src", "public")));

app.use(
  session({
    store: new PgSession({
      pool: db,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Initialize passport configuration
initializePassport(passport);

// Make user available to all views
app.use(async (req, res, next) => {
  try {
    console.log("SESSION CONTENT:", req.session);

    res.locals.user = req.user;

    // Get pending orders count for all views
    if (req.user) {
      const pendingOrdersResult = await db.query(`
        SELECT COUNT(*) FROM orders 
        WHERE status = 'pending'
      `);
      res.locals.pendingOrders = pendingOrdersResult.rows[0].count;
    } else {
      res.locals.pendingOrders = 0;
    }
  } catch (err) {
    console.error("Error in user middleware:", err);
    res.locals.user = null;
    res.locals.pendingOrders = 0;
  }

  next();
});

const uploadDir = path.join(process.cwd(), "src", "public", "uploads");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e4);
    cb(null, name + "-" + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per file
  },
});

async function logAdminAction({
  admin_id,
  admin_name,
  action,
  table_name,
  record_id = null,
  message = null,
}) {
  try {
    await db.query(
      `INSERT INTO admin_logs (admin_id, admin_name, action, table_name, record_id, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [admin_id, admin_name, action, table_name, record_id, message]
    );
  } catch (err) {
    console.error("❌ Failed to log admin action:", err);
  }
}

app.get("/", async (req, res) => {
  const categoriesResult = await db.query(`
    SELECT 
      c.id AS category_id,
      c.main_category,
      c.description,
      i.icon_class
    FROM categories c
    LEFT JOIN icon_options i ON c.icon_id = i.id
    ORDER BY c.id
  `);

  res.render("home", {
    title: "Home",
    products: [],
    user: req.user,
    categories: categoriesResult.rows,
  });
});

// GET /login
app.get("/login", (req, res) => {
  res.render("login", {
    error: req.flash("error"),
    user: req.user,
  });
});

// POST /login
app.post("/login", (req, res, next) => {
  console.log("🔐 Login attempt for email:", req.body.email);
  console.log("📝 Request body:", {
    email: req.body.email,
    password: req.body.password ? "***" : "empty",
  });

  // Basic validation
  if (!req.body.email || !req.body.password) {
    console.log("❌ Validation failed: Missing email or password");
    req.flash("error", "Email and password are required");
    return res.redirect("/login");
  }

  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("❌ Database/Server error during login:", err);
      req.flash("error", "Server error occurred. Please try again.");
      return res.redirect("/login");
    }

    if (!user) {
      console.log(
        "❌ Authentication failed:",
        info?.message || "Unknown error"
      );
      req.flash("error", info?.message || "Invalid credentials");
      return res.redirect("/login");
    }

    console.log(
      "✅ User authenticated successfully:",
      user.email,
      "Role:",
      user.role
    );

    req.logIn(user, (err) => {
      if (err) {
        console.error("❌ Session error during login:", err);
        req.flash("error", "Session error occurred");
        return res.redirect("/login");
      }

      console.log("✅ User logged in successfully, redirecting to /dashboard");
      res.redirect("/dashboard");
    });
  })(req, res, next);
});

// GET /logout
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

// GET /dashboard
app.get("/dashboard", async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.redirect("/login");
    }

    const [
      adminsResult,
      shippingOptionsResult,
      productsResult,
      ordersResult,
      totalActiveProducts,
      totalOrders,
      totalIncome,
      lowStock,
      monthlySales,
    ] = await Promise.all([
      db.query("SELECT * FROM admins ORDER BY created_at DESC"),
      db.query("SELECT * FROM shipping_options ORDER BY name"),
      db.query(
        "SELECT * FROM products WHERE is_active = true ORDER BY created_at DESC"
      ),
      db.query("SELECT * FROM orders ORDER BY created_at DESC"),
      db.query("SELECT COUNT(*) FROM products WHERE is_active = true"),
      db.query("SELECT COUNT(*) FROM orders"),
      db.query("SELECT SUM(total) FROM orders"),
      db.query(
        "SELECT * FROM products WHERE stock <= 5 AND is_active = true ORDER BY stock ASC"
      ),
      db.query(`
          SELECT COUNT(*) FROM orders 
          WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
        `),
    ]);

    const salesData = await db.query(`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') AS month,
        SUM(total) AS total
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month
    `);

    // Fetch categories
    const categoriesResult = await db.query(`
      SELECT 
        c.id AS category_id,
        c.main_category,
        c.description,
        c.icon_id,
        c.created_at AS category_created_at
      FROM categories c
      ORDER BY c.id
    `);

    // Fetch all subcategories
    const subcategoriesResult = await db.query(
      `SELECT sc.id, sc.category_id, sc.sub_category
       FROM sub_categories sc`
    );
    // Group subcategories by category_id
    const subcategoriesByCategory = {};
    subcategoriesResult.rows.forEach((sub) => {
      if (!subcategoriesByCategory[sub.category_id]) {
        subcategoriesByCategory[sub.category_id] = [];
      }
      subcategoriesByCategory[sub.category_id].push(sub.sub_category);
    });
    // Attach subcategories to each category
    const categories = categoriesResult.rows.map((cat) => ({
      ...cat,
      subcategories: subcategoriesByCategory[cat.category_id] || [],
    }));

    // Process sales data for chart
    const sales = {
      labels: salesData.rows.map((row) => row.month),
      data: salesData.rows.map((row) => parseFloat(row.total)),
    };

    // Sort: superadmin first, then by name (case-insensitive)
    let admins = adminsResult.rows;
    admins.sort((a, b) => {
      if (a.role === "superadmin" && b.role !== "superadmin") return -1;
      if (a.role !== "superadmin" && b.role === "superadmin") return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

    res.render("adminDashboard", {
      admins: admins,
      shippingOptions: shippingOptionsResult.rows,
      products: productsResult.rows,
      orders: ordersResult.rows,
      summary: {
        totalActiveProducts: totalActiveProducts.rows[0].count,
        totalOrders: totalOrders.rows[0].count,
        totalIncome: totalIncome.rows[0].sum || 0,
        monthlySales: monthlySales.rows[0].count,
        lowStock: lowStock.rows.length,
      },
      sales: sales,
      lowStockProducts: lowStock.rows,
      categories,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).send("Something went wrong.");
  }
});

// GET /admin/products
app.get("/admin/products", async (req, res) => {
  const limit = 20;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;
  const search = req.query.search || "";
  const selectedCategory = req.query.category || "";
  const selectedStock = req.query.stock || "";
  const selectedRating = req.query.rating || "";
  const showInactive = req.query.showInactive || "active"; // Default to active only

  try {
    // Build the WHERE clause based on filters
    let whereConditions = ["p.name ILIKE $1"];
    let queryParams = [`%${search}%`];
    let paramIndex = 2;

    // Handle product status filter
    if (showInactive === "active") {
      whereConditions.push(`p.is_active = true`);
    } else if (showInactive === "inactive") {
      whereConditions.push(`p.is_active = false`);
    }
    // If showInactive === "all", don't add any filter condition

    if (selectedCategory) {
      whereConditions.push(`c.id = $${paramIndex}`);
      queryParams.push(selectedCategory);
      paramIndex++;
    }

    if (selectedStock) {
      switch (selectedStock) {
        case "in_stock":
          whereConditions.push(`p.stock > 5`);
          break;
        case "low_stock":
          whereConditions.push(`p.stock <= 5 AND p.stock > 0`);
          break;
        case "out_of_stock":
          whereConditions.push(`p.stock = 0`);
          break;
      }
    }

    if (selectedRating) {
      whereConditions.push(`COALESCE(AVG(r.rating), 0) >= $${paramIndex}`);
      queryParams.push(parseInt(selectedRating));
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    const query = `
      SELECT 
        p.*,
        c.main_category as category_name,
        sc.sub_category as subcategory_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = true LIMIT 1) AS main_image,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM products p
      JOIN sub_categories sc ON p.subcategory_id = sc.id
      JOIN categories c ON sc.category_id = c.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE ${whereClause}
      GROUP BY p.id, c.main_category, sc.sub_category
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT p.id) FROM products p
      JOIN sub_categories sc ON p.subcategory_id = sc.id
      JOIN categories c ON sc.category_id = c.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE ${whereClause}
    `;

    // Get products
    const { rows: products } = await db.query(query, [
      ...queryParams,
      limit,
      offset,
    ]);

    // Get total count
    const totalCountResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(totalCountResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // Get categories for filter dropdown
    const categoriesResult = await db.query(`
      SELECT DISTINCT id, main_category 
      FROM categories 
      ORDER BY main_category
    `);

    // Get statistics
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_products,
        COUNT(CASE WHEN stock <= 5 AND stock > 0 THEN 1 END) as low_stock_products,
        SUM(CASE WHEN is_active = true THEN cost * stock ELSE 0 END) as total_value
      FROM products
    `);

    // Get review statistics
    const reviewStatsResult = await db.query(`
      SELECT 
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as total_reviews
      FROM reviews r
      JOIN products p ON r.product_id = p.id
      WHERE p.is_active = true
    `);

    const stats = statsResult.rows[0];
    const reviewStats = reviewStatsResult.rows[0];

    res.render("adminProducts", {
      products,
      search,
      selectedCategory,
      selectedStock,
      selectedRating,
      showInactive,
      currentPage: page,
      totalPages,
      categories: categoriesResult.rows,
      totalProducts: stats.total_products,
      activeProducts: stats.active_products,
      lowStockProducts: stats.low_stock_products,
      totalValue: parseFloat(stats.total_value || 0),
      averageRating: parseFloat(reviewStats.average_rating || 0),
      totalReviews: parseInt(reviewStats.total_reviews || 0),
      success: req.flash("success"),
      error: req.flash("error"),
    });
  } catch (err) {
    console.error("❌ Error loading admin products:", err);
    res.status(500).render("error", {
      error: "Failed to load products",
      details: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : null,
    });
  }
});

// API endpoint for fetching subcategories
app.get("/api/subcategories/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const result = await db.query(
      `SELECT sc.id, sc.sub_category 
       FROM sub_categories sc 
       JOIN categories c ON sc.category_id = c.id 
       WHERE c.main_category = $1 
       ORDER BY sc.sub_category`,
      [category]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching subcategories:", err);
    res.status(500).json({ error: "Failed to fetch subcategories" });
  }
});

// GET /admin/products/edit/:id
app.get("/admin/products/edit/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const productRes = await db.query(
      `
      SELECT p.*, c.main_category, sc.sub_category
      FROM products p
      JOIN sub_categories sc ON p.subcategory_id = sc.id
      JOIN categories c ON sc.category_id = c.id
      WHERE p.id = $1
    `,
      [id]
    );

    const imagesRes = await db.query(
      "SELECT * FROM product_images WHERE product_id = $1",
      [id]
    );

    const categories = await db.query("SELECT * FROM categories");

    // Get subcategories for the current product's category
    const subcategories = await db.query(
      `SELECT sc.id, sc.sub_category 
       FROM sub_categories sc 
       JOIN categories c ON sc.category_id = c.id 
       WHERE c.main_category = $1 
       ORDER BY sc.sub_category`,
      [productRes.rows[0].main_category]
    );

    if (!productRes.rows.length) return res.status(404).send("Not found");

    res.render("editProduct", {
      product: productRes.rows[0],
      images: imagesRes.rows,
      categories: categories.rows,
      subcategories: subcategories.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading edit page");
  }
});

// POST /admin/products/edit/:id
app.post(
  "/admin/products/edit/:id",
  upload.fields([
    { name: "main_image", maxCount: 1 },
    { name: "additional_images", maxCount: 4 },
  ]),
  async (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock, main_category, sub_category } =
      req.body;

    try {
      // Determine the subcategory
      const subcatRes = await db.query(
        "SELECT sc.id FROM sub_categories sc JOIN categories c ON sc.category_id = c.id WHERE c.main_category = $1 AND sc.sub_category = $2",
        [main_category, sub_category]
      );
      const subcategory_id = subcatRes.rows[0]?.id;

      if (!subcategory_id) {
        req.flash("error", "Invalid category/subcategory combination");
        return res.redirect(`/admin/products/edit/${id}`);
      }

      // Update product data
      await db.query(
        "UPDATE products SET name=$1, description=$2, price=$3, stock=$4, subcategory_id=$5 WHERE id=$6",
        [name, description, price, stock, subcategory_id, id]
      );

      // Update main image (if a new image is uploaded)
      if (req.files["main_image"]) {
        // Delete the old image from the database and file system
        const oldMain = await db.query(
          "SELECT image_url FROM product_images WHERE product_id = $1 AND is_main = true",
          [id]
        );
        if (oldMain.rows.length) {
          const oldPath = path.join("uploads", oldMain.rows[0].image_url);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        const filename = req.files["main_image"][0].filename;
        await db.query(
          "DELETE FROM product_images WHERE product_id = $1 AND is_main = true",
          [id]
        );
        await db.query(
          "INSERT INTO product_images (product_id, image_url, is_main) VALUES ($1, $2, true)",
          [id, filename]
        );

        await logAdminAction({
          admin_id: req.user.id,
          admin_name: req.user.name,
          action: "update",
          table_name: "product_images",
          record_id: id,
          message: `Updated main image for product ${name}`,
        });
      }

      // Add new additional images
      if (
        req.files["additional_images"] &&
        req.files["additional_images"].length > 0
      ) {
        const oldImages = await db.query(
          "SELECT image_url FROM product_images WHERE product_id = $1 AND is_main = false",
          [id]
        );
        if (oldImages.rows.length) {
          for (const img of oldImages.rows) {
            const oldPath = path.join("uploads", img.image_url);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }
          await db.query(
            "DELETE FROM product_images WHERE product_id = $1 AND is_main = false",
            [id]
          );
        }

        const images = req.files["additional_images"];

        for (let img of images) {
          await db.query(
            "INSERT INTO product_images (product_id, image_url, is_main) VALUES ($1, $2, false)",
            [id, img.filename]
          );
        }

        await logAdminAction({
          admin_id: req.user.id,
          admin_name: req.user.name,
          action: "update",
          table_name: "product_images",
          record_id: id,
          message: `Replaced the additional images for product ${name}`,
        });
      }

      // Log the main update
      await logAdminAction({
        admin_id: req.user.id,
        admin_name: req.user.name,
        action: "update",
        table_name: "products",
        record_id: id,
        message: `Updated product: ${name}`,
      });

      res.redirect("/admin/products");
    } catch (err) {
      console.error("❌ Error updating product:", err);
      res.status(500).render("error", {
        error: "Failed to update product",
        errorCode: "500",
        details: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : null,
      });
    }
  }
);

// POST /admin/products/delete/:id
app.post("/admin/products/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || null;

    // Get product name before deactivation for logging
    const productRes = await db.query(
      "SELECT name FROM products WHERE id = $1",
      [id]
    );

    if (!productRes.rows.length) {
      req.flash("error", "Product not found");
      return res.redirect("/admin/products");
    }

    const productName = productRes.rows[0].name;

    // Deactivate the product instead of deleting it
    await db.query("UPDATE products SET is_active = false WHERE id = $1", [id]);

    // Log the action
    await logAdminAction({
      admin_id: adminId,
      admin_name: req.user?.name || "Unknown",
      action: "deactivate",
      table_name: "products",
      record_id: id,
      message: `Deactivated product: ${productName}`,
    });

    req.flash("success", `Product "${productName}" deactivated successfully`);
    res.redirect("/admin/products");
  } catch (err) {
    console.error("❌ Error deactivating product:", err);
    req.flash("error", "Failed to deactivate product. Please try again.");
    res.redirect("/admin/products");
  }
});

// POST /admin/products/reactivate/:id
app.post("/admin/products/reactivate/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || null;

    // Get product name before reactivation for logging
    const productRes = await db.query(
      "SELECT name FROM products WHERE id = $1",
      [id]
    );

    if (!productRes.rows.length) {
      req.flash("error", "Product not found");
      return res.redirect("/admin/products");
    }

    const productName = productRes.rows[0].name;

    // Reactivate the product
    await db.query("UPDATE products SET is_active = true WHERE id = $1", [id]);

    // Log the action
    await logAdminAction({
      admin_id: adminId,
      admin_name: req.user?.name || "Unknown",
      action: "reactivate",
      table_name: "products",
      record_id: id,
      message: `Reactivated product: ${productName}`,
    });

    req.flash("success", `Product "${productName}" reactivated successfully`);
    res.redirect("/admin/products");
  } catch (err) {
    console.error("❌ Error reactivating product:", err);
    req.flash("error", "Failed to reactivate product. Please try again.");
    res.redirect("/admin/products");
  }
});

// GET /admin/products/view/:id
app.get("/admin/products/view/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  try {
    const { id } = req.params;

    const productResult = await db.query(
      `
      SELECT 
        p.*,
        c.main_category as category_name,
        sc.sub_category as subcategory_name
      FROM products p
      JOIN sub_categories sc ON p.subcategory_id = sc.id
      JOIN categories c ON sc.category_id = c.id
      WHERE p.id = $1
    `,
      [id]
    );

    if (!productResult.rows.length) {
      req.flash("error", "Product not found");
      return res.redirect("/admin/products");
    }

    const product = productResult.rows[0];

    // Get all images for the product
    const imagesResult = await db.query(
      `
      SELECT * FROM product_images 
      WHERE product_id = $1 
      ORDER BY is_main DESC, id ASC
    `,
      [id]
    );

    res.render("viewProduct", {
      title: `View Product - ${product.name}`,
      product,
      images: imagesResult.rows,
      user: req.user,
    });
  } catch (err) {
    console.error("❌ Error viewing product:", err);
    req.flash("error", "Failed to load product details");
    res.redirect("/admin/products");
  }
});

// GET /admin/products/add
app.get("/admin/products/add", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  // Fetch only categories for dropdown (subcategories loaded via API)
  const categories = await db.query(
    "SELECT * FROM categories ORDER BY main_category ASC"
  );
  res.render("addProduct", {
    user: req.user,
    categories: categories.rows,
    error: req.flash("error")[0] || "",
    success: req.flash("success")[0] || "",
  });
});

// POST /admin/products/add
app.post(
  "/admin/products/add",
  upload.fields([
    { name: "main_image", maxCount: 1 },
    { name: "additional_images", maxCount: 4 },
  ]),
  async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect("/login");
    }
    try {
      const { name, description, cost, price, stock, sub_category } = req.body;
      if (
        !name ||
        !price ||
        !stock ||
        !cost ||
        !sub_category ||
        !req.files["main_image"]
      ) {
        req.flash("error", "All required fields must be filled.");
        return res.redirect("/admin/products/add");
      }
      // Insert product
      const result = await db.query(
        "INSERT INTO products (name, description, cost, price, stock, subcategory_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [name, description, cost, price, stock, sub_category]
      );
      const productId = result.rows[0].id;
      // Save main image
      const mainImage = req.files["main_image"][0];
      await db.query(
        "INSERT INTO product_images (product_id, image_url, is_main) VALUES ($1, $2, true)",
        [productId, mainImage.filename]
      );
      // Save additional images
      if (req.files["additional_images"]) {
        for (const img of req.files["additional_images"]) {
          await db.query(
            "INSERT INTO product_images (product_id, image_url, is_main) VALUES ($1, $2, false)",
            [productId, img.filename]
          );
        }
      }

      // Log the main product creation action
      await logAdminAction({
        admin_id: req.user.id,
        admin_name: req.user.name,
        action: "create",
        table_name: "products",
        record_id: productId,
        message: `Created new product: ${name}`,
      });

      // Log image upload actions
      await logAdminAction({
        admin_id: req.user.id,
        admin_name: req.user.name,
        action: "create",
        table_name: "product_images",
        record_id: productId,
        message: `Uploaded main image for product: ${name}`,
      });

      if (
        req.files["additional_images"] &&
        req.files["additional_images"].length > 0
      ) {
        await logAdminAction({
          admin_id: req.user.id,
          admin_name: req.user.name,
          action: "create",
          table_name: "product_images",
          record_id: productId,
          message: `Uploaded ${req.files["additional_images"].length} additional images for product: ${name}`,
        });
      }

      req.flash("success", "Product added successfully!");
      res.redirect("/admin/products");
    } catch (err) {
      console.error("Error adding product:", err);
      req.flash("error", "Failed to add product. Please try again.");
      res.redirect("/admin/products/add");
    }
  }
);

// GET /categories (public route for users)
// app.get("/categories", async (req, res) => {
//   try {
//     const categoriesResult = await db.query(`
//       SELECT
//         c.id,
//         c.main_category,
//         c.description,
//         c.created_at,
//         i.icon_class,
//         COALESCE(p.product_count, 0) AS product_count,
//         COALESCE(s.subcategory_count, 0) AS subcategory_count
//       FROM categories c
//       LEFT JOIN icon_options i ON c.icon_id = i.id
//       LEFT JOIN (
//         SELECT sc.category_id, COUNT(p.id) AS product_count
//         FROM products p
//         JOIN sub_categories sc ON p.subcategory_id = sc.id
//         GROUP BY sc.category_id
//       ) p ON c.id = p.category_id
//       LEFT JOIN (
//         SELECT category_id, COUNT(*) AS subcategory_count
//         FROM sub_categories
//         GROUP BY category_id
//       ) s ON c.id = s.category_id
//       ORDER BY c.main_category ASC
//     `);

//     res.render("categories", {
//       title: "Categories",
//       user: req.user,
//       categories: categoriesResult.rows,
//     });
//   } catch (err) {
//     console.error("Error loading categories:", err);
//     res.status(500).send("Something went wrong loading categories.");
//   }
// });

// GET /admin/categories (admin route for management)
app.get("/admin/categories", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  if (req.user.role !== "superadmin") {
    return res.status(403).render("error", {
      error: "Unauthorized",
      errorCode: "403",
      errorDetails: "You are not authorized to access this page.",
    });
  }

  try {
    const categoriesResult = await db.query(`
      SELECT
        c.id,
        c.main_category,
        c.description,
        c.created_at,
        i.icon_class,
        COALESCE(p.product_count, 0) AS product_count,
        COALESCE(s.subcategory_count, 0) AS subcategory_count
      FROM categories c
      LEFT JOIN icon_options i ON c.icon_id = i.id
      LEFT JOIN (
        SELECT sc.category_id, COUNT(p.id) AS product_count
        FROM products p
        JOIN sub_categories sc ON p.subcategory_id = sc.id
        GROUP BY sc.category_id
      ) p ON c.id = p.category_id
      LEFT JOIN (
        SELECT category_id, COUNT(*) AS subcategory_count
        FROM sub_categories
        GROUP BY category_id
      ) s ON c.id = s.category_id
      ORDER BY c.main_category ASC
    `);

    // Fetch all subcategories
    const subcategoriesResult = await db.query(
      `SELECT sc.id, sc.category_id, sc.sub_category, COUNT(p.id) AS product_count
       FROM sub_categories sc
       LEFT JOIN products p ON p.subcategory_id = sc.id
       GROUP BY sc.id, sc.category_id, sc.sub_category`
    );
    // Group subcategories by category_id and store id+name
    const subcategoriesByCategory = {};
    subcategoriesResult.rows.forEach((sub) => {
      if (!subcategoriesByCategory[sub.category_id]) {
        subcategoriesByCategory[sub.category_id] = [];
      }
      subcategoriesByCategory[sub.category_id].push({
        id: sub.id,
        name: sub.sub_category,
        product_count: parseInt(sub.product_count, 10) || 0,
      });
    });
    // Attach subcategory names to each category
    categoriesResult.rows.forEach((cat) => {
      cat.subcategory_names = subcategoriesByCategory[cat.id] || [];
    });

    // Flatten for table: each subcategory gets its own row, and add rowspan for first row of each category
    const categoryRows = [];
    categoriesResult.rows.forEach((cat) => {
      const subcatCount = cat.subcategory_names.length;
      if (subcatCount > 0) {
        cat.subcategory_names.forEach((subcat, idx) => {
          categoryRows.push({
            ...cat,
            subcategory_name: subcat.name,
            subcategory_id: subcat.id,
            subcategory_product_count: subcat.product_count,
            isFirst: idx === 0,
            rowspan: idx === 0 ? subcatCount : undefined,
          });
        });
      } else {
        categoryRows.push({
          ...cat,
          subcategory_name: null,
          subcategory_id: null,
          subcategory_product_count: 0,
          isFirst: true,
          rowspan: 1,
        });
      }
    });

    // Fetch total products and subcategories
    const totalProductsResult = await db.query("SELECT COUNT(*) FROM products");
    const totalSubcategoriesResult = await db.query(
      "SELECT COUNT(*) FROM sub_categories"
    );
    const totalProducts = parseInt(totalProductsResult.rows[0].count, 10);
    const totalSubcategories = parseInt(
      totalSubcategoriesResult.rows[0].count,
      10
    );

    const iconData = await db.query(
      `SELECT * FROM icon_options ORDER BY category`
    );

    const iconCategories = await db.query(
      `SELECT DISTINCT category FROM icon_options`
    );

    // Group icons by category
    const iconGroups = {};
    iconData.rows.forEach((icon) => {
      if (!iconGroups[icon.category]) {
        iconGroups[icon.category] = [];
      }
      iconGroups[icon.category].push(icon);
    });

    res.render("adminCategories", {
      title: "Categories Management",
      user: req.user,
      categories: categoriesResult.rows,
      categoryRows,
      iconOptions: iconGroups,
      iconCategories: iconCategories.rows,
      allIcons: iconData.rows, // For JavaScript to populate second dropdown
      totalProducts,
      totalSubcategories,
    });
  } catch (err) {
    console.error("Error loading categories:", err);
    res.status(500).send("Something went wrong loading categories.");
  }
});

// POST /admin/categories/add
app.post("/admin/categories/add", async (req, res) => {
  if (!req.isAuthenticated()) {
    if (req.headers["content-type"]?.includes("application/json")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return res.redirect("/login");
  }

  if (req.user.role !== "superadmin") {
    if (req.headers["content-type"]?.includes("application/json")) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.status(403).send("Unauthorized");
  }

  try {
    const { main_category, description, icon_id } = req.body;

    // Validate required fields
    if (!main_category || !description || !icon_id) {
      if (req.headers["content-type"]?.includes("application/json")) {
        return res.status(400).json({ error: "All fields are required" });
      }
      req.flash("error", "All fields are required");
      return res.redirect("/admin/categories");
    }

    // Check if category already exists
    const existingCategory = await db.query(
      "SELECT id FROM categories WHERE main_category = $1",
      [main_category]
    );

    if (existingCategory.rows.length > 0) {
      if (req.headers["content-type"]?.includes("application/json")) {
        return res.status(400).json({ error: "Category already exists" });
      }
      req.flash("error", "Category already exists");
      return res.redirect("/admin/categories");
    }

    // Insert new category
    const result = await db.query(
      "INSERT INTO categories (main_category, description, icon_id) VALUES ($1, $2, $3) RETURNING id",
      [main_category, description, icon_id]
    );

    // Log the action
    await logAdminAction({
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: "create",
      table_name: "categories",
      record_id: result.rows[0].id,
      message: `Created new category: ${main_category}`,
    });

    if (req.headers["content-type"]?.includes("application/json")) {
      return res
        .status(200)
        .json({ success: true, message: "Category created successfully" });
    }

    req.flash("success", "Category created successfully");
    res.redirect("/admin/categories");
  } catch (err) {
    console.error("Error creating category:", err);
    if (req.headers["content-type"]?.includes("application/json")) {
      return res.status(500).json({ error: "Failed to create category" });
    }
    req.flash("error", "Failed to create category");
    res.redirect("/admin/categories");
  }
});

// POST /admin/categories/edit
app.post("/admin/categories/edit", async (req, res) => {
  if (!req.isAuthenticated()) {
    if (req.headers["content-type"]?.includes("application/json")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return res.redirect("/login");
  }

  if (req.user.role !== "superadmin") {
    if (req.headers["content-type"]?.includes("application/json")) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.status(403).send("Unauthorized");
  }

  try {
    const { category_id, main_category, description, icon_id } = req.body;

    // Validate required fields
    if (!category_id || !main_category || !description || !icon_id) {
      if (req.headers["content-type"]?.includes("application/json")) {
        return res.status(400).json({ error: "All fields are required" });
      }
      req.flash("error", "All fields are required");
      return res.redirect("/admin/categories");
    }

    // Check if category name already exists (excluding current category)
    const existingCategory = await db.query(
      "SELECT id FROM categories WHERE main_category = $1 AND id != $2",
      [main_category, category_id]
    );

    if (existingCategory.rows.length > 0) {
      if (req.headers["content-type"]?.includes("application/json")) {
        return res.status(400).json({ error: "Category name already exists" });
      }
      req.flash("error", "Category name already exists");
      return res.redirect("/admin/categories");
    }

    // Update category
    await db.query(
      "UPDATE categories SET main_category = $1, description = $2, icon_id = $3 WHERE id = $4",
      [main_category, description, icon_id, category_id]
    );

    // Log the action
    await logAdminAction({
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: "update",
      table_name: "categories",
      record_id: category_id,
      message: `Updated category: ${main_category}`,
    });

    if (req.headers["content-type"]?.includes("application/json")) {
      return res
        .status(200)
        .json({ success: true, message: "Category updated successfully" });
    }

    req.flash("success", "Category updated successfully");
    res.redirect("/admin/categories");
  } catch (err) {
    console.error("Error updating category:", err);
    if (req.headers["content-type"]?.includes("application/json")) {
      return res.status(500).json({ error: "Failed to update category" });
    }
    req.flash("error", "Failed to update category");
    res.redirect("/admin/categories");
  }
});

// POST /admin/subcategories/add
app.post("/admin/subcategories/add", async (req, res) => {
  const isAjax =
    req.headers["content-type"]?.includes("application/json") ||
    req.headers["accept"]?.includes("application/json");

  if (!req.isAuthenticated()) {
    if (isAjax) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return res.redirect("/login");
  }

  if (req.user.role !== "superadmin") {
    if (isAjax) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.status(403).send("Unauthorized");
  }

  try {
    const { category_id, sub_category } = req.body;

    // Validate required fields
    if (!category_id || !sub_category) {
      if (isAjax) {
        return res
          .status(400)
          .json({ error: "Category and subcategory name are required" });
      }
      req.flash("error", "Category and subcategory name are required");
      return res.redirect("/admin/categories");
    }

    // Check if subcategory already exists for this category
    const existingSubcategory = await db.query(
      "SELECT id FROM sub_categories WHERE category_id = $1 AND sub_category = $2",
      [category_id, sub_category]
    );

    if (existingSubcategory.rows.length > 0) {
      if (isAjax) {
        return res
          .status(400)
          .json({ error: "Subcategory already exists for this category" });
      }
      req.flash("error", "Subcategory already exists for this category");
      return res.redirect("/admin/categories");
    }

    // Insert new subcategory
    const result = await db.query(
      "INSERT INTO sub_categories (category_id, sub_category) VALUES ($1, $2) RETURNING id",
      [category_id, sub_category]
    );

    // Log the action
    await logAdminAction({
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: "create",
      table_name: "sub_categories",
      record_id: result.rows[0].id,
      message: `Created new subcategory: ${sub_category}`,
    });

    if (isAjax) {
      return res
        .status(200)
        .json({ success: true, message: "Subcategory created successfully" });
    }

    req.flash("success", "Subcategory created successfully");
    res.redirect("/admin/categories");
  } catch (err) {
    console.error("Error creating subcategory:", err);
    if (isAjax) {
      return res
        .status(500)
        .json({ error: "Failed to add subcategory. Please try again." });
    }
    req.flash("error", "Failed to add subcategory. Please try again.");
    res.redirect("/admin/categories");
  }
});

// POST /admin/subcategories/edit
app.post("/admin/subcategories/edit", async (req, res) => {
  const isAjax =
    req.headers["content-type"]?.includes("application/json") ||
    req.headers["accept"]?.includes("application/json");

  if (!req.isAuthenticated()) {
    if (isAjax) return res.status(401).json({ error: "Unauthorized" });
    return res.redirect("/login");
  }
  if (req.user.role !== "superadmin") {
    if (isAjax) return res.status(403).json({ error: "Forbidden" });
    return res.status(403).send("Unauthorized");
  }
  try {
    const { subcategory_id, new_name } = req.body;
    if (!subcategory_id || !new_name) {
      if (isAjax)
        return res
          .status(400)
          .json({ error: "Subcategory ID and new name are required" });
      req.flash("error", "Subcategory ID and new name are required");
      return res.redirect("/admin/categories");
    }
    // Check if subcategory exists
    const subcatRes = await db.query(
      "SELECT * FROM sub_categories WHERE id = $1",
      [subcategory_id]
    );
    if (subcatRes.rows.length === 0) {
      if (isAjax)
        return res.status(404).json({ error: "Subcategory not found" });
      req.flash("error", "Subcategory not found");
      return res.redirect("/admin/categories");
    }
    const category_id = subcatRes.rows[0].category_id;
    // Check for duplicate name in same category
    const dupRes = await db.query(
      "SELECT id FROM sub_categories WHERE category_id = $1 AND sub_category = $2 AND id != $3",
      [category_id, new_name, subcategory_id]
    );
    if (dupRes.rows.length > 0) {
      if (isAjax)
        return res.status(400).json({
          error:
            "A subcategory with this name already exists in this category.",
        });
      req.flash(
        "error",
        "A subcategory with this name already exists in this category."
      );
      return res.redirect("/admin/categories");
    }
    await db.query(
      "UPDATE sub_categories SET sub_category = $1 WHERE id = $2",
      [new_name, subcategory_id]
    );
    await logAdminAction({
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: "update",
      table_name: "sub_categories",
      record_id: subcategory_id,
      message: `Renamed subcategory to: ${new_name}`,
    });
    if (isAjax)
      return res.json({
        success: true,
        message: "Subcategory updated successfully",
      });
    req.flash("success", "Subcategory updated successfully");
    res.redirect("/admin/categories");
  } catch (err) {
    console.error("Error editing subcategory:", err);
    if (isAjax)
      return res.status(500).json({ error: "Failed to edit subcategory." });
    req.flash("error", "Failed to edit subcategory.");
    res.redirect("/admin/categories");
  }
});

// POST /admin/subcategories/delete
app.post("/admin/subcategories/delete", async (req, res) => {
  const isAjax =
    req.headers["content-type"]?.includes("application/json") ||
    req.headers["accept"]?.includes("application/json");

  if (!req.isAuthenticated()) {
    if (isAjax) return res.status(401).json({ error: "Unauthorized" });
    return res.redirect("/login");
  }

  if (req.user.role !== "superadmin") {
    if (isAjax) return res.status(403).json({ error: "Forbidden" });
    return res.status(403).send("Unauthorized");
  }

  try {
    const { category_id } = req.body;
    if (!category_id) {
      if (isAjax)
        return res.status(400).json({ error: "Category ID is required" });
      req.flash("error", "Category ID is required");
      return res.redirect("/admin/categories");
    }

    // Check for related products (through subcategories)
    const prodResult = await db.query(
      `SELECT COUNT(*) FROM products p
   JOIN sub_categories sc ON p.subcategory_id = sc.id
   WHERE sc.category_id = $1`,
      [category_id]
    );
    if (parseInt(prodResult.rows[0].count, 10) > 0) {
      if (isAjax)
        return res
          .status(400)
          .json({ error: "Cannot delete category with existing products." });
      req.flash("error", "Cannot delete category with existing products.");
      return res.redirect("/admin/categories");
    }

    // Check for related subcategories
    const subcatResult = await db.query(
      "SELECT COUNT(*) FROM sub_categories WHERE category_id = $1",
      [category_id]
    );
    if (parseInt(subcatResult.rows[0].count, 10) > 0) {
      if (isAjax)
        return res.status(400).json({
          error: "Cannot delete category with existing subcategories.",
        });
      req.flash("error", "Cannot delete category with existing subcategories.");
      return res.redirect("/admin/categories");
    }

    // Delete the category
    await db.query("DELETE FROM categories WHERE id = $1", [category_id]);

    // Log the action
    await logAdminAction({
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: "delete",
      table_name: "categories",
      record_id: category_id,
      message: `Deleted category ID: ${category_id}`,
    });

    if (isAjax)
      return res.json({
        success: true,
        message: "Category deleted successfully",
      });
    req.flash("success", "Category deleted successfully");
    res.redirect("/admin/categories");
  } catch (err) {
    console.error("Error deleting category:", err);
    if (isAjax)
      return res.status(500).json({ error: "Failed to delete category." });
    req.flash("error", "Failed to delete category.");
    res.redirect("/admin/categories");
  }
});

// GET /admin/shipping (superadmin only)
app.get("/admin/shipping", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "superadmin") {
      return res.status(403).send("Unauthorized");
    }
    const shippingOptionsResult = await db.query(
      "SELECT * FROM shipping_options ORDER BY name"
    );
    // Only call req.flash("error") and req.flash("success") ONCE each
    const error = req.flash("error")[0] || "";
    const success = req.flash("success")[0] || "";
    res.render("adminShipping", {
      user: req.user,
      shippingOptions: shippingOptionsResult.rows,
      error,
      success,
      flashError: error,
      flashSuccess: success,
    });
  } catch (err) {
    console.error("Error loading shipping options:", err);
    res.status(500).send("Failed to load shipping options.");
  }
});

// POST /admin/shipping/add (superadmin only)
app.post("/admin/shipping/add", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "superadmin") {
      return res.status(403).send("Unauthorized");
    }
    const { name, price } = req.body;
    if (!name || !price || isNaN(price) || Number(price) < 0) {
      req.flash("error", "Invalid city name or price.");
      return res.redirect("/admin/shipping");
    }
    // Check if city already exists (case-insensitive)
    const existingCity = await db.query(
      "SELECT id FROM shipping_options WHERE LOWER(name) = LOWER($1)",
      [name.trim()]
    );
    if (existingCity.rows.length > 0) {
      req.flash("error", "City already exists");
      return res.redirect("/admin/shipping");
    }

    const result = await db.query(
      "INSERT INTO shipping_options (name, price) VALUES ($1, $2) RETURNING id",
      [name.trim(), Number(price)]
    );

    // Log the action
    await logAdminAction({
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: "create",
      table_name: "shipping_options",
      record_id: result.rows[0].id,
      message: `Created new shipping option: ${name.trim()}`,
    });

    req.flash("success", `Shipping option "${name.trim()}" added successfully`);
    res.redirect("/admin/shipping");
  } catch (err) {
    console.error("Error adding shipping option:", err);
    req.flash("error", "Failed to add shipping option. Please try again.");
    res.redirect("/admin/shipping");
  }
});

// POST /admin/shipping/delete/:id
app.post("/admin/shipping/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is authenticated and is superadmin
    if (!req.isAuthenticated()) {
      req.flash("error", "You must be logged in to perform this action");
      return res.redirect("/login");
    }

    if (req.user.role !== "superadmin") {
      req.flash("error", "You don't have permission to perform this action");
      return res.redirect("/admin/shipping");
    }

    // Check if shipping option exists
    const shippingCheck = await db.query(
      "SELECT id, name FROM shipping_options WHERE id = $1",
      [id]
    );

    if (!shippingCheck.rows.length) {
      req.flash("error", "Shipping option not found");
      return res.redirect("/admin/shipping");
    }

    const shippingName = shippingCheck.rows[0].name;

    // Check if shipping option is used in any orders
    const ordersCheck = await db.query(
      "SELECT COUNT(*) as count FROM orders WHERE shipping_city_id = $1",
      [id]
    );

    if (parseInt(ordersCheck.rows[0].count) > 0) {
      req.flash(
        "error",
        "Cannot delete shipping option that is being used in orders"
      );
      return res.redirect("/admin/shipping");
    }

    // Delete shipping option
    await db.query("DELETE FROM shipping_options WHERE id = $1", [id]);

    // Log the action
    await logAdminAction({
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: "delete",
      table_name: "shipping_options",
      record_id: id,
      message: `Deleted shipping option: ${shippingName}`,
    });

    req.flash(
      "success",
      `Shipping option "${shippingName}" deleted successfully`
    );
    res.redirect("/admin/shipping");
  } catch (err) {
    console.error("❌ Failed to delete shipping option:", err);
    req.flash("error", "Failed to delete shipping option. Please try again.");
    res.redirect("/admin/shipping");
  }
});

// GET /admin/admins (superadmin only)
app.get("/admin/admins", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "superadmin") {
      return res.status(403).send("Unauthorized");
    }

    const adminsResult = await db.query(
      "SELECT id, name, email, role, created_at FROM admins ORDER BY created_at DESC"
    );

    // Sort: superadmin first, then by name (case-insensitive)
    let admins = adminsResult.rows;
    admins.sort((a, b) => {
      if (a.role === "superadmin" && b.role !== "superadmin") return -1;
      if (a.role !== "superadmin" && b.role === "superadmin") return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

    res.render("adminAdmins", {
      title: "Admin Management",
      user: req.user,
      admins: admins,
      error: req.flash("error")[0] || "",
      success: req.flash("success")[0] || "",
    });
  } catch (err) {
    console.error("Error loading admins:", err);
    res.status(500).send("Failed to load admins.");
  }
});

// POST /admin/admins/add (superadmin only)
app.post("/admin/admins/add", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "superadmin") {
      return res.status(403).send("Unauthorized");
    }

    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      req.flash("error", "Name, email, and password are required.");
      return res.redirect("/admin/admins");
    }

    // Validate role
    const validRoles = ["admin", "superadmin"];
    const selectedRole = role || "admin";
    if (!validRoles.includes(selectedRole)) {
      req.flash("error", "Invalid role selected.");
      return res.redirect("/admin/admins");
    }

    // Check if email already exists
    const existingAdmin = await db.query(
      "SELECT id FROM admins WHERE email = $1",
      [email.trim()]
    );

    if (existingAdmin.rows.length > 0) {
      req.flash("error", "An admin with this email already exists.");
      return res.redirect("/admin/admins");
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new admin
    const result = await db.query(
      "INSERT INTO admins (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id",
      [name.trim(), email.trim(), hashedPassword, selectedRole]
    );

    // Log the action
    await logAdminAction({
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: "create",
      table_name: "admins",
      record_id: result.rows[0].id,
      message: `Created new ${selectedRole}: ${name.trim()}`,
    });

    req.flash("success", `Admin "${name.trim()}" created successfully`);
    res.redirect("/admin/admins");
  } catch (err) {
    console.error("Error creating admin:", err);
    req.flash("error", "Failed to create admin. Please try again.");
    res.redirect("/admin/admins");
  }
});

// POST /admin/admins/delete/:id (superadmin only)
app.post("/admin/admins/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.isAuthenticated() || req.user.role !== "superadmin") {
      req.flash("error", "You don't have permission to perform this action");
      return res.redirect("/admin/admins");
    }

    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      req.flash("error", "You cannot delete your own account");
      return res.redirect("/admin/admins");
    }

    // Check if admin exists and get details
    const adminCheck = await db.query(
      "SELECT id, name, email, role FROM admins WHERE id = $1",
      [id]
    );

    if (!adminCheck.rows.length) {
      req.flash("error", "Admin not found");
      return res.redirect("/admin/admins");
    }

    const adminToDelete = adminCheck.rows[0];

    // Prevent deletion of other superadmins (optional security measure)
    if (adminToDelete.role === "superadmin") {
      req.flash("error", "Cannot delete superadmin accounts");
      return res.redirect("/admin/admins");
    }

    // Delete admin
    await db.query("DELETE FROM admins WHERE id = $1", [id]);

    // Log the action
    await logAdminAction({
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: "delete",
      table_name: "admins",
      record_id: id,
      message: `Deleted admin: ${adminToDelete.name} (${adminToDelete.email})`,
    });

    req.flash("success", `Admin "${adminToDelete.name}" deleted successfully`);
    res.redirect("/admin/admins");
  } catch (err) {
    console.error("❌ Failed to delete admin:", err);
    req.flash("error", "Failed to delete admin. Please try again.");
    res.redirect("/admin/admins");
  }
});

// GET /admin/admins/edit/:id (superadmin only)
app.get("/admin/admins/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.isAuthenticated() || req.user.role !== "superadmin") {
      return res.status(403).send("Unauthorized");
    }

    // Get admin details
    const adminResult = await db.query(
      "SELECT id, name, email, role FROM admins WHERE id = $1",
      [id]
    );

    if (!adminResult.rows.length) {
      req.flash("error", "Admin not found");
      return res.redirect("/admin/admins");
    }

    res.render("editAdmin", {
      user: req.user,
      admin: adminResult.rows[0],
      error: req.flash("error"),
    });
  } catch (err) {
    console.error("Error loading admin edit page:", err);
    res.status(500).send("Failed to load admin edit page.");
  }
});

// POST /admin/admins/edit/:id (superadmin only)
app.post("/admin/admins/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;

    if (!req.isAuthenticated() || req.user.role !== "superadmin") {
      return res.status(403).send("Unauthorized");
    }

    // Validate required fields
    if (!name || !email) {
      req.flash("error", "Name and email are required.");
      return res.redirect(`/admin/admins/edit/${id}`);
    }

    // Validate role
    const validRoles = ["admin", "superadmin"];
    const selectedRole = role || "admin";
    if (!validRoles.includes(selectedRole)) {
      req.flash("error", "Invalid role selected.");
      return res.redirect(`/admin/admins/edit/${id}`);
    }

    // Check if admin exists
    const adminCheck = await db.query(
      "SELECT id, name, email, role FROM admins WHERE id = $1",
      [id]
    );

    if (!adminCheck.rows.length) {
      req.flash("error", "Admin not found");
      return res.redirect("/admin/admins");
    }

    const oldAdmin = adminCheck.rows[0];

    // Check if new email already exists (excluding current admin)
    const existingAdmin = await db.query(
      "SELECT id FROM admins WHERE email = $1 AND id != $2",
      [email.trim(), id]
    );

    if (existingAdmin.rows.length > 0) {
      req.flash("error", "An admin with this email already exists.");
      return res.redirect(`/admin/admins/edit/${id}`);
    }

    // Prepare update query
    let updateQuery = "UPDATE admins SET name = $1, email = $2, role = $3";
    let queryParams = [name.trim(), email.trim(), selectedRole];

    // Add password update if provided
    if (password && password.trim()) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateQuery += ", password = $4 WHERE id = $5";
      queryParams.push(hashedPassword, id);
    } else {
      updateQuery += " WHERE id = $4";
      queryParams.push(id);
    }

    // Update admin
    await db.query(updateQuery, queryParams);

    // Log the action
    await logAdminAction({
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: "update",
      table_name: "admins",
      record_id: id,
      message: `Updated admin: ${name.trim()} (${email.trim()})`,
    });

    req.flash("success", "Admin updated successfully");
    res.redirect("/admin/admins");
  } catch (err) {
    console.error("Error updating admin:", err);
    req.flash("error", "Failed to update admin. Please try again.");
    res.redirect(`/admin/admins/edit/${id}`);
  }
});

// 404 handler - must be before error handling middleware
app.use((req, res) => {
  res.status(404).render("404");
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      req.flash("error", "Each image must be less than 5MB.");
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      req.flash(
        "error",
        "You can upload 1 main image and up to 4 additional images only."
      );
    } else if (err.code === "LIMIT_FILE_COUNT") {
      req.flash("error", "Too many files uploaded.");
    } else {
      req.flash("error", "Upload error: " + err.message);
    }

    return res.redirect("back");
  }

  console.error(err.stack);
  res.status(500).render("error", {
    error: "Something went wrong!",
    errorCode: "500",
    errorDetails: "An unexpected error occurred on the server.",
  });
});

// Start server
const PORT = process.env.PORT || 3000;

// Create session table and start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
