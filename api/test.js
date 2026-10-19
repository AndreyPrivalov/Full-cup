export default async function handler(_req, res) {
  const steps = [];
  try {
    steps.push("importing backend/index.js");
    const backend = await import("../backend/index.js");
    steps.push("imported backend successfully");
    const app = backend.default;
    steps.push(`app is ${typeof app}`);

    return res.status(200).json({
      status: "test-ok",
      steps,
      node: process.version,
      env: process.env.VERCEL ? "vercel" : "local",
    });
  } catch (err) {
    return res.status(200).json({
      status: "import-error",
      steps,
      errorName: err.name,
      errorMessage: err.message,
      errorStack: err.stack,
    });
  }
}
