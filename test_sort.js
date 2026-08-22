const arr = Array.from({ length: 100000 }, () => ({ date: "2026-06-03T10:00:00Z" }));
const start = Date.now();
arr.sort((a, b) => new Date(b.date) - new Date(a.date));
console.log(`Sort took ${Date.now() - start}ms`);
