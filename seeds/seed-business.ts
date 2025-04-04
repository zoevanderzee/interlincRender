import { db } from "../server/db";
import { users } from "../shared/schema";

async function main() {
  console.log("Seeding sample business user...");

  // Add sample business user
  const businessUser = {
    username: "cdmanagement",
    password: "$2a$10$JqxMWkbdK7UpRBXJVEP7xOI89XTj0CG4lZDkoxcQJuL2QGh0pJg96", // hashed password
    firstName: "CD",
    lastName: "Admin",
    email: "admin@creativlinc.com",
    role: "business",
    profileImageUrl: "https://randomuser.me/api/portraits/men/10.jpg",
    companyName: "Creativ Linc",
    title: "Platform Administrator",
  };

  try {
    await db.insert(users).values(businessUser);
    console.log(`Added business user: ${businessUser.firstName} ${businessUser.lastName}`);
  } catch (error) {
    console.error(`Error adding business user ${businessUser.firstName} ${businessUser.lastName}:`, error);
  }

  console.log("Sample business user seeded successfully!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});