import { db } from "../server/db";
import { users } from "../shared/schema";

async function main() {
  console.log("Seeding sample contractors and freelancers...");

  // Add sample contractors
  const sampleContractors = [
    {
      username: "alexsmith",
      password: "$2a$10$JqxMWkbdK7UpRBXJVEP7xOI89XTj0CG4lZDkoxcQJuL2QGh0pJg96", // hashed password
      firstName: "Alex",
      lastName: "Smith",
      email: "alex.smith@example.com",
      role: "contractor",
      workerType: "contractor",
      profileImageUrl: "https://randomuser.me/api/portraits/men/1.jpg",
      companyName: "Smith Digital Solutions",
      title: "Full Stack Developer",
    },
    {
      username: "sarahj",
      password: "$2a$10$JqxMWkbdK7UpRBXJVEP7xOI89XTj0CG4lZDkoxcQJuL2QGh0pJg96", // hashed password
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@example.com",
      role: "contractor",
      workerType: "contractor",
      profileImageUrl: "https://randomuser.me/api/portraits/women/1.jpg",
      companyName: "Johnson Web Agency",
      title: "UI/UX Designer",
    },
    {
      username: "michaelp",
      password: "$2a$10$JqxMWkbdK7UpRBXJVEP7xOI89XTj0CG4lZDkoxcQJuL2QGh0pJg96", // hashed password
      firstName: "Michael",
      lastName: "Parker",
      email: "michael.parker@example.com",
      role: "contractor",
      workerType: "contractor",
      profileImageUrl: "https://randomuser.me/api/portraits/men/2.jpg",
      companyName: "Parker Software Solutions",
      title: "Mobile App Developer",
    }
  ];

  // Add sample freelancers
  const sampleFreelancers = [
    {
      username: "jamesc",
      password: "$2a$10$JqxMWkbdK7UpRBXJVEP7xOI89XTj0CG4lZDkoxcQJuL2QGh0pJg96", // hashed password
      firstName: "James",
      lastName: "Chen",
      email: "james.chen@example.com",
      role: "contractor",
      workerType: "freelancer",
      profileImageUrl: "https://randomuser.me/api/portraits/men/3.jpg",
      title: "DevOps Engineer",
    },
    {
      username: "emilyr",
      password: "$2a$10$JqxMWkbdK7UpRBXJVEP7xOI89XTj0CG4lZDkoxcQJuL2QGh0pJg96", // hashed password
      firstName: "Emily",
      lastName: "Rodriguez",
      email: "emily.rodriguez@example.com",
      role: "contractor",
      workerType: "freelancer",
      profileImageUrl: "https://randomuser.me/api/portraits/women/2.jpg",
      title: "Content Writer",
    },
    {
      username: "davidm",
      password: "$2a$10$JqxMWkbdK7UpRBXJVEP7xOI89XTj0CG4lZDkoxcQJuL2QGh0pJg96", // hashed password
      firstName: "David",
      lastName: "Martinez",
      email: "david.martinez@example.com",
      role: "contractor",
      workerType: "freelancer",
      profileImageUrl: "https://randomuser.me/api/portraits/men/4.jpg",
      title: "Graphic Designer",
    },
    {
      username: "sophiat",
      password: "$2a$10$JqxMWkbdK7UpRBXJVEP7xOI89XTj0CG4lZDkoxcQJuL2QGh0pJg96", // hashed password
      firstName: "Sophia",
      lastName: "Thompson",
      email: "sophia.thompson@example.com",
      role: "contractor",
      workerType: "freelancer",
      profileImageUrl: "https://randomuser.me/api/portraits/women/3.jpg",
      title: "Social Media Manager",
    },
    {
      username: "danielk",
      password: "$2a$10$JqxMWkbdK7UpRBXJVEP7xOI89XTj0CG4lZDkoxcQJuL2QGh0pJg96", // hashed password
      firstName: "Daniel",
      lastName: "Kim",
      email: "daniel.kim@example.com",
      role: "contractor",
      workerType: "freelancer",
      profileImageUrl: "https://randomuser.me/api/portraits/men/5.jpg",
      title: "SEO Specialist",
    }
  ];

  // Insert the sample contractors
  for (const contractor of sampleContractors) {
    try {
      await db.insert(users).values(contractor);
      console.log(`Added contractor: ${contractor.firstName} ${contractor.lastName}`);
    } catch (error) {
      console.error(`Error adding contractor ${contractor.firstName} ${contractor.lastName}:`, error);
    }
  }

  // Insert the sample freelancers
  for (const freelancer of sampleFreelancers) {
    try {
      await db.insert(users).values(freelancer);
      console.log(`Added freelancer: ${freelancer.firstName} ${freelancer.lastName}`);
    } catch (error) {
      console.error(`Error adding freelancer ${freelancer.firstName} ${freelancer.lastName}:`, error);
    }
  }

  console.log("Sample contractors and freelancers seeded successfully!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});