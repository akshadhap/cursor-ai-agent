import prisma from "../src/lib/db";

async function backfillExecutionUserId() {
  console.log("Starting backfill of execution userId...");
  
  // Get all executions without userId
  const executions = await prisma.execution.findMany({
    where: {
      userId: null,
      workflowId: { not: null },
    },
    include: {
      workflow: {
        select: {
          userId: true,
        },
      },
    },
  });

  console.log(`Found ${executions.length} executions to backfill`);

  let updated = 0;
  for (const execution of executions) {
    if (execution.workflow?.userId) {
      await prisma.execution.update({
        where: { id: execution.id },
        data: { userId: execution.workflow.userId },
      });
      updated++;
    }
  }

  console.log(`✅ Backfilled ${updated} executions with userId`);
  
  // Report any executions that still don't have userId
  const remaining = await prisma.execution.count({
    where: { userId: null },
  });
  
  if (remaining > 0) {
    console.log(`⚠️  ${remaining} executions still have null userId (likely deleted workflows)`);
  }
}

backfillExecutionUserId()
  .catch((e) => {
    console.error("Error backfilling:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
