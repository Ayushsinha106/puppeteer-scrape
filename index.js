const express = require("express");
const cors = require("cors");
const app = express();
const puppeteer = require("puppeteer");
require("dotenv").config();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use(cors());

const getChapter = async (url) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  const page = await browser.newPage();
  await page.goto(url);

  const paragraph = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll("p")); // Change the selector as needed
    return elements.map((element) => element.textContent);
  });
  const pageTitle = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll("h2")); // Change the selector as needed
    return elements.map((element) => element.textContent);
  });

  const data = {
    paragraph: paragraph,
    pageTitle: pageTitle[0],
  };

  await browser.close();
  return data;
};

async function scrapeData(name) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  const page = await browser.newPage();

  const url = `https://allnovelbook.com/search?q=${name}`;
  await page.goto(url);

  const divElement = await page.$("div.special");
  const divExists = divElement !== null;

  console.log(divExists);

  const data = { result: [] };
  if (divExists) {
    const novelLinks = await divElement.$$("a");

    for (const a of novelLinks) {
      const img = await a.$("img");
      if (img) {
        const title = await a.evaluate((a) => a.getAttribute("title"));
        const url = await a.evaluate((a) => a.getAttribute("href"));
        const imgSrc = await img.evaluate((img) =>
          img.getAttribute("data-src")
        );

        const items = { title, url, img: imgSrc };
        data.result.push(items);
      }
    }

    const next = await divElement.$("ul.pagination");
    if (next) {
      const numList = await next.$$("a.page-link");
      const num = await Promise.all(
        numList.map((p) => p.evaluate((p) => p.textContent))
      );
      const val = num.length;
      let i = 0;

      while (i < val - 1) {
        if (i === parseInt(num[val - 2])) {
          break;
        }

        const nextPageUrl = `https://allnovelbook.com/search?q=${name}&page=${num[i]}`;
        await page.goto(nextPageUrl);

        const nextPageDivElement = await page.$("div.special");
        if (nextPageDivElement) {
          const nextPageNovelLinks = await nextPageDivElement.$$("a");
          for (const a of nextPageNovelLinks) {
            const img = await a.$("img");
            if (img) {
              const title = await a.evaluate((a) => a.getAttribute("title"));
              const url = await a.evaluate((a) => a.getAttribute("href"));
              const imgSrc = await img.evaluate((img) =>
                img.getAttribute("data-src")
              );

              const items = { title, url, img: imgSrc };
              data.result.push(items);
            }
          }
        }
        i++;
      }
    }
  } else {
    data.result.push("No results for your search.");
  }

  await browser.close();
  return data;
}

app.post("/chapters", async (req, res) => {
  const data = req.body;
  console.log(data.name);
  const response = await getChapter(data.name);
  console.log(response);
  res.json(response);
});

app.post("/search", async (req, res) => {
  const data = req.body;
  console.log(data.name);
  const response = await scrapeData(data.name);
  console.log(response);
  res.json(response);
});

app.get("/", async (req, res) => {
  res.send("hello Ayush");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
