import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import db from "./db.js";

export default function initialize(passport) {
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          console.log("🔍 Checking credentials for email:", email);

          const result = await db.query(
            "SELECT * FROM admins WHERE email = $1",
            [email]
          );

          console.log(
            "📊 Database query result:",
            result.rows.length,
            "rows found"
          );

          const user = result.rows[0];
          if (!user) {
            console.log("❌ No user found with email:", email);
            return done(null, false, { message: "Incorrect email." });
          }

          console.log("👤 User found:", {
            id: user.id,
            name: user.name,
            role: user.role,
          });

          const match = await bcrypt.compare(password, user.password);
          console.log("🔐 Password match result:", match);

          if (!match) {
            console.log("❌ Password mismatch for user:", email);
            return done(null, false, { message: "Incorrect password." });
          }

          console.log("✅ Authentication successful for:", email);
          return done(null, user);
        } catch (err) {
          console.error("❌ Error in LocalStrategy:", err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    console.log("💾 Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      console.log("🔍 Deserializing user with ID:", id);

      if (!id) {
        console.log("❌ No user ID provided for deserialization");
        return done(null, false);
      }

      const result = await db.query("SELECT * FROM admins WHERE id = $1", [id]);

      if (!result.rows[0]) {
        console.log("❌ User not found during deserialization:", id);
        return done(null, false);
      }

      console.log("✅ User deserialized successfully:", result.rows[0].email);
      done(null, result.rows[0]);
    } catch (err) {
      console.error("❌ Error in deserializeUser:", err);
      // Don't pass the error to done() as it will break the session
      // Instead, return false to indicate no user
      done(null, false);
    }
  });
}
