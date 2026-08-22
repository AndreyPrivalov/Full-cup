const http = require("node:http");
const start = Date.now();
http
  .get("http://127.0.0.1:3001/api/dashboard", (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      console.log(`Latency: ${Date.now() - start}ms`);
      process.exit(0);
    });
  })
  .on("error", (err) => {
    console.log(`Error: ${err.message}`);
    process.exit(1);
  });
