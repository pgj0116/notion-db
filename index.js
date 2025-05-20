require("dotenv").config();
const express = require("express");
const { Client } = require("@notionhq/client");

const app = express();
const port = 3000;

const notion = new Client({ auth: process.env.NOTION_TOKEN });

app.use(express.json());

app.post("/add-car", async (req, res) => {
  const { name, carNumber, phoneNumber } = req.body;

  console.log(process.env.NOTION_TOKEN, process.env.NOTION_DATABASE_ID);
  try {
    const response = await notion.pages.create({
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        Name: {
          title: [
            {
              text: { content: String(name) }
            }
          ]
        },
        CarNumber: {
          number: Number(carNumber)
        },
        OwnerPhoneNumber: {
          phone_number: String(phoneNumber)
        }
      }
    });

    res.status(200).json({ success: true, id: response.id });
  } catch (error) {
    console.error("Notion API Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/cars", async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      sorts: [
        {
          timestamp: "created_time",
          direction: "descending"
        }
      ]
    });

    const cars = response.results.map((page) => ({
      id: page.id,
      name: page.properties.Name.title[0]?.text.content || "",
      carNumber: page.properties.CarNumber.number || null,
      phoneNumber: page.properties.OwnerPhoneNumber.phone_number || "",
      createdTime: page.created_time
    }));

    res.status(200).json({ success: true, data: cars });
  } catch (error) {
    console.error("Notion API Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a car entry
app.delete("/cars/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await notion.pages.update({
      page_id: id,
      archived: true
    });

    res
      .status(200)
      .json({ success: true, message: "Car entry deleted successfully" });
  } catch (error) {
    console.error("Notion API Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a car entry
app.put("/cars/:id", async (req, res) => {
  const { id } = req.params;
  const { name, carNumber, phoneNumber } = req.body;

  try {
    const response = await notion.pages.update({
      page_id: id,
      properties: {
        Name: {
          title: [
            {
              text: { content: String(name) }
            }
          ]
        },
        CarNumber: {
          number: Number(carNumber)
        },
        OwnerPhoneNumber: {
          phone_number: String(phoneNumber)
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        id: response.id,
        name: response.properties.Name.title[0]?.text.content || "",
        carNumber: response.properties.CarNumber.number || null,
        phoneNumber: response.properties.OwnerPhoneNumber.phone_number || "",
        updatedTime: response.last_edited_time
      }
    });
  } catch (error) {
    console.error("Notion API Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});
