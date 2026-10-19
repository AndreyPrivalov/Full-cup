export default function handler(_req, res) {
  res.status(200).json({
    status: "test-ok",
    node: process.version,
    env: process.env.VERCEL ? "vercel" : "local",
    time: new Date().toISOString(),
  });
}
