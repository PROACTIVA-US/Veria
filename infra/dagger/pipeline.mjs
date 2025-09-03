
import { connect } from "@dagger.io/dagger";

export async function run() {
  const conn = await connect();
  try {
    const ctr = conn.container().from("node:20-alpine").withExec(["node", "-v"]);
    const v = await ctr.stdout();
    console.log("Node in pipeline:", v.trim());
  } finally {
    await conn.close();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
