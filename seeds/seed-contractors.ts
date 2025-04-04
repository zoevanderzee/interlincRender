import { db } from "../server/db";
import { users } from "../shared/schema";

async function main() {
  console.log("Seeding sample contractors and freelancers...");

  // Add sample contractors (as companies)
  const sampleContractors = [
    {
      username: "smith_digital",
      password: "$2a$10$JqxMWkbdK7UpRBXJVEP7xOI89XTj0CG4lZDkoxcQJuL2QGh0pJg96", // hashed password
      email: "contact@smithdigital.com",
      role: "contractor",
      workerType: "contractor",
      companyName: "Smith Digital Solutions",
      companyLogo: "https://ui-avatars.com/api/?name=Smith+Digital&background=0D8ABC&color=fff&size=128&bold=true",
      title: "Software Development Agency",
      industry: "Technology",
      foundedYear: 2015,
      employeeCount: 24,
      website: "https://smithdigital.example.com",
    },
    {
      username: "johnson_web",
      password: "$2a$10$JqxMWkbdK7UpRBXJVEP7xOI89XTj0CG4lZDkoxcQJuL2QGh0pJg96", // hashed password
      email: "info@johnsonweb.com",
      role: "contractor",
      workerType: "contractor",
      companyName: "Johnson Web Agency",
      companyLogo: "https://ui-avatars.com/api/?name=Johnson+Web&background=E74C3C&color=fff&size=128&bold=true",
      title: "Web Design & Development Agency",
      industry: "Creative",
      foundedYear: 2018,
      employeeCount: 12,
      website: "https://johnsonweb.example.com",
    },
    {
      username: "parker_software",
      password: "$2a$10$JqxMWkbdK7UpRBXJVEP7xOI89XTj0CG4lZDkoxcQJuL2QGh0pJg96", // hashed password
      email: "hello@parkersoftware.com",
      role: "contractor",
      workerType: "contractor",
      companyName: "Parker Software Solutions",
      companyLogo: "https://ui-avatars.com/api/?name=Parker+Software&background=27AE60&color=fff&size=128&bold=true",
      title: "Mobile App Development Company",
      industry: "Technology",
      foundedYear: 2017,
      employeeCount: 18,
      website: "https://parkersoftware.example.com",
    },
    {
      username: "techcrafters",
      password: "$2a$10$JqxMWkbdK7UpRBXJVEP7xOI89XTj0CG4lZDkoxcQJuL2QGh0pJg96", // hashed password
      email: "info@techcrafters.com",
      role: "contractor",
      workerType: "contractor",
      companyName: "TechCrafters Inc.",
      companyLogo: "https://ui-avatars.com/api/?name=Tech+Crafters&background=8E44AD&color=fff&size=128&bold=true",
      title: "Custom Software Solutions",
      industry: "Technology",
      foundedYear: 2014,
      employeeCount: 35,
      website: "https://techcrafters.example.com",
    },
    {
      username: "vision_designs",
      password: "$2a$10$JqxMWkbdK7UpRBXJVEP7xOI89XTj0CG4lZDkoxcQJuL2QGh0pJg96", // hashed password
      email: "contact@visiondesigns.com",
      role: "contractor",
      workerType: "contractor",
      companyName: "Vision Designs LLC",
      companyLogo: "https://ui-avatars.com/api/?name=Vision+Designs&background=F39C12&color=fff&size=128&bold=true",
      title: "Digital Design Studio",
      industry: "Creative",
      foundedYear: 2019,
      employeeCount: 8,
      website: "https://visiondesigns.example.com",
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
      console.log(`Added contractor company: ${contractor.companyName}`);
    } catch (error) {
      console.error(`Error adding contractor company ${contractor.companyName}:`, error);
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