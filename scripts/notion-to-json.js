// scripts/notion-to-json.js
import fs from "fs";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function notionRequest(path, body) {
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API error ${res.status}: ${text}`);
  }

  return res.json();
}

function getText(prop) {
  if (!prop) return "";
  if (prop.type === "title") return prop.title?.map(t => t.plain_text).join("") || "";
  if (prop.type === "rich_text") return prop.rich_text?.map(t => t.plain_text).join("") || "";
  if (prop.type === "select") return prop.select?.name || "";
  if (prop.type === "number") return prop.number ?? null;
  if (prop.type === "checkbox") return !!prop.checkbox;
  return "";
}

function getFileUrl(prop) {
  if (!prop || prop.type !== "files") return "";
  const f = prop.files?.[0];
  if (!f) return "";
  // file = upload notion, external = url
  if (f.type === "file") return f.file.url;
  if (f.type === "external") return f.external.url;
  return "";
}

async function main() {
  const data = await notionRequest(`databases/${DATABASE_ID}/query`, {
    page_size: 100,
    sorts: [
      { property: "Année", direction: "descending" }
    ]
  });

  const artworks = data.results
    .map(p => {
      const props = p.properties;
      return {
        title: getText(props["Title"]),
        year: getText(props["Année"]),
        technique: getText(props["Technique"]),
        size: getText(props["Taille"]),
        desc: getText(props["Description"]),
        visible: getText(props["Visible"]),
        order: getText(props["Ordre"]),
        image: getFileUrl(props["Image"])
      };
    })
    .filter(a => a.visible && a.title && a.image);

  // tri : Ordre si présent sinon Année desc
  artworks.sort((a, b) => {
    const ao = a.order ?? 999999;
    const bo = b.order ?? 999999;
    if (ao !== bo) return ao - bo;
    return (b.year ?? 0) - (a.year ?? 0);
  });

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync("data/artworks.json", JSON.stringify(artworks, null, 2), "utf8");

  console.log(`✅ Generated data/artworks.json (${artworks.length} artworks)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

