const http = require("node:http");

const endpoints = [
  "/api/dashboard",
  "/api/transactions",
  "/api/categories",
  "/api/banks",
  "/api/projects",
  "/api/savings",
];

let completed = 0;

endpoints.forEach((endpoint) => {
  const start = Date.now();
  http
    .get(`http://127.0.0.1:3001${endpoint}`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log(`${endpoint} Latency: ${Date.now() - start}ms`);
        completed++;
        if (completed === endpoints.length) process.exit(0);
      });
    })
    .on("error", (err) => {
      console.log(`${endpoint} Error: ${err.message}`);
      completed++;
      if (completed === endpoints.length) process.exit(1);
    });
});
