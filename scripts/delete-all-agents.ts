import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

async function deleteAllAgents() {
  try {
    console.log("🗑️  Starting to delete all standalone agents...\n");

    // Get all agents first to show what we're deleting
    const allAgents = await prisma.standaloneAgent.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        userId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log(`📊 Found ${allAgents.length} agent(s) in the database:\n`);
    
    allAgents.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.name} (${agent.type})`);
      console.log(`   User: ${agent.userId}`);
      console.log(`   Created: ${agent.createdAt.toISOString()}`);
      console.log(`   ID: ${agent.id}\n`);
    });

    if (allAgents.length === 0) {
      console.log("✅ No agents found. Database is already clean!");
      return;
    }

    // Delete all agents
    const result = await prisma.standaloneAgent.deleteMany({});

    console.log(`\n✅ Successfully deleted ${result.count} agent(s)!`);
    console.log("🎉 Database cleanup complete!\n");
  } catch (error) {
    console.error("❌ Error deleting agents:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllAgents()
  .then(() => {
    console.log("✨ Script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
