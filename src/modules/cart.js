import express from "express";
import db from "../config/db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const sessionId = req.sessionID;

    const result = await db.query(
      `SELECT cart_items.id, products.name, products.price, cart_items.quantity
       FROM cart_items
       JOIN products ON cart_items.product_id = products.id
       WHERE cart_items.session_id = $1`,
      [sessionId]
    );

    const cart = result.rows;
    res.render("cart", { cart });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading cart");
  }
});

router.post("/cart/add", async (req, res) => {
  try {
    const sessionId = req.sessionID;
    const { product_id, quantity } = req.body;

    const existing = await db.query(
      "SELECT * FROM cart_items WHERE session_id = $1 AND product_id = $2",
      [sessionId, product_id]
    );

    if (existing.rows.length > 0) {
      await db.query(
        "UPDATE cart_items SET quantity = quantity + $1 WHERE session_id = $2 AND product_id = $3",
        [quantity, sessionId, product_id]
      );
    } else {
      await db.query(
        "INSERT INTO cart_items (session_id, product_id, quantity) VALUES ($1, $2, $3)",
        [sessionId, product_id, quantity]
      );
    }

    res.status(200).json({ message: "Product added to cart" });
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.post("/delete/:id", async (req, res) => {
  try {
    const sessionId = req.sessionID;
    const itemId = req.params.id;

    await db.query("DELETE FROM cart_items WHERE id = $1 AND session_id = $2", [
      itemId,
      sessionId,
    ]);

    res.redirect("/cart");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting item");
  }
});

export default router;
