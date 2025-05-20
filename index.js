require("dotenv").config();
const express = require("express");
const { Client } = require("@notionhq/client");

const app = express();
const port = 3000;

const notion = new Client({ auth: process.env.NOTION_TOKEN });

app.use(express.json());

app.post("/add-car", async (req, res) => {
  const { name, carNumber, phoneNumber, imageUrl } = req.body;

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
        },
        CarImage: imageUrl
          ? {
              files: [
                {
                  type: "external",
                  name: "car-image",
                  external: {
                    url: imageUrl
                  }
                }
              ]
            }
          : undefined
      }
    });

    res.status(200).json({ success: true, id: response.id });
  } catch (error) {
    console.error("Notion API Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to extract image URL from Notion response
const getImageUrl = (property) => {
  console.log("Raw CarImage property:", JSON.stringify(property, null, 2));
  if (!property || !property.files || property.files.length === 0) return null;
  const file = property.files[0];
  console.log("File object:", JSON.stringify(file, null, 2));
  if (file.type === "external") return file.external.url;
  if (file.type === "file") return file.file.url;
  return null;
};

// Get all cars
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
      imageUrl: getImageUrl(page.properties.CarImage),
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
  const { name, carNumber, phoneNumber, imageUrl } = req.body;

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
        },
        CarImage: imageUrl
          ? {
              files: [
                {
                  type: "external",
                  name: "car-image",
                  external: {
                    url: imageUrl
                  }
                }
              ]
            }
          : undefined
      }
    });

    res.status(200).json({
      success: true,
      data: {
        id: response.id,
        name: response.properties.Name.title[0]?.text.content || "",
        carNumber: response.properties.CarNumber.number || null,
        phoneNumber: response.properties.OwnerPhoneNumber.phone_number || "",
        imageUrl: getImageUrl(response.properties.CarImage),
        updatedTime: response.last_edited_time
      }
    });
  } catch (error) {
    console.error("Notion API Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get car by number
app.get("/cars/number/:carNumber", async (req, res) => {
  const { carNumber } = req.params;

  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: {
        property: "CarNumber",
        number: {
          equals: Number(carNumber)
        }
      }
    });

    if (response.results.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No car found with number ${carNumber}`
      });
    }

    const cars = response.results.map((car) => ({
      id: car.id,
      name: car.properties.Name.title[0]?.text.content || "",
      carNumber: car.properties.CarNumber.number || null,
      phoneNumber: car.properties.OwnerPhoneNumber.phone_number || "",
      imageUrl: getImageUrl(car.properties.CarImage),
      createdTime: car.created_time
    }));

    res.status(200).json({
      success: true,
      data: cars
    });
  } catch (error) {
    console.error("Notion API Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get car by phone number
app.get("/cars/phone/:phoneNumber", async (req, res) => {
  const { phoneNumber } = req.params;

  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: {
        property: "OwnerPhoneNumber",
        phone_number: {
          equals: phoneNumber
        }
      }
    });

    if (response.results.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No car found with phone number ${phoneNumber}`
      });
    }

    const cars = response.results.map((car) => ({
      id: car.id,
      name: car.properties.Name.title[0]?.text.content || "",
      carNumber: car.properties.CarNumber.number || null,
      phoneNumber: car.properties.OwnerPhoneNumber.phone_number || "",
      imageUrl: getImageUrl(car.properties.CarImage),
      createdTime: car.created_time
    }));

    res.status(200).json({
      success: true,
      data: cars
    });
  } catch (error) {
    console.error("Notion API Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get car by name
app.get("/cars/name/:name", async (req, res) => {
  const { name } = req.params;

  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: {
        property: "Name",
        title: {
          equals: name
        }
      }
    });

    if (response.results.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No car found with owner name ${name}`
      });
    }

    const cars = response.results.map((car) => ({
      id: car.id,
      name: car.properties.Name.title[0]?.text.content || "",
      carNumber: car.properties.CarNumber.number || null,
      phoneNumber: car.properties.OwnerPhoneNumber.phone_number || "",
      imageUrl: getImageUrl(car.properties.CarImage),
      createdTime: car.created_time
    }));

    res.status(200).json({
      success: true,
      data: cars
    });
  } catch (error) {
    console.error("Notion API Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});
