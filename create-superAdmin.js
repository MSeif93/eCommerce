import bcrypt from "bcrypt";
import db from "./src/config/db.js";

const name = "Admin"; // change it to your name
const email = "admin@example.com"; // change it to your email
const plainPassword = "admin123"; // change it to your password
// then run the command "node create-superAdmin.js" in the terminal to create a superadmin
const role = "superadmin";

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const existing = await db.query("SELECT * FROM admins WHERE email = $1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      console.log("Admin already exists with this email.");
      process.exit();
    }

    await db.query(
      "INSERT INTO admins (name, email, password, role) VALUES ($1, $2, $3, $4)",
      [name, email, hashedPassword, role]
    );

    console.log(`✅ Superadmin created:
      Email: ${email}
      Password: ${plainPassword}
      Role: ${role}`);
  } catch (err) {
    console.error("❌ Error creating admin:", err);
  } finally {
    db.end();
  }
}

createAdmin();
