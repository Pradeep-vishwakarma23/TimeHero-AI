import { initAuthDb, updateUserPassword } from "../server/auth_db.js";
import bcryptjs from "bcryptjs";

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.log("Usage: npx tsx scripts/reset-password.ts <email> <new_password>");
    process.exit(1);
  }

  // Initialize the SQLite Auth database
  await initAuthDb();

  // Hash the password with bcryptjs (10 rounds, identical to registration)
  const passwordHash = await bcryptjs.hash(newPassword, 10);

  // Safely update the password hash in the SQLite database and persist it
  const success = await updateUserPassword(email, passwordHash);

  if (success) {
    console.log(`Password reset successful for ${email}`);
  } else {
    console.log("User not found.");
  }
}

main().catch((err) => {
  console.error("An error occurred during password reset:", err);
  process.exit(1);
});
