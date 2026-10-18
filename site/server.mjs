import { createServer } from "node:http";

const courseHref = new URL("./course.mjs", import.meta.url).href;
const checkout = {
  type: "checkout.session.completed",
  paid: true,
  student: "Maya",
  email: "maya@class.test",
  studentId: "stu_maya",
  course: "Intro to product design",
  fee: "$49",
};

const port = Number(process.env.PORT ?? 3000);
const server = createServer(async (_req, res) => {
  const { pageFor } = await import(`${courseHref}?t=${Date.now()}`);
  const html = pageFor(checkout);
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Course site http://localhost:${port}`);
});
